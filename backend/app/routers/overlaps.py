import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.database import get_db
from app.models import CaseLink, ComplaintCase, CaseAction, Alert, Institution, User
from app.schemas import CaseLinkResponse, CaseLinkReview, CaseLinkManual, PrecheckResponse
from app.auth import get_current_user, require_roles
from app.services.matching import run_overlap_scan, score_pair, find_possible_duplicates
from app.services.audit import log_audit

router = APIRouter(prefix="/api/overlaps", tags=["Overlaps"])

@router.get("")
def list_overlaps(
    status: Optional[str] = None,
    band: Optional[str] = None,
    bureau_id: Optional[int] = None,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CaseLink)

    if status:
        query = query.filter(CaseLink.status == status)

    if band:
        query = query.filter(CaseLink.confidence_band == band)

    if region_id:
        query = query.join(Institution, CaseLink.institution_id == Institution.id)\
            .filter(Institution.region_id == region_id)

    links = query.order_by(desc(CaseLink.score), desc(CaseLink.created_at)).all()

    results = []
    for link in links:
        c_a = link.case_a
        c_b = link.case_b
        if not c_a or not c_b:
            continue

        if bureau_id and c_a.current_bureau_id != bureau_id and c_b.current_bureau_id != bureau_id:
            continue

        today = datetime.date.today()
        results.append({
            "id": link.id,
            "institution_id": link.institution_id,
            "institution_name": link.institution.name if link.institution else "N/A",
            "institution_permanent_id": link.institution.permanent_id if link.institution else "N/A",
            "score": link.score,
            "confidence_band": link.confidence_band,
            "status": link.status,
            "evidence": link.evidence,
            "review_remark": link.review_remark,
            "reviewed_at": link.reviewed_at,
            "reviewed_by": link.reviewer.name if link.reviewer else None,
            "case_a": {
                "id": c_a.id,
                "case_no": c_a.case_no,
                "bureau_code": c_a.current_bureau.code if c_a.current_bureau else "",
                "status": c_a.status,
                "priority": c_a.priority,
                "subject": c_a.subject,
                "description": c_a.description,
                "received_date": c_a.received_date,
                "due_date": c_a.due_date,
                "assigned_officer": c_a.assigned_officer.name if c_a.assigned_officer else "Unassigned",
                "age_days": (today - c_a.received_date).days
            },
            "case_b": {
                "id": c_b.id,
                "case_no": c_b.case_no,
                "bureau_code": c_b.current_bureau.code if c_b.current_bureau else "",
                "status": c_b.status,
                "priority": c_b.priority,
                "subject": c_b.subject,
                "description": c_b.description,
                "received_date": c_b.received_date,
                "due_date": c_b.due_date,
                "assigned_officer": c_b.assigned_officer.name if c_b.assigned_officer else "Unassigned",
                "age_days": (today - c_b.received_date).days
            }
        })

    return results

@router.get("/stats")
def get_overlap_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(CaseLink).count()
    suggested = db.query(CaseLink).filter(CaseLink.status == "SUGGESTED").count()
    confirmed = db.query(CaseLink).filter(CaseLink.status == "CONFIRMED").count()
    rejected = db.query(CaseLink).filter(CaseLink.status == "REJECTED").count()

    high_band = db.query(CaseLink).filter(CaseLink.confidence_band == "HIGH").count()
    possible_band = db.query(CaseLink).filter(CaseLink.confidence_band == "POSSIBLE").count()

    return {
        "total_overlaps": total,
        "suggested": suggested,
        "confirmed": confirmed,
        "rejected": rejected,
        "high_band": high_band,
        "possible_band": possible_band
    }

