import uuid
from datetime import date, timedelta

from app.database import SessionLocal
from app.models import BillingCycle, Subscription, Plan, Invoice, AuditLog
from app.services.billing_cycle_service import generate_billing_cycle


def generate_invoice_number() -> str:
    return f"INV-{uuid.uuid4().hex[:8].upper()}"


def generate_invoices_for_due_cycles() -> int:
    """
    Finds all pending billing cycles whose renewal_date has arrived,
    generates an invoice for each, marks the cycle completed, and
    creates the subscription's next billing cycle.
    Returns the number of cycles processed.
    """
    db = SessionLocal()
    processed = 0

    try:
        today = date.today()

        due_cycles = (
            db.query(BillingCycle)
            .filter(BillingCycle.status == "pending")
            .filter(BillingCycle.renewal_date <= today)
            .all()
        )

        for cycle in due_cycles:
            subscription = db.query(Subscription).filter(Subscription.id == cycle.subscription_id).first()

            if not subscription or subscription.status not in ("active", "past_due"):
                cycle.status = "completed"
                db.commit()
                continue

            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if not plan:
                cycle.status = "completed"
                db.commit()
                continue

            subtotal = plan.price
            tax_amount = 0.0
            total_amount = subtotal + tax_amount

            invoice = Invoice(
                invoice_number=generate_invoice_number(),
                subscription_id=subscription.id,
                customer_id=subscription.customer_id,
                invoice_date=today,
                due_date=today + timedelta(days=7),
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                status="unpaid"
            )
            db.add(invoice)

            cycle.status = "completed"

            db.commit()
            db.refresh(invoice)

            db.add(AuditLog(
                entity_type="invoice",
                entity_id=invoice.id,
                action="auto_generate",
                new_value=str({"subscription_id": subscription.id, "total_amount": total_amount}),
                performed_by="system"
            ))
            db.add(AuditLog(
                entity_type="billing_cycle",
                entity_id=cycle.id,
                action="auto_complete",
                performed_by="system"
            ))
            db.commit()

            generate_billing_cycle(db, subscription)

            processed += 1

        return processed

    finally:
        db.close()