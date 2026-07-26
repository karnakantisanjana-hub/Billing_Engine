from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subscription, Plan,Invoice, Payment
from app.auth import require_user
from datetime import date


router = APIRouter(prefix="/api", tags=["Reports"])

REVENUE_GENERATING_STATUSES = ["active", "past_due"]


@router.get("/revenue")
def get_revenue_summary(db: Session = Depends(get_db), user=Depends(require_user)):
    rows = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(REVENUE_GENERATING_STATUSES))
        .all()
    )

    by_plan = {}
    total_mrr = 0.0

    for sub, plan in rows:
        total_mrr += plan.price
        if plan.name not in by_plan:
            by_plan[plan.name] = {"plan_name": plan.name, "revenue": 0.0, "subscribers": 0}
        by_plan[plan.name]["revenue"] += plan.price
        by_plan[plan.name]["subscribers"] += 1

    return {
        "total_mrr": round(total_mrr, 2),
        "by_plan": list(by_plan.values())
    }


@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    active_subscriptions = (
        db.query(Subscription)
        .filter(Subscription.status.in_(["active", "past_due"]))
        .count()
    )

    mrr = 0.0
    active_subs = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(["active", "past_due"]))
        .all()
    )
    for sub, plan in active_subs:
        mrr += plan.price

    invoices_due = (
        db.query(Invoice)
        .filter(Invoice.status.in_(["unpaid", "draft"]))
        .count()
    )

    today = date.today()
    month_start = today.replace(day=1)

    payments_this_month = (
        db.query(Payment)
        .filter(Payment.status == "success")
        .filter(Payment.payment_date >= month_start)
        .all()
    )
    payments_total = sum(p.amount or 0 for p in payments_this_month)

    return {
        "active_subscriptions": active_subscriptions,
        "mrr": round(mrr, 2),
        "invoices_due": invoices_due,
        "payments_this_month": round(payments_total, 2)
    }