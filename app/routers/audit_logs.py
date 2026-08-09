from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date as date_type

from app.database import get_db
from app.models import AuditLog, Subscription, Invoice
from app.schemas import AuditLogOut
from app.auth import require_user

# The prefix "/api/v1" is already handled in main.py
router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    customer_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    performed_by: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    """
    List audit logs with comprehensive filtering.
    """
    query = db.query(AuditLog)

    # Basic Filters
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if performed_by:
        query = query.filter(AuditLog.performed_by == performed_by)
    
    # Date Filters
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    # Customer Filter (M3 Task 3 requirement)
    if customer_id:
        # Get all subscription IDs for this customer
        sub_ids = [s.id for s in db.query(Subscription.id).filter(Subscription.customer_id == customer_id).all()]
        # Get all invoice IDs for this customer
        inv_ids = [i.id for i in db.query(Invoice.id).filter(Invoice.customer_id == customer_id).all()]
        
        # Filter logs that belong to the customer directly, or their subscriptions/invoices
        query = query.filter(
            or_(
                (AuditLog.entity_type == "customer") & (AuditLog.entity_id == customer_id),
                (AuditLog.entity_type == "subscription") & (AuditLog.entity_id.in_(sub_ids)),
                (AuditLog.entity_type == "invoice") & (AuditLog.entity_id.in_(inv_ids))
            )
        )

    return query.order_by(AuditLog.created_at.desc()).all()

@router.get("/{log_id}", response_model=AuditLogOut)
def get_audit_log(log_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log
