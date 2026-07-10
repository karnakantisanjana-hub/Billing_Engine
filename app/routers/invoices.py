import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Invoice, AuditLog
from app.schemas import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.auth import require_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_invoice_number():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    invoice = Invoice(**invoice_in.model_dump(), invoice_number=generate_invoice_number())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    db.add(AuditLog(entity_type="invoice", entity_id=invoice.id, action="create",
                     new_value=str(invoice_in.model_dump()), performed_by=user.username))
    db.commit()
    return invoice


@router.get("", response_model=List[InvoiceOut])
def list_invoices(db: Session = Depends(get_db), user=Depends(require_user)):
    return db.query(Invoice).all()


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: int, invoice_in: InvoiceUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = invoice_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)

    db.add(AuditLog(entity_type="invoice", entity_id=invoice.id, action="update",
                     new_value=str(update_data), performed_by=user.username))
    db.commit()
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()

    db.add(AuditLog(entity_type="invoice", entity_id=invoice_id, action="delete", performed_by=user.username))
    db.commit()
    return {"message": "Invoice deleted"}