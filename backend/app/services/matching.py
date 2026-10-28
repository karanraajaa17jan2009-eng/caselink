import re
import datetime
from typing import Optional, Tuple, Dict, Any, List
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import Institution, ComplaintCase, CaseLink, Alert, Bureau

STOPWORDS = {
    "the", "of", "and", "in", "to", "for", "with", "on", "at", "by", "from",
    "an", "as", "is", "are", "was", "were", "it", "this", "that", "regarding",
    "against", "complaint", "matter", "allegation", "issue", "case"
}

RELATED_CATEGORIES = {
    "Unapproved/Unauthorized Courses": {"Fake Affiliation / Approval Claims", "Admission Irregularities"},
    "Fake Affiliation / Approval Claims": {"Unapproved/Unauthorized Courses", "Mandatory Disclosure Violation"},
    "Admission Irregularities": {"Excess/Illegal Fee Collection", "Unapproved/Unauthorized Courses"},
    "Excess/Illegal Fee Collection": {"Admission Irregularities", "Withholding of Certificates / Documents"},
    "Withholding of Certificates / Documents": {"Excess/Illegal Fee Collection", "Harassment / Ragging"},
    "Faculty Shortage / Qualification": {"Salary/Service Matters of Faculty", "Infrastructure Deficiency"},
    "Salary/Service Matters of Faculty": {"Faculty Shortage / Qualification"},
    "Infrastructure Deficiency": {"Faculty Shortage / Qualification", "Unapproved/Unauthorized Courses"},
}

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.lower()
    # Unify & and and
    text = re.sub(r'&', ' and ', text)
    # Strip common noise suffix
    text = re.sub(r'\(autonomous\)', ' ', text)
    text = re.sub(r'affiliated to [a-z0-9\s]+', ' ', text)
    # Expand abbreviations
    abbrev_map = {
        r'\binst\b': 'institute',
        r'\bengg\b': 'engineering',
        r'\btech\b': 'technology',
        r'\bcoll\b': 'college',
        r'\buniv\b': 'university',
        r'\bpoly\b': 'polytechnic',
        r'\bmgmt\b': 'management',
        r'\bgovt\b': 'government',
        r'\bshri\b': 'shri',
        r'\bshree\b': 'shri',
        r'\bsri\b': 'shri',
        r'\bdr\b': 'doctor',
        r'\bst\b': 'saint',
    }
    for pattern, repl in abbrev_map.items():
        text = re.sub(pattern, repl, text)
    # Remove punctuation
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def normalize_permanent_id(pid: Optional[str]) -> str:
    if not pid:
        return ""
    # Strip spaces, hyphens, prefixes like "ID:", "AICTE:"
    clean = re.sub(r'[^a-zA-Z0-9]', '', pid).upper()
    clean = re.sub(r'^(AICTE|ID|PERMID)', '', clean)
    return clean

def extract_tokens(text: str) -> set:
    norm = normalize_text(text)
    tokens = {w for w in norm.split() if len(w) > 2 and w not in STOPWORDS}
    return tokens

