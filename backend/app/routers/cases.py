import os
import io
import csv
import datetime
import shutil
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models import (
    ComplaintCase, Institution, CaseAction, CaseLink, Alert, Bureau, User
)
from app.schemas import (
    ComplaintCaseResponse, ComplaintCaseCreate, CaseActionResponse,
    ComplaintCaseTransfer, ComplaintCaseEscalate, ComplaintCaseDispose
)
from app.auth import get_current_user, require_roles, can_modify_case
from app.services.matching import resolve_institution, detect_for_case
from app.services.sla import calculate_due_date
from app.services.audit import log_audit
from app.config import settings

router = APIRouter(prefix="/api/cases", tags=["Cases"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=Dict[str, Any])
def list_cases(
    q: Optional[str] = None,
    institution_id: Optional[int] = None,
    permanent_id: Optional[str] = None,
    bureau_id: Optional[int] = None,
    region_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    overdue: Optional[bool] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    assigned_officer_id: Optional[int] = None,
    has_overlap: Optional[bool] = None,
    sort_by: str = "received_date",
    sort_dir: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase)

    if q:
        q_term = f"%{q.strip()}%"
        query = query.outerjoin(Institution, ComplaintCase.institution_id == Institution.id).filter(
            or_(
                ComplaintCase.case_no.ilike(q_term),
                ComplaintCase.subject.ilike(q_term),
                ComplaintCase.description.ilike(q_term),
                ComplaintCase.raw_institution_name.ilike(q_term),
                Institution.name.ilike(q_term),
                Institution.permanent_id.ilike(q_term)
            )
        )

    if institution_id:
        query = query.filter(ComplaintCase.institution_id == institution_id)

    if permanent_id:
        query = query.join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.permanent_id.ilike(f"%{permanent_id.strip()}%"))

    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)

    if region_id:
        query = query.join(Institution, ComplaintCase.institution_id == Institution.id)\
            .filter(Institution.region_id == region_id)

    if category:
        query = query.filter(ComplaintCase.category == category)

    if status:
        query = query.filter(ComplaintCase.status == status)

    if priority:
        query = query.filter(ComplaintCase.priority == priority)

    today = datetime.date.today()
    if overdue is True:
        query = query.filter(ComplaintCase.status != "Disposed", ComplaintCase.due_date < today)
    elif overdue is False:
        query = query.filter(or_(ComplaintCase.status == "Disposed", ComplaintCase.due_date >= today))

    if date_from:
        query = query.filter(ComplaintCase.received_date >= date_from)
    if date_to:
        query = query.filter(ComplaintCase.received_date <= date_to)

    if assigned_officer_id:
        query = query.filter(ComplaintCase.assigned_officer_id == assigned_officer_id)

    # Sorting
    sort_column = getattr(ComplaintCase, sort_by, ComplaintCase.received_date)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    cases = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for c in cases:
        age_days = (today - c.received_date).days
        days_to_due = (c.due_date - today).days
        is_overdue = c.status != "Disposed" and c.due_date < today

        overlap_count = db.query(CaseLink).filter(
            or_(CaseLink.case_a_id == c.id, CaseLink.case_b_id == c.id),
            CaseLink.status.in_(["SUGGESTED", "CONFIRMED"])
        ).count()

        if has_overlap is True and overlap_count == 0:
            continue
        if has_overlap is False and overlap_count > 0:
            continue

        item = {
            "id": c.id,
            "case_no": c.case_no,
            "institution_id": c.institution_id,
            "raw_institution_name": c.raw_institution_name,
            "raw_permanent_id": c.raw_permanent_id,
            "category": c.category,
            "subject": c.subject,
            "description": c.description,
            "source": c.source,
            "received_date": c.received_date,
            "status": c.status,
            "priority": c.priority,
            "current_bureau_id": c.current_bureau_id,
            "original_bureau_id": c.original_bureau_id,
            "assigned_officer_id": c.assigned_officer_id,
            "last_action": c.last_action,
            "last_action_date": c.last_action_date,
            "due_date": c.due_date,
            "disposal_date": c.disposal_date,
            "match_confidence": c.match_confidence,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "age_days": age_days,
            "days_to_due": days_to_due,
            "is_overdue": is_overdue,
            "overlap_count": overlap_count,
            "institution": {
                "id": c.institution.id,
                "name": c.institution.name,
                "permanent_id": c.institution.permanent_id,
                "district": c.institution.district,
                "state": c.institution.state
            } if c.institution else None,
            "current_bureau": {
                "id": c.current_bureau.id,
                "code": c.current_bureau.code,
                "name": c.current_bureau.name
            } if c.current_bureau else None,
            "assigned_officer": {
                "id": c.assigned_officer.id,
                "name": c.assigned_officer.name,
                "designation": c.assigned_officer.designation
            } if c.assigned_officer else None
        }
        items.append(item)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

