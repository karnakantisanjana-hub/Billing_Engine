import uuid
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models import Invoice, Payment, Subscription, Plan, AuditLog


def calculate_refund_amount(subscription: Subscription, plan: Plan, invoice: Invoice) -> dict:
    
    today = date.today()

    if not subscription.start_date:
        return {"total_days": 30, "used_days": 0, "remaining_days": 30, "refund_amount": invoice.total_amount}

    
    cycle_length = 30
    used_days = (today - subscription.start_date).days
    used_days = max(0, min(used_days, cycle_length))
    remaining_days = cycle_length - used_days

    daily_rate = invoice.total_amount / cycle_length
    refund_amount = round(daily_rate * remaining_days, 2)

    return {
        "total_days": cycle_length,
        "used_days": used_days,
        "remaining_days": remaining_days,
        "refund_amount": refund_amount
    }


def issue_refund(db: Session, invoice_id: int, performed_by: str) -> dict:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    if invoice.status != "paid":
        raise ValueError("Only paid invoices can be refunded")

    subscription = db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first() if subscription else None

    breakdown = calculate_refund_amount(subscription, plan, invoice)

    payment = db.query(Payment).filter(
        Payment.invoice_id == invoice_id, Payment.status == "success"
    ).order_by(Payment.id.desc()).first()

    refund_reference = f"RF{uuid.uuid4().hex[:8].upper()}"

    if payment:
        payment.status = "refunded"

    invoice.status = "void"

    db.add(AuditLog(
        entity_type="payment",
        entity_id=payment.id if payment else invoice_id,
        action="refund_issued",
        new_value=str({
            "refund_reference": refund_reference,
            "refund_amount": breakdown["refund_amount"],
            "invoice_id": invoice_id
        }),
        performed_by=performed_by
    ))

    db.commit()

    return {
        "refund_reference": refund_reference,
        "invoice_id": invoice_id,
        "refund_amount": breakdown["refund_amount"],
        "used_days": breakdown["used_days"],
        "remaining_days": breakdown["remaining_days"],
        "status": "completed"
    }