@router.get("/precheck")
def precheck_duplicates(
    institution_id: Optional[int] = None,
    text: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not institution_id or not text:
        return {"has_matches": False, "potential_overlaps": []}

    matches = find_possible_duplicates(db, "", text, institution_id)
    return {
        "has_matches": len(matches) > 0,
        "potential_overlaps": matches
    }

@router.get("/{id}")
def get_overlap_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    link = db.query(CaseLink).filter(CaseLink.id == id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Overlap record not found")

    return {
        "id": link.id,
        "institution_id": link.institution_id,
        "institution": {
            "id": link.institution.id,
            "name": link.institution.name,
            "permanent_id": link.institution.permanent_id,
            "district": link.institution.district,
            "state": link.institution.state
        } if link.institution else None,
        "score": link.score,
        "confidence_band": link.confidence_band,
        "status": link.status,
        "evidence": link.evidence,
        "review_remark": link.review_remark,
        "case_a": {
            "id": link.case_a.id,
            "case_no": link.case_a.case_no,
            "bureau": link.case_a.current_bureau.code if link.case_a.current_bureau else "",
            "status": link.case_a.status,
            "subject": link.case_a.subject,
            "description": link.case_a.description,
            "category": link.case_a.category,
            "received_date": link.case_a.received_date
        },
        "case_b": {
            "id": link.case_b.id,
            "case_no": link.case_b.case_no,
            "bureau": link.case_b.current_bureau.code if link.case_b.current_bureau else "",
            "status": link.case_b.status,
            "subject": link.case_b.subject,
            "description": link.case_b.description,
            "category": link.case_b.category,
            "received_date": link.case_b.received_date
        }
    }

@router.post("/{id}/review")
def review_overlap(
    id: int,
    review_in: CaseLinkReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    link = db.query(CaseLink).filter(CaseLink.id == id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Overlap record not found")

    decision = review_in.decision.upper()
    if decision not in ["CONFIRM", "REJECT"]:
        raise HTTPException(status_code=400, detail="Decision must be either CONFIRM or REJECT")

    link.status = "CONFIRMED" if decision == "CONFIRM" else "REJECTED"
    link.reviewed_by = current_user.id
    link.reviewed_at = datetime.datetime.utcnow()
    link.review_remark = review_in.remark

    if decision == "CONFIRM":
        # Write "Linked" action on BOTH cases
        c_a = link.case_a
        c_b = link.case_b
        now = datetime.datetime.utcnow()

        act_a = CaseAction(
            case_id=c_a.id,
            action_type="Linked",
            from_bureau_id=c_a.current_bureau_id,
            to_bureau_id=c_a.current_bureau_id,
            performed_by_user_id=current_user.id,
            remarks=f"Confirmed coordination link with case {c_b.case_no} ({c_b.current_bureau.code if c_b.current_bureau else 'Cell'}). Remark: {review_in.remark or 'Verified cross-bureau overlap.'}",
            created_at=now
        )
        db.add(act_a)

        act_b = CaseAction(
            case_id=c_b.id,
            action_type="Linked",
            from_bureau_id=c_b.current_bureau_id,
            to_bureau_id=c_b.current_bureau_id,
            performed_by_user_id=current_user.id,
            remarks=f"Confirmed coordination link with case {c_a.case_no} ({c_a.current_bureau.code if c_a.current_bureau else 'Cell'}). Remark: {review_in.remark or 'Verified cross-bureau overlap.'}",
            created_at=now
        )
        db.add(act_b)

        # Notify bureaus of confirmation
        alert = Alert(
            type="OVERLAP",
            severity="INFO",
            case_id=c_a.id,
            institution_id=link.institution_id,
            link_id=link.id,
            message=f"Coordination link CONFIRMED between {c_a.case_no} and {c_b.case_no} by {current_user.name}.",
            target_bureau_id=c_a.current_bureau_id
        )
        db.add(alert)

    db.commit()
    log_audit(db, current_user.id, "OVERLAP_REVIEW", "LINK", str(link.id), {"decision": decision, "remark": review_in.remark})

    return {"status": "success", "new_status": link.status}

@router.post("/manual")
def manual_link(
    manual_in: CaseLinkManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER", "CELL_OFFICER", "REGIONAL_OFFICER"]))
):
    if manual_in.case_a_id == manual_in.case_b_id:
        raise HTTPException(status_code=400, detail="Cannot link a case to itself")

    c1 = db.query(ComplaintCase).filter(ComplaintCase.id == manual_in.case_a_id).first()
    c2 = db.query(ComplaintCase).filter(ComplaintCase.id == manual_in.case_b_id).first()
    if not c1 or not c2:
        raise HTTPException(status_code=404, detail="One or both cases not found")

    c_a, c_b = (c1, c2) if c1.id < c2.id else (c2, c1)

    existing = db.query(CaseLink).filter(
        CaseLink.case_a_id == c_a.id,
        CaseLink.case_b_id == c_b.id
    ).first()

    if existing:
        return {"status": "already_exists", "link_id": existing.id, "link_status": existing.status}

    score, evidence = score_pair(c_a, c_b)
    if manual_in.remark:
        evidence["reasons"].append(f"Manual link remark: {manual_in.remark}")

    link = CaseLink(
        case_a_id=c_a.id,
        case_b_id=c_b.id,
        institution_id=c_a.institution_id,
        score=max(score, 0.85),
        confidence_band="HIGH",
        evidence=evidence,
        status="CONFIRMED",
        reviewed_by=current_user.id,
        reviewed_at=datetime.datetime.utcnow(),
        review_remark=manual_in.remark or "Manually linked by officer"
    )
    db.add(link)
    db.commit()

    log_audit(db, current_user.id, "MANUAL_LINK", "LINK", str(link.id), {"case_a": c_a.case_no, "case_b": c_b.case_no})
    return {"status": "success", "link_id": link.id}

@router.post("/scan")
def trigger_overlap_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER"]))
):
    res = run_overlap_scan(db)
    log_audit(db, current_user.id, "SCAN_OVERLAPS", "SYSTEM", None, res)
    return {"status": "success", "scan_results": res}
