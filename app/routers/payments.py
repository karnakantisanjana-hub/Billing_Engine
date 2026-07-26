import uuid
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Payment, Invoice, Subscription, AuditLog
from app.schemas import PaymentCreate, PaymentUpdate, PaymentOut
from app.auth import require_user

router = APIRouter(prefix="/payments", tags=["Payments"])


def generate_payment_reference():
    return f"PAY-{uuid.uuid4().hex[:10].upper()}"

class ProcessPaymentRequest(BaseModel):
    invoice_id: int
    amount: float
    force_status: str | None = None  # Optional: "success" or "failed"


@router.post("/process")
def process_payment(payload: ProcessPaymentRequest, db: Session = Depends(get_db), user=Depends(require_user)):
    """
    Mock payment gateway:
    Pass force_status="failed" to guarantee a failed payment test.
    If force_status is not provided, defaults to 80% success / 20% fail.
    """
    invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Force status if requested, otherwise run random logic
    if payload.force_status in ["success", "failed"]:
        succeeded = (payload.force_status == "success")
    else:
        succeeded = random.random() < 0.8  # Default random behavior

    payment = Payment(
        invoice_id=payload.invoice_id,
        payment_reference=generate_payment_reference(),
        amount=payload.amount,
        payment_method="mock_gateway",
        status="success" if succeeded else "failed",
        payment_date=datetime.utcnow(),
    )
    db.add(payment)

    if succeeded:
        invoice.status = "paid"
    else:
        invoice.status = "unpaid"
        subscription = db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
        if subscription and subscription.status == "active":
            subscription.status = "past_due"
            subscription.status_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(payment)

    db.add(AuditLog(
        entity_type="payment",
        entity_id=payment.id,
        action="payment_success" if succeeded else "payment_failed",
        new_value=str({"invoice_id": payload.invoice_id, "amount": payload.amount, "status": payment.status}),
        performed_by=user.username
    ))
    db.commit()

    return {
        "success": succeeded,
        "payment_id": payment.id,
        "payment_reference": payment.payment_reference,
        "status": payment.status,
        "invoice_status": invoice.status,
    }

@router.get("/enriched")
def list_payments_enriched(db: Session = Depends(get_db), user=Depends(require_user)):
    """Same data as GET /payments, with invoice_number and customer_name attached."""
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    results = []
    for p in payments:
        results.append({
            "id": p.id,
            "invoice_id": p.invoice_id,
            "invoice_number": p.invoice.invoice_number if p.invoice else None,
            "customer_name": p.invoice.customer.name if p.invoice and p.invoice.customer else None,
            "payment_reference": p.payment_reference,
            "amount": p.amount,
            "payment_method": p.payment_method,
            "status": p.status,
            "payment_date": p.payment_date,
        })
    return results


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(payment_in: PaymentCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    payment = Payment(**payment_in.model_dump(), payment_reference=generate_payment_reference())
    db.add(payment)
    db.commit()
    db.refresh(payment)

    db.add(AuditLog(entity_type="payment", entity_id=payment.id, action="create",
                     new_value=str(payment_in.model_dump()), performed_by=user.username))
    db.commit()
    return payment


@router.get("", response_model=List[PaymentOut])
def list_payments(db: Session = Depends(get_db), user=Depends(require_user)):
    return db.query(Payment).all()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(payment_id: int, payment_in: PaymentUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    update_data = payment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)

    db.add(AuditLog(entity_type="payment", entity_id=payment.id, action="update",
                     new_value=str(update_data), performed_by=user.username))
    db.commit()
    return payment


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()

    db.add(AuditLog(entity_type="payment", entity_id=payment_id, action="delete", performed_by=user.username))
    db.commit()
    return {"message": "Payment deleted"}



