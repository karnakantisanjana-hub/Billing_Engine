import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Refund, Invoice, Subscription, AuditLog
from app.auth import require_user

router = APIRouter(prefix="/api/refunds", tags=["Refunds"])


@router.post("")
def issue_refund(invoice_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != "paid":
        raise HTTPException(
            status_code=400,
            detail=f"Refunds can only be issued for paid invoices. Invoice #{invoice_id} has status: '{invoice.status}'."
        )

    existing_refund = db.query(Refund).filter(Refund.invoice_id == invoice_id).first()
    if existing_refund:
        raise HTTPException(status_code=400, detail="A refund has already been issued for this invoice.")

    subscription = db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
    
    proration_factor = 0.5  
    try:
        if subscription:
            start = getattr(subscription, "current_period_start", None)
            end = getattr(subscription, "billing_period_end", None)
            if start and end:
                total_days = (end - start).days if (end - start).days > 0 else 30
                days_elapsed = (datetime.utcnow() - start).days
                days_elapsed = max(days_elapsed, 0)
                days_remaining = max(total_days - days_elapsed, 0)
                proration_factor = min(days_remaining / total_days, 0.66)
    except Exception:
        proration_factor = 0.5


    base_amount = getattr(invoice, "subtotal", None) or getattr(invoice, "total_amount", invoice.total_amount)
    refunded_amount = round(base_amount * proration_factor, 2)

    refund = Refund(
        invoice_id=invoice_id,
        subscription_id=invoice.subscription_id,
        amount=refunded_amount,
        reason="customer_request",
        status="approved",
        refund_reference=f"REF-{uuid.uuid4().hex[:10].upper()}",
        processed_at=datetime.utcnow(),
    )
    db.add(refund)
    invoice.status = "refunded"
    
    db.flush()  
    
    db.add(AuditLog(
        entity_type="refund",
        entity_id=invoice_id,  
        action="refund_issued",
        new_value=str({
            "invoice_id": invoice_id,
            "refunded_amount": refunded_amount,
            "original_amount": invoice.total_amount,
        }),
        performed_by=user.username if hasattr(user, "username") else "admin"
    ))

    db.commit()
    db.refresh(refund)


    return {
        "success": True,
        "refund_id": refund.id,
        "refund_reference": refund.refund_reference,
        "refunded_amount": refunded_amount,
        "original_amount": invoice.total_amount,
        "proration_factor": round(proration_factor, 2),
        "message": f"Refund of ₹{refunded_amount} issued successfully."
    }


@router.get("")
def list_refunds(db: Session = Depends(get_db), user=Depends(require_user)):
    """List all refunds with invoice details."""
    refunds = db.query(Refund).order_by(Refund.created_at.desc()).all()
    results = []
    for r in refunds:
        results.append({
            "id": r.id,
            "invoice_id": r.invoice_id,
            "invoice_number": r.invoice.invoice_number if r.invoice else None,
            "customer_name": r.invoice.customer.name if r.invoice and r.invoice.customer else None,
            "amount": r.amount,
            "reason": r.reason,
            "status": r.status,
            "refund_reference": r.refund_reference,
            "processed_at": r.processed_at,
        })
    return results
