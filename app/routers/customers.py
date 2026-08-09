from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import CustomerCreate, CustomerUpdate, CustomerOut
from app.auth import require_user
from app.models import Customer,Subscription, Invoice, Payment, AuditLog, Plan
from datetime import datetime

router = APIRouter(prefix="/customers", tags=["Customers"])
@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: CustomerCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    existing = db.query(Customer).filter(Customer.email == customer_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")

    customer = Customer(**customer_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)

    db.add(AuditLog(
        entity_type="customer",
        entity_id=customer.id,
        action="create",
        new_value=str(customer_in.model_dump()),
        performed_by=user.username
    ))
    db.commit()

    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("", response_model=List[CustomerOut])
def list_customers(db: Session = Depends(get_db), user=Depends(require_user)):
    return db.query(Customer).all()


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, customer_in: CustomerUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    old_value = {"name": customer.name, "email": customer.email, "company_name": customer.company_name}

    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    db.add(AuditLog(
        entity_type="customer",
        entity_id=customer.id,
        action="update",
        old_value=str(old_value),
        new_value=str(update_data),
        performed_by=user.username
    ))
    db.commit()

    return customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    existing_subs = db.query(Subscription).filter(Subscription.customer_id == customer_id).first()
    if existing_subs:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with existing subscriptions. Consider archiving instead."
        )

    db.delete(customer)
    db.commit()

    db.add(AuditLog(entity_type="customer", entity_id=customer_id, action="delete", performed_by=user.username))
    db.commit()

    return {"message": "Customer deleted"}


@router.get("/{customer_id}/billing-history")
def get_customer_billing_history(customer_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    timeline = []

    subscriptions = db.query(Subscription).filter(Subscription.customer_id == customer_id).all()
    for sub in subscriptions:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if sub.start_date:
            timeline.append({
                "date": sub.start_date.isoformat(),
                "event": f"Subscription Created ({plan.name if plan else 'Unknown Plan'})",
                "type": "subscription"
            })
        if sub.end_date and sub.status == "cancelled":
            timeline.append({
                "date": sub.end_date.isoformat(),
                "event": f"Subscription Cancelled ({plan.name if plan else 'Unknown Plan'})",
                "type": "subscription"
            })

    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).all()
    for inv in invoices:
        if inv.invoice_date:
            timeline.append({
                "date": inv.invoice_date.isoformat(),
                "event": f"Invoice Generated ({inv.invoice_number}) — ${inv.total_amount}",
                "type": "invoice"
            })

    payments = (
        db.query(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.customer_id == customer_id)
        .all()
    )
    for pay in payments:
        if pay.payment_date:
            label = "Payment Received" if pay.status == "success" else "Payment Failed" if pay.status == "failed" else "Payment Refunded" if pay.status == "refunded" else "Payment Attempted"
            timeline.append({
                "date": pay.payment_date.isoformat() if hasattr(pay.payment_date, 'isoformat') else str(pay.payment_date),
                "event": f"{label} — ${pay.amount}",
                "type": "payment"
            })

    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "subscription",
        AuditLog.action == "change_plan"
    ).all()
    sub_ids = [s.id for s in subscriptions]
    for log in logs:
        if log.entity_id in sub_ids and log.created_at:
            timeline.append({
                "date": log.created_at.isoformat(),
                "event": "Plan Changed",
                "type": "audit"
            })

    timeline.sort(key=lambda x: x["date"])

    return {
        "customer_id": customer_id,
        "customer_name": customer.name,
        "timeline": timeline
    }


@router.get("/{customer_id}/activity-summary")
def get_customer_activity_summary(customer_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    total_invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).count()

    total_paid = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.customer_id == customer_id, Invoice.status == "paid"
    ).scalar() or 0.0

    failed_payments = (
        db.query(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.customer_id == customer_id, Payment.status == "failed")
        .count()
    )

    refunds = (
        db.query(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.customer_id == customer_id, Payment.status == "refunded")
        .count()
    )

    return {
        "total_invoices": total_invoices,
        "total_paid": round(float(total_paid), 2),
        "failed_payments": failed_payments,
        "refunds": refunds
    }