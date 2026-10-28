import io
import csv
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import ComplaintCase, Institution, Bureau, Region, CaseLink, User
from app.auth import get_current_user
from app.services.reports import (
    get_bureau_wise_report, get_region_wise_report, get_ageing_report, get_performance_report
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])

def generate_csv_response(filename: str, headers: List[str], rows: List[List[Any]]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
    )

@router.get("/bureau-wise")
def bureau_wise_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_bureau_wise_report(db)
    if format == "csv":
        headers = ["Bureau Code", "Bureau Name", "Total Cases", "Open Cases", "Disposed Cases", "Overdue Cases", "Disposal Rate %", "Avg Disposal Days"]
        rows = [
            [d["bureau_code"], d["bureau_name"], d["total_cases"], d["open_cases"], d["disposed_cases"], d["overdue_cases"], d["disposal_rate"], d["avg_disposal_days"]]
            for d in data
        ]
        return generate_csv_response("bureau_wise_report", headers, rows)
    return data

@router.get("/region-wise")
def region_wise_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_region_wise_report(db)
    if format == "csv":
        headers = ["Region Name", "Regional Office City", "Total Cases", "Open Cases", "Disposed Cases", "Overdue Cases"]
        rows = [
            [d["region_name"], d["office_city"], d["total_cases"], d["open_cases"], d["disposed_cases"], d["overdue_cases"]]
            for d in data
        ]
        return generate_csv_response("region_wise_report", headers, rows)
    return data

@router.get("/status-wise")
def status_wise_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    counts = db.query(ComplaintCase.status, func.count(ComplaintCase.id)).group_by(ComplaintCase.status).all()
    total = sum(c[1] for c in counts)
    data = [
        {"status": status, "count": count, "percentage": round((count / total * 100), 1) if total > 0 else 0}
        for status, count in counts
    ]
    if format == "csv":
        headers = ["Status", "Count", "Percentage"]
        rows = [[d["status"], d["count"], d["percentage"]] for d in data]
        return generate_csv_response("status_wise_report", headers, rows)
    return data

@router.get("/category-wise")
def category_wise_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    counts = db.query(ComplaintCase.category, func.count(ComplaintCase.id)).group_by(ComplaintCase.category).order_by(desc(func.count(ComplaintCase.id))).all()
    total = sum(c[1] for c in counts)
    data = [
        {"category": cat, "count": count, "percentage": round((count / total * 100), 1) if total > 0 else 0}
        for cat, count in counts
    ]
    if format == "csv":
        headers = ["Category", "Count", "Percentage"]
        rows = [[d["category"], d["count"], d["percentage"]] for d in data]
        return generate_csv_response("category_wise_report", headers, rows)
    return data

@router.get("/institution-history/{institution_id}")
def institution_history_report(
    institution_id: int,
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    cases = db.query(ComplaintCase).filter(ComplaintCase.institution_id == institution_id)\
        .order_by(desc(ComplaintCase.received_date)).all()
    
    data = [
        {
            "case_no": c.case_no,
            "category": c.category,
            "subject": c.subject,
            "bureau": c.current_bureau.code if c.current_bureau else "",
            "status": c.status,
            "priority": c.priority,
            "received_date": c.received_date.isoformat(),
            "due_date": c.due_date.isoformat(),
            "disposal_date": c.disposal_date.isoformat() if c.disposal_date else ""
        } for c in cases
    ]

    if format == "csv":
        headers = ["Case No", "Category", "Subject", "Bureau", "Status", "Priority", "Received Date", "Due Date", "Disposal Date"]
        rows = [
            [d["case_no"], d["category"], d["subject"], d["bureau"], d["status"], d["priority"], d["received_date"], d["due_date"], d["disposal_date"]]
            for d in data
        ]
        return generate_csv_response(f"institution_{inst.permanent_id}_history", headers, rows)
    return {"institution": inst.name, "permanent_id": inst.permanent_id, "cases": data}

@router.get("/ageing")
def ageing_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_ageing_report(db)
    if format == "csv":
        headers = ["Ageing Bucket", "Open Cases Count"]
        rows = [[d["bucket"], d["count"]] for d in data]
        return generate_csv_response("ageing_report", headers, rows)
    return data

@router.get("/disposal-rate")
def disposal_rate_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Monthly and quarterly disposal rate stats
    today = datetime.date.today()
    results = []
    for q_idx in range(4):
        start_d = today - datetime.timedelta(days=(q_idx + 1) * 90)
        end_d = today - datetime.timedelta(days=q_idx * 90)
        q_label = f"Q{4 - q_idx} ({start_d.strftime('%b')} - {end_d.strftime('%b %Y')})"

        rec = db.query(ComplaintCase).filter(ComplaintCase.received_date > start_d, ComplaintCase.received_date <= end_d).count()
        disp = db.query(ComplaintCase).filter(ComplaintCase.status == "Disposed", ComplaintCase.disposal_date > start_d, ComplaintCase.disposal_date <= end_d).count()
        rate = round((disp / rec * 100), 1) if rec > 0 else 0.0

        results.append({
            "period": q_label,
            "received": rec,
            "disposed": disp,
            "disposal_rate": rate
        })

    if format == "csv":
        headers = ["Quarter Period", "Cases Received", "Cases Disposed", "Disposal Rate %"]
        rows = [[d["period"], d["received"], d["disposed"], d["disposal_rate"]] for d in results]
        return generate_csv_response("disposal_rate_report", headers, rows)
    return results

@router.get("/overlaps")
def overlaps_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    links = db.query(CaseLink).all()
    data = [
        {
            "link_id": l.id,
            "institution_id": l.institution.permanent_id if l.institution else "N/A",
            "institution_name": l.institution.name if l.institution else "N/A",
            "case_a_no": l.case_a.case_no if l.case_a else "",
            "case_a_bureau": l.case_a.current_bureau.code if l.case_a and l.case_a.current_bureau else "",
            "case_b_no": l.case_b.case_no if l.case_b else "",
            "case_b_bureau": l.case_b.current_bureau.code if l.case_b and l.case_b.current_bureau else "",
            "score": l.score,
            "confidence_band": l.confidence_band,
            "status": l.status
        } for l in links
    ]

    if format == "csv":
        headers = ["Link ID", "AICTE ID", "Institution Name", "Case A", "Bureau A", "Case B", "Bureau B", "Score", "Band", "Status"]
        rows = [
            [d["link_id"], d["institution_id"], d["institution_name"], d["case_a_no"], d["case_a_bureau"], d["case_b_no"], d["case_b_bureau"], d["score"], d["confidence_band"], d["status"]]
            for d in data
        ]
        return generate_csv_response("overlaps_report", headers, rows)
    return data

@router.get("/performance")
def performance_report(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_performance_report(db)
    if format == "csv":
        headers = ["Bureau Code", "Bureau Name", "Total", "Open", "Disposed", "Overdue", "Disposal Rate %", "Avg Days"]
        rows = [
            [d["bureau_code"], d["bureau_name"], d["total_cases"], d["open_cases"], d["disposed_cases"], d["overdue_cases"], d["disposal_rate"], d["avg_disposal_days"]]
            for d in data
        ]
        return generate_csv_response("performance_report", headers, rows)
    return data