@router.get("/export.csv")
def export_cases_csv(
    q: Optional[str] = None,
    bureau_id: Optional[int] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ComplaintCase)
    if bureau_id:
        query = query.filter(ComplaintCase.current_bureau_id == bureau_id)
    if status:
        query = query.filter(ComplaintCase.status == status)
    if category:
        query = query.filter(ComplaintCase.category == category)

    cases = query.order_by(desc(ComplaintCase.received_date)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Case No", "Institution Permanent ID", "Institution Name", "Category",
        "Subject", "Bureau", "Status", "Priority", "Received Date", "Due Date",
        "Disposal Date", "Complainant Type"
    ])

    for c in cases:
        writer.writerow([
            c.case_no,
            c.institution.permanent_id if c.institution else (c.raw_permanent_id or "N/A"),
            c.institution.name if c.institution else (c.raw_institution_name or "N/A"),
            c.category,
            c.subject,
            c.current_bureau.code if c.current_bureau else "",
            c.status,
            c.priority,
            c.received_date.isoformat(),
            c.due_date.isoformat(),
            c.disposal_date.isoformat() if c.disposal_date else "",
            c.complainant_type
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aicte_caselink_cases.csv"}
    )

@router.get("/{id_or_no}")
def get_case_detail(
    id_or_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if id_or_no.isdigit():
        case = db.query(ComplaintCase).filter(ComplaintCase.id == int(id_or_no)).first()
    else:
        case = db.query(ComplaintCase).filter(ComplaintCase.case_no == id_or_no).first()

    if not case:
        raise HTTPException(status_code=404, detail="Complaint case not found")

    today = datetime.date.today()
    age_days = (today - case.received_date).days
    days_to_due = (case.due_date - today).days
    is_overdue = case.status != "Disposed" and case.due_date < today

    # Overlaps
    links = db.query(CaseLink).filter(
        or_(CaseLink.case_a_id == case.id, CaseLink.case_b_id == case.id)
    ).all()

    overlap_details = []
    for link in links:
        other_case = link.case_b if link.case_a_id == case.id else link.case_a
        overlap_details.append({
            "link_id": link.id,
            "status": link.status,
            "score": link.score,
            "confidence_band": link.confidence_band,
            "evidence": link.evidence,
            "other_case": {
                "id": other_case.id,
                "case_no": other_case.case_no,
                "bureau": other_case.current_bureau.code if other_case.current_bureau else "N/A",
                "status": other_case.status,
                "subject": other_case.subject,
                "category": other_case.category,
                "received_date": other_case.received_date
            }
        })

    # Actions chronological
    actions = db.query(CaseAction).filter(CaseAction.case_id == case.id)\
        .order_by(asc(CaseAction.created_at)).all()

    return {
        "case": {
            "id": case.id,
            "case_no": case.case_no,
            "institution_id": case.institution_id,
            "raw_institution_name": case.raw_institution_name,
            "raw_address": case.raw_address,
            "raw_permanent_id": case.raw_permanent_id,
            "complainant_type": case.complainant_type,
            "complainant_name": case.complainant_name,
            "complainant_email": case.complainant_email,
            "complainant_phone": case.complainant_phone,
            "category": case.category,
            "subject": case.subject,
            "description": case.description,
            "source": case.source,
            "received_date": case.received_date,
            "status": case.status,
            "priority": case.priority,
            "current_bureau_id": case.current_bureau_id,
            "original_bureau_id": case.original_bureau_id,
            "assigned_officer_id": case.assigned_officer_id,
            "last_action": case.last_action,
            "last_action_date": case.last_action_date,
            "next_action": case.next_action,
            "due_date": case.due_date,
            "disposal_date": case.disposal_date,
            "disposal_remark": case.disposal_remark,
            "match_confidence": case.match_confidence,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
            "age_days": age_days,
            "days_to_due": days_to_due,
            "is_overdue": is_overdue,
            "can_modify": can_modify_case(current_user, case),
            "institution": {
                "id": case.institution.id,
                "name": case.institution.name,
                "permanent_id": case.institution.permanent_id,
                "district": case.institution.district,
                "state": case.institution.state,
                "approval_status": case.institution.approval_status
            } if case.institution else None,
            "current_bureau": {
                "id": case.current_bureau.id,
                "code": case.current_bureau.code,
                "name": case.current_bureau.name
            } if case.current_bureau else None,
            "assigned_officer": {
                "id": case.assigned_officer.id,
                "name": case.assigned_officer.name,
                "designation": case.assigned_officer.designation
            } if case.assigned_officer else None
        },
        "actions": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "remarks": a.remarks,
                "from_bureau": a.from_bureau.code if a.from_bureau else None,
                "to_bureau": a.to_bureau.code if a.to_bureau else None,
                "performed_by": a.performed_by.name if a.performed_by else "System",
                "document_name": a.document_name,
                "document_path": a.document_path,
                "created_at": a.created_at
            } for a in actions
        ],
        "overlaps": overlap_details
    }

