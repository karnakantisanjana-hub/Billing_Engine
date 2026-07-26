import calendar
from datetime import date
from sqlalchemy.orm import Session
from app.models import Subscription, Plan, BillingCycle


def add_months(d: date, months: int) -> date:
    
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def calculate_next_renewal_date(current_date: date, billing_interval: str) -> date:
    interval = billing_interval.lower()

    if interval in ("month", "monthly"):
        return add_months(current_date, 1)
    elif interval in ("year", "yearly", "annual", "annually"):
        return add_months(current_date, 12)
    else:
        return add_months(current_date, 1)


def generate_billing_cycle(db: Session, subscription: Subscription) -> BillingCycle:
    
    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        raise ValueError("Plan not found for this subscription")

    last_cycle = (
        db.query(BillingCycle)
        .filter(BillingCycle.subscription_id == subscription.id)
        .order_by(BillingCycle.id.desc())
        .first()
    )

    cycle_start_date = last_cycle.cycle_end_date if last_cycle else subscription.start_date
    if cycle_start_date is None:
        cycle_start_date = date.today()

    cycle_end_date = calculate_next_renewal_date(cycle_start_date, plan.billing_interval)
    renewal_date = cycle_end_date

    cycle = BillingCycle(
        subscription_id=subscription.id,
        cycle_start_date=cycle_start_date,
        cycle_end_date=cycle_end_date,
        renewal_date=renewal_date,
        status="pending"
    )

    db.add(cycle)
    db.commit()
    db.refresh(cycle)

    return cycle