def resolve_institution(
    db: Session,
    raw_permanent_id: Optional[str],
    raw_name: Optional[str],
    raw_address: Optional[str] = None
) -> Tuple[Optional[int], float, Dict[str, Any]]:
    evidence = {
        "matched_method": "NONE",
        "details": [],
        "candidates": []
    }

    norm_pid = normalize_permanent_id(raw_permanent_id)
    norm_name = normalize_text(raw_name)

    all_institutions = db.query(Institution).filter(Institution.is_active == True).all()
    if not all_institutions:
        return None, 0.0, evidence

    # Step 1: Exact normalised permanent ID match
    if norm_pid:
        for inst in all_institutions:
            if normalize_permanent_id(inst.permanent_id) == norm_pid:
                name_score = fuzz.token_set_ratio(norm_name, inst.normalized_name) if norm_name else 70.0
                if name_score >= 60.0:
                    confidence = 1.0
                    evidence["matched_method"] = "EXACT_PERMANENT_ID_HIGH_NAME"
                    evidence["details"].append(f"Permanent ID {inst.permanent_id} matched and name similarity is {name_score:.1f}%")
                elif name_score < 45.0 and norm_name:
                    confidence = 0.60
                    evidence["matched_method"] = "ID_NAME_CONFLICT"
                    evidence["details"].append(f"Permanent ID {inst.permanent_id} matched but name '{raw_name}' has low similarity ({name_score:.1f}%) with registered '{inst.name}'")
                else:
                    confidence = 0.98
                    evidence["matched_method"] = "EXACT_PERMANENT_ID"
                    evidence["details"].append(f"Permanent ID {inst.permanent_id} matched registered record")
                return inst.id, confidence, evidence

    # Step 2: Fuzzy resolution by name + address
    if not norm_name:
        return None, 0.0, evidence

    scored_candidates = []
    norm_addr = normalize_text(raw_address) if raw_address else ""

    for inst in all_institutions:
        n_token_set = fuzz.token_set_ratio(norm_name, inst.normalized_name)
        n_wratio = fuzz.WRatio(norm_name, inst.normalized_name)
        name_score = 0.5 * n_token_set + 0.5 * n_wratio

        addr_score = 0.0
        if norm_addr:
            inst_addr = normalize_text(f"{inst.address} {inst.district} {inst.state} {inst.pincode}")
            addr_score = fuzz.token_set_ratio(norm_addr, inst_addr)

        location_match = 0.0
        if raw_address:
            raw_upper = raw_address.upper()
            if inst.pincode and inst.pincode in raw_address:
                location_match += 50.0
            if inst.district and inst.district.upper() in raw_upper:
                location_match += 50.0

        if norm_addr:
            composite = 0.65 * (name_score / 100.0) + 0.25 * (addr_score / 100.0) + 0.10 * (location_match / 100.0)
        else:
            composite = name_score / 100.0

        scored_candidates.append({
            "institution_id": inst.id,
            "name": inst.name,
            "permanent_id": inst.permanent_id,
            "score": round(composite, 3),
            "name_score": round(name_score, 1)
        })

    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    evidence["candidates"] = scored_candidates[:3]

    if not scored_candidates:
        return None, 0.0, evidence

    top = scored_candidates[0]
    top_score = top["score"]

    if top_score >= 0.85:
        evidence["matched_method"] = "FUZZY_NAME_AUTO"
        evidence["details"].append(f"High fuzzy match with '{top['name']}' (confidence {top_score * 100:.1f}%)")
        return top["institution_id"], top_score, evidence
    elif top_score >= 0.65:
        evidence["matched_method"] = "FUZZY_NAME_VERIFY"
        evidence["details"].append(f"Moderate fuzzy match with '{top['name']}' (confidence {top_score * 100:.1f}%). Needs verification.")
        return top["institution_id"], top_score, evidence
    else:
        evidence["matched_method"] = "UNRESOLVED"
        evidence["details"].append("No institution candidate exceeded 0.65 confidence threshold.")
        return None, top_score, evidence

