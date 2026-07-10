from pydantic import BaseModel, ConfigDict
from typing import Optional

from datetime import date, datetime

class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    status: str = "trial"


class StatusUpdate(BaseModel):
    status: str


# ---------- PLAN ----------

class PlanCreate(BaseModel):
    name: str
    price: float
    billing_interval: str
    trial_days: int = 0
    features: Optional[dict] = None


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    billing_interval: Optional[str] = None
    trial_days: Optional[int] = None
    features: Optional[dict] = None


class PlanOut(BaseModel):
    id: int
    name: str
    price: float
    billing_interval: str
    trial_days: int
    features: Optional[dict] = None
    is_archived: bool

    model_config = ConfigDict(from_attributes=True)


# ---------- CUSTOMER ----------

class CustomerCreate(BaseModel):
    name: str
    email: str
    company_name: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- SUBSCRIPTION (full CRUD) ----------

class SubscriptionOut(BaseModel):
    id: int
    customer_id: int
    plan_id: int
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)


class SubscriptionFullUpdate(BaseModel):
    plan_id: Optional[int] = None
    end_date: Optional[date] = None


# ---------- BILLING CYCLE ----------

class BillingCycleCreate(BaseModel):
    subscription_id: int
    cycle_start_date: date
    cycle_end_date: date
    renewal_date: date
    status: str = "pending"


class BillingCycleUpdate(BaseModel):
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None
    renewal_date: Optional[date] = None
    status: Optional[str] = None


class BillingCycleOut(BaseModel):
    id: int
    subscription_id: int
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None
    renewal_date: Optional[date] = None
    status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- INVOICE ----------

class InvoiceCreate(BaseModel):
    subscription_id: int
    customer_id: int
    invoice_date: date
    due_date: date
    subtotal: float
    tax_amount: float = 0
    total_amount: float
    status: str = "draft"


class InvoiceUpdate(BaseModel):
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- PAYMENT ----------

class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str
    status: str = "pending"
    payment_date: Optional[datetime] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[datetime] = None


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    payment_reference: str
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- AUDIT LOG (read-only) ----------

class AuditLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    performed_by: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SubscribeRequest(BaseModel):
    customer_id: int
    plan_id: int

class ChangePlanRequest(BaseModel):
    new_plan_id: int

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class ApiKeyOut(BaseModel):
    id: int
    key: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class CustomerSignup(BaseModel):
    name: str
    email: str
    company_name: Optional[str] = None
    password: str


class CustomerLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"