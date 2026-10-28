export type UserRole = 
  | 'ADMIN' 
  | 'RB_OFFICER' 
  | 'PGRC_OFFICER' 
  | 'CELL_OFFICER' 
  | 'REGIONAL_OFFICER' 
  | 'SENIOR_MGMT';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  bureau_id?: number;
  region_id?: number;
  designation: string;
  is_active: boolean;
  bureau?: {
    id: number;
    code: string;
    name: string;
  };
  region?: {
    id: number;
    name: string;
    office_city: string;
  };
}

export interface Region {
  id: number;
  name: string;
  office_city: string;
}

export interface Bureau {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface Institution {
  id: number;
  permanent_id: string;
  name: string;
  normalized_name?: string;
  institution_type: string;
  management_type: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  region_id?: number;
  email?: string;
  phone?: string;
  approval_status: string;
  established_year?: number;
  is_active: boolean;
  region?: Region;
  total_cases_count?: number;
  open_cases_count?: number;
  disposed_cases_count?: number;
  overdue_cases_count?: number;
  handling_bureaus?: string[];
  has_active_overlap?: boolean;
  is_repeat_offender?: boolean;
}

export interface CaseAction {
  id: number;
  case_id: number;
  action_type: string;
  from_bureau?: string;
  to_bureau?: string;
  performed_by: string;
  performed_by_role?: string;
  remarks: string;
  document_name?: string;
  document_path?: string;
  created_at: string;
}

export interface CaseLinkEvidence {
  matched_fields: string[];
  reasons: string[];
  shared_keywords: string[];
  bureaus: string[];
  days_apart: number;
}

export interface CaseLink {
  id: number;
  institution_id?: number;
  institution_name?: string;
  institution_permanent_id?: string;
  score: number;
  confidence_band: 'HIGH' | 'POSSIBLE' | 'LOW';
  status: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED';
  evidence: CaseLinkEvidence;
  review_remark?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  case_a: {
    id: number;
    case_no: string;
    bureau_code: string;
    status: string;
    priority: string;
    subject: string;
    description: string;
    received_date: string;
    due_date: string;
    assigned_officer?: string;
    age_days?: number;
  };
  case_b: {
    id: number;
    case_no: string;
    bureau_code: string;
    status: string;
    priority: string;
    subject: string;
    description: string;
    received_date: string;
    due_date: string;
    assigned_officer?: string;
    age_days?: number;
  };
}

export interface ComplaintCase {
  id: number;
  case_no: string;
  institution_id?: number;
  raw_institution_name?: string;
  raw_address?: string;
  raw_permanent_id?: string;
  complainant_type: string;
  complainant_name?: string;
  complainant_email?: string;
  complainant_phone?: string;
  category: string;
  subject: string;
  description: string;
  source: string;
  received_date: string;
  status: 'Received' | 'Under Process' | 'Pending' | 'Transferred' | 'Escalated' | 'Disposed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  current_bureau_id: number;
  original_bureau_id: number;
  assigned_officer_id?: number;
  last_action?: string;
  last_action_date?: string;
  next_action?: string;
  due_date: string;
  disposal_date?: string;
  disposal_remark?: string;
  match_confidence: number;
  created_at: string;
  updated_at: string;
  age_days?: number;
  days_to_due?: number;
  is_overdue?: boolean;
  overlap_count?: number;
  can_modify?: boolean;
  institution?: {
    id: number;
    name: string;
    permanent_id: string;
    district: string;
    state: string;
    approval_status?: string;
  };
  current_bureau?: {
    id: number;
    code: string;
    name: string;
  };
  assigned_officer?: {
    id: number;
    name: string;
    designation: string;
  };
}

export interface AlertItem {
  id: number;
  type: 'OVERLAP' | 'SLA_BREACH' | 'SLA_DUE_SOON' | 'PENDING_REMINDER' | 'ESCALATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  case_id?: number;
  case_no?: string;
  institution_id?: number;
  institution_name?: string;
  link_id?: number;
  message: string;
  target_bureau_code?: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_received: number;
  pending: number;
  under_process: number;
  disposed: number;
  transferred: number;
  escalated: number;
  overdue: number;
  due_within_7_days: number;
  overlap_open_count: number;
  disposal_rate: number;
  avg_disposal_days: number;
}

export interface BureauWorkload {
  bureau_id: number;
  bureau_code: string;
  bureau_name: string;
  open_cases: number;
  overdue_cases: number;
  disposed_this_month: number;
  avg_age_days: number;
}

export interface SlaRule {
  id: number;
  category: string;
  priority: string;
  days_allowed: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip?: string;
  created_at: string;
}
