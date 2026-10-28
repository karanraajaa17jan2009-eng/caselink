from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, Base, engine
from app.models import User, SlaRule, AuditLog, Region, Bureau
from app.schemas import (
    UserResponse, UserCreate, UserUpdate, SlaRuleResponse, SlaRuleUpdate,
    AuditLogResponse, RegionResponse, BureauResponse
)
from app.auth import get_current_user, require_roles, get_password_hash
from app.services.audit import log_audit
from app.seed import seed_database

router = APIRouter(prefix="/api", tags=["Admin & Users"])

# --- Regions & Bureaus Lookups ---
@router.get("/regions", response_model=List[RegionResponse])
def get_regions(db: Session = Depends(get_db)):
    return db.query(Region).order_by(Region.name).all()

@router.get("/bureaus", response_model=List[BureauResponse])
def get_bureaus(db: Session = Depends(get_db)):
    return db.query(Bureau).order_by(Bureau.name).all()

# --- Users Management ---
@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    return db.query(User).order_by(User.name).all()

@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        bureau_id=user_in.bureau_id,
        region_id=user_in.region_id,
        designation=user_in.designation,
        is_active=user_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, current_user.id, "USER_CREATE", "USER", str(user.id), {"email": user.email, "role": user.role})
    return user

@router.patch("/users/{id}", response_model=UserResponse)
def update_user(
    id: int,
    user_up: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = user_up.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data.pop("password"))

    for k, v in data.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "USER_UPDATE", "USER", str(user.id), data)
    return user

# --- SLA Rules Management ---
@router.get("/sla-rules", response_model=List[SlaRuleResponse])
def get_sla_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(SlaRule).order_by(SlaRule.category, SlaRule.priority).all()

@router.put("/sla-rules/{id}", response_model=SlaRuleResponse)
def update_sla_rule(
    id: int,
    rule_up: SlaRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    rule = db.query(SlaRule).filter(SlaRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="SLA rule not found")

    old_days = rule.days_allowed
    rule.days_allowed = rule_up.days_allowed
    db.commit()
    db.refresh(rule)

    log_audit(db, current_user.id, "SLA_RULE_UPDATE", "SLA_RULE", str(rule.id), {
        "category": rule.category, "priority": rule.priority, "from": old_days, "to": rule_up.days_allowed
    })
    return rule

# --- Audit Log ---
@router.get("/audit-log")
def get_audit_log(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SENIOR_MGMT"]))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user.name if l.user else "System / Anonymous",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "ip": l.ip,
            "created_at": l.created_at
        } for l in logs
    ]

# --- Admin Reset Demo Data ---
@router.post("/admin/reset-demo")
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    # Drop and recreate all tables, then seed fresh
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
    log_audit(db, current_user.id, "RESET_DEMO_DATA", "SYSTEM", None, {})
    return {"status": "success", "message": "Demo data reset successfully"}
