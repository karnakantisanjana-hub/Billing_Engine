import uuid
from datetime import date, timedelta
from typing import List, Optional
from app.auth import require_user
from app.database import get_db
from app.models import AuditLog, Customer, Invoice, Plan, Subscription
from app.schemas import InvoiceCreate, InvoiceOut, InvoiceUpdate
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_invoice_number():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

@router.get("/enriched")
def get_enriched_invoices(
    exclude_no_tax: bool = Query(False, description="Set True to filter out invoices without tax"),
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    """Returns all enriched invoices without deduplication."""
    results = (
        db.query(
            Invoice.id,
            Invoice.invoice_number,
            Invoice.subscription_id,
            Invoice.customer_id,
            Invoice.invoice_date,
            Invoice.due_date,
            Invoice.subtotal,
            Invoice.tax_amount,
            Invoice.total_amount,
            Invoice.status,
            Customer.name.label("customer_name"),
            Plan.name.label("plan_name"),
        )
        .outerjoin(Customer, Invoice.customer_id == Customer.id)
        .outerjoin(Subscription, Invoice.subscription_id == Subscription.id)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .all()
    )

    enriched = []
    for row in results:
        tax = row.tax_amount or 0.0

        if exclude_no_tax and tax == 0:
            continue

        enriched.append({
            "id": row.id,
            "invoice_number": row.invoice_number,
            "subscription_id": row.subscription_id,
            "customer_id": row.customer_id,
            "invoice_date": str(row.invoice_date) if row.invoice_date else None,
            "due_date": str(row.due_date) if row.due_date else None,
            "subtotal": row.subtotal,
            "tax_amount": tax,
            "total_amount": row.total_amount,
            "status": row.status,
            "customer_name": row.customer_name or "Unknown",
            "plan_name": row.plan_name or "Unknown",
        })

    return enriched


@router.get("/invoices")
def list_invoices(db: Session = Depends(get_db)):
    # Just return existing invoices — no creation
    invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
    return invoices

@router.post("/generate/{subscription_id}", response_model=InvoiceOut)
def generate_invoice(
    subscription_id: int,
    include_tax: bool = Query(False, description="Set True if 18% tax should be included"),
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    subscription = (
        db.query(Subscription)
        .filter(Subscription.id == subscription_id)
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found"
        )

    if subscription.status.lower() not in ["active", "trial"]:
        raise HTTPException(
            status_code=400,
            detail="Invoice can only be generated for active or trial subscriptions."
        )

    customer = db.query(Customer).filter(Customer.id == subscription.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    existing_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id == subscription.id,
            Invoice.status == "unpaid"
        )
        .first()
    )

    if existing_invoice:
        raise HTTPException(
            status_code=400,
            detail=f"Invoice {existing_invoice.invoice_number} already exists for this subscription."
        )

    subtotal = float(plan.price)
    tax_amount = round(subtotal * 0.18, 2) if include_tax else 0.0
    total_amount = round(subtotal + tax_amount, 2)

    invoice = Invoice(
        invoice_number=generate_invoice_number(),
        subscription_id=subscription.id,
        customer_id=customer.id,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=7),
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        status="unpaid",
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    db.add(
        AuditLog(
            entity_type="invoice",
            entity_id=invoice.id,
            action="generate",
            new_value=f"Generated invoice {invoice.invoice_number} (Tax: {tax_amount})",
            performed_by=user.username,
        )
    )
    db.commit()

    return invoice

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

    db.add(AuditLog(
        entity_type="invoice",
        entity_id=invoice.id,
        action="update",
        new_value=str(update_data),
        performed_by=user.username
    ))
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

