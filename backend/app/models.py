import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Float, Text, JSON,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    office_city = Column(String(100), nullable=False)

    institutions = relationship("Institution", back_populates="region")
    users = relationship("User", back_populates="region")


class Bureau(Base):
    __tablename__ = "bureaus"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)

    users = relationship("User", back_populates="bureau")
    cases_current = relationship("ComplaintCase", foreign_keys="ComplaintCase.current_bureau_id", back_populates="current_bureau")
    cases_original = relationship("ComplaintCase", foreign_keys="ComplaintCase.original_bureau_id", back_populates="original_bureau")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # ADMIN, RB_OFFICER, PGRC_OFFICER, CELL_OFFICER, REGIONAL_OFFICER, SENIOR_MGMT
    bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    designation = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bureau = relationship("Bureau", back_populates="users")
    region = relationship("Region", back_populates="users")
    assigned_cases = relationship("ComplaintCase", back_populates="assigned_officer")
    actions_performed = relationship("CaseAction", back_populates="performed_by")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    permanent_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=False, index=True)
    institution_type = Column(String(50), nullable=False)  # University, College, Polytechnic, Standalone
    management_type = Column(String(50), nullable=False)   # Government, Private, Deemed, Trust
    address = Column(String(500), nullable=False)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    pincode = Column(String(20), nullable=False, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    approval_status = Column(String(50), default="Approved", nullable=False)  # Approved, Withdrawn, Closed, Under Scrutiny
    established_year = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    region = relationship("Region", back_populates="institutions")
    cases = relationship("ComplaintCase", back_populates="institution")


class ComplaintCase(Base):
    __tablename__ = "complaints_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_no = Column(String(50), unique=True, nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, index=True)
    raw_institution_name = Column(String(255), nullable=True)
    raw_address = Column(String(500), nullable=True)
    raw_permanent_id = Column(String(50), nullable=True)
    complainant_type = Column(String(50), nullable=False)  # Student, Faculty, Parent, Staff, Anonymous, Other Stakeholder
    complainant_name = Column(String(150), nullable=True)
    complainant_email = Column(String(150), nullable=True)
    complainant_phone = Column(String(50), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String(50), nullable=False)  # Portal, Email, Letter, CPGRAMS, Walk-in
    received_date = Column(Date, nullable=False, index=True)
    status = Column(String(50), default="Received", nullable=False, index=True)  # Received, Under Process, Pending, Transferred, Escalated, Disposed
    priority = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High, Critical
    current_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    original_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=False)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_action = Column(String(255), nullable=True)
    last_action_date = Column(DateTime, nullable=True)
    next_action = Column(String(255), nullable=True)
    due_date = Column(Date, nullable=False, index=True)
    disposal_date = Column(Date, nullable=True)
    disposal_remark = Column(Text, nullable=True)
    match_confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="cases")
    current_bureau = relationship("Bureau", foreign_keys=[current_bureau_id], back_populates="cases_current")
    original_bureau = relationship("Bureau", foreign_keys=[original_bureau_id], back_populates="cases_original")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="assigned_cases")
    actions = relationship("CaseAction", back_populates="case", cascade="all, delete-orphan", order_by="CaseAction.created_at.desc()")


class CaseAction(Base):
    __tablename__ = "case_actions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("complaints_cases.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # Received, Assigned, Inquiry Initiated, Notice Issued, Reply Received, Inspection Ordered, Remark Added, Transferred, Escalated, Linked, Disposed, Reopened
    from_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    to_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True)
    performed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=False)
    document_name = Column(String(255), nullable=True)
    document_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    case = relationship("ComplaintCase", back_populates="actions")
    from_bureau = relationship("Bureau", foreign_keys=[from_bureau_id])
    to_bureau = relationship("Bureau", foreign_keys=[to_bureau_id])
    performed_by = relationship("User", back_populates="actions_performed")


class CaseLink(Base):
    __tablename__ = "case_links"

    id = Column(Integer, primary_key=True, index=True)
    case_a_id = Column(Integer, ForeignKey("complaints_cases.id"), nullable=False, index=True)
    case_b_id = Column(Integer, ForeignKey("complaints_cases.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, index=True)
    score = Column(Float, nullable=False)
    confidence_band = Column(String(20), nullable=False)  # HIGH, POSSIBLE, LOW
    evidence = Column(JSON, nullable=False)
    status = Column(String(20), default="SUGGESTED", nullable=False)  # SUGGESTED, CONFIRMED, REJECTED
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case_a = relationship("ComplaintCase", foreign_keys=[case_a_id])
    case_b = relationship("ComplaintCase", foreign_keys=[case_b_id])
    institution = relationship("Institution")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        UniqueConstraint('case_a_id', 'case_b_id', name='uq_case_pair'),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False, index=True)  # OVERLAP, SLA_BREACH, SLA_DUE_SOON, PENDING_REMINDER, ESCALATION
    severity = Column(String(20), default="MEDIUM", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    case_id = Column(Integer, ForeignKey("complaints_cases.id"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, index=True)
    link_id = Column(Integer, ForeignKey("case_links.id"), nullable=True)
    message = Column(Text, nullable=False)
    target_bureau_id = Column(Integer, ForeignKey("bureaus.id"), nullable=True, index=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    case = relationship("ComplaintCase")
    institution = relationship("Institution")
    target_bureau = relationship("Bureau")


class SlaRule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    priority = Column(String(50), nullable=False, index=True)
    days_allowed = Column(Integer, default=30, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    ip = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    kind = Column(String(50), nullable=False)  # INSTITUTIONS, CASES
    total_rows = Column(Integer, default=0)
    inserted = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    errors = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User")
