from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models import Subscription, Customer, Plan
from app.schemas import SubscriptionCreate, StatusUpdate
from app.auth import require_user
from app.services.subscription_service import transition_subscription_status, InvalidTransitionError, VALID_TRANSITIONS

router = APIRouter(prefix="/api", tags=["Dashboard"])


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
        transition_subscription_status(db, subscription, payload.status)
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Status updated", "status": subscription.status}