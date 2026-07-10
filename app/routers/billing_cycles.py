from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Subscription
from app.models import BillingCycle, AuditLog
from app.schemas import BillingCycleCreate, BillingCycleUpdate, BillingCycleOut
from app.auth import require_user
from app.services.billing_cycle_service import generate_billing_cycle
from app.services.invoice_generation_service import generate_invoices_for_due_cycles
router = APIRouter(prefix="/billing-cycles", tags=["Billing Cycles"])


@router.post("", response_model=BillingCycleOut, status_code=201)
def create_billing_cycle(cycle_in: BillingCycleCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    cycle = BillingCycle(**cycle_in.model_dump())
    db.add(cycle)
    db.commit()
    db.refresh(cycle)

    db.add(AuditLog(entity_type="billing_cycle", entity_id=cycle.id, action="create",
                     new_value=str(cycle_in.model_dump()), performed_by=user.username))
    db.commit()
    return cycle


@router.get("", response_model=List[BillingCycleOut])
def list_billing_cycles(db: Session = Depends(get_db), user=Depends(require_user)):
    return db.query(BillingCycle).all()


@router.get("/{cycle_id}", response_model=BillingCycleOut)
def get_billing_cycle(cycle_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    cycle = db.query(BillingCycle).filter(BillingCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Billing cycle not found")
    return cycle


@router.put("/{cycle_id}", response_model=BillingCycleOut)
def update_billing_cycle(cycle_id: int, cycle_in: BillingCycleUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    cycle = db.query(BillingCycle).filter(BillingCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Billing cycle not found")

    update_data = cycle_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cycle, field, value)

    db.commit()
    db.refresh(cycle)

    db.add(AuditLog(entity_type="billing_cycle", entity_id=cycle.id, action="update",
                     new_value=str(update_data), performed_by=user.username))
    db.commit()
    return cycle


@router.delete("/{cycle_id}")
def delete_billing_cycle(cycle_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    cycle = db.query(BillingCycle).filter(BillingCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Billing cycle not found")

    db.delete(cycle)
    db.commit()

    db.add(AuditLog(entity_type="billing_cycle", entity_id=cycle_id, action="delete", performed_by=user.username))
    db.commit()
    return {"message": "Billing cycle deleted"}

@router.post("/generate/{subscription_id}", response_model=BillingCycleOut, status_code=201)
def generate_cycle_for_subscription(subscription_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    cycle = generate_billing_cycle(db, subscription)

    db.add(AuditLog(
        entity_type="billing_cycle",
        entity_id=cycle.id,
        action="generate",
        new_value=str({
            "subscription_id": subscription_id,
            "cycle_start_date": str(cycle.cycle_start_date),
            "cycle_end_date": str(cycle.cycle_end_date)
        }),
        performed_by=user.username
    ))
    db.commit()

    return cycle

@router.post("/run-invoice-generation")
def run_invoice_generation_now(user=Depends(require_user)):
    count = generate_invoices_for_due_cycles()
    return {"message": f"Processed {count} billing cycle(s)"}