import uuid
from datetime import date, timedelta
from pydantic import BaseModel
from app.auth import require_user
from app.database import get_db
from app.models import AuditLog, Customer, Invoice, Plan, Subscription
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/v1/billing-cycles", tags=["Billing Cycles"])


def generate_invoice_number():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"


class InvoiceGenerateRequest(BaseModel):
    subscription_id: int
    due_date_days: int = 7


@router.post("/run-invoice-generation")
def run_invoice_generation(
    body: InvoiceGenerateRequest,
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    """Generate a single invoice for a specific subscription with 18% GST."""
    sub = db.query(Subscription).filter(Subscription.id == body.subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    customer = db.query(Customer).filter(Customer.id == sub.customer_id).first()
    plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
    if not customer or not plan:
        raise HTTPException(status_code=400, detail="Customer or plan not found for this subscription")

    try:
        subtotal = float(plan.price)
    except (TypeError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid plan price")

    gst = round(subtotal * 0.18, 2)
    total = round(subtotal + gst, 2)

    invoice = Invoice(
        invoice_number=generate_invoice_number(),
        subscription_id=sub.id,
        customer_id=customer.id,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=body.due_date_days),
        subtotal=subtotal,
        tax_amount=gst,
        total_amount=total,
        status="unpaid",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    try:
        db.add(AuditLog(
            entity_type="invoice",
            entity_id=invoice.id,
            action="generate_invoice",
            performed_by=user.username,
            details=f"Generated invoice {invoice.invoice_number} for {customer.name} - {plan.name} (₹{total} incl. 18% GST)"
        ))
        db.commit()
    except Exception:
        db.commit()

    return {
        "message": f"Invoice {invoice.invoice_number} generated for {customer.name} ({plan.name})",
        "invoice": {
            "invoice_number": invoice.invoice_number,
            "customer": customer.name,
            "plan": plan.name,
            "subtotal": subtotal,
            "gst": gst,
            "total": total,
            "due_date": str(invoice.due_date),
        }
    }


@router.get("/subscriptions")
def list_active_subscriptions(
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    """Return all active/trial subscriptions with customer & plan details."""
    results = (
        db.query(
            Subscription.id,
            Subscription.status,
            Customer.name.label("customer_name"),
            Customer.email.label("customer_email"),
            Plan.name.label("plan_name"),
            Plan.price.label("plan_price"),
        )
        .outerjoin(Customer, Subscription.customer_id == Customer.id)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .filter(func.lower(Subscription.status).in_(["active", "trial"]))
        .all()
    )

    return [
        {
            "id": r.id,
            "status": r.status,
            "customer_name": r.customer_name or "Unknown",
            "customer_email": r.customer_email or "",
            "plan_name": r.plan_name or "Unknown",
            "plan_price": r.plan_price,
        }
        for r in results
    ]
