import random
import datetime
from sqlalchemy.orm import Session
from app.models import (
    Region, Bureau, User, Institution, ComplaintCase, CaseAction,
    SlaRule, Alert, CaseLink
)
from app.auth import get_password_hash
from app.services.matching import run_overlap_scan, normalize_text
from app.services.sla import generate_alerts

CATEGORIES = [
    "Unapproved/Unauthorized Courses",
    "Admission Irregularities",
    "Excess/Illegal Fee Collection",
    "Faculty Shortage / Qualification",
    "Infrastructure Deficiency",
    "Fake Affiliation / Approval Claims",
    "Withholding of Certificates / Documents",
    "Harassment / Ragging",
    "Salary/Service Matters of Faculty",
    "Closure of Institution / Student Transfer",
    "Mandatory Disclosure Violation",
    "Other"
]

COMPLAINT_TEMPLATES = {
    "Unapproved/Unauthorized Courses": [
        "It is brought to your urgent notice that the institution has commenced admissions in unauthorized {course} programs without obtaining mandatory prior approval from AICTE for the academic year {year}. Students were misled through deceptive prospectuses and exorbitant fees totaling Rs. {fee} were collected without lawful sanction.",
        "The management has introduced an unapproved specialized stream in {course} claiming deemed AICTE affiliation. Around {num} students have enrolled in good faith and are now facing uncertainty regarding their degree validation and employment prospects."
    ],
    "Admission Irregularities": [
        "The college management has flagrantly violated state centralized counseling norms and AICTE admission guidelines for {year}. Seats reserved under merit quota were covertly converted into management quota seats against unauthorized capitation fees of Rs. {fee} per candidate.",
        "Severe irregularities observed during direct second-year lateral entry admissions. Eligible diploma holders with valid merit rankings were bypassed in favor of candidates who paid unauthorized donations amounting to Rs. {fee}."
    ],
    "Excess/Illegal Fee Collection": [
        "The institution is extorting arbitrary development fees and examination charges amounting to Rs. {fee} over and above the fee structure approved by the State Fee Regulatory Committee. Hall tickets for semester examinations are being withheld for non-payment.",
        "Despite repeated circulars against capitation fees, students enrolled in the {course} department are coerced to remit Rs. {fee} under the guise of mandatory skill development kits and building maintenance funds."
    ],
    "Faculty Shortage / Qualification": [
        "The department of {course} is operating with an acute shortage of qualified faculty members. Only {num} regular faculty members are present against the sanctioned cadre strength, violating the mandated 1:15 cadre ratio as per AICTE Approval Process Handbook.",
        "Several assistant professors appointed in core engineering streams do not possess the minimum prescribed qualifications (M.Tech/Ph.D.) and were recruited on ad-hoc basis without formal selection committee procedures."
    ],
    "Infrastructure Deficiency": [
        "The technical campus lacks basic computer center amenities, high-speed broadband, and mandated licensed software suites. Crucial laboratory machinery for {course} is dysfunctional or obsolete, severely hampering practical coursework.",
        "Hostel facilities and library holdings are deficient. The college central library does not subscribe to mandated AICTE e-journal consortiums, and physical book volumes per student fall drastically below regulatory thresholds."
    ],
    "Fake Affiliation / Approval Claims": [
        "The institution publishes misleading advertisements in regional dailies and on its official website claiming full AICTE approval and NAAC 'A+' accreditation for its newly established {course} division, which is entirely fabricated.",
        "Prospective students and parents are being duped with fake certificates of extension of approval (EoA). Scrutiny of the official AICTE portal reveals that the institution has been placed under withdrawal of approval status."
    ],
    "Withholding of Certificates / Documents": [
        "Upon completion of coursework, the college administration is unlawfully retaining original secondary, intermediate, and transfer certificates of {num} graduating students, demanding clearance of unjustified dues of Rs. {fee}.",
        "A student who sought cancellation of admission within prescribed AICTE timelines was denied return of original educational dossiers and refund of deposited caution fee of Rs. {fee}."
    ],
    "Harassment / Ragging": [
        "First-year students residing in Campus Hostel Block-B have been subjected to severe intimidation and verbal abuse by senior batches. The mandated anti-ragging squad failed to take cognizance despite written representations.",
        "Faculty members and non-teaching staff have reported persistent workplace harassment and arbitrary deductions from remuneration without statutory notice or redressal."
    ],
    "Salary/Service Matters of Faculty": [
        "The management has not disbursed monthly salaries to {num} teaching faculty members for the past 4 months. Furthermore, mandatory provident fund (EPF) deductions have not been credited to employee accounts.",
        "Faculty members are deprived of 7th Central Pay Commission scales and DA revisions, in direct violation of AICTE notification F.No. 61-1/RIFD/7th CPC/2016-17."
    ],
    "Closure of Institution / Student Transfer": [
        "The governing trust has abruptly declared unilateral closure of the {course} department without initiating formal progressive closure procedures with AICTE, leaving {num} continuing students stranded.",
        "Students of the closing polytechnic wing have not been facilitated with lawful transfer to neighboring approved institutions, jeopardizing their academic continuity."
    ],
    "Mandatory Disclosure Violation": [
        "The college website fails to host updated mandatory disclosures regarding faculty profiles, audited financial statements, fee breakdowns, and grievance redressal committee details as required by AICTE regulations.",
        "Information displayed regarding approved intake capacity is outdated and conflicts with the official AICTE Approval Process Handbook intake limits."
    ],
    "Other": [
        "Serious administrative irregularities reported regarding misappropriation of technical grant funds received under AICTE MODROBS scheme for laboratory modernization.",
        "General governance lapse involving non-constitution of Internal Complaints Committee (ICC) and Student Grievance Redressal Committee (SGRC) as per AICTE Gazette Regulations."
    ]
}