def score_pair(case_a: ComplaintCase, case_b: ComplaintCase) -> Tuple[float, Dict[str, Any]]:
    # Pair overlap evaluation
    evidence = {
        "matched_fields": [],
        "reasons": [],
        "shared_keywords": [],
        "bureaus": [],
        "days_apart": 0
    }

    if not case_a.institution_id or not case_b.institution_id:
        return 0.0, evidence

    if case_a.institution_id != case_b.institution_id:
        return 0.0, evidence

    # Institution match component (40%)
    inst_match = min(case_a.match_confidence or 0.8, case_b.match_confidence or 0.8)
    evidence["matched_fields"].append("institution")
    evidence["reasons"].append(f"Same resolved institution (AICTE ID: {case_a.institution.permanent_id if case_a.institution else 'N/A'})")

    # Text similarity (30%)
    text_a = f"{case_a.subject} {case_a.description}"
    text_b = f"{case_b.subject} {case_b.description}"
    
    tokens_a = extract_tokens(text_a)
    tokens_b = extract_tokens(text_b)
    shared_tokens = list(tokens_a.intersection(tokens_b))
    evidence["shared_keywords"] = shared_tokens[:10]

    jaccard = len(shared_tokens) / max(len(tokens_a.union(tokens_b)), 1)
    token_ratio = fuzz.token_set_ratio(normalize_text(text_a), normalize_text(text_b)) / 100.0
    text_sim = 0.85 * token_ratio + 0.15 * jaccard

    if text_sim > 0.40:
        evidence["matched_fields"].append("text")
        evidence["reasons"].append(f"Complaint text similarity is {token_ratio * 100:.0f}% with key shared terms")

    # Category similarity (15%)
    cat_sim = 0.0
    if case_a.category == case_b.category:
        cat_sim = 1.0
        evidence["matched_fields"].append("category")
        evidence["reasons"].append(f"Identical grievance category: '{case_a.category}'")
    elif case_b.category in RELATED_CATEGORIES.get(case_a.category, set()):
        cat_sim = 0.6
        evidence["matched_fields"].append("category")
        evidence["reasons"].append(f"Closely related grievance categories: '{case_a.category}' & '{case_b.category}'")

    # Time proximity (10%)
    d_a = case_a.received_date
    d_b = case_b.received_date
    days_apart = abs((d_a - d_b).days)
    evidence["days_apart"] = days_apart
    if days_apart <= 30:
        time_sim = 1.0
        evidence["reasons"].append(f"Received within {days_apart} days of each other")
    elif days_apart <= 365:
        time_sim = max(0.0, 1.0 - (days_apart - 30) / 335.0)
        evidence["reasons"].append(f"Received {days_apart} days apart")
    else:
        time_sim = 0.0

    # Complainant overlap (5%)
    comp_sim = 0.0
    if case_a.complainant_name and case_b.complainant_name:
        comp_sim = fuzz.token_set_ratio(case_a.complainant_name.lower(), case_b.complainant_name.lower()) / 100.0
        if comp_sim > 0.8:
            evidence["matched_fields"].append("complainant")
            evidence["reasons"].append("Same or similar complainant identity")

    score = (
        0.40 * inst_match +
        0.30 * text_sim +
        0.15 * cat_sim +
        0.10 * time_sim +
        0.05 * comp_sim
    )

    def extract_bcode(case):
        if case.current_bureau and hasattr(case.current_bureau, "code"):
            return case.current_bureau.code
        for prefix in ["RB", "PGRC", "AB", "ACAD", "FIN", "LEGAL", "VIG", "RO"]:
            if case.case_no and case.case_no.startswith(prefix):
                return prefix
        return str(case.current_bureau_id)

    bureau_a_code = extract_bcode(case_a)
    bureau_b_code = extract_bcode(case_b)
    evidence["bureaus"] = [bureau_a_code, bureau_b_code]

    # Special rule: Same permanent ID with different bureaus gets at least POSSIBLE band (0.65)
    if case_a.current_bureau_id != case_b.current_bureau_id and score < 0.65:
        score = 0.65
        evidence["reasons"].append("Multi-bureau jurisdiction on same AICTE institution baseline")

    score = min(1.0, max(0.0, score))
    return round(score, 3), evidence

def run_overlap_scan(db: Session) -> Dict[str, int]:
    # Scan all institutions with >= 2 active or recently disposed cases
    ninety_days_ago = datetime.date.today() - datetime.timedelta(days=90)
    
    # Query cases that are open OR disposed recently
    relevant_cases = db.query(ComplaintCase).filter(
        ComplaintCase.institution_id.isnot(None),
        or_(
            ComplaintCase.status != "Disposed",
            ComplaintCase.disposal_date >= ninety_days_ago
        )
    ).all()

    # Group by institution
    inst_cases_map: Dict[int, List[ComplaintCase]] = {}
    for c in relevant_cases:
        inst_cases_map.setdefault(c.institution_id, []).append(c)

    new_links_count = 0
    high_count = 0
    possible_count = 0

    for inst_id, cases in inst_cases_map.items():
        if len(cases) < 2:
            continue

        for i in range(len(cases)):
            for j in range(i + 1, len(cases)):
                case_1 = cases[i]
                case_2 = cases[j]

                # Ensure smaller id is case_a
                c_a, c_b = (case_1, case_2) if case_1.id < case_2.id else (case_2, case_1)

                score, evidence = score_pair(c_a, c_b)
                if score < 0.60:
                    continue

                band = "HIGH" if score >= 0.80 else "POSSIBLE"
                if band == "HIGH":
                    high_count += 1
                else:
                    possible_count += 1

                # Check if link exists
                existing = db.query(CaseLink).filter(
                    CaseLink.case_a_id == c_a.id,
                    CaseLink.case_b_id == c_b.id
                ).first()

                if not existing:
                    link = CaseLink(
                        case_a_id=c_a.id,
                        case_b_id=c_b.id,
                        institution_id=inst_id,
                        score=score,
                        confidence_band=band,
                        evidence=evidence,
                        status="SUGGESTED"
                    )
                    db.add(link)
                    db.flush()

                    # Create alerts for both bureaus if different
                    msg = f"Potential overlap ({band} confidence - {int(score*100)}%) between cases {c_a.case_no} and {c_b.case_no} for institution."
                    alert_a = Alert(
                        type="OVERLAP",
                        severity="HIGH" if band == "HIGH" else "MEDIUM",
                        case_id=c_a.id,
                        institution_id=inst_id,
                        link_id=link.id,
                        message=msg,
                        target_bureau_id=c_a.current_bureau_id
                    )
                    db.add(alert_a)
                    if c_b.current_bureau_id != c_a.current_bureau_id:
                        alert_b = Alert(
                            type="OVERLAP",
                            severity="HIGH" if band == "HIGH" else "MEDIUM",
                            case_id=c_b.id,
                            institution_id=inst_id,
                            link_id=link.id,
                            message=msg,
                            target_bureau_id=c_b.current_bureau_id
                        )
                        db.add(alert_b)

                    new_links_count += 1

    db.commit()
    return {
        "new_links": new_links_count,
        "high_band": high_count,
        "possible_band": possible_count
    }

