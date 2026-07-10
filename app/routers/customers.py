from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import CustomerCreate, CustomerUpdate, CustomerOut
from app.auth import require_user
from app.models import Customer, Subscription, AuditLog
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