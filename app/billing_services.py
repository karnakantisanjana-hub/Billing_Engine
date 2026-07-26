import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Subscription, Plan, BillingCycle, Invoice, Payment, AuditLog

TAX_RATE = 0.18  


VALID_TRANSITIONS = {
    "trial": {"active", "cancelled"},
    "active": {"past_due", "cancelled"},
    "past_due": {"active", "cancelled"},
    "cancelled": set()  # Terminal state
}

def transition_subscription_status(
    db: Session, 
    subscription: Subscription, 
    new_status: str, 
    user_id: int = None, 
    performed_by: str = "system"
):
    old_status = subscription.status
    if old_status == new_status:
        return subscription

    if new_status not in VALID_TRANSITIONS.get(old_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription status transition from '{old_status}' to '{new_status}'"
        )

    subscription.status = new_status
    subscription.updated_at = datetime.utcnow()
    
  
    log_action(
        db=db,
        entity_type="subscription",
        entity_id=subscription.id,
        action="status_change",
        old_val=old_status,
        new_val=new_status,
        user_id=user_id,
        performed_by=performed_by
    )
    db.commit()
    return subscription


def log_action(
    db: Session, 
    entity_type: str, 
    entity_id: int, 
    action: str, 
    old_val: str = None, 
    new_val: str = None, 
    user_id: int = None, 
    performed_by: str = "system"
):
    log = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=str(old_val) if old_val is not None else None,
        new_value=str(new_val) if new_val is not None else None,
        performed_by=performed_by
    )
    db.add(log)
    db.flush() 


def calculate_proration(db: Session, subscription_id: int, new_plan_id: int):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    current_plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
    
    if not new_plan:
        raise HTTPException(status_code=404, detail="Target plan not found")
        
    active_cycle = db.query(BillingCycle).filter(
        BillingCycle.subscription_id == subscription_id,
        BillingCycle.status == "pending"
    ).first()
    
    if active_cycle:
        cycle_start = active_cycle.cycle_start_date
        cycle_end = active_cycle.cycle_end_date
    else:
        cycle_start = subscription.start_date or date.today()
        cycle_end = cycle_start + timedelta(days=30)
        
    total_days = (cycle_end - cycle_start).days or 30
    today = date.today()
    days_used = (today - cycle_start).days
    days_used = max(0, min(days_used, total_days))
    days_remaining = total_days - days_used

    unused_credit = round((current_plan.price / total_days) * days_remaining, 2)
    new_plan_charge = round((new_plan.price / total_days) * days_remaining, 2)
    amount_due = round(new_plan_charge - unused_credit, 2)

    return {
        "days_remaining": days_remaining,
        "unused_credit": unused_credit,
        "new_plan_charge": new_plan_charge,
        "amount_due": max(0.0, amount_due)
    }


def create_invoice_for_cycle(
    db: Session, 
    subscription: Subscription, 
    cycle: BillingCycle, 
    override_subtotal: float = None,
    user_id: int = None,
    performed_by: str = "system"
) -> Invoice:
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    subtotal = override_subtotal if override_subtotal is not None else subscription.plan.price
    tax = round(subtotal * TAX_RATE, 2)
    total = subtotal + tax

    invoice = Invoice(
        invoice_number=invoice_number,
        subscription_id=subscription.id,
        customer_id=subscription.customer_id,
        billing_cycle_id=cycle.id if cycle else None,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=7),
        subtotal=subtotal,
        tax_amount=tax,
        total_amount=total,
        status="unpaid"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    log_action(
        db=db,
        entity_type="invoice",
        entity_id=invoice.id,
        action="create",
        new_val=invoice_number,
        user_id=user_id,
        performed_by=performed_by
    )
    db.commit()
    return invoice