def seed_database(db: Session):
    random.seed(2026)
    today = datetime.date.today()

    # Check if already seeded
    if db.query(Region).count() > 0:
        print("[SEED] Database already populated. Skipping initial seed.")
        return

    print("[SEED] Initializing database seed with deterministic seed 2026...")

    # 1. 8 Regions
    regions_data = [
        ("Eastern", "Kolkata"),
        ("North-Eastern", "Guwahati"),
        ("Northern", "New Delhi"),
        ("North-Western", "Chandigarh"),
        ("Western", "Mumbai"),
        ("Central", "Bhopal"),
        ("Southern", "Chennai"),
        ("South-Western", "Bengaluru")
    ]
    regions = []
    for name, city in regions_data:
        r = Region(name=name, office_city=city)
        db.add(r)
        regions.append(r)
    db.flush()

    # 2. 8 Bureaus
    bureaus_data = [
        ("RB", "Regulation Bureau", "BUREAU"),
        ("PGRC", "Public Grievance Redressal Cell", "CELL"),
        ("AB", "Approval Bureau", "BUREAU"),
        ("ACAD", "Academic Bureau", "BUREAU"),
        ("FIN", "Finance & Accounts Bureau", "BUREAU"),
        ("LEGAL", "Legal Cell", "CELL"),
        ("VIG", "Vigilance Cell", "CELL"),
        ("RO", "Regional Office Coordination", "REGIONAL")
    ]
    bureau_map = {}
    for code, name, b_type in bureaus_data:
        b = Bureau(code=code, name=name, type=b_type)
        db.add(b)
        db.flush()
        bureau_map[code] = b

    # 3. 12 Users
    pwd_hash = get_password_hash("Caselink@2026")
    users_data = [
        ("Dr. Rajeshwar Sharma", "admin@caselink.demo", "ADMIN", None, None, "System Administrator"),
        ("Shri Anand Vardhan", "rb1@caselink.demo", "RB_OFFICER", bureau_map["RB"].id, None, "Deputy Director, Regulation"),
        ("Smt. Sunita Meena", "rb2@caselink.demo", "RB_OFFICER", bureau_map["RB"].id, None, "Assistant Director, Regulation"),
        ("Shri Praveen Nair", "pgrc1@caselink.demo", "PGRC_OFFICER", bureau_map["PGRC"].id, None, "Section Officer, PGRC"),
        ("Dr. Kavita Deshmukh", "pgrc2@caselink.demo", "PGRC_OFFICER", bureau_map["PGRC"].id, None, "Grievance Officer, PGRC"),
        ("Shri Suresh Chandra", "ab1@caselink.demo", "CELL_OFFICER", bureau_map["AB"].id, None, "Scrutiny Officer, Approval"),
        ("Adv. Meenakshi Raman", "legal1@caselink.demo", "CELL_OFFICER", bureau_map["LEGAL"].id, None, "Legal Consultant"),
        ("Shri Vikramaditya Roy", "vig1@caselink.demo", "CELL_OFFICER", bureau_map["VIG"].id, None, "Inquiry Officer, Vigilance"),
        ("Dr. K. Senthil Kumar", "ro.south@caselink.demo", "REGIONAL_OFFICER", bureau_map["RO"].id, regions[6].id, "Regional Officer, Southern"),
        ("Dr. Harpreet Singh", "ro.north@caselink.demo", "REGIONAL_OFFICER", bureau_map["RO"].id, regions[2].id, "Regional Officer, Northern"),
        ("Dr. Rameshwar Prasad", "director@caselink.demo", "SENIOR_MGMT", None, None, "Adviser & Director"),
        ("Prof. Anil Sahasrabudhe", "secretary@caselink.demo", "SENIOR_MGMT", None, None, "Member Secretary")
    ]
    users = []
    for name, email, role, b_id, r_id, desig in users_data:
        u = User(
            name=name,
            email=email,
            password_hash=pwd_hash,
            role=role,
            bureau_id=b_id,
            region_id=r_id,
            designation=desig,
            is_active=True
        )
        db.add(u)
        users.append(u)
    db.flush()

    # 4. Default SLA Rules
    sla_data = [
        ("Critical", 7),
        ("High", 15),
        ("Medium", 30),
        ("Low", 45)
    ]
    for cat in CATEGORIES:
        for prio, days in sla_data:
            rule = SlaRule(category=cat, priority=prio, days_allowed=days)
            db.add(rule)
    db.flush()

    # 5. 80 Fictional Institutions
    states_by_region = {
        0: [("West Bengal", ["Kolkata", "Howrah", "North 24 Parganas", "Hooghly"]), ("Odisha", ["Bhubaneswar", "Cuttack", "Rourkela"]), ("Bihar", ["Patna", "Gaya", "Muzaffarpur"]), ("Jharkhand", ["Ranchi", "Jamshedpur", "Dhanbad"])],
        1: [("Assam", ["Guwahati", "Dibrugarh", "Silchar"]), ("Meghalaya", ["Shillong"]), ("Tripura", ["Agartala"])],
        2: [("Delhi", ["New Delhi", "North Delhi", "South Delhi"]), ("Uttar Pradesh", ["Lucknow", "Noida", "Kanpur", "Ghaziabad", "Varanasi"])],
        3: [("Punjab", ["Jalandhar", "Ludhiana", "Amritsar", "Patiala"]), ("Haryana", ["Gurugram", "Faridabad", "Ambala", "Karnal"]), ("Chandigarh", ["Chandigarh"]), ("Himachal Pradesh", ["Shimla", "Solan"])],
        4: [("Maharashtra", ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"]), ("Goa", ["Panaji", "Margao"]), ("Gujarat", ["Ahmedabad", "Surat", "Vadodara", "Rajkot"])],
        5: [("Madhya Pradesh", ["Bhopal", "Indore", "Gwalior", "Jabalpur"]), ("Chhattisgarh", ["Raipur", "Bilaspur", "Bhilai"])],
        6: [("Tamil Nadu", ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"]), ("Kerala", ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"]), ("Puducherry", ["Puducherry"])],
        7: [("Karnataka", ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"]), ("Telangana", ["Hyderabad", "Warangal", "Nizamabad"]), ("Andhra Pradesh", ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"])]
    }

    inst_prefixes = ["Sri", "Shri", "Maharaja", "Dr. B.R. Ambedkar", "Swami Vivekananda", "Sardar Patel", "National", "Apex", "Horizon", "Pinnacle", "Vanguard", "Kalinga", "Chhatrapati", "Deccan", "Malwa", "Cauvery", "Ganga", "Brahmaputra", "Indus", "Vindhya"]
    inst_middles = ["Institute of Engineering & Technology", "College of Engineering", "Institute of Technology & Management", "Polytechnic Institute", "Faculty of Technical Education", "Academy of Higher Engineering", "Institute of Advanced Technology"]
    
    institutions = []
    pid_counter = 4821937000

    for i in range(80):
        reg_idx = i % 8
        reg = regions[reg_idx]
        state_list = states_by_region[reg_idx]
        chosen_state, dist_list = random.choice(state_list)
        chosen_dist = random.choice(dist_list)

        prefix = inst_prefixes[i % len(inst_prefixes)]
        mid = inst_middles[(i + 3) % len(inst_middles)]
        city_suffix = chosen_dist
        inst_name = f"{prefix} {mid}, {city_suffix}"
        perm_id = f"1-{pid_counter + i}"

        inst_type = random.choice(["College", "University", "Polytechnic", "Standalone"])
        mgmt_type = random.choice(["Private", "Government", "Trust", "Deemed"])
        appr_status = random.choices(["Approved", "Under Scrutiny", "Withdrawn", "Closed"], weights=[80, 12, 5, 3])[0]
        pincode = f"{random.randint(11, 79)}{random.randint(1000, 9999)}"

        inst = Institution(
            permanent_id=perm_id,
            name=inst_name,
            normalized_name=normalize_text(inst_name),
            institution_type=inst_type,
            management_type=mgmt_type,
            address=f"Plot No. {random.randint(10, 450)}, Sector {random.randint(1, 25)}, Industrial Knowledge Corridor",
            district=chosen_dist,
            state=chosen_state,
            pincode=pincode,
            region_id=reg.id,
            email=f"registrar@inst-{i+1}.edu.in",
            phone=f"+91 {random.randint(91000, 99999)} {random.randint(10000, 99999)}",
            approval_status=appr_status,
            established_year=random.randint(1995, 2021),
            is_active=True
        )
        db.add(inst)
        institutions.append(inst)

    db.flush()

    # 6. Generate ~450 cases over past 12 months with planted scenarios
    cases = []
    case_counter = 100

    # Planted Scenario Setup:
    # a) 12 institutions with simultaneous PGRC + RB cases (classic overlap)
    planted_a_insts = institutions[:12]
    # b) 5 institutions with 3 cases across 3 bureaus (RB + PGRC + Legal/Vigilance)
    planted_b_insts = institutions[12:17]
    # c) 8 cases with missing/wrong permanent ID and misspelled name
    planted_c_insts = institutions[17:25]
    # d) 6 pairs of exact duplicate complaints (same institution, same category, near identical text)
    planted_d_insts = institutions[25:31]
    # e) 3 institutions with repeat complaints over several months
    planted_e_insts = institutions[31:34]
    # f) 4 transfer chains and 5 escalated cases
    # (will tag specific cases during generation)

    courses_list = ["B.Tech Computer Science & Artificial Intelligence", "B.Tech Mechanical Engineering", "Diploma in Civil Engineering", "B.Tech Electronics & Communication", "Master of Computer Applications", "MBA in Technology Management"]
    complainant_types = ["Student", "Faculty", "Parent", "Staff", "Other Stakeholder", "Anonymous"]

    # We will track case count to reach ~450
    # First, plant Scenario A: 12 pairs of PGRC + RB open cases
    for idx, inst in enumerate(planted_a_insts):
        cat = random.choice(["Unapproved/Unauthorized Courses", "Admission Irregularities", "Excess/Illegal Fee Collection"])
        course = random.choice(courses_list)
        fee = f"{random.randint(45, 180)},000"
        rec_date = today - datetime.timedelta(days=random.randint(10, 60))

        # PGRC case
        pgrc_no = f"PGRC-2026-{case_counter:05d}"
        case_counter += 1
        pgrc_desc = f"Formal student petition regarding {cat.lower()} at {inst.name}. The college enrolled students for {course} demanding illegal fee of Rs. {fee} without approval. Kindly arrange immediate inspection."
        pgrc_case = ComplaintCase(
            case_no=pgrc_no,
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Student",
            complainant_name=f"Rohan Gupta {idx+1}",
            complainant_email=f"student{idx+1}@gmail.com",
            category=cat,
            subject=f"Grievance regarding {cat} in {course}",
            description=pgrc_desc,
            source="Portal",
            received_date=rec_date,
            status="Under Process",
            priority="High",
            current_bureau_id=bureau_map["PGRC"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[3].id,
            last_action="Inquiry Initiated",
            last_action_date=datetime.datetime.combine(rec_date + datetime.timedelta(days=2), datetime.time(11, 0)),
            next_action="Awaiting explanation from Principal",
            due_date=rec_date + datetime.timedelta(days=15),
            match_confidence=1.0
        )
        db.add(pgrc_case)
        cases.append(pgrc_case)

        # RB case (overlapping on same institution with different wording)
        rb_no = f"RB-2026-{case_counter:05d}"
        case_counter += 1
        rb_desc = f"Inspection report and parent representation alleging that {inst.name} has admitted students beyond sanctioned intake in {course} charging capitation charges of Rs. {fee}. Matter requires regulatory scrutiny under AICTE approval norms."
        rb_case = ComplaintCase(
            case_no=rb_no,
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Parent",
            complainant_name=f"V. K. Gupta {idx+1}",
            complainant_email=f"parent{idx+1}@yahoo.co.in",
            category=cat,
            subject=f"Regulatory violation regarding {cat} and approval compliance",
            description=rb_desc,
            source="Letter",
            received_date=rec_date + datetime.timedelta(days=random.randint(1, 10)),
            status="Under Process",
            priority="High",
            current_bureau_id=bureau_map["RB"].id,
            original_bureau_id=bureau_map["RB"].id,
            assigned_officer_id=users[1].id,
            last_action="Notice Issued",
            last_action_date=datetime.datetime.combine(rec_date + datetime.timedelta(days=4), datetime.time(14, 30)),
            next_action="Show-cause reply evaluation",
            due_date=rec_date + datetime.timedelta(days=20),
            match_confidence=1.0
        )
        db.add(rb_case)
        cases.append(rb_case)

    # Scenario B: 5 institutions with 3 cases across 3 bureaus (RB + PGRC + Legal/Vig)
    for idx, inst in enumerate(planted_b_insts):
        rec_date = today - datetime.timedelta(days=random.randint(20, 80))
        cat = "Fake Affiliation / Approval Claims"
        
        # 1. RB case
        c_rb = ComplaintCase(
            case_no=f"RB-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Other Stakeholder",
            category=cat,
            subject=f"Scrutiny of Extension of Approval (EoA) documents - {inst.name}",
            description=f"Serious discrepancy discovered in mandatory disclosure documents submitted for {inst.name}. Campus boundary survey conflicts with Master Land Deed.",
            source="Portal",
            received_date=rec_date,
            status="Under Process",
            priority="High",
            current_bureau_id=bureau_map["RB"].id,
            original_bureau_id=bureau_map["RB"].id,
            assigned_officer_id=users[1].id,
            due_date=rec_date + datetime.timedelta(days=15),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c_rb)
        cases.append(c_rb)

        # 2. PGRC case
        c_pgrc = ComplaintCase(
            case_no=f"PGRC-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Student",
            category=cat,
            subject=f"False AICTE approval claims displayed during admissions",
            description=f"College brochure circulated during state admissions represented unapproved wings as AICTE sanctioned. Enrolled students are denied government scholarship benefits.",
            source="CPGRAMS",
            received_date=rec_date + datetime.timedelta(days=5),
            status="Pending",
            priority="High",
            current_bureau_id=bureau_map["PGRC"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[3].id,
            due_date=rec_date + datetime.timedelta(days=20),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c_pgrc)
        cases.append(c_pgrc)

        # 3. LEGAL or VIG case
        target_b = bureau_map["LEGAL"] if idx % 2 == 0 else bureau_map["VIG"]
        target_user = users[6] if idx % 2 == 0 else users[7]
        c_leg = ComplaintCase(
            case_no=f"{target_b.code}-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Staff",
            category="Mandatory Disclosure Violation",
            subject=f"Legal challenge / Vigilance inquiry regarding land title records",
            description=f"Legal notice served regarding alleged forgery of land conversion certificate presented to AICTE Standing Hearing Committee (SHC) for {inst.name}.",
            source="Letter",
            received_date=rec_date + datetime.timedelta(days=12),
            status="Under Process",
            priority="Critical",
            current_bureau_id=target_b.id,
            original_bureau_id=target_b.id,
            assigned_officer_id=target_user.id,
            due_date=rec_date + datetime.timedelta(days=19),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c_leg)
        cases.append(c_leg)

    # Scenario C: 8 cases with missing/wrong ID and abbreviated/misspelled name
    for idx, inst in enumerate(planted_c_insts):
        # Create an abbreviated/misspelled version of institution name
        words = inst.name.split()
        short_name = f"{words[0]} Inst of Engg & Tech, {inst.district}"
        rec_date = today - datetime.timedelta(days=random.randint(15, 90))
        cat = random.choice(["Excess/Illegal Fee Collection", "Withholding of Certificates / Documents", "Infrastructure Deficiency"])

        case_c = ComplaintCase(
            case_no=f"PGRC-2026-{case_counter:05d}",
            institution_id=inst.id,  # Will be mapped by fuzzy resolver
            raw_institution_name=short_name,
            raw_address=f"Near Highway, {inst.district}, {inst.state} - {inst.pincode}",
            raw_permanent_id="" if idx % 2 == 0 else "WRONG-ID-9999",
            complainant_type="Student",
            complainant_name=f"Amit Verma {idx+1}",
            category=cat,
            subject=f"Grievance regarding {cat.lower()} filed without exact AICTE ID",
            description=f"Student representation filed against {short_name}. The institution refused to return original mark sheets despite clear AICTE regulations. Immediate redressal requested.",
            source="Walk-in",
            received_date=rec_date,
            status="Under Process",
            priority="Medium",
            current_bureau_id=bureau_map["PGRC"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[3].id,
            due_date=rec_date + datetime.timedelta(days=30),
            match_confidence=0.88  # Resolved via fuzzy matching
        )
        case_counter += 1
        db.add(case_c)
        cases.append(case_c)

    # Scenario D: 6 pairs of exact duplicate complaints (same institution, same category, near-identical text)
    for idx, inst in enumerate(planted_d_insts):
        cat = "Withholding of Certificates / Documents"
        fee = f"{random.randint(15, 60)},000"
        dup_text = f"Student completed B.Tech in 2025 from {inst.name}. Administration is illegally withholding original Degree Certificate demanding arbitrary library dues of Rs. {fee}."
        rec_date = today - datetime.timedelta(days=random.randint(10, 40))

        # First instance via Portal
        c1 = ComplaintCase(
            case_no=f"PGRC-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Student",
            complainant_name=f"Deepak Nair {idx+1}",
            category=cat,
            subject=f"Illegal withholding of original Degree Certificate - {inst.name}",
            description=dup_text,
            source="Portal",
            received_date=rec_date,
            status="Under Process",
            priority="Medium",
            current_bureau_id=bureau_map["PGRC"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[4].id,
            due_date=rec_date + datetime.timedelta(days=30),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c1)
        cases.append(c1)

        # Duplicate instance via CPGRAMS or Email
        c2 = ComplaintCase(
            case_no=f"PGRC-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Student",
            complainant_name=f"Deepak Nair {idx+1}",
            category=cat,
            subject=f"Illegal withholding of original Degree Certificate - {inst.name}",
            description=dup_text + " Re-submitted through public grievance portal due to lack of immediate response.",
            source="CPGRAMS",
            received_date=rec_date + datetime.timedelta(days=2),
            status="Received",
            priority="Medium",
            current_bureau_id=bureau_map["PGRC"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[4].id,
            due_date=rec_date + datetime.timedelta(days=32),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c2)
        cases.append(c2)

    # Scenario E: 3 institutions with repeat complaints over several months
    for inst in planted_e_insts:
        for m in range(4):
            cat = random.choice(CATEGORIES)
            rec_date = today - datetime.timedelta(days=(m + 1) * 65)
            c_rep = ComplaintCase(
                case_no=f"RB-2026-{case_counter:05d}",
                institution_id=inst.id,
                raw_institution_name=inst.name,
                raw_permanent_id=inst.permanent_id,
                complainant_type="Faculty" if m % 2 == 0 else "Student",
                category=cat,
                subject=f"Periodic complaint ({m+1}/4): {cat} - {inst.name}",
                description=f"Serial complaint regarding persistent governance and compliance failures at {inst.name}. Multiple show-cause notices previously issued have yielded no corrective action.",
                source="Portal",
                received_date=rec_date,
                status="Disposed" if m > 0 else "Under Process",
                priority="High",
                current_bureau_id=bureau_map["RB"].id,
                original_bureau_id=bureau_map["RB"].id,
                assigned_officer_id=users[2].id,
                due_date=rec_date + datetime.timedelta(days=30),
                disposal_date=rec_date + datetime.timedelta(days=25) if m > 0 else None,
                disposal_remark="Hearing conducted; penalty imposed and compliance report placed on record." if m > 0 else None,
                match_confidence=1.0
            )
            case_counter += 1
            db.add(c_rep)
            cases.append(c_rep)

    # Scenario F: 4 transfer chains (PGRC -> RB -> LEGAL) and 5 escalated cases
    for i in range(4):
        inst = institutions[35 + i]
        rec_date = today - datetime.timedelta(days=random.randint(45, 120))
        c_tr = ComplaintCase(
            case_no=f"PGRC-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Student",
            category="Unapproved/Unauthorized Courses",
            subject=f"Multi-bureau transfer chain case: Course approval issue at {inst.name}",
            description=f"Complaint initially lodged with PGRC. On preliminary review, found to involve core approval conditions, hence transferred to RB, then escalated to Legal Cell for standing hearing advice.",
            source="Portal",
            received_date=rec_date,
            status="Transferred",
            priority="High",
            current_bureau_id=bureau_map["LEGAL"].id,
            original_bureau_id=bureau_map["PGRC"].id,
            assigned_officer_id=users[6].id,
            due_date=rec_date + datetime.timedelta(days=20),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c_tr)
        cases.append(c_tr)

    for i in range(5):
        inst = institutions[40 + i]
        rec_date = today - datetime.timedelta(days=random.randint(30, 90))
        c_esc = ComplaintCase(
            case_no=f"RB-2026-{case_counter:05d}",
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type="Faculty",
            category="Salary/Service Matters of Faculty",
            subject=f"Escalated grievance: Massive salary non-disbursement at {inst.name}",
            description=f"Persistent failure by college trust to disburse statutory pay scales to 42 faculty members. Regional office inspection confirmed grave non-compliance. Escalated to Member Secretary.",
            source="CPGRAMS",
            received_date=rec_date,
            status="Escalated",
            priority="Critical",
            current_bureau_id=bureau_map["RB"].id,
            original_bureau_id=bureau_map["RB"].id,
            assigned_officer_id=users[10].id,
            due_date=rec_date + datetime.timedelta(days=7),
            match_confidence=1.0
        )
        case_counter += 1
        db.add(c_esc)
        cases.append(c_esc)

    # Now fill remaining cases up to ~450
    # Bureau distribution: PGRC ~40%, RB ~30%, others ~30%
    # Realistic status mix: ~35% Disposed, ~30% Under Process, ~15% Pending, ~10% Transferred, ~10% Escalated
    # Overdue count ~25, due within 7 days ~40
    target_total = 450
    needed = target_total - len(cases)
    print(f"[SEED] Pre-planted {len(cases)} scenario cases. Generating {needed} more realistic cases...")

    overdue_seeded = 0
    due_soon_seeded = 0

    other_bureau_codes = ["AB", "ACAD", "FIN", "LEGAL", "VIG", "RO"]

    for k in range(needed):
        inst = random.choice(institutions)
        cat = random.choice(CATEGORIES)
        template = random.choice(COMPLAINT_TEMPLATES.get(cat, COMPLAINT_TEMPLATES["Other"]))

        b_choice = random.choices(["PGRC", "RB", "OTHER"], weights=[40, 30, 30])[0]
        if b_choice == "OTHER":
            b_code = random.choice(other_bureau_codes)
        else:
            b_code = b_choice

        b_obj = bureau_map[b_code]
        case_no = f"{b_code}-2026-{case_counter:05d}"
        case_counter += 1

        desc = template.format(
            course=random.choice(courses_list),
            year="2025-26",
            fee=f"{random.randint(25, 250)},000",
            num=random.randint(12, 60)
        )

        # Date received: between 365 days ago and today
        # Check if we should plant an overdue or due-soon case
        if overdue_seeded < 25 and random.random() < 0.25:
            rec_date = today - datetime.timedelta(days=random.randint(45, 90))
            sla_days = random.choice([7, 15, 30])
            due_date = rec_date + datetime.timedelta(days=sla_days)  # < today
            status = random.choice(["Under Process", "Pending"])
            overdue_seeded += 1
        elif due_soon_seeded < 40 and random.random() < 0.30:
            rec_date = today - datetime.timedelta(days=random.randint(10, 25))
            sla_days = (today - rec_date).days + random.randint(1, 6)
            due_date = rec_date + datetime.timedelta(days=sla_days)  # within 1-6 days from today
            status = random.choice(["Under Process", "Pending", "Received"])
            due_soon_seeded += 1
        else:
            rec_date = today - datetime.timedelta(days=random.randint(5, 350))
            sla_days = random.choice([7, 15, 30, 45])
            due_date = rec_date + datetime.timedelta(days=sla_days)
            # Standard status distribution
            status = random.choices(
                ["Disposed", "Under Process", "Pending", "Transferred", "Escalated"],
                weights=[35, 30, 15, 10, 10]
            )[0]

        disp_date = None
        disp_remark = None
        if status == "Disposed":
            disp_date = min(today, rec_date + datetime.timedelta(days=random.randint(10, 40)))
            disp_remark = random.choice([
                "Satisfactory explanation received from institution and verified by Regional Office.",
                "Inquiry concluded; necessary compliance affidavit furnished by the Principal.",
                "Refund processed and certificates returned to students under intimation to AICTE.",
                "Matter disposed after hearing before Appellate Committee with requisite caution notice."
            ])

        priority = random.choices(["Low", "Medium", "High", "Critical"], weights=[20, 50, 20, 10])[0]

        case = ComplaintCase(
            case_no=case_no,
            institution_id=inst.id,
            raw_institution_name=inst.name,
            raw_permanent_id=inst.permanent_id,
            complainant_type=random.choice(complainant_types),
            complainant_name=f"Complainant {case_counter}",
            category=cat,
            subject=f"Grievance regarding {cat.lower()} at {inst.name.split(',')[0]}",
            description=desc,
            source=random.choice(["Portal", "Email", "Letter", "CPGRAMS", "Walk-in"]),
            received_date=rec_date,
            status=status,
            priority=priority,
            current_bureau_id=b_obj.id,
            original_bureau_id=b_obj.id,
            due_date=due_date,
            disposal_date=disp_date,
            disposal_remark=disp_remark,
            match_confidence=1.0
        )
        db.add(case)
        cases.append(case)

    db.flush()

    # 7. Add 2-7 chronological case_actions for each case
    action_types = [
        "Received", "Assigned", "Inquiry Initiated", "Notice Issued",
        "Reply Received", "Inspection Ordered", "Remark Added"
    ]
    sample_remarks = [
        "Show-cause notice issued to the institution; reply sought within 15 days.",
        "Report called from Regional Office regarding infrastructure veracity.",
        "Complainant rejoinder received and tagged for scrutiny.",
        "Inspection committee constituted by Regulation Bureau.",
        "Transferred to RB as matter pertains to approval conditions.",
        "Institution explanation found unsatisfactory; personal hearing scheduled.",
        "Compliance affidavit received and forwarded for verification."
    ]

    for case in cases:
        action_count = random.randint(2, 6)
        curr_time = datetime.datetime.combine(case.received_date, datetime.time(9, 30))
        
        # Action 1: Received
        act1 = CaseAction(
            case_id=case.id,
            action_type="Received",
            from_bureau_id=case.original_bureau_id,
            to_bureau_id=case.original_bureau_id,
            performed_by_user_id=users[3].id,
            remarks=f"Grievance registered and acknowledged via {case.source}.",
            created_at=curr_time
        )
        db.add(act1)

        # Subsequent actions
        for a_idx in range(1, action_count):
            curr_time += datetime.timedelta(days=random.randint(1, 5), hours=random.randint(1, 4))
            if curr_time.date() > today:
                break

            act_type = action_types[min(a_idx, len(action_types) - 1)]
            remark = sample_remarks[a_idx % len(sample_remarks)]
            
            act = CaseAction(
                case_id=case.id,
                action_type=act_type,
                from_bureau_id=case.current_bureau_id,
                to_bureau_id=case.current_bureau_id,
                performed_by_user_id=random.choice(users).id,
                remarks=remark,
                created_at=curr_time
            )
            db.add(act)

        # If disposed, add final Disposed action
        if case.status == "Disposed" and case.disposal_date:
            disp_time = datetime.datetime.combine(case.disposal_date, datetime.time(16, 0))
            db.add(CaseAction(
                case_id=case.id,
                action_type="Disposed",
                from_bureau_id=case.current_bureau_id,
                to_bureau_id=case.current_bureau_id,
                performed_by_user_id=users[1].id,
                remarks=case.disposal_remark or "Matter disposed after due scrutiny.",
                created_at=disp_time
            ))

    db.commit()

    # 8. Run matching/overlap scan to detect and store all overlap links + alerts
    print("[SEED] Executing initial overlap detection scan...")
    scan_res = run_overlap_scan(db)
    print(f"[SEED] Overlap scan completed: {scan_res}")

    # 9. Run SLA alerts generator
    print("[SEED] Generating initial SLA alerts...")
    sla_res = generate_alerts(db)
    print(f"[SEED] SLA alerts completed: {sla_res}")

    print("==================================================================")
    print("AICTE CASELINK DATABASE SEED SUMMARY:")
    print(f" - Regions: {db.query(Region).count()}")
    print(f" - Bureaus: {db.query(Bureau).count()}")
    print(f" - Users: {db.query(User).count()}")
    print(f" - Institutions: {db.query(Institution).count()}")
    print(f" - Complaint Cases: {db.query(ComplaintCase).count()}")
    print(f" - Case Actions: {db.query(CaseAction).count()}")
    print(f" - Overlap Links: {db.query(CaseLink).count()}")
    print(f" - Alerts: {db.query(Alert).count()}")
    print("==================================================================")
