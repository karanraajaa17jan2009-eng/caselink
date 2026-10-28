import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Institution, ComplaintCase, CaseAction, CaseLink, Bureau, Region, User
from app.services.matching import (
    normalize_text, normalize_permanent_id, resolve_institution,
    score_pair, run_overlap_scan, find_possible_duplicates
)

@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()

    # Seed test region & bureaus
    reg = Region(name="Southern", office_city="Chennai")
    db.add(reg)
    b_rb = Bureau(code="RB", name="Regulation Bureau", type="BUREAU")
    b_pgrc = Bureau(code="PGRC", name="Public Grievance Redressal Cell", type="CELL")
    b_ab = Bureau(code="AB", name="Approval Bureau", type="BUREAU")
    db.add_all([b_rb, b_pgrc, b_ab])
    db.flush()

    # Seed test institutions
    inst1 = Institution(
        permanent_id="1-4821937001",
        name="Sri Venkateswara Institute of Engineering & Technology",
        normalized_name=normalize_text("Sri Venkateswara Institute of Engineering & Technology"),
        institution_type="College",
        management_type="Private",
        address="Sector 5, Knowledge Park",
        district="Nellore",
        state="Andhra Pradesh",
        pincode="524001",
        region_id=reg.id
    )
    inst2 = Institution(
        permanent_id="1-4821937002",
        name="Maharaja Agrasen College of Technology",
        normalized_name=normalize_text("Maharaja Agrasen College of Technology"),
        institution_type="College",
        management_type="Trust",
        address="Near Ring Road",
        district="Bhopal",
        state="Madhya Pradesh",
        pincode="462001",
        region_id=reg.id
    )
    db.add_all([inst1, inst2])
    db.commit()

    yield db
    db.close()

def test_abbreviation_expansion():
    raw = "SVIET inst of engg & tech, nellore"
    norm = normalize_text(raw)
    assert "institute" in norm
    assert "engineering" in norm
    assert "technology" in norm
    assert "&" not in norm
    assert "and" in norm

def test_permanent_id_normalization():
    assert normalize_permanent_id("1-4821937001") == "14821937001"
    assert normalize_permanent_id("AICTE: 1-4821937001 ") == "14821937001"
    assert normalize_permanent_id("ID: 1-4821937001") == "14821937001"

def test_exact_permanent_id_match(test_db):
    inst_id, conf, ev = resolve_institution(
        test_db,
        raw_permanent_id="1-4821937001",
        raw_name="Sri Venkateswara Institute of Engineering & Technology",
        raw_address="Nellore"
    )
    assert inst_id is not None
    assert conf >= 0.98
    assert "EXACT_PERMANENT_ID" in ev["matched_method"]

def test_id_name_conflict_handling(test_db):
    # ID belongs to Sri Venkateswara, but name says Maharaja Agrasen
    inst_id, conf, ev = resolve_institution(
        test_db,
        raw_permanent_id="1-4821937001",
        raw_name="Maharaja Agrasen College",
        raw_address="Bhopal"
    )
    assert inst_id is not None
    assert conf <= 0.60
    assert ev["matched_method"] == "ID_NAME_CONFLICT"

def test_wrong_id_right_name_fuzzy_resolution(test_db):
    # Missing/wrong ID, but name is similar with abbreviations
    inst_id, conf, ev = resolve_institution(
        test_db,
        raw_permanent_id="WRONG-9999",
        raw_name="Sri Venkateswara Inst. of Engg and Tech, Nellore",
        raw_address="Nellore, Andhra Pradesh - 524001"
    )
    inst = test_db.query(Institution).filter(Institution.id == inst_id).first()
    assert inst is not None
    assert "Venkateswara" in inst.name
    assert conf >= 0.80

def test_score_pair_high_band(test_db):
    inst = test_db.query(Institution).first()
    b_rb = test_db.query(Bureau).filter(Bureau.code == "RB").first()
    b_pgrc = test_db.query(Bureau).filter(Bureau.code == "PGRC").first()

    case_a = ComplaintCase(
        case_no="PGRC-2026-00001",
        institution_id=inst.id,
        category="Excess/Illegal Fee Collection",
        subject="Extortion of illegal fee for semester exam",
        description="College administration demanding Rs 45,000 extra fee from computer science students.",
        received_date=datetime.date.today() - datetime.timedelta(days=5),
        status="Under Process",
        current_bureau_id=b_pgrc.id,
        original_bureau_id=b_pgrc.id,
        due_date=datetime.date.today() + datetime.timedelta(days=20),
        match_confidence=1.0
    )
    case_b = ComplaintCase(
        case_no="RB-2026-00002",
        institution_id=inst.id,
        category="Excess/Illegal Fee Collection",
        subject="Collection of excess unapproved fee from students",
        description="Representation against illegal fee collection of Rs 45,000 for examination registration.",
        received_date=datetime.date.today() - datetime.timedelta(days=7),
        status="Under Process",
        current_bureau_id=b_rb.id,
        original_bureau_id=b_rb.id,
        due_date=datetime.date.today() + datetime.timedelta(days=15),
        match_confidence=1.0
    )

    score, evidence = score_pair(case_a, case_b)
    assert score >= 0.80
    assert "institution" in evidence["matched_fields"]
    assert "category" in evidence["matched_fields"]
    assert len(evidence["shared_keywords"]) > 0