def detect_for_case(db: Session, case_id: int) -> List[Dict[str, Any]]:
    case = db.query(ComplaintCase).filter(ComplaintCase.id == case_id).first()
    if not case or not case.institution_id:
        return []

    ninety_days_ago = datetime.date.today() - datetime.timedelta(days=90)
    sibling_cases = db.query(ComplaintCase).filter(
        ComplaintCase.institution_id == case.institution_id,
        ComplaintCase.id != case.id,
        or_(
            ComplaintCase.status != "Disposed",
            ComplaintCase.disposal_date >= ninety_days_ago
        )
    ).all()

    new_suggestions = []
    for sibling in sibling_cases:
        c_a, c_b = (case, sibling) if case.id < sibling.id else (sibling, case)
        score, evidence = score_pair(c_a, c_b)
        if score < 0.60:
            continue

        band = "HIGH" if score >= 0.80 else "POSSIBLE"
        existing = db.query(CaseLink).filter(
            CaseLink.case_a_id == c_a.id,
            CaseLink.case_b_id == c_b.id
        ).first()

        if not existing:
            link = CaseLink(
                case_a_id=c_a.id,
                case_b_id=c_b.id,
                institution_id=case.institution_id,
                score=score,
                confidence_band=band,
                evidence=evidence,
                status="SUGGESTED"
            )
            db.add(link)
            db.flush()

            msg = f"Potential overlap ({band} confidence - {int(score*100)}%) detected with existing case {sibling.case_no}."
            alert = Alert(
                type="OVERLAP",
                severity="HIGH" if band == "HIGH" else "MEDIUM",
                case_id=case.id,
                institution_id=case.institution_id,
                link_id=link.id,
                message=msg,
                target_bureau_id=case.current_bureau_id
            )
            db.add(alert)
            if sibling.current_bureau_id != case.current_bureau_id:
                alert_sib = Alert(
                    type="OVERLAP",
                    severity="HIGH" if band == "HIGH" else "MEDIUM",
                    case_id=sibling.id,
                    institution_id=case.institution_id,
                    link_id=link.id,
                    message=msg,
                    target_bureau_id=sibling.current_bureau_id
                )
                db.add(alert_sib)

            new_suggestions.append({
                "link_id": link.id,
                "case_no": sibling.case_no,
                "score": score,
                "band": band,
                "evidence": evidence
            })

    db.commit()
    return new_suggestions

def institution_multi_bureau_flag(db: Session, institution_id: int) -> bool:
    open_cases = db.query(ComplaintCase).filter(
        ComplaintCase.institution_id == institution_id,
        ComplaintCase.status != "Disposed"
    ).all()
    distinct_bureaus = {c.current_bureau_id for c in open_cases}
    return len(distinct_bureaus) >= 2

def find_possible_duplicates(
    db: Session,
    subject: str,
    description: str,
    institution_id: Optional[int]
) -> List[Dict[str, Any]]:
    if not institution_id:
        return []

    open_cases = db.query(ComplaintCase).filter(
        ComplaintCase.institution_id == institution_id,
        ComplaintCase.status != "Disposed"
    ).all()

    matches = []
    text_new = f"{subject} {description}"
    tokens_new = extract_tokens(text_new)

    for c in open_cases:
        text_existing = f"{c.subject} {c.description}"
        tokens_exist = extract_tokens(text_existing)
        shared = list(tokens_new.intersection(tokens_exist))
        sim = fuzz.token_set_ratio(normalize_text(text_new), normalize_text(text_existing))

        if sim >= 55.0 or len(shared) >= 4:
            matches.append({
                "case_id": c.id,
                "case_no": c.case_no,
                "bureau_code": c.current_bureau.code if c.current_bureau else "UNKNOWN",
                "category": c.category,
                "subject": c.subject,
                "similarity_score": round(sim, 1),
                "shared_keywords": shared[:6]
            })

    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches
