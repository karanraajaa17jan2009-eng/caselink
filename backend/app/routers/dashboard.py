import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.database import get_db
from app.models import ComplaintCase, Institution, Bureau, Region, CaseAction, CaseLink, User
from app.schemas import DashboardSummary, BureauWorkload, AgeingBucket
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    region_id: Optional[int] = None,
    bureau_id: Optional[int] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase)
    if region_id:
        query = query.join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == region_id)
    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)
    if date_from:
        query = query.filter(ComplaintCase.received_date >= date_from)
    if date_to:
        query = query.filter(ComplaintCase.received_date <= date_to)

    cases = query.all()
    today = datetime.date.today()

    total = len(cases)
    pending = sum(1 for c in cases if c.status == "Pending")
    under_process = sum(1 for c in cases if c.status == "Under Process")
    disposed = sum(1 for c in cases if c.status == "Disposed")
    transferred = sum(1 for c in cases if c.status == "Transferred")
    escalated = sum(1 for c in cases if c.status == "Escalated")
    
    overdue = sum(1 for c in cases if c.status != "Disposed" and c.due_date < today)
    due_within_7 = sum(1 for c in cases if c.status != "Disposed" and 0 <= (c.due_date - today).days <= 7)

    disposal_rate = round((disposed / total * 100), 1) if total > 0 else 0.0

    disposed_cases = [c for c in cases if c.status == "Disposed" and c.disposal_date]
    if disposed_cases:
        avg_days = sum((c.disposal_date - c.received_date).days for c in disposed_cases) / len(disposed_cases)
        avg_disposal_days = round(avg_days, 1)
    else:
        avg_disposal_days = 0.0

    overlap_count = db.query(CaseLink).filter(CaseLink.status.in_(["SUGGESTED", "CONFIRMED"])).count()

    return {
        "total_received": total,
        "pending": pending,
        "under_process": under_process,
        "disposed": disposed,
        "transferred": transferred,
        "escalated": escalated,
        "overdue": overdue,
        "due_within_7_days": due_within_7,
        "overlap_open_count": overlap_count,
        "disposal_rate": disposal_rate,
        "avg_disposal_days": avg_disposal_days
    }

@router.get("/bureau-workload", response_model=List[BureauWorkload])
def get_bureau_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bureaus = db.query(Bureau).all()
    today = datetime.date.today()
    first_of_month = today.replace(day=1)
    results = []

    for b in bureaus:
        cases = db.query(ComplaintCase).filter(ComplaintCase.current_bureau_id == b.id).all()
        open_cases = [c for c in cases if c.status != "Disposed"]
        overdue_cases = [c for c in open_cases if c.due_date < today]
        disposed_this_month = [
            c for c in cases if c.status == "Disposed" and c.disposal_date and c.disposal_date >= first_of_month
        ]

        if open_cases:
            avg_age = sum((today - c.received_date).days for c in open_cases) / len(open_cases)
        else:
            avg_age = 0.0

        results.append({
            "bureau_id": b.id,
            "bureau_code": b.code,
            "bureau_name": b.name,
            "open_cases": len(open_cases),
            "overdue_cases": len(overdue_cases),
            "disposed_this_month": len(disposed_this_month),
            "avg_age_days": round(avg_age, 1)
        })

    return results

@router.get("/status-distribution")
def get_status_distribution(
    region_id: Optional[int] = None,
    bureau_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase.status, func.count(ComplaintCase.id))
    if region_id:
        query = query.join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == region_id)
    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)

    counts = query.group_by(ComplaintCase.status).all()
    return [{"status": status, "count": count} for status, count in counts]

@router.get("/category-distribution")
def get_category_distribution(
    region_id: Optional[int] = None,
    bureau_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase.category, func.count(ComplaintCase.id))
    if region_id:
        query = query.join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == region_id)
    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)

    counts = query.group_by(ComplaintCase.category).order_by(desc(func.count(ComplaintCase.id))).all()
    return [{"category": cat, "count": count} for cat, count in counts]

@router.get("/region-distribution")
def get_region_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    regions = db.query(Region).all()
    results = []
    for r in regions:
        count = db.query(ComplaintCase).join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == r.id).count()
        results.append({
            "region_id": r.id,
            "region_name": r.name,
            "count": count
        })
    return results

@router.get("/monthly-trend")
def get_monthly_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.date.today()
    months = []
    for m in range(11, -1, -1):
        dt = today - datetime.timedelta(days=m * 30)
        months.append(dt.strftime("%b %Y"))

    # Compute actual counts grouped by month
    results = []
    for m in range(11, -1, -1):
        start_d = today - datetime.timedelta(days=(m + 1) * 30)
        end_d = today - datetime.timedelta(days=m * 30)
        label = end_d.strftime("%b %y")

        rec = db.query(ComplaintCase).filter(
            ComplaintCase.received_date > start_d,
            ComplaintCase.received_date <= end_d
        ).count()

        disp = db.query(ComplaintCase).filter(
            ComplaintCase.status == "Disposed",
            ComplaintCase.disposal_date > start_d,
            ComplaintCase.disposal_date <= end_d
        ).count()

        results.append({
            "month": label,
            "received": rec,
            "disposed": disp
        })

    return results

@router.get("/ageing-buckets")
def get_ageing_buckets(
    bureau_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.date.today()
    query = db.query(ComplaintCase).filter(ComplaintCase.status != "Disposed")
    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)

    cases = query.all()
    buckets = {
        "0-7 days": 0,
        "8-15 days": 0,
        "16-30 days": 0,
        "31-60 days": 0,
        "60+ days": 0
    }
    for c in cases:
        age = (today - c.received_date).days
        if age <= 7:
            buckets["0-7 days"] += 1
        elif age <= 15:
            buckets["8-15 days"] += 1
        elif age <= 30:
            buckets["16-30 days"] += 1
        elif age <= 60:
            buckets["31-60 days"] += 1
        else:
            buckets["60+ days"] += 1

    return [{"bucket": k, "count": v} for k, v in buckets.items()]

@router.get("/top-institutions")
def get_top_institutions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = db.query(
        Institution.id,
        Institution.name,
        Institution.permanent_id,
        Institution.district,
        Institution.state,
        func.count(ComplaintCase.id).label("open_cases")
    ).join(ComplaintCase, Institution.id == ComplaintCase.institution_id)\
     .filter(ComplaintCase.status != "Disposed")\
     .group_by(Institution.id)\
     .order_by(desc("open_cases"))\
     .limit(limit).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "permanent_id": r.permanent_id,
            "district": r.district,
            "state": r.state,
            "open_cases": r.open_cases
        } for r in results
    ]

@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    actions = db.query(CaseAction).order_by(desc(CaseAction.created_at)).limit(limit).all()
    return [
        {
            "id": a.id,
            "case_id": a.case_id,
            "case_no": a.case.case_no if a.case else "N/A",
            "action_type": a.action_type,
            "from_bureau": a.from_bureau.code if a.from_bureau else None,
            "to_bureau": a.to_bureau.code if a.to_bureau else None,
            "performed_by": a.performed_by.name if a.performed_by else "System",
            "remarks": a.remarks,
            "created_at": a.created_at
        } for a in actions
    ]
