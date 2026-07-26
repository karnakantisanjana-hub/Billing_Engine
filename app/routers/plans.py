from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Plan, AuditLog
from app.schemas import PlanCreate, PlanUpdate, PlanOut
from app.auth import require_user

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(plan_in: PlanCreate, db: Session = Depends(get_db), user=Depends(require_user)):
    plan = Plan(**plan_in.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)

    db.add(AuditLog(
        entity_type="plan",
        entity_id=plan.id,
        action="create",
        new_value=str(plan_in.model_dump()),
        performed_by=user.username
    ))
    db.commit()

    return plan


@router.get("", response_model=List[PlanOut])
def list_plans(include_archived: bool = False, db: Session = Depends(get_db)):
    query = db.query(Plan)

    if not include_archived:
        query = query.filter(Plan.is_archived == False)

    return query.all()


@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(plan_id: int, plan_in: PlanUpdate, db: Session = Depends(get_db), user=Depends(require_user)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    old_value = {
        "name": plan.name,
        "price": plan.price,
        "billing_interval": plan.billing_interval,
        "trial_days": plan.trial_days,
        "features": plan.features
    }

    update_data = plan_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)

    db.add(AuditLog(
        entity_type="plan",
        entity_id=plan.id,
        action="update",
        old_value=str(old_value),
        new_value=str(update_data),
        performed_by=user.username
    ))
    db.commit()

    return plan


@router.patch("/{plan_id}/archive", response_model=PlanOut)
def archive_plan(plan_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.is_archived:
        raise HTTPException(status_code=400, detail="Plan is already archived")

    plan.is_archived = True
    db.commit()
    db.refresh(plan)

    db.add(AuditLog(
        entity_type="plan",
        entity_id=plan.id,
        action="archive",
        old_value="is_archived=False",
        new_value="is_archived=True",
        performed_by=user.username
    ))
    db.commit()

    return plan
