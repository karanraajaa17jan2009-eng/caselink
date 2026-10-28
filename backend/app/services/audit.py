from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditLog

def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details or {},
        ip=ip
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