@router.post("")
def create_case(
    case_in: ComplaintCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER", "CELL_OFFICER", "REGIONAL_OFFICER"]))
):
    bureau_id = case_in.current_bureau_id or current_user.bureau_id
    if not bureau_id:
        rb_bureau = db.query(Bureau).filter(Bureau.code == "RB").first()
        bureau_id = rb_bureau.id if rb_bureau else 1

    bureau = db.query(Bureau).filter(Bureau.id == bureau_id).first()
    b_code = bureau.code if bureau else "GEN"

    # Auto-resolve institution if not provided
    resolved_inst_id = case_in.institution_id
    confidence = 1.0
    evidence = {}

    if not resolved_inst_id:
        resolved_inst_id, confidence, evidence = resolve_institution(
            db,
            case_in.raw_permanent_id,
            case_in.raw_institution_name,
            case_in.raw_address
        )

    # Generate sequential case number
    year = datetime.date.today().year
    case_count = db.query(ComplaintCase).count() + 101
    case_no = f"{b_code}-{year}-{case_count:05d}"

    received_date = case_in.received_date or datetime.date.today()
    due_date = calculate_due_date(db, case_in.category, case_in.priority, received_date)

    case = ComplaintCase(
        case_no=case_no,
        institution_id=resolved_inst_id,
        raw_institution_name=case_in.raw_institution_name,
        raw_address=case_in.raw_address,
        raw_permanent_id=case_in.raw_permanent_id,
        complainant_type=case_in.complainant_type,
        complainant_name=case_in.complainant_name,
        complainant_email=case_in.complainant_email,
        complainant_phone=case_in.complainant_phone,
        category=case_in.category,
        subject=case_in.subject,
        description=case_in.description,
        source=case_in.source,
        received_date=received_date,
        status="Received",
        priority=case_in.priority,
        current_bureau_id=bureau_id,
        original_bureau_id=bureau_id,
        assigned_officer_id=case_in.assigned_officer_id or current_user.id,
        due_date=due_date,
        match_confidence=round(confidence, 2)
    )
    db.add(case)
    db.flush()

    # Add first action "Received"
    action = CaseAction(
        case_id=case.id,
        action_type="Received",
        from_bureau_id=bureau_id,
        to_bureau_id=bureau_id,
        performed_by_user_id=current_user.id,
        remarks=f"Complaint lodged via {case.source} and acknowledged in system.",
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)
    db.commit()

    # Trigger overlap detection
    new_overlaps = detect_for_case(db, case.id)
    log_audit(db, current_user.id, "CASE_CREATE", "CASE", str(case.id), {"case_no": case.case_no, "institution_id": resolved_inst_id})

    return {
        "case_id": case.id,
        "case_no": case.case_no,
        "institution_id": resolved_inst_id,
        "match_confidence": confidence,
        "resolution_evidence": evidence,
        "new_overlaps": new_overlaps
    }

@router.post("/{id}/actions")
def add_case_action(
    id: int,
    action_type: str = Form(...),
    remarks: str = Form(...),
    next_action: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not can_modify_case(current_user, case):
        raise HTTPException(status_code=403, detail="Permission denied: You cannot modify a case handled by another bureau.")

    doc_name = None
    doc_path = None
    if file:
        allowed_exts = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail="Allowed file types: pdf, jpg, png, docx")
        
        doc_name = file.filename
        safe_name = f"{case.case_no}_{int(datetime.datetime.utcnow().timestamp())}_{doc_name}"
        save_path = os.path.join(settings.UPLOAD_DIR, safe_name)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        doc_path = save_path

    action = CaseAction(
        case_id=case.id,
        action_type=action_type,
        from_bureau_id=case.current_bureau_id,
        to_bureau_id=case.current_bureau_id,
        performed_by_user_id=current_user.id,
        remarks=remarks,
        document_name=doc_name,
        document_path=doc_path,
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)

    case.last_action = action_type
    case.last_action_date = datetime.datetime.utcnow()
    if next_action:
        case.next_action = next_action
    if case.status == "Received":
        case.status = "Under Process"

    db.commit()
    log_audit(db, current_user.id, "ACTION_ADD", "CASE", str(case.id), {"action_type": action_type, "remarks": remarks})

    return {"status": "success", "action_id": action.id}

