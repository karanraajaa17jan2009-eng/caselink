import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import Institution, ComplaintCase, CaseAction, CaseLink, User, Bureau
from app.schemas import InstitutionResponse, InstitutionCreate, InstitutionUpdate, ComplaintCaseResponse
from app.auth import get_current_user, require_roles
from app.services.matching import normalize_text, institution_multi_bureau_flag
from app.services.audit import log_audit

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])

@router.get("", response_model=Dict[str, Any])
def list_institutions(
    search: Optional[str] = None,
    region_id: Optional[int] = None,
    state: Optional[str] = None,
    approval_status: Optional[str] = None,
    has_open_cases: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Institution).filter(Institution.is_active == True)

    if search:
        search_norm = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search_norm),
                Institution.permanent_id.ilike(search_norm),
                Institution.district.ilike(search_norm),
                Institution.state.ilike(search_norm)
            )
        )

    if region_id:
        query = query.filter(Institution.region_id == region_id)

    if state:
        query = query.filter(Institution.state.ilike(f"%{state}%"))

    if approval_status:
        query = query.filter(Institution.approval_status == approval_status)

    total = query.count()
    institutions = query.order_by(Institution.name).offset((page - 1) * page_size).limit(page_size).all()

    today = datetime.date.today()
    items = []
    for inst in institutions:
        cases = inst.cases
        total_cases = len(cases)
        open_cases = [c for c in cases if c.status != "Disposed"]
        disposed_cases = [c for c in cases if c.status == "Disposed"]
        overdue_cases = [c for c in open_cases if c.due_date < today]

        if has_open_cases is True and len(open_cases) == 0:
            continue
        if has_open_cases is False and len(open_cases) > 0:
            continue

        handling_bureau_ids = {c.current_bureau_id for c in open_cases}
        bureaus = db.query(Bureau).filter(Bureau.id.in_(handling_bureau_ids)).all() if handling_bureau_ids else []
        handling_codes = [b.code for b in bureaus]

        has_active_overlap = db.query(CaseLink).filter(
            CaseLink.institution_id == inst.id,
            CaseLink.status.in_(["SUGGESTED", "CONFIRMED"])
        ).count() > 0

        inst_dict = {
            "id": inst.id,
            "permanent_id": inst.permanent_id,
            "name": inst.name,
            "normalized_name": inst.normalized_name,
            "institution_type": inst.institution_type,
            "management_type": inst.management_type,
            "address": inst.address,
            "district": inst.district,
            "state": inst.state,
            "pincode": inst.pincode,
            "region_id": inst.region_id,
            "email": inst.email,
            "phone": inst.phone,
            "approval_status": inst.approval_status,
            "established_year": inst.established_year,
            "is_active": inst.is_active,
            "region": {
                "id": inst.region.id,
                "name": inst.region.name,
                "office_city": inst.region.office_city
            } if inst.region else None,
            "total_cases_count": total_cases,
            "open_cases_count": len(open_cases),
            "disposed_cases_count": len(disposed_cases),
            "overdue_cases_count": len(overdue_cases),
            "handling_bureaus": handling_codes,
            "has_active_overlap": has_active_overlap,
            "is_repeat_offender": total_cases >= 3
        }
        items.append(inst_dict)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

@router.get("/{id}", response_model=Dict[str, Any])
def get_institution_360(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    today = datetime.date.today()
    cases = inst.cases
    total_cases = len(cases)
    open_cases = [c for c in cases if c.status != "Disposed"]
    disposed_cases = [c for c in cases if c.status == "Disposed"]
    overdue_cases = [c for c in open_cases if c.due_date < today]

    handling_bureau_ids = {c.current_bureau_id for c in open_cases}
    bureaus = db.query(Bureau).filter(Bureau.id.in_(handling_bureau_ids)).all() if handling_bureau_ids else []
    handling_codes = [b.code for b in bureaus]

    active_overlaps = db.query(CaseLink).filter(
        CaseLink.institution_id == inst.id,
        CaseLink.status.in_(["SUGGESTED", "CONFIRMED"])
    ).all()

    multi_bureau = len(handling_codes) >= 2

    return {
        "institution": {
            "id": inst.id,
            "permanent_id": inst.permanent_id,
            "name": inst.name,
            "normalized_name": inst.normalized_name,
            "institution_type": inst.institution_type,
            "management_type": inst.management_type,
            "address": inst.address,
            "district": inst.district,
            "state": inst.state,
            "pincode": inst.pincode,
            "region_id": inst.region_id,
            "email": inst.email,
            "phone": inst.phone,
            "approval_status": inst.approval_status,
            "established_year": inst.established_year,
            "region": {
                "id": inst.region.id,
                "name": inst.region.name,
                "office_city": inst.region.office_city
            } if inst.region else None
        },
        "kpis": {
            "total_cases": total_cases,
            "open_cases": len(open_cases),
            "disposed_cases": len(disposed_cases),
            "overdue_cases": len(overdue_cases),
            "handling_bureaus": handling_codes,
            "multi_bureau_jurisdiction": multi_bureau,
            "is_repeat_complaints": total_cases >= 3,
            "active_overlaps_count": len(active_overlaps)
        },
        "active_overlaps": [
            {
                "id": link.id,
                "case_a_no": link.case_a.case_no if link.case_a else "",
                "case_b_no": link.case_b.case_no if link.case_b else "",
                "score": link.score,
                "confidence_band": link.confidence_band,
                "status": link.status,
                "reasons": link.evidence.get("reasons", [])
            } for link in active_overlaps
        ]
    }

@router.get("/{id}/cases")
def get_institution_cases(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    cases = db.query(ComplaintCase).filter(ComplaintCase.institution_id == id)\
        .order_by(desc(ComplaintCase.received_date)).all()
    
    today = datetime.date.today()
    results = []
    for c in cases:
        age_days = (today - c.received_date).days
        days_to_due = (c.due_date - today).days
        is_overdue = c.status != "Disposed" and c.due_date < today
        results.append({
            "id": c.id,
            "case_no": c.case_no,
            "category": c.category,
            "subject": c.subject,
            "status": c.status,
            "priority": c.priority,
            "source": c.source,
            "received_date": c.received_date,
            "due_date": c.due_date,
            "current_bureau": c.current_bureau.code if c.current_bureau else "",
            "assigned_officer": c.assigned_officer.name if c.assigned_officer else None,
            "age_days": age_days,
            "days_to_due": days_to_due,
            "is_overdue": is_overdue,
            "disposal_date": c.disposal_date
        })
    return results

@router.get("/{id}/timeline")
def get_institution_cross_bureau_timeline(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Fetch all case actions across all cases of this institution
    actions = db.query(CaseAction).join(ComplaintCase, CaseAction.case_id == ComplaintCase.id)\
        .filter(ComplaintCase.institution_id == id)\
        .order_by(desc(CaseAction.created_at)).all()

    timeline = []
    for a in actions:
        timeline.append({
            "id": a.id,
            "case_id": a.case_id,
            "case_no": a.case.case_no if a.case else "N/A",
            "action_type": a.action_type,
            "remarks": a.remarks,
            "from_bureau": a.from_bureau.code if a.from_bureau else None,
            "to_bureau": a.to_bureau.code if a.to_bureau else None,
            "performed_by": a.performed_by.name if a.performed_by else "System",
            "performed_by_role": a.performed_by.role if a.performed_by else None,
            "document_name": a.document_name,
            "created_at": a.created_at
        })
    return timeline

@router.post("", response_model=InstitutionResponse)
def create_institution(
    inst_in: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER", "CELL_OFFICER", "REGIONAL_OFFICER"]))
):
    existing = db.query(Institution).filter(Institution.permanent_id == inst_in.permanent_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution with this AICTE Permanent ID already exists")

    norm_name = normalize_text(inst_in.name)
    inst = Institution(
        **inst_in.model_dump(),
        normalized_name=norm_name
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)

    log_audit(db, current_user.id, "INSTITUTION_CREATE", "INSTITUTION", str(inst.id), {"permanent_id": inst.permanent_id, "name": inst.name})
    return inst

@router.put("/{id}", response_model=InstitutionResponse)
def update_institution(
    id: int,
    inst_up: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER", "CELL_OFFICER", "REGIONAL_OFFICER"]))
):
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    update_data = inst_up.model_dump(exclude_unset=True)
    if "name" in update_data:
        update_data["normalized_name"] = normalize_text(update_data["name"])

    for k, v in update_data.items():
        setattr(inst, k, v)

    db.commit()
    db.refresh(inst)
    log_audit(db, current_user.id, "INSTITUTION_UPDATE", "INSTITUTION", str(inst.id), update_data)
    return inst
