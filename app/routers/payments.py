import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Payment, AuditLog
from app.schemas import PaymentCreate, PaymentUpdate, PaymentOut
from app.auth import require_user

router = APIRouter(prefix="/payments", tags=["Payments"])


def generate_payment_reference():
    return f"PAY-{uuid.uuid4().hex[:10].upper()}"


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