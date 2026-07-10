from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogOut
from app.auth import require_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action: Optional[str] = None,
    performed_by: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_user)
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if performed_by:
        query = query.filter(AuditLog.performed_by == performed_by)
    return query.order_by(AuditLog.id.desc()).all()


@router.get("/{log_id}", response_model=AuditLogOut)
def get_audit_log(log_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log