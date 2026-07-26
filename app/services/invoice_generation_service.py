import uuid
from datetime import date, timedelta

from app.database import SessionLocal
from app.models import BillingCycle, Subscription, Plan, Invoice, AuditLog
from app.services.billing_cycle_service import generate_billing_cycle

TAX_RATE = 0.18  


def generate_invoice_number() -> str:
    return f"INV-{uuid.uuid4().hex[:8].upper()}"


def _build_invoice(subscription, plan, invoice_date, due_date, billing_cycle_id=None) -> Invoice:
    subtotal = plan.price
    tax_amount = round(subtotal * TAX_RATE, 2)
    total_amount = round(subtotal + tax_amount, 2)

    return Invoice(
        invoice_number=generate_invoice_number(),
        subscription_id=subscription.id,
        customer_id=subscription.customer_id,
        billing_cycle_id=billing_cycle_id,
        invoice_date=invoice_date,
        due_date=due_date,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        status="unpaid"
    )


def generate_invoices_for_due_cycles() -> int:
    
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
            
            already_invoiced = db.query(Invoice).filter(
                Invoice.billing_cycle_id == cycle.id
            ).first()
            if already_invoiced:
                cycle.status = "completed"
                db.commit()
                continue

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

            invoice_date = cycle.renewal_date or today
            invoice = _build_invoice(
                subscription, plan,
                invoice_date=invoice_date,
                due_date=invoice_date + timedelta(days=7),
                billing_cycle_id=cycle.id,
            )
            db.add(invoice)

            cycle.status = "completed"

            db.commit()
            db.refresh(invoice)

            db.add(AuditLog(
                entity_type="invoice",
                entity_id=invoice.id,
                action="auto_generate",
                new_value=str({"subscription_id": subscription.id, "total_amount": invoice.total_amount}),
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


def generate_initial_invoice_if_active(db, subscription):
   
    if subscription.status != "active":
        return None

    existing_invoice = db.query(Invoice).filter(
        Invoice.subscription_id == subscription.id
    ).first()
    if existing_invoice:
        return None 

    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        return None

    cycle = generate_billing_cycle(db, subscription)

    invoice = _build_invoice(
        subscription, plan,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=7),
        billing_cycle_id=cycle.id,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    db.add(AuditLog(
        entity_type="invoice",
        entity_id=invoice.id,
        action="auto_generate_on_subscribe",
        new_value=str({"subscription_id": subscription.id, "total_amount": invoice.total_amount}),
        performed_by="system"
    ))
    db.commit()

    return invoice