from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subscription, Customer, Plan, Invoice
from app.auth import require_user

router = APIRouter(
    prefix="/billing-cycles",
    tags=["Billing Cycles"]
)


def get_cycle_length(interval: str):
    interval = (interval or "").lower()

    if interval == "annual":
        return 365

    return 30


@router.get("")
def list_billing_cycles(
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    subscriptions = (
        db.query(Subscription)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Plan, Subscription.plan_id == Plan.id)
        .all()
    )

    result = []

    today = date.today()

    for sub in subscriptions:

        customer = db.query(Customer).filter(
            Customer.id == sub.customer_id
        ).first()

        plan = db.query(Plan).filter(
            Plan.id == sub.plan_id
        ).first()

        cycle_days = get_cycle_length(plan.billing_interval)

        start = sub.start_date
        end = start + timedelta(days=cycle_days)

        # Billing Cycle Status
        if sub.status == "cancelled":
            status = "cancelled"

        elif sub.status == "past_due":
            status = "failed"

        elif today < end:
            status = "pending"

        else:
            status = "completed"

        result.append(
            {
                "id": sub.id,
                "customer_name": customer.name,
                "plan_name": plan.name,
                "billing_period": f"{start} to {end}",
                "next_billing_date": end,
                "status": status,
            }
        )

    return result


@router.post("/run-invoice-generation")
def run_billing_engine(
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    today = date.today()

    generated = 0

    subscriptions = (
        db.query(Subscription)
        .join(Plan, Subscription.plan_id == Plan.id)
        .all()
    )

    for sub in subscriptions:

        if sub.status not in ["active", "past_due"]:
            continue

        plan = db.query(Plan).filter(
            Plan.id == sub.plan_id
        ).first()

        cycle_days = get_cycle_length(plan.billing_interval)

        next_date = sub.start_date + timedelta(days=cycle_days)

        if next_date <= today:

            invoice = Invoice(
                invoice_number=f"INV-{today.strftime('%Y%m%d')}-{sub.id}",
                subscription_id=sub.id,
                customer_id=sub.customer_id,
                invoice_date=today,
                due_date=today + timedelta(days=7),
                subtotal=plan.price,
                tax_amount=0,
                total_amount=plan.price,
                status="unpaid",
            )

            db.add(invoice)

            # Start next billing cycle
            sub.start_date = today

            generated += 1

    db.commit()

    return {
        "message": f"{generated} invoice(s) generated successfully."
    }