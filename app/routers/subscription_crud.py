from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.database import get_db
from app.models import Subscription, Customer, Plan, AuditLog
from app.schemas import SubscriptionOut, SubscriptionFullUpdate, SubscribeRequest, ChangePlanRequest
from app.auth import require_user
from app.services.subscription_service import transition_subscription_status, InvalidTransitionError
from app.services.invoice_generation_service import generate_initial_invoice_if_active

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.post("", response_model=SubscriptionOut, status_code=201)
def subscribe(sub_in: SubscribeRequest, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == sub_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    plan = db.query(Plan).filter(Plan.id == sub_in.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot subscribe to an archived plan")

    start_date = date.today()

    if plan.trial_days and plan.trial_days > 0:
        status_value = "trial"
        end_date = start_date + timedelta(days=plan.trial_days)
    else:
        status_value = "active"
        end_date = None

    subscription = Subscription(
        customer_id=sub_in.customer_id,
        plan_id=sub_in.plan_id,
        status=status_value,
        start_date=start_date,
        end_date=end_date
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    generate_initial_invoice_if_active(db, subscription)
    db.add(AuditLog(
        entity_type="subscription",
        entity_id=subscription.id,
        action="create",
        new_value=str({"customer_id": sub_in.customer_id, "plan_id": sub_in.plan_id, "status": status_value}),
        performed_by=user.username
    ))
    db.commit()

    return subscription

@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db), user=Depends(require_user)):
    return db.query(Subscription).all()


@router.get("/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.put("/{subscription_id}", response_model=SubscriptionOut)
def update_subscription(subscription_id: int, sub_in: SubscriptionFullUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    update_data = sub_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sub, field, value)

    db.commit()
    db.refresh(sub)

    db.add(AuditLog(entity_type="subscription", entity_id=sub.id, action="update",
                     new_value=str(update_data), performed_by=user.username))
    db.commit()
    return sub


@router.delete("/{subscription_id}")
def delete_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(sub)
    db.commit()

    db.add(AuditLog(entity_type="subscription", entity_id=subscription_id, action="delete", performed_by=user.username))
    db.commit()
    return {"message": "Subscription deleted"}

@router.post("/{subscription_id}/change-plan", response_model=SubscriptionOut)
def change_plan(subscription_id: int, payload: ChangePlanRequest, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    new_plan = db.query(Plan).filter(Plan.id == payload.new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")

    old_plan_id = sub.plan_id
    sub.plan_id = payload.new_plan_id
    db.commit()
    db.refresh(sub)

    db.add(AuditLog(entity_type="subscription", entity_id=sub.id, action="change_plan",
                     old_value=str({"plan_id": old_plan_id}),
                     new_value=str({"plan_id": payload.new_plan_id}),
                     performed_by=user.username))
    db.commit()
    return sub


@router.post("/{subscription_id}/pause", response_model=SubscriptionOut)
def pause_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    try:
        transition_subscription_status(db, sub, "paused")
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.add(AuditLog(entity_type="subscription", entity_id=sub.id, action="pause", performed_by=user.username))
    db.commit()
    return sub


@router.post("/{subscription_id}/resume", response_model=SubscriptionOut)
def resume_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    try:
        transition_subscription_status(db, sub, "active")
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    generate_initial_invoice_if_active(db, sub)
    db.add(AuditLog(entity_type="subscription", entity_id=sub.id, action="resume", performed_by=user.username))
    db.commit()
    return sub


@router.post("/{subscription_id}/cancel", response_model=SubscriptionOut)
def cancel_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    try:
        transition_subscription_status(db, sub, "cancelled")
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.add(AuditLog(entity_type="subscription", entity_id=sub.id, action="cancel", performed_by=user.username))
    db.commit()
    return sub

