# app/routers/customer_portal.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.database import get_db
from app.models import Customer, Subscription, Invoice, Plan
from app.routers.dependencies import get_current_customer
from typing import List, Optional

router = APIRouter(
    prefix="/api/v1/customer/portal",
    tags=["customer-portal"]
)


class SubscriptionResponse(BaseModel):
    id: int
    plan_id: int
    status: str
    start_date: date
    end_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    status: str
    subtotal: float
    tax_amount: float
    total_amount: float
    invoice_date: date
    due_date: date

    class Config:
        from_attributes = True


class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None


class CustomerPasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class ChangePlanRequest(BaseModel):
    new_plan_id: int


# ============ SUBSCRIPTION ENDPOINTS ============

@router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def get_my_subscriptions(
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all subscriptions for current customer"""
    subscriptions = db.query(Subscription).filter(
        Subscription.customer_id == customer.id
    ).all()

    return subscriptions


@router.get("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription_detail(
    subscription_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get specific subscription (only if owned by current customer)"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    return subscription


@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Cancel customer's subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if subscription.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already cancelled"
        )

    subscription.status = "cancelled"
    subscription.end_date = date.today()
    subscription.status_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(subscription)

    return {
        "message": "Subscription cancelled successfully",
        "subscription_id": subscription.id,
        "status": subscription.status,
        "end_date": subscription.end_date
    }


@router.post("/subscriptions/{subscription_id}/pause")
async def pause_subscription(
    subscription_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Pause customer's subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if subscription.status == "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already paused"
        )

    subscription.status = "paused"
    subscription.status_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(subscription)

    return {
        "message": "Subscription paused successfully",
        "subscription_id": subscription.id,
        "status": subscription.status
    }


@router.post("/subscriptions/{subscription_id}/resume")
async def resume_subscription(
    subscription_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Resume paused subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if subscription.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paused subscriptions can be resumed"
        )

    subscription.status = "active"
    subscription.status_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(subscription)

    return {
        "message": "Subscription resumed successfully",
        "subscription_id": subscription.id,
        "status": subscription.status
    }


@router.post("/subscriptions/{subscription_id}/change-plan")
async def change_my_plan(
    subscription_id: int,
    request: ChangePlanRequest,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Change the plan on a customer's own subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if subscription.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    new_plan = db.query(Plan).filter(Plan.id == request.new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")

    old_plan_id = subscription.plan_id
    subscription.plan_id = request.new_plan_id
    db.commit()
    db.refresh(subscription)

    return {
        "message": "Plan changed successfully",
        "subscription_id": subscription.id,
        "old_plan_id": old_plan_id,
        "new_plan_id": subscription.plan_id
    }


@router.get("/plans")
async def list_available_plans(db: Session = Depends(get_db)):
    """List all active plans a customer can switch to"""
    plans = db.query(Plan).filter(Plan.is_archived == False).all()
    return [{"id": p.id, "name": p.name, "price": p.price} for p in plans]


# ============ INVOICE ENDPOINTS ============

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_my_invoices(
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """Get all invoices for current customer"""
    invoices = db.query(Invoice).filter(
        Invoice.customer_id == customer.id
    ).order_by(Invoice.invoice_date.desc()).offset(skip).limit(limit).all()

    return invoices


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice_detail(
    invoice_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get specific invoice (only if owned by customer)"""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.customer_id == customer.id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    return invoice


# ============ PROFILE ENDPOINTS ============

@router.get("/profile")
async def get_profile(
    customer: Customer = Depends(get_current_customer)
):
    """Get current customer profile"""
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "company_name": customer.company_name,
        "is_active": customer.is_active,
        "is_verified": customer.is_verified,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at
    }


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Update customer profile"""
    if request.name:
        customer.name = request.name
    if request.company_name:
        customer.company_name = request.company_name

    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)

    return {
        "message": "Profile updated successfully",
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "company_name": customer.company_name
        }
    }


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Change customer password"""
    from app.utils.jwt_utils import PasswordUtils

    # Verify old password
    if not customer.password or not PasswordUtils.verify_password(request.old_password, customer.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Hash and update new password
    customer.password = PasswordUtils.hash_password(request.new_password)
    customer.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Password changed successfully"}