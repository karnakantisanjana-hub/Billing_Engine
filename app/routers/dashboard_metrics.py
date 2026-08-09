from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Customer, Subscription, Plan
from app.auth import require_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# Subscriptions in these statuses count as currently paying / revenue-generating
REVENUE_STATUSES = ["active", "past_due"]


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total_customers = db.query(Customer).count()
    active_subscriptions = db.query(Subscription).filter(Subscription.status == "active").count()
    cancelled_subscriptions = db.query(Subscription).filter(Subscription.status == "cancelled").count()

    # MRR: sum of plan price for every currently-paying subscription
    mrr_rows = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(REVENUE_STATUSES))
        .all()
    )
    mrr = round(sum(plan.price for _, plan in mrr_rows), 2)

    total_subs = db.query(Subscription).count()

    churn_rate = round((cancelled_subscriptions / total_subs) * 100, 2) if total_subs else 0.0

    # NOTE: the schema doesn't record whether a subscription was ever in
    # 'trial' historically — only its current status. Milestone 1 Task 6
    # assigns a trial period to every new subscription, so we treat every
    # subscription as trial-eligible and define "converted" as currently
    # active or past_due (i.e. progressed to a paying state at some point).
    # This is an approximation, not a true historical funnel.
    converted = db.query(Subscription).filter(Subscription.status.in_(REVENUE_STATUSES)).count()
    trial_conversion_rate = round((converted / total_subs) * 100, 2) if total_subs else 0.0

    return {
        "total_customers": total_customers,
        "active_subscriptions": active_subscriptions,
        "cancelled_subscriptions": cancelled_subscriptions,
        "mrr": mrr,
        "churn_rate": churn_rate,
        "trial_conversion_rate": trial_conversion_rate,
    }


@router.get("/revenue-by-plan")
def revenue_by_plan(db: Session = Depends(get_db)):
    rows = (
        db.query(Plan.name, Plan.price, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(REVENUE_STATUSES))
        .group_by(Plan.name, Plan.price)
        .all()
    )
    return [{"plan": name, "revenue": round(price * count, 2), "subscriber_count": count, "plan_price": price} for name, price, count in rows]



@router.get("/subscription-metrics")
def subscription_metrics(db: Session = Depends(get_db)):
    statuses = ["trial", "active", "past_due", "cancelled"]
    counts = {s: 0 for s in statuses}

    rows = db.query(Subscription.status, func.count(Subscription.id)).group_by(Subscription.status).all()
    for status_value, count in rows:
        if status_value in counts:
            counts[status_value] = count

    return counts