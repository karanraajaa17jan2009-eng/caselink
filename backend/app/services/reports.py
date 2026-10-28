import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import ComplaintCase, Institution, Bureau, Region, CaseLink

def get_bureau_wise_report(db: Session) -> List[Dict[str, Any]]:
    bureaus = db.query(Bureau).all()
    today = datetime.date.today()
    results = []

    for b in bureaus:
        cases = db.query(ComplaintCase).filter(ComplaintCase.current_bureau_id == b.id).all()
        total = len(cases)
        open_c = [c for c in cases if c.status != "Disposed"]
        disposed_c = [c for c in cases if c.status == "Disposed"]
        overdue_c = [c for c in open_c if c.due_date < today]

        avg_disp_days = 0.0
        if disposed_c:
            total_days = sum((c.disposal_date - c.received_date).days for c in disposed_c if c.disposal_date)
            avg_disp_days = round(total_days / len(disposed_c), 1)

        disp_rate = round((len(disposed_c) / total * 100), 1) if total > 0 else 0.0

        results.append({
            "bureau_id": b.id,
            "bureau_code": b.code,
            "bureau_name": b.name,
            "total_cases": total,
            "open_cases": len(open_c),
            "disposed_cases": len(disposed_c),
            "overdue_cases": len(overdue_c),
            "disposal_rate": disp_rate,
            "avg_disposal_days": avg_disp_days
        })

    return results

def get_region_wise_report(db: Session) -> List[Dict[str, Any]]:
    regions = db.query(Region).all()
    today = datetime.date.today()
    results = []

    for r in regions:
        # Cases connected to institutions in this region
        cases = db.query(ComplaintCase).join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == r.id).all()
        
        total = len(cases)
        open_c = [c for c in cases if c.status != "Disposed"]
        disposed_c = [c for c in cases if c.status == "Disposed"]
        overdue_c = [c for c in open_c if c.due_date < today]

        results.append({
            "region_id": r.id,
            "region_name": r.name,
            "office_city": r.office_city,
            "total_cases": total,
            "open_cases": len(open_c),
            "disposed_cases": len(disposed_c),
            "overdue_cases": len(overdue_c)
        })

    return results

def get_ageing_report(db: Session) -> List[Dict[str, Any]]:
    today = datetime.date.today()
    open_cases = db.query(ComplaintCase).filter(ComplaintCase.status != "Disposed").all()
    
    buckets = {
        "0-7 days": 0,
        "8-15 days": 0,
        "16-30 days": 0,
        "31-60 days": 0,
        "60+ days": 0
    }

    for c in open_cases:
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

def get_performance_report(db: Session) -> List[Dict[str, Any]]:
    return get_bureau_wise_report(db)
