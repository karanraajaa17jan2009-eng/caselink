from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Alert, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(
    type: Optional[str] = None,
    unread: Optional[bool] = None,
    bureau_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)

    if type:
        query = query.filter(Alert.type == type)

    if unread is not None:
        query = query.filter(Alert.is_read == (not unread))

    if bureau_id:
        query = query.filter(Alert.target_bureau_id == bureau_id)
    elif current_user.bureau_id and current_user.role != "ADMIN" and current_user.role != "SENIOR_MGMT":
        # Default to user's bureau if restricted
        query = query.filter(Alert.target_bureau_id == current_user.bureau_id)

    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

    return [
        {
            "id": a.id,
            "type": a.type,
            "severity": a.severity,
            "case_id": a.case_id,
            "case_no": a.case.case_no if a.case else None,
            "institution_id": a.institution_id,
            "institution_name": a.institution.name if a.institution else None,
            "link_id": a.link_id,
            "message": a.message,
            "target_bureau_code": a.target_bureau.code if a.target_bureau else None,
            "is_read": a.is_read,
            "created_at": a.created_at
        } for a in alerts
    ]

@router.get("/count")
def get_unread_alerts_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).filter(Alert.is_read == False)
    if current_user.bureau_id and current_user.role not in ["ADMIN", "SENIOR_MGMT"]:
        query = query.filter(Alert.target_bureau_id == current_user.bureau_id)

    count = query.count()
    return {"unread_count": count}

@router.post("/{id}/read")
def mark_alert_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    return {"status": "success", "alert_id": id, "is_read": True}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).filter(Alert.is_read == False)
    if current_user.bureau_id and current_user.role not in ["ADMIN", "SENIOR_MGMT"]:
        query = query.filter(Alert.target_bureau_id == current_user.bureau_id)

    updated_count = query.update({Alert.is_read: True})
    db.commit()
    return {"status": "success", "marked_read_count": updated_count}