def test_score_pair_cross_bureau_possible_band(test_db):
    inst = test_db.query(Institution).first()
    b_rb = test_db.query(Bureau).filter(Bureau.code == "RB").first()
    b_pgrc = test_db.query(Bureau).filter(Bureau.code == "PGRC").first()

    case_a = ComplaintCase(
        case_no="PGRC-2026-00010",
        institution_id=inst.id,
        category="Infrastructure Deficiency",
        subject="Library book shortage",
        description="Library does not have books.",
        received_date=datetime.date.today() - datetime.timedelta(days=10),
        status="Under Process",
        current_bureau_id=b_pgrc.id,
        original_bureau_id=b_pgrc.id,
        due_date=datetime.date.today() + datetime.timedelta(days=20),
        match_confidence=0.9
    )
    case_b = ComplaintCase(
        case_no="RB-2026-00011",
        institution_id=inst.id,
        category="Faculty Shortage / Qualification",
        subject="Faculty shortage in mechanical engineering",
        description="Faculty cadre ratio not maintained as per handbook.",
        received_date=datetime.date.today() - datetime.timedelta(days=12),
        status="Under Process",
        current_bureau_id=b_rb.id,
        original_bureau_id=b_rb.id,
        due_date=datetime.date.today() + datetime.timedelta(days=20),
        match_confidence=0.9
    )

    score, evidence = score_pair(case_a, case_b)
    # Different bureaus on same institution gets at least 0.65
    assert score >= 0.65
    assert "PGRC" in evidence["bureaus"]
    assert "RB" in evidence["bureaus"]

def test_no_auto_merge_principle(test_db):
    # Verify that score_pair produces suggestions and does NOT mutate case records
    inst = test_db.query(Institution).first()
    b_rb = test_db.query(Bureau).filter(Bureau.code == "RB").first()

    c1 = ComplaintCase(
        id=901,
        case_no="RB-2026-00901",
        institution_id=inst.id,
        category="Other",
        subject="Issue A",
        description="Detail A",
        complainant_type="Student",
        source="Portal",
        received_date=datetime.date.today(),
        status="Received",
        current_bureau_id=b_rb.id,
        original_bureau_id=b_rb.id,
        due_date=datetime.date.today() + datetime.timedelta(days=30),
        match_confidence=1.0
    )
    c2 = ComplaintCase(
        id=902,
        case_no="RB-2026-00902",
        institution_id=inst.id,
        category="Other",
        subject="Issue B",
        description="Detail B",
        complainant_type="Student",
        source="Portal",
        received_date=datetime.date.today(),
        status="Received",
        current_bureau_id=b_rb.id,
        original_bureau_id=b_rb.id,
        due_date=datetime.date.today() + datetime.timedelta(days=30),
        match_confidence=1.0
    )
    score, _ = score_pair(c1, c2)
    # Ensure neither case is modified
    assert c1.status == "Received"
    assert c2.status == "Received"
    assert c1.id == 901
    assert c2.id == 902

def test_confirmed_link_not_overwritten(test_db):
    inst = test_db.query(Institution).first()
    b_rb = test_db.query(Bureau).filter(Bureau.code == "RB").first()
    b_pgrc = test_db.query(Bureau).filter(Bureau.code == "PGRC").first()

    c1 = ComplaintCase(
        case_no="RB-2026-00905",
        institution_id=inst.id,
        category="Admission Irregularities",
        subject="Quota violation",
        description="Admissions violated merit quota.",
        complainant_type="Student",
        source="Portal",
        received_date=datetime.date.today(),
        status="Under Process",
        current_bureau_id=b_rb.id,
        original_bureau_id=b_rb.id,
        due_date=datetime.date.today() + datetime.timedelta(days=30),
        match_confidence=1.0
    )
    c2 = ComplaintCase(
        case_no="PGRC-2026-00906",
        institution_id=inst.id,
        category="Admission Irregularities",
        subject="Quota violation grievance",
        description="Student complaint regarding admission quota violation.",
        complainant_type="Student",
        source="Portal",
        received_date=datetime.date.today(),
        status="Under Process",
        current_bureau_id=b_pgrc.id,
        original_bureau_id=b_pgrc.id,
        due_date=datetime.date.today() + datetime.timedelta(days=30),
        match_confidence=1.0
    )
    test_db.add_all([c1, c2])
    test_db.commit()

    # Pre-insert a CONFIRMED link
    link = CaseLink(
        case_a_id=c1.id,
        case_b_id=c2.id,
        institution_id=inst.id,
        score=0.92,
        confidence_band="HIGH",
        evidence={"reasons": ["Pre-confirmed by officer"]},
        status="CONFIRMED"
    )
    test_db.add(link)
    test_db.commit()

    # Run scan
    run_overlap_scan(test_db)
    reloaded = test_db.query(CaseLink).filter(CaseLink.id == link.id).first()
    # Must remain CONFIRMED
    assert reloaded.status == "CONFIRMED"

def test_duplicate_precheck(test_db):
    inst = test_db.query(Institution).first()
    matches = find_possible_duplicates(
        test_db,
        subject="Admission Irregularities",
        description="Admissions violated merit quota and collected donation",
        institution_id=inst.id
    )
    assert len(matches) > 0
    assert matches[0]["similarity_score"] > 50.0

def test_unresolved_low_confidence(test_db):
    inst_id, conf, ev = resolve_institution(
        test_db,
        raw_permanent_id=None,
        raw_name="Completely Unknown Random Academy 12345",
        raw_address="Nowhere"
    )
    assert inst_id is None
    assert conf < 0.65
    assert ev["matched_method"] == "UNRESOLVED"
