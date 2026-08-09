from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Optional

from app.database import get_db
from app.models import Invoice, Payment, Subscription, Customer, Plan
from app.auth import require_user

router = APIRouter(prefix="/api/invoice-management", tags=["Invoice Management"])


# ============================================================================
# 1. INVOICE STATUS BOARD — GET /api/invoice-management/invoices
# ============================================================================
@router.get("/invoices")
def get_invoices(
    db: Session = Depends(get_db),
    user=Depends(require_user),
    status: Optional[str] = Query(None, description="Filter by status: draft, unpaid, paid, failed, refunded"),
    customer: Optional[str] = Query(None, description="Filter by customer name or email"),
    invoice_number: Optional[str] = Query(None, description="Filter by invoice number"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    Fetch invoices with optional filters for status, customer, invoice number, and date range.
    Supports pagination.
    """
    query = db.query(Invoice, Customer, Subscription, Plan).join(
        Customer, Invoice.customer_id == Customer.id, isouter=True
    ).join(
        Subscription, Invoice.subscription_id == Subscription.id, isouter=True
    ).join(
        Plan, Subscription.plan_id == Plan.id, isouter=True
    )

    if status:
        query = query.filter(Invoice.status.ilike(f"%{status}%"))
    if customer:
        query = query.filter(
            Customer.name.ilike(f"%{customer}%") | Customer.email.ilike(f"%{customer}%")
        )
    if invoice_number:
        query = query.filter(Invoice.invoice_number.ilike(f"%{invoice_number}%"))
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Invoice.issued_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(Invoice.issued_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    total = query.count()
    rows = query.order_by(Invoice.issued_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

    invoices = []
    for inv, customer_obj, sub, plan in rows:
        invoices.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": customer_obj.name if customer_obj else "N/A",
            "customer_email": customer_obj.email if customer_obj else "N/A",
            "plan_name": plan.name if plan else "N/A",
            "amount": inv.amount,
            "status": inv.status,
            "issued_date": inv.issued_date.isoformat() if inv.issued_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
        })

    return {
        "invoices": invoices,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


# ============================================================================
# Invoice Status Counts (for the status board summary)
# ============================================================================
@router.get("/invoices/status-counts")
def get_invoice_status_counts(db: Session = Depends(get_db), user=Depends(require_user)):
    """Return count of invoices by status for the status board."""
    statuses = ["draft", "unpaid", "paid", "failed", "refunded"]
    counts = {}
    for status in statuses:
        counts[status] = db.query(Invoice).filter(Invoice.status == status).count()
    return counts


# ============================================================================
# 2. PAYMENT STATUS TRACKING — GET /api/invoice-management/payments
# ============================================================================
@router.get("/payments")
def get_payments(
    db: Session = Depends(get_db),
    user=Depends(require_user),
    status: Optional[str] = Query(None, description="Filter: success, failed, pending"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Show payment history with invoice number, amount, payment status,
    transaction reference, and payment date.
    Uses Payment.invoice_id → Invoice → Subscription → Customer chain.
    """
    query = db.query(
        Payment,
        Invoice,
        Subscription,
        Customer,
        Plan,
    ).join(
        Invoice, Payment.invoice_id == Invoice.id, isouter=True
    ).join(
        Subscription, Invoice.subscription_id == Subscription.id, isouter=True
    ).join(
        Customer, Subscription.customer_id == Customer.id, isouter=True
    ).join(
        Plan, Subscription.plan_id == Plan.id, isouter=True
    )

    if status:
        query = query.filter(Payment.status == status)

    total = query.count()
    rows = query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    payments = []
    for pay, inv, sub, cust, plan in rows:
        payments.append({
            "id": pay.id,
            "invoice_number": inv.invoice_number if inv else "N/A",
            "customer_name": cust.name if cust else "N/A",
            "customer_email": cust.email if cust else "N/A",
            "amount": pay.amount,
            "status": pay.status,
            "payment_method": pay.payment_method or "N/A",
            "transaction_reference": pay.payment_reference or "N/A",
            "payment_date": pay.payment_date.isoformat() if pay.payment_date else None,
            "created_at": pay.created_at.isoformat() if pay.created_at else None,
        })

    return {
        "payments": payments,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


# ============================================================================
# 3. FAILED PAYMENT QUEUE — GET /api/invoice-management/payments/failed
# ============================================================================
@router.get("/payments/failed")
def get_failed_payments(db: Session = Depends(get_db), user=Depends(require_user)):
    """
    Find failed payments with retry attempt count and next retry date.
    Shows customers who need payment retry.
    """
    rows = db.query(
        Payment,
        Invoice,
        Subscription,
        Customer,
        Plan,
    ).join(
        Invoice, Payment.invoice_id == Invoice.id, isouter=True
    ).join(
        Subscription, Invoice.subscription_id == Subscription.id, isouter=True
    ).join(
        Customer, Subscription.customer_id == Customer.id, isouter=True
    ).join(
        Plan, Subscription.plan_id == Plan.id, isouter=True
    ).filter(
        Payment.status == "failed"
    ).order_by(Payment.created_at.desc()).all()

    failed_payments = []
    for pay, inv, sub, cust, plan in rows:
        # Calculate retry attempts: count of failed payments for this invoice
        retry_count = db.query(func.count(Payment.id)).filter(
            and_(
                Payment.invoice_id == pay.invoice_id,
                Payment.status == "failed"
            )
        ).scalar()

        # Next retry date: 3 days after the last failed attempt
        next_retry = None
        if pay.created_at:
            next_retry = (pay.created_at + timedelta(days=3)).isoformat()

        failed_payments.append({
            "id": pay.id,
            "invoice_number": inv.invoice_number if inv else "N/A",
            "customer_name": cust.name if cust else "N/A",
            "customer_email": cust.email if cust else "N/A",
            "plan_name": plan.name if plan else "N/A",
            "amount": pay.amount,
            "status": pay.status,
            "payment_method": pay.payment_method or "N/A",
            "transaction_reference": pay.payment_reference or "N/A",
            "retry_attempt": retry_count,
            "next_retry_date": next_retry,
            "failed_at": pay.created_at.isoformat() if pay.created_at else None,
        })

    return {
        "failed_payments": failed_payments,
        "total": len(failed_payments),
    }


# ============================================================================
# 4. REFUND HISTORY — GET /api/invoice-management/refunds
# ============================================================================
@router.get("/refunds")
def get_refunds(
    db: Session = Depends(get_db),
    user=Depends(require_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = db.query(
        Invoice,
        Customer,
        Plan,
        Subscription,
    ).join(
        Customer, Invoice.customer_id == Customer.id, isouter=True
    ).join(
        Subscription, Invoice.subscription_id == Subscription.id, isouter=True
    ).join(
        Plan, Subscription.plan_id == Plan.id, isouter=True
    ).filter(
        Invoice.status == "refunded"
    )

    total = query.count()
    rows = query.order_by(Invoice.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    refunds = []
    for inv, cust, plan, sub in rows:
        refunds.append({
            "id": inv.id,
            "refund_id": f"RF{inv.id:04d}",
            "invoice_number": inv.invoice_number,
            "customer_name": cust.name if cust else "N/A",
            "customer_email": cust.email if cust else "N/A",
            "plan_name": plan.name if plan else "N/A",
            "amount": inv.total_amount,
            "refund_date": inv.created_at.isoformat() if inv.created_at else None,
            "reason": "N/A",
        })

    return {
        "refunds": refunds,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }


# ============================================================================
# 5. MARK INVOICE AS PAID — POST /api/invoice-management/invoices/{id}/mark-paid
# ============================================================================
@router.post("/invoices/{invoice_id}/mark-paid")
def mark_invoice_paid(invoice_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    """Mark an unpaid/failed invoice as paid."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status in ("paid", "refunded"):
        raise HTTPException(status_code=400, detail=f"Invoice is already {invoice.status}")

    invoice.status = "paid"
    
    db.commit()
    db.refresh(invoice)

    return {"message": "Invoice marked as paid", "invoice_number": invoice.invoice_number}


# ============================================================================
# 6. RETRY FAILED PAYMENT — POST /api/invoice-management/payments/{id}/retry
# ============================================================================
@router.post("/payments/{payment_id}/retry")
def retry_failed_payment(payment_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    """Retry a failed payment."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed payments can be retried")

    # Create a new payment attempt
    new_payment = Payment(
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        status="pending",
        payment_method=payment.payment_method,
        payment_reference=f"RETRY-{payment.payment_reference or payment.id}",
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return {
        "message": "Payment retry created",
        "new_payment_id": new_payment.id,
        "status": new_payment.status,
    }


# ============================================================================
# 7. PROCESS REFUND — POST /api/invoice-management/invoices/{id}/refund
# ============================================================================
@router.post("/invoices/{invoice_id}/refund")
def process_refund(invoice_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    """Process a refund for a paid invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != "paid":
        raise HTTPException(status_code=400, detail="Only paid invoices can be refunded")

    invoice.status = "refunded"
    db.commit()
    db.refresh(invoice)

    return {
        "message": "Refund processed",
        "invoice_number": invoice.invoice_number,
        "refund_id": f"RF{invoice.id:04d}",
    }
