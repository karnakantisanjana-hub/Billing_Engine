from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import Customer, Subscription, Invoice, Plan
from app.routers.dependencies import get_current_customer
from typing import List, Optional
from app.services.invoice_generation_service import generate_initial_invoice_if_active

router = APIRouter(
    prefix="/api/v1/customer/portal",
    tags=["customer-portal"]
)


class PlanSummary(BaseModel):
    id: int
    name: str
    price: float
    billing_interval: str

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: int
    plan_id: int
    status: str
    start_date: date
    end_date: Optional[date]
    created_at: datetime
    plan: Optional[PlanSummary] = None

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
    plan_name: Optional[str] = None

    class Config:
        from_attributes = True


def _cycle_length_days(billing_interval: str) -> int:
    return 365 if (billing_interval or "").lower() == "annual" else 30


def _calculate_proration(subscription: Subscription, current_plan: Plan, new_plan: Plan) -> dict:
    """Estimate proration credit/charge for a mid-cycle plan change.

    Approximates the current billing cycle as starting on the subscription's
    start_date and repeating every cycle_length days, matching the Milestone 2
    proration example (credit for unused days on old plan, charge for the new
    plan over the remaining days in the cycle).
    """
    cycle_length = _cycle_length_days(current_plan.billing_interval)
    today = date.today()
    start = subscription.start_date or today

    days_since_start = (today - start).days
    if days_since_start < 0:
        days_since_start = 0
    days_elapsed_in_cycle = days_since_start % cycle_length
    remaining_days = max(cycle_length - days_elapsed_in_cycle, 0)

    unused_credit = round(current_plan.price * remaining_days / cycle_length, 2)
    new_plan_charge = round(new_plan.price * remaining_days / cycle_length, 2)
    amount_due = round(new_plan_charge - unused_credit, 2)

    return {
        "current_plan_id": current_plan.id,
        "current_plan_name": current_plan.name,
        "new_plan_id": new_plan.id,
        "new_plan_name": new_plan.name,
        "cycle_length_days": cycle_length,
        "remaining_days": remaining_days,
        "unused_credit": unused_credit,
        "new_plan_charge": new_plan_charge,
        "amount_due": amount_due,
    }


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

def _attach_plan(subscription: Subscription) -> Subscription:
    """Populate subscription.plan (a Plan ORM object) for SubscriptionResponse serialization"""
    _ = subscription.plan
    return subscription


@router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def get_my_subscriptions(
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all subscriptions for current customer"""
    subscriptions = db.query(Subscription).filter(
        Subscription.customer_id == customer.id
    ).all()

    return [_attach_plan(s) for s in subscriptions]


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

    return _attach_plan(subscription)


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
    generate_initial_invoice_if_active(db, subscription)
    db.refresh(subscription)

    return {
        "message": "Subscription resumed successfully",
        "subscription_id": subscription.id,
        "status": subscription.status
    }


@router.get("/subscriptions/{subscription_id}/change-plan/preview")
async def preview_plan_change(
    subscription_id: int,
    new_plan_id: int,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Preview the proration credit/charge for switching to a new plan, without applying it"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    current_plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")
    if not current_plan:
        raise HTTPException(status_code=404, detail="Current plan not found")

    return _calculate_proration(subscription, current_plan, new_plan)


@router.post("/subscriptions/{subscription_id}/change-plan")
async def change_my_plan(
    subscription_id: int,
    request: ChangePlanRequest,
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Change the plan on a customer's own subscription, applying mid-cycle proration"""
    from app.models import AuditLog

    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.customer_id == customer.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if subscription.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot change plan on a cancelled subscription")

    current_plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    new_plan = db.query(Plan).filter(Plan.id == request.new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if new_plan.is_archived:
        raise HTTPException(status_code=400, detail="Cannot switch to an archived plan")

    proration = _calculate_proration(subscription, current_plan, new_plan) if current_plan else None

    old_plan_id = subscription.plan_id
    subscription.plan_id = request.new_plan_id
    subscription.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(subscription)

    db.add(AuditLog(
        entity_type="subscription",
        entity_id=subscription.id,
        action="plan_changed",
        old_value=str({"plan_id": old_plan_id}),
        new_value=str({"plan_id": subscription.plan_id, "proration": proration}),
        performed_by=customer.email
    ))
    db.commit()

    return {
        "message": "Plan changed successfully",
        "subscription_id": subscription.id,
        "old_plan_id": old_plan_id,
        "new_plan_id": subscription.plan_id,
        "proration": proration
    }


@router.get("/plans")
async def list_available_plans(db: Session = Depends(get_db)):
    """List all active plans a customer can switch to"""
    plans = db.query(Plan).filter(Plan.is_archived == False).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "billing_interval": p.billing_interval,
            "trial_days": p.trial_days,
            "features": p.features,
        }
        for p in plans
    ]


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

    results = []
    for inv in invoices:
        inv.plan_name = inv.subscription.plan.name if inv.subscription and inv.subscription.plan else None
        results.append(inv)
    return results


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