@router.post("/{id}/transfer")
def transfer_case(
    id: int,
    transfer_in: ComplaintCaseTransfer,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not can_modify_case(current_user, case):
        raise HTTPException(status_code=403, detail="Permission denied")

    target_bureau = db.query(Bureau).filter(Bureau.id == transfer_in.to_bureau_id).first()
    if not target_bureau:
        raise HTTPException(status_code=400, detail="Target bureau not found")

    from_b_id = case.current_bureau_id
    case.current_bureau_id = target_bureau.id
    case.assigned_officer_id = transfer_in.to_officer_id
    case.status = "Transferred"
    case.last_action = f"Transferred to {target_bureau.code}"
    case.last_action_date = datetime.datetime.utcnow()

    action = CaseAction(
        case_id=case.id,
        action_type="Transferred",
        from_bureau_id=from_b_id,
        to_bureau_id=target_bureau.id,
        performed_by_user_id=current_user.id,
        remarks=transfer_in.remarks,
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)

    # Target bureau alert
    alert = Alert(
        type="ESCALATION",
        severity="HIGH",
        case_id=case.id,
        institution_id=case.institution_id,
        message=f"Case {case.case_no} transferred to your bureau ({target_bureau.code}). Reason: {transfer_in.remarks}",
        target_bureau_id=target_bureau.id
    )
    db.add(alert)
    db.commit()

    log_audit(db, current_user.id, "CASE_TRANSFER", "CASE", str(case.id), {"to_bureau": target_bureau.code, "remarks": transfer_in.remarks})
    return {"status": "success", "message": f"Case transferred to {target_bureau.code}"}

@router.post("/{id}/escalate")
def escalate_case(
    id: int,
    escalate_in: ComplaintCaseEscalate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not can_modify_case(current_user, case):
        raise HTTPException(status_code=403, detail="Permission denied")

    case.status = "Escalated"
    case.priority = "Critical"
    case.last_action = "Escalated to Senior Authority"
    case.last_action_date = datetime.datetime.utcnow()

    action = CaseAction(
        case_id=case.id,
        action_type="Escalated",
        from_bureau_id=case.current_bureau_id,
        to_bureau_id=case.current_bureau_id,
        performed_by_user_id=current_user.id,
        remarks=escalate_in.reason,
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)

    alert = Alert(
        type="ESCALATION",
        severity="CRITICAL",
        case_id=case.id,
        institution_id=case.institution_id,
        message=f"Case {case.case_no} escalated for urgent administrative intervention: {escalate_in.reason}",
        target_bureau_id=case.current_bureau_id
    )
    db.add(alert)
    db.commit()

    log_audit(db, current_user.id, "CASE_ESCALATE", "CASE", str(case.id), {"reason": escalate_in.reason})
    return {"status": "success", "message": "Case escalated successfully"}

@router.post("/{id}/dispose")
def dispose_case(
    id: int,
    dispose_in: ComplaintCaseDispose,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not can_modify_case(current_user, case):
        raise HTTPException(status_code=403, detail="Permission denied")

    case.status = "Disposed"
    case.disposal_date = dispose_in.disposal_date or datetime.date.today()
    case.disposal_remark = dispose_in.remark
    case.last_action = "Disposed"
    case.last_action_date = datetime.datetime.utcnow()

    action = CaseAction(
        case_id=case.id,
        action_type="Disposed",
        from_bureau_id=case.current_bureau_id,
        to_bureau_id=case.current_bureau_id,
        performed_by_user_id=current_user.id,
        remarks=dispose_in.remark,
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)
    db.commit()

    log_audit(db, current_user.id, "CASE_DISPOSE", "CASE", str(case.id), {"remark": dispose_in.remark})
    return {"status": "success", "message": "Case marked as disposed"}

@router.post("/{id}/reopen")
def reopen_case(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(ComplaintCase).filter(ComplaintCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not can_modify_case(current_user, case):
        raise HTTPException(status_code=403, detail="Permission denied")

    case.status = "Under Process"
    case.disposal_date = None
    case.last_action = "Reopened"
    case.last_action_date = datetime.datetime.utcnow()

    action = CaseAction(
        case_id=case.id,
        action_type="Reopened",
        from_bureau_id=case.current_bureau_id,
        to_bureau_id=case.current_bureau_id,
        performed_by_user_id=current_user.id,
        remarks="Complaint case reopened for further verification / appellate review.",
        created_at=datetime.datetime.utcnow()
    )
    db.add(action)
    db.commit()

    log_audit(db, current_user.id, "CASE_REOPEN", "CASE", str(case.id), {})
    return {"status": "success", "message": "Case reopened successfully"}
