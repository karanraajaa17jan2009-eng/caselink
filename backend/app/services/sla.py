import datetime
from typing import Dict
from sqlalchemy.orm import Session
from app.models import ComplaintCase, SlaRule, Alert

DEFAULT_SLA_DAYS = {
    "Critical": 7,
    "High": 15,
    "Medium": 30,
    "Low": 45,
}

def calculate_due_date(db: Session, category: str, priority: str, received_date: datetime.date) -> datetime.date:
    rule = db.query(SlaRule).filter(
        SlaRule.category == category,
        SlaRule.priority == priority
    ).first()
    
    if rule:
        days = rule.days_allowed
    else:
        days = DEFAULT_SLA_DAYS.get(priority, 30)

    return received_date + datetime.timedelta(days=days)

def generate_alerts(db: Session) -> Dict[str, int]:
    today = datetime.date.today()
    open_cases = db.query(ComplaintCase).filter(
        ComplaintCase.status != "Disposed"
    ).all()

    counts = {
        "sla_breach": 0,
        "sla_due_soon": 0,
        "pending_reminder": 0
    }

    for case in open_cases:
        # 1. SLA Breach (overdue)
        if case.due_date < today:
            days_overdue = (today - case.due_date).days
            existing = db.query(Alert).filter(
                Alert.case_id == case.id,
                Alert.type == "SLA_BREACH",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    type="SLA_BREACH",
                    severity="CRITICAL",
                    case_id=case.id,
                    institution_id=case.institution_id,
                    message=f"Case {case.case_no} has breached its SLA by {days_overdue} days (Due date: {case.due_date}).",
                    target_bureau_id=case.current_bureau_id
                )
                db.add(alert)
                counts["sla_breach"] += 1

        # 2. SLA Due Soon (due within 5 days)
        elif 0 <= (case.due_date - today).days <= 5:
            days_left = (case.due_date - today).days
            existing = db.query(Alert).filter(
                Alert.case_id == case.id,
                Alert.type == "SLA_DUE_SOON",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    type="SLA_DUE_SOON",
                    severity="HIGH",
                    case_id=case.id,
                    institution_id=case.institution_id,
                    message=f"Case {case.case_no} is due in {days_left} day(s) on {case.due_date}.",
                    target_bureau_id=case.current_bureau_id
                )
                db.add(alert)
                counts["sla_due_soon"] += 1

        # 3. Pending Reminder (no action for > 15 days)
        last_date = case.last_action_date.date() if case.last_action_date else case.received_date
        idle_days = (today - last_date).days
        if idle_days > 15:
            existing = db.query(Alert).filter(
                Alert.case_id == case.id,
                Alert.type == "PENDING_REMINDER",
                Alert.is_read == False
            ).first()
            if not existing:
                alert = Alert(
                    type="PENDING_REMINDER",
                    severity="MEDIUM",
                    case_id=case.id,
                    institution_id=case.institution_id,
                    message=f"No action taken on Case {case.case_no} for {idle_days} days.",
                    target_bureau_id=case.current_bureau_id
                )
                db.add(alert)
                counts["pending_reminder"] += 1

    db.commit()
    return counts
