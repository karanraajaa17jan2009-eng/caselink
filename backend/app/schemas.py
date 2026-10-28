from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# --- Region Schemas ---
class RegionBase(BaseModel):
    name: str
    office_city: str

class RegionResponse(RegionBase):
    id: int

    class Config:
        from_attributes = True

# --- Bureau Schemas ---
class BureauBase(BaseModel):
    code: str
    name: str
    type: str

class BureauResponse(BureauBase):
    id: int

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    bureau_id: Optional[int] = None
    region_id: Optional[int] = None
    designation: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    bureau_id: Optional[int] = None
    region_id: Optional[int] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    bureau: Optional[BureauResponse] = None
    region: Optional[RegionResponse] = None

    class Config:
        from_attributes = True

# Token response needs UserResponse reference
Token.model_rebuild()

# --- Institution Schemas ---
class InstitutionBase(BaseModel):
    permanent_id: str
    name: str
    institution_type: str
    management_type: str
    address: str
    district: str
    state: str
    pincode: str
    region_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    approval_status: str = "Approved"
    established_year: Optional[int] = None
    is_active: bool = True

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    institution_type: Optional[str] = None
    management_type: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    region_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    approval_status: Optional[str] = None
    established_year: Optional[int] = None
    is_active: Optional[bool] = None

class InstitutionResponse(InstitutionBase):
    id: int
    normalized_name: str
    region: Optional[RegionResponse] = None
    open_cases_count: Optional[int] = 0
    total_cases_count: Optional[int] = 0
    disposed_cases_count: Optional[int] = 0
    overdue_cases_count: Optional[int] = 0
    handling_bureaus: Optional[List[str]] = []
    has_active_overlap: Optional[bool] = False
    is_repeat_offender: Optional[bool] = False

    class Config:
        from_attributes = True

# --- Case Action Schemas ---
class CaseActionBase(BaseModel):
    action_type: str
    remarks: str
    from_bureau_id: Optional[int] = None
    to_bureau_id: Optional[int] = None
    document_name: Optional[str] = None
    document_path: Optional[str] = None

class CaseActionCreate(CaseActionBase):
    pass

class CaseActionResponse(CaseActionBase):
    id: int
    case_id: int
    performed_by_user_id: Optional[int] = None
    created_at: datetime
    performed_by: Optional[UserResponse] = None
    from_bureau: Optional[BureauResponse] = None
    to_bureau: Optional[BureauResponse] = None

    class Config:
        from_attributes = True

# --- Case Link / Overlap Schemas ---
class CaseLinkBase(BaseModel):
    case_a_id: int
    case_b_id: int
    score: float
    confidence_band: str
    evidence: Dict[str, Any]
    status: str = "SUGGESTED"
    review_remark: Optional[str] = None

class CaseLinkReview(BaseModel):
    decision: str  # CONFIRM or REJECT
    remark: Optional[str] = None

class CaseLinkManual(BaseModel):
    case_a_id: int
    case_b_id: int
    remark: Optional[str] = None

class CaseLinkResponse(CaseLinkBase):
    id: int
    institution_id: Optional[int] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    case_a: Optional[Any] = None
    case_b: Optional[Any] = None
    institution: Optional[InstitutionResponse] = None
    reviewer: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Complaint Case Schemas ---
class ComplaintCaseBase(BaseModel):
    institution_id: Optional[int] = None
    raw_institution_name: Optional[str] = None
    raw_address: Optional[str] = None
    raw_permanent_id: Optional[str] = None
    complainant_type: str
    complainant_name: Optional[str] = None
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
    category: str
    subject: str
    description: str
    source: str = "Portal"
    received_date: Optional[date] = None
    priority: str = "Medium"
    current_bureau_id: Optional[int] = None
    assigned_officer_id: Optional[int] = None

class ComplaintCaseCreate(ComplaintCaseBase):
    pass

class ComplaintCaseTransfer(BaseModel):
    to_bureau_id: int
    to_officer_id: Optional[int] = None
    remarks: str

class ComplaintCaseEscalate(BaseModel):
    to_user_id: Optional[int] = None
    to_bureau_id: Optional[int] = None
    reason: str

class ComplaintCaseDispose(BaseModel):
    remark: str
    disposal_date: Optional[date] = None

class ComplaintCaseResponse(BaseModel):
    id: int
    case_no: str
    institution_id: Optional[int] = None
    raw_institution_name: Optional[str] = None
    raw_address: Optional[str] = None
    raw_permanent_id: Optional[str] = None
    complainant_type: str
    complainant_name: Optional[str] = None
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
    category: str
    subject: str
    description: str
    source: str
    received_date: date
    status: str
    priority: str
    current_bureau_id: int
    original_bureau_id: int
    assigned_officer_id: Optional[int] = None
    last_action: Optional[str] = None
    last_action_date: Optional[datetime] = None
    next_action: Optional[str] = None
    due_date: date
    disposal_date: Optional[date] = None
    disposal_remark: Optional[str] = None
    match_confidence: float
    created_at: datetime
    updated_at: datetime

    age_days: Optional[int] = None
    days_to_due: Optional[int] = None
    is_overdue: Optional[bool] = False
    overlap_count: Optional[int] = 0

    institution: Optional[InstitutionResponse] = None
    current_bureau: Optional[BureauResponse] = None
    original_bureau: Optional[BureauResponse] = None
    assigned_officer: Optional[UserResponse] = None
    actions: Optional[List[CaseActionResponse]] = []
    links: Optional[List[CaseLinkResponse]] = []

    class Config:
        from_attributes = True

# --- Alert Schemas ---
class AlertResponse(BaseModel):
    id: int
    type: str
    severity: str
    case_id: Optional[int] = None
    institution_id: Optional[int] = None
    link_id: Optional[int] = None
    message: str
    target_bureau_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    case: Optional[ComplaintCaseResponse] = None
    institution: Optional[InstitutionResponse] = None
    target_bureau: Optional[BureauResponse] = None

    class Config:
        from_attributes = True

# --- SLA Rule Schemas ---
class SlaRuleBase(BaseModel):
    category: str
    priority: str
    days_allowed: int

class SlaRuleUpdate(BaseModel):
    days_allowed: int

class SlaRuleResponse(SlaRuleBase):
    id: int

    class Config:
        from_attributes = True

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Dashboard & Stats Schemas ---
class DashboardSummary(BaseModel):
    total_received: int
    pending: int
    under_process: int
    disposed: int
    transferred: int
    escalated: int
    overdue: int
    due_within_7_days: int
    overlap_open_count: int
    disposal_rate: float
    avg_disposal_days: float

class BureauWorkload(BaseModel):
    bureau_id: int
    bureau_code: str
    bureau_name: str
    open_cases: int
    overdue_cases: int
    disposed_this_month: int
    avg_age_days: float

class AgeingBucket(BaseModel):
    bucket: str
    count: int

# --- Precheck & Matching Schemas ---
class PrecheckResponse(BaseModel):
    has_matches: bool
    candidate_institution: Optional[Dict[str, Any]] = None
    potential_overlaps: List[Dict[str, Any]] = []

class ImportSummaryResponse(BaseModel):
    job_id: int
    filename: str
    kind: str
    total_rows: int
    inserted: int
    skipped: int
    errors: List[str]
