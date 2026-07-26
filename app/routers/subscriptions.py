from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import json

from app.database import get_db
from app.models import Subscription, Customer, Plan, Invoice, AuditLog
from app.schemas import SubscriptionCreate, StatusUpdate
from app.auth import require_user
from app.services.subscription_service import transition_subscription_status, InvalidTransitionError, VALID_TRANSITIONS
from app.services.invoice_generation_service import generate_initial_invoice_if_active, generate_invoice_number
router = APIRouter(prefix="/api", tags=["Dashboard"])


class ChangePlanBody(BaseModel):
    new_plan_id: int


def _cycle_length_days(billing_interval: str) -> int:
    return 365 if (billing_interval or "").lower() == "annual" else 30


def _calculate_proration(subscription: Subscription, current_plan: Plan, new_plan: Plan) -> dict:
  
    cycle_length = _cycle_length_days(current_plan.billing_interval)
    today = date.today()
    start = subscription.start_date or today

    days_since_start = max((today - start).days, 0)
    days_elapsed_in_cycle = days_since_start % cycle_length
    remaining_days = max(cycle_length - days_elapsed_in_cycle, 0)

    unused_credit = round(current_plan.price * remaining_days / cycle_length, 2)
    new_plan_charge = round(new_plan.price * remaining_days / cycle_length, 2)
    amount_due = round(new_plan_charge - unused_credit, 2)

    return {
        "current_plan_id": current_plan.id,
        "current_plan_name": current_plan.name,
        "new_plan_id": new_plan.id,
        "new_plan_name": new_plan.name,
        "cycle_length_days": cycle_length,
        "remaining_days": remaining_days,
        "unused_credit": unused_credit,
        "new_plan_charge": new_plan_charge,
        "amount_due": amount_due,
    }


@router.get("/customers")
def api_list_customers(db: Session = Depends(get_db), user=Depends(require_user)):
    customers = db.query(Customer).all()
    return [{"id": c.id, "name": c.name, "email": c.email} for c in customers]


@router.get("/plans")
def api_list_plans(db: Session = Depends(get_db), user=Depends(require_user)):
    plans = db.query(Plan).filter(Plan.is_archived == False).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "billing_interval": p.billing_interval,
            "trial_days": p.trial_days
        }
        for p in plans
    ]


@router.post("/subscriptions")
def api_create_subscription(sub_in: SubscriptionCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == sub_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    plan = db.query(Plan).filter(Plan.id == sub_in.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if sub_in.status not in ("trial", "active"):
        raise HTTPException(status_code=400, detail="Initial status must be 'trial' or 'active'")

    subscription = Subscription(
        customer_id=sub_in.customer_id,
        plan_id=sub_in.plan_id,
        status=sub_in.status,
        start_date=date.today()
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    generate_initial_invoice_if_active(db, subscription)
    return {"message": "Subscription created", "id": subscription.id}


@router.get("/subscriptions")
def api_list_subscriptions(db: Session = Depends(get_db), user=Depends(require_user)):
    rows = (
        db.query(Subscription, Customer, Plan)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Plan, Subscription.plan_id == Plan.id)
        .order_by(Subscription.id.desc())
        .all()
    )

    result = []
    for sub, customer, plan in rows:
        result.append({
            "id": sub.id,
            "customer_name": customer.name,
            "plan_name": plan.name,
            "status": sub.status,
            "start_date": sub.start_date.isoformat() if sub.start_date else None,
            "status_updated_at": sub.status_updated_at.isoformat() if sub.status_updated_at else None,
            "valid_next_states": VALID_TRANSITIONS.get(sub.status, [])
        })
    return result


@router.patch("/subscriptions/{subscription_id}/status")
def api_update_status(subscription_id: int, payload: StatusUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    try:
        transition_subscription_status(subscription, payload.status)
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    generate_initial_invoice_if_active(db, subscription)
    return {"message": "Status updated", "status": subscription.status}


@router.get("/subscriptions/{subscription_id}/change-plan/preview")
def api_preview_change_plan(subscription_id: int, new_plan_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    """Step 3-6 of the proration flow, without applying anything yet —
    powers the 'Proration Preview' screen before the customer confirms."""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    current_plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
    if not current_plan:
        raise HTTPException(status_code=404, detail="Current plan not found")
    if not new_plan:
        raise HTTPException(status_code=404, detail="New plan not found")
    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")
    if new_plan.id == current_plan.id:
        raise HTTPException(status_code=400, detail="Already subscribed to this plan")

    return _calculate_proration(subscription, current_plan, new_plan)


@router.post("/subscriptions/{subscription_id}/change-plan")
def api_change_plan(subscription_id: int, payload: ChangePlanBody, db: Session = Depends(get_db), user=Depends(require_user)):
   
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    current_plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not current_plan:
        raise HTTPException(status_code=404, detail="Current plan not found")

    new_plan = db.query(Plan).filter(Plan.id == payload.new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="New plan not found")
    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")
    if new_plan.id == current_plan.id:
        raise HTTPException(status_code=400, detail="Already subscribed to this plan")

    proration = _calculate_proration(subscription, current_plan, new_plan)

    adjustment_invoice = None
    if proration["amount_due"] != 0:
        adjustment_invoice = Invoice(
            invoice_number=f"ADJ-{generate_invoice_number().split('-', 1)[1]}",
            subscription_id=subscription.id,
            customer_id=subscription.customer_id,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=7),
            subtotal=proration["amount_due"],
            tax_amount=0.0,
            total_amount=proration["amount_due"],
            status="unpaid" if proration["amount_due"] > 0 else "paid",
        )
        db.add(adjustment_invoice)

    # 7. Update subscription with new plan
    old_plan_id = subscription.plan_id
    subscription.plan_id = new_plan.id
    db.commit()
    db.refresh(subscription)
    if adjustment_invoice:
        db.refresh(adjustment_invoice)

    # 8. Store audit log
    db.add(AuditLog(
        entity_type="subscription",
        entity_id=subscription.id,
        action="change_plan",
        old_value=json.dumps({"plan_id": old_plan_id, "plan_name": current_plan.name}),
        new_value=json.dumps({
            "plan_id": new_plan.id,
            "plan_name": new_plan.name,
            "proration": proration,
            "adjustment_invoice_id": adjustment_invoice.id if adjustment_invoice else None,
        }),
        performed_by=user.username
    ))
    db.commit()

    return {
        "message": "Plan changed successfully",
        "subscription_id": subscription.id,
        "old_plan_id": old_plan_id,
        "new_plan_id": subscription.plan_id,
        "proration": proration,
        "adjustment_invoice_id": adjustment_invoice.id if adjustment_invoice else None,
    }


@router.get("/subscriptions/{subscription_id}/plan-history")
def api_plan_change_history(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    """Powers the 'Previous Plan Changes' list on the Subscription Details page."""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == "subscription")
        .filter(AuditLog.entity_id == subscription_id)
        .filter(AuditLog.action == "change_plan")
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    history = []
    for log in logs:
        try:
            old_data = json.loads(log.old_value) if log.old_value else {}
            new_data = json.loads(log.new_value) if log.new_value else {}
        except (json.JSONDecodeError, TypeError):
            old_data, new_data = {}, {}

        history.append({
            "id": log.id,
            "from_plan": old_data.get("plan_name"),
            "to_plan": new_data.get("plan_name"),
            "date": log.created_at.isoformat() if log.created_at else None,
            "proration": new_data.get("proration"),
            "adjustment_invoice_id": new_data.get("adjustment_invoice_id"),
        })

    return history