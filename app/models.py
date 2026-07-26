from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="api_keys")

class User(Base):
    """Admin/Business users"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String)         
    company_name = Column(String)      
    created_at = Column(DateTime, server_default=func.now())
    role = Column(String, default="admin")
    profile_picture = Column(String, nullable=True) 
    api_keys = relationship("ApiKey", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    billing_interval = Column(String, nullable=False)
    trial_days = Column(Integer, default=0)
    features = Column(JSON)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    subscriptions = relationship("Subscription", back_populates="plan")


class Customer(Base):
    """End-users who subscribe to plans"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    company_name = Column(String)
    password = Column(String, nullable=True)  
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    subscriptions = relationship("Subscription", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    status = Column(String, nullable=False, default="trial")
    start_date = Column(Date)
    end_date = Column(Date)
    status_updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    
    customer = relationship("Customer", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    billing_cycles = relationship("BillingCycle", back_populates="subscription")
    invoices = relationship("Invoice", back_populates="subscription")
    refunds = relationship("Refund", back_populates="subscription", cascade="all, delete-orphan")

class BillingCycle(Base):
    __tablename__ = "billing_cycles"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    cycle_start_date = Column(Date)
    cycle_end_date = Column(Date)
    renewal_date = Column(Date)
    status = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    

    subscription = relationship("Subscription", back_populates="billing_cycles")
    invoices = relationship("Invoice", back_populates="billing_cycle")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    billing_cycle_id = Column(Integer, ForeignKey("billing_cycles.id"), nullable=True)
    invoice_date = Column(Date)
    due_date = Column(Date)
    subtotal = Column(Float)
    tax_amount = Column(Float)
    total_amount = Column(Float)
    status = Column(String, default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    
    subscription = relationship("Subscription", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    billing_cycle = relationship("BillingCycle", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")
    refunds = relationship("Refund", back_populates="invoice", cascade="all, delete-orphan") 

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    payment_reference = Column(String, unique=True, nullable=False, index=True)
    amount = Column(Float)
    payment_method = Column(String)
    status = Column(String, default="pending")
    payment_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    invoice = relationship("Invoice", back_populates="payments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    performed_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="audit_logs")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float)
    reason = Column(String, default="customer_request")
    status = Column(String, default="approved")
    refund_reference = Column(String, unique=True)
    processed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="refunds")
    subscription = relationship("Subscription", back_populates="refunds")