# ============ PAYMENT ENDPOINTS ============
 
class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    payment_reference: str
    amount: float
    payment_method: Optional[str] = None
    status: str
    payment_date: Optional[datetime] = None
    invoice_number: Optional[str] = None
 
    class Config:
        from_attributes = True
 
 
@router.get("/payments", response_model=List[PaymentResponse])
async def get_my_payments(
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all payments made against the current customer's invoices"""
    from app.models import Payment
 
    payments = (
        db.query(Payment)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .filter(Invoice.customer_id == customer.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
 
    results = []
    for p in payments:
        p.invoice_number = p.invoice.invoice_number if p.invoice else None
        results.append(p)
    return results
 
 
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

@router.get("/dashboard-summary")
async def get_dashboard_summary(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    customers_count = db.query(Customer).count()

    active_subscriptions = db.query(Subscription).filter(
        Subscription.status.in_(["active", "past_due"])
    ).count()

    monthly_revenue = 0.0
    active_subs = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(["active", "past_due"]))
        .all()
    )
    for sub, plan in active_subs:
        monthly_revenue += plan.price

    pending_invoices = db.query(Invoice).filter(Invoice.status == "unpaid").count()

    return {
        "customers_count": customers_count,
        "active_subscriptions": active_subscriptions,
        "monthly_revenue": round(monthly_revenue, 2),
        "pending_invoices": pending_invoices
    }


@router.get("/revenue-chart")
async def get_revenue_chart(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    rows = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.status.in_(["active", "past_due"]))
        .all()
    )
    by_plan = {}
    for sub, plan in rows:
        by_plan.setdefault(plan.name, 0)
        by_plan[plan.name] += plan.price

    return {"labels": list(by_plan.keys()), "values": list(by_plan.values())}


@router.get("/subscription-status-chart")
async def get_subscription_status_chart(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    statuses = ["trial", "active", "past_due", "paused", "cancelled"]
    counts = {}
    for s in statuses:
        counts[s] = db.query(Subscription).filter(Subscription.status == s).count()
    return {"labels": list(counts.keys()), "values": list(counts.values())}

@router.get("/customers/search")
async def search_customers(
    q: str = None,
    status: str = None,
    plan_id: int = None,
    db: Session = Depends(get_db),
    customer: Customer = Depends(get_current_customer)
):
    query = db.query(Customer)

    if q:
        query = query.filter(
            (Customer.name.ilike(f"%{q}%")) | (Customer.email.ilike(f"%{q}%"))
        )

    customers = query.all()
    result = []

    for c in customers:
        sub_query = db.query(Subscription, Plan).join(Plan, Subscription.plan_id == Plan.id).filter(
            Subscription.customer_id == c.id
        ).order_by(Subscription.id.desc())

        if plan_id:
            sub_query = sub_query.filter(Subscription.plan_id == plan_id)

        latest = sub_query.first()

        current_status = latest[0].status if latest else "no subscription"
        plan_name = latest[1].name if latest else "—"
        sub_id = latest[0].id if latest else None

        if status and current_status != status:
            continue
        if plan_id and not latest:
            continue

        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "company_name": c.company_name,
            "plan_name": plan_name,
            "status": current_status,
            "subscription_id": sub_id
        })

    return result


@router.get("/customers/{customer_id}/details")
async def get_customer_details(
    customer_id: int,
    db: Session = Depends(get_db),
    customer: Customer = Depends(get_current_customer)
):
    target = db.query(Customer).filter(Customer.id == customer_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Customer not found")

    subs = (
        db.query(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.customer_id == customer_id)
        .order_by(Subscription.id.desc())
        .all()
    )

    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).order_by(Invoice.id.desc()).limit(5).all()

    return {
        "id": target.id,
        "name": target.name,
        "email": target.email,
        "company_name": target.company_name,
        "created_at": target.created_at,
        "subscriptions": [
            {"id": s.id, "plan_name": p.name, "status": s.status, "start_date": s.start_date}
            for s, p in subs
        ],
        "recent_invoices": [
            {"invoice_number": i.invoice_number, "total_amount": i.total_amount, "status": i.status}
            for i in invoices
        ]
    }