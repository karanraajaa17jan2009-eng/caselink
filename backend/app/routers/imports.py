import io
import csv
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Institution, ComplaintCase, CaseAction, ImportJob, User, Bureau, Region
from app.auth import get_current_user, require_roles
from app.services.matching import normalize_text, resolve_institution, detect_for_case
from app.services.sla import calculate_due_date
from app.services.audit import log_audit

router = APIRouter(prefix="/api/import", tags=["Import"])

@router.get("/template/{kind}")
def get_template(kind: str):
    kind_upper = kind.upper()
    output = io.StringIO()
    writer = csv.writer(output)

    if kind_upper == "INSTITUTIONS":
        headers = [
            "permanent_id", "name", "institution_type", "management_type",
            "address", "district", "state", "pincode", "region_name",
            "email", "phone", "approval_status", "established_year"
        ]
        sample = [
            "1-9988776655", "Saraswati College of Engineering", "College", "Private",
            "Sector 12, Tech Zone", "Pune", "Maharashtra", "411001", "Western",
            "contact@scoe.edu.in", "9876543210", "Approved", "2008"
        ]
        writer.writerow(headers)
        writer.writerow(sample)
        filename = "institutions_template.csv"
    elif kind_upper == "CASES":
        headers = [
            "raw_permanent_id", "raw_institution_name", "category", "subject",
            "description", "complainant_type", "complainant_name", "complainant_email",
            "source", "priority", "bureau_code"
        ]
        sample = [
            "1-9988776655", "Saraswati College of Engg, Pune", "Excess/Illegal Fee Collection",
            "Excess fee demanded for examination form", "College demanding Rs 15000 extra fee beyond approval norm.",
            "Student", "Aditya Sharma", "aditya@gmail.com", "Portal", "Medium", "PGRC"
        ]
        writer.writerow(headers)
        writer.writerow(sample)
        filename = "cases_template.csv"
    else:
        raise HTTPException(status_code=400, detail="Invalid kind: must be 'institutions' or 'cases'")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/institutions")
def import_institutions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER"]))
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required_cols = {"permanent_id", "name", "address", "district", "state", "pincode"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        missing = required_cols - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")

    total = 0
    inserted = 0
    skipped = 0
    errors = []

    regions_cache = {r.name.lower(): r.id for r in db.query(Region).all()}

    for row_idx, row in enumerate(reader, start=2):
        total += 1
        perm_id = row.get("permanent_id", "").strip()
        name = row.get("name", "").strip()

        if not perm_id or not name:
            errors.append(f"Row {row_idx}: Missing permanent_id or name")
            skipped += 1
            continue

        existing = db.query(Institution).filter(Institution.permanent_id == perm_id).first()
        if existing:
            skipped += 1
            continue

        reg_name = row.get("region_name", "").strip().lower()
        region_id = regions_cache.get(reg_name)

        try:
            year_val = int(row.get("established_year", 0)) if row.get("established_year") else None
        except ValueError:
            year_val = None

        inst = Institution(
            permanent_id=perm_id,
            name=name,
            normalized_name=normalize_text(name),
            institution_type=row.get("institution_type", "College").strip(),
            management_type=row.get("management_type", "Private").strip(),
            address=row.get("address", "").strip(),
            district=row.get("district", "").strip(),
            state=row.get("state", "").strip(),
            pincode=row.get("pincode", "").strip(),
            region_id=region_id,
            email=row.get("email", "").strip() or None,
            phone=row.get("phone", "").strip() or None,
            approval_status=row.get("approval_status", "Approved").strip(),
            established_year=year_val,
            is_active=True
        )
        db.add(inst)
        inserted += 1

    job = ImportJob(
        filename=file.filename,
        kind="INSTITUTIONS",
        total_rows=total,
        inserted=inserted,
        skipped=skipped,
        errors=errors[:50],
        created_by=current_user.id
    )
    db.add(job)
    db.commit()

    log_audit(db, current_user.id, "IMPORT_INSTITUTIONS", "IMPORT", str(job.id), {"total": total, "inserted": inserted, "skipped": skipped})
    return {
        "job_id": job.id,
        "filename": file.filename,
        "total_rows": total,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:50]
    }

@router.post("/cases")
def import_cases_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RB_OFFICER", "PGRC_OFFICER", "CELL_OFFICER"]))
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required_cols = {"category", "subject", "description"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        missing = required_cols - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")

    total = 0
    inserted = 0
    skipped = 0
    errors = []

    bureaus_cache = {b.code.upper(): b.id for b in db.query(Bureau).all()}
    default_bureau_id = current_user.bureau_id or bureaus_cache.get("RB", 1)
    year = datetime.date.today().year
    case_counter = db.query(ComplaintCase).count() + 101

    for row_idx, row in enumerate(reader, start=2):
        total += 1
        cat = row.get("category", "").strip()
        subj = row.get("subject", "").strip()
        desc = row.get("description", "").strip()

        if not cat or not subj or not desc:
            errors.append(f"Row {row_idx}: Missing category, subject, or description")
            skipped += 1
            continue

        b_code = row.get("bureau_code", "").strip().upper()
        b_id = bureaus_cache.get(b_code, default_bureau_id)
        b_obj = db.query(Bureau).filter(Bureau.id == b_id).first()
        b_code_actual = b_obj.code if b_obj else "RB"

        # Resolve institution
        raw_pid = row.get("raw_permanent_id", "").strip()
        raw_name = row.get("raw_institution_name", "").strip()
        raw_addr = row.get("raw_address", "").strip()
        
        inst_id, conf, _ = resolve_institution(db, raw_pid, raw_name, raw_addr)

        case_no = f"{b_code_actual}-{year}-{case_counter:05d}"
        case_counter += 1
        priority = row.get("priority", "Medium").strip()
        rec_date = datetime.date.today()
        due_date = calculate_due_date(db, cat, priority, rec_date)

        case = ComplaintCase(
            case_no=case_no,
            institution_id=inst_id,
            raw_institution_name=raw_name,
            raw_address=raw_addr,
            raw_permanent_id=raw_pid,
            complainant_type=row.get("complainant_type", "Other Stakeholder").strip(),
            complainant_name=row.get("complainant_name", "").strip() or None,
            complainant_email=row.get("complainant_email", "").strip() or None,
            category=cat,
            subject=subj,
            description=desc,
            source=row.get("source", "Portal").strip(),
            received_date=rec_date,
            status="Received",
            priority=priority,
            current_bureau_id=b_id,
            original_bureau_id=b_id,
            assigned_officer_id=current_user.id,
            due_date=due_date,
            match_confidence=round(conf, 2)
        )
        db.add(case)
        db.flush()

        # Add initial action
        act = CaseAction(
            case_id=case.id,
            action_type="Received",
            from_bureau_id=b_id,
            to_bureau_id=b_id,
            performed_by_user_id=current_user.id,
            remarks="Case bulk imported via CSV.",
            created_at=datetime.datetime.utcnow()
        )
        db.add(act)

        # Detect overlap
        detect_for_case(db, case.id)
        inserted += 1

    job = ImportJob(
        filename=file.filename,
        kind="CASES",
        total_rows=total,
        inserted=inserted,
        skipped=skipped,
        errors=errors[:50],
        created_by=current_user.id
    )
    db.add(job)
    db.commit()

    log_audit(db, current_user.id, "IMPORT_CASES", "IMPORT", str(job.id), {"total": total, "inserted": inserted, "skipped": skipped})
    return {
        "job_id": job.id,
        "filename": file.filename,
        "total_rows": total,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:50]
    }
