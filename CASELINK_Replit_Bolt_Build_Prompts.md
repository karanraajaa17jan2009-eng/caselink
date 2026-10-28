# AICTE CASELINK – Build Prompt Pack (Replit / Bolt, Free Plan)

SIH 2026 · PS 26264 · Team Tech Spartans
Stack (matches your idea deck): **React + FastAPI + PostgreSQL**

---

## 0. READ THIS FIRST – How to use on a FREE plan

Free plans (Replit Starter agent credits, Bolt daily token limit) run out if you paste one giant prompt and ask for everything at once. So this pack is split into **5 copy-paste prompts**. Paste them **one at a time**, wait until each works, then paste the next.

| Step | What | Tool |
|---|---|---|
| Prompt 1 | Project context + DB + seed data | Replit (best) |
| Prompt 2 | Backend API + auth | Replit |
| Prompt 3 | Matching/overlap engine + alerts + reports | Replit |
| Prompt 4 | Frontend (all pages) | Replit |
| Prompt 5 | Polish + README + demo checklist | Replit |
| Bolt version | Section 7 (Bolt cannot run Python, so it uses Supabase) | Bolt |

**Free-plan rules (already baked into the prompts):**
- Use **Replit** as primary. It runs Python + Node + PostgreSQL together. Bolt runs only Node in-browser, so it needs the alternate version in Section 7.
- Don't ask the agent to "improve", "refactor" or "add tests" between prompts. Every extra turn burns credits.
- If the agent hits an error, paste only the error text and say "fix this error only".
- Use Replit **Agent "Build" mode only when pasting the prompts**; use the plain Assistant/chat for tiny fixes (cheaper).
- Database: the code reads `DATABASE_URL`. If Replit PostgreSQL is not available on your plan, the app **falls back to SQLite automatically**, so nothing breaks.
- No paid APIs, no external AI APIs, no email/SMS providers. The "AI-assisted" matching is local (rapidfuzz + text similarity), so it costs nothing.

**Data honesty note:** The prompts generate *realistic synthetic data* (fictional institutions with AICTE-style IDs, regions and bureaus that mirror AICTE's real structure). Do **not** attach invented complaints to real, named colleges for the demo. Show a "Sample Data" badge in the UI. The CSV importer lets you load the real AICTE institution list later (public at facilities.aicte-india.org).

---

## 1. PROMPT 1 – Foundation, Database, Seed Data

Paste this entire block into Replit Agent:

```
You are a senior full-stack engineer. Build a production-quality web application called "AICTE CASELINK – Integrated Institution Complaint Monitoring & Status Dashboard" for the All India Council for Technical Education (AICTE), Regulation Bureau. This is for Smart India Hackathon 2026, Problem Statement 26264.

PROBLEM: AICTE complaints about the same institution reach different Bureaus/Cells (Regulation Bureau RB, Public Grievance Redressal Cell PGRC, and others). There is no single view, so work is duplicated, delayed, or conflicting. Build a single-window dashboard where authorized officials can see all institution-related complaint cases in one place, see which Bureau/Cell is handling each, track full movement/history, detect overlapping cases across bureaus automatically, and get SLA/ageing alerts and reports.

TECH STACK (fixed, do not change):
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query + Recharts + lucide-react
- Backend: Python 3.11 + FastAPI + SQLAlchemy 2.x + Pydantic v2 + Uvicorn
- Database: PostgreSQL via DATABASE_URL env var. If DATABASE_URL is missing or unreachable, automatically fall back to a local SQLite file (caselink.db). All models must work on both.
- Auth: JWT (python-jose) + bcrypt (passlib), role-based access control
- Matching: rapidfuzz (no heavy ML libs, no external AI API)
- Keep dependencies minimal. No Docker. No paid services.

PROJECT STRUCTURE:
/backend
  app/main.py, app/config.py, app/database.py, app/models.py, app/schemas.py,
  app/auth.py, app/seed.py,
  app/routers/ (auth.py, institutions.py, cases.py, overlaps.py, dashboard.py, alerts.py, reports.py, imports.py, users.py),
  app/services/ (matching.py, sla.py, audit.py, reports.py)
/frontend  (Vite React TS app; dev proxy /api -> backend)
README.md
Run both with one command (a single run script/Replit run config): backend on port 8000, frontend on port 5000 (or Replit's default web port), frontend proxies /api to backend.

DATABASE SCHEMA (SQLAlchemy models, with indexes and foreign keys):
1. regions: id, name, office_city  -- exactly the 8 AICTE Regional Offices: Eastern (Kolkata), North-Eastern (Guwahati), Northern (New Delhi), North-Western (Chandigarh), Western (Mumbai), Central (Bhopal), Southern (Chennai), South-Western (Bengaluru).
2. bureaus: id, code, name, type  -- seed: RB (Regulation Bureau), PGRC (Public Grievance Redressal Cell), AB (Approval Bureau), ACAD (Academic Bureau), FIN (Finance/Accounts), LEGAL (Legal Cell), VIG (Vigilance Cell), RO (Regional Office).
3. users: id, name, email (unique), password_hash, role, bureau_id, region_id, designation, is_active, created_at.
   Roles: ADMIN, RB_OFFICER, PGRC_OFFICER, CELL_OFFICER, REGIONAL_OFFICER, SENIOR_MGMT (read-only on everything).
4. institutions: id, permanent_id (unique, AICTE style like "1-4821937560"), name, normalized_name, institution_type (University / College / Polytechnic / Standalone), management_type (Government / Private / Deemed / Trust), address, district, state, pincode, region_id, email, phone, approval_status (Approved / Withdrawn / Closed / Under Scrutiny), established_year, is_active.
5. complaints_cases: id, case_no (unique, formatted "RB-2026-00108" / "PGRC-2026-00041" – prefix = receiving bureau code), institution_id (nullable FK), raw_institution_name, raw_address, raw_permanent_id (what the complainant actually wrote; may be wrong/missing), complainant_type (Student / Faculty / Parent / Staff / Anonymous / Other Stakeholder), complainant_name (nullable), category, subject, description (text), source (Portal / Email / Letter / CPGRAMS / Walk-in), received_date, status (Received / Under Process / Pending / Transferred / Escalated / Disposed), priority (Low / Medium / High / Critical), current_bureau_id, original_bureau_id, assigned_officer_id, last_action, last_action_date, next_action, due_date (SLA), disposal_date (nullable), disposal_remark, match_confidence (float, how confidently the institution was resolved), created_at, updated_at.
   Categories: "Unapproved/Unauthorized Courses", "Admission Irregularities", "Excess/Illegal Fee Collection", "Faculty Shortage / Qualification", "Infrastructure Deficiency", "Fake Affiliation / Approval Claims", "Withholding of Certificates / Documents", "Harassment / Ragging", "Salary/Service Matters of Faculty", "Closure of Institution / Student Transfer", "Mandatory Disclosure Violation", "Other".
6. case_actions: id, case_id, action_type (Received / Assigned / Inquiry Initiated / Notice Issued / Reply Received / Inspection Ordered / Remark Added / Transferred / Escalated / Linked / Disposed / Reopened), from_bureau_id, to_bureau_id, performed_by_user_id, remarks, document_name (nullable), document_path (nullable), created_at (timestamp).
7. case_links: id, case_a_id, case_b_id, institution_id, score (0-1), confidence_band (HIGH / POSSIBLE / LOW), evidence (JSON: matched fields + reasons), status (SUGGESTED / CONFIRMED / REJECTED), reviewed_by, reviewed_at, review_remark, created_at. Unique pair constraint (always store smaller id first).
8. alerts: id, type (OVERLAP / SLA_BREACH / SLA_DUE_SOON / PENDING_REMINDER / ESCALATION), severity, case_id (nullable), institution_id (nullable), link_id (nullable), message, target_bureau_id (nullable), is_read, created_at.
9. sla_rules: id, category, priority, days_allowed. Default 30 days; Critical 7; High 15; Medium 30; Low 45. Make editable by ADMIN. (Note in README: actual AICTE timelines must be configured by the Bureau.)
10. audit_log: id, user_id, action, entity_type, entity_id, details (JSON), ip, created_at. Every create/update/login/link-review writes here.
11. import_jobs: id, filename, kind (INSTITUTIONS / CASES), total_rows, inserted, skipped, errors (JSON), created_by, created_at.

SEED DATA (app/seed.py, runs automatically on first start if DB is empty; idempotent; deterministic with random.seed(2026)):
- 8 regions, 8 bureaus as above.
- 12 users, all with password "Caselink@2026", including:
  admin@caselink.demo (ADMIN), rb1@caselink.demo & rb2@caselink.demo (RB_OFFICER), pgrc1@caselink.demo & pgrc2@caselink.demo (PGRC_OFFICER), ab1@caselink.demo (CELL_OFFICER, AB), legal1@caselink.demo (CELL_OFFICER, LEGAL), vig1@caselink.demo (CELL_OFFICER, VIG), ro.south@caselink.demo & ro.north@caselink.demo (REGIONAL_OFFICER), director@caselink.demo & secretary@caselink.demo (SENIOR_MGMT). Realistic Indian names and designations (Deputy Director, Assistant Director, Section Officer, Joint Secretary, etc).
- 80 FICTIONAL institutions spread across all 8 regions and ~25 states/UTs, realistic Indian naming patterns (e.g. "Sri Venkateswara Institute of Engineering & Technology", "Maharaja Agrasen College of Technology", "National Polytechnic, Jalandhar"), real district names, real-looking PIN codes, AICTE-style permanent IDs. Do NOT use real institution names. Mix types and approval statuses.
- ~450 cases received over the last 12 months (relative to today), spread across bureaus: PGRC ~40%, RB ~30%, others ~30%. Realistic status mix: ~35% Disposed, ~30% Under Process, ~15% Pending, ~10% Transferred, ~10% Escalated. Each non-trivial case has 2-7 chronological case_actions with realistic remarks (e.g. "Show-cause notice issued to the institution; reply sought within 15 days.", "Report called from Regional Office.", "Transferred to RB as matter pertains to approval conditions."). Dates must be internally consistent (actions after receipt, disposal after actions, due_date = received_date + SLA days). About 25 cases must be overdue and about 40 must be due within 7 days.
- Write complaint descriptions that are realistic, varied, and in plain formal Indian-English (50-120 words each). Generate them from category-specific templates with randomised details (course names, fee amounts in INR, number of faculty, years) so no two read the same.
- DELIBERATE SCENARIOS (must exist so the demo works):
  a) 12 institutions each have one PGRC case and one RB case open at the same time with DIFFERENT wording and different case references (classic overlap, like P-041 and R-108 in the deck).
  b) 5 institutions have 3 cases across 3 bureaus (RB + PGRC + Legal/Vigilance).
  c) 8 cases were filed with a MISSING or WRONG permanent ID and a misspelled/abbreviated institution name ("Sri Venkateswara Inst. of Engg & Tech", "SVIET Nellore") that the fuzzy resolver must still map to the right institution.
  d) 6 pairs of exact duplicate complaints (same institution, same category, near-identical text) filed through different channels.
  e) 3 institutions with repeat complaints over several months (history view).
  f) 4 transfer chains (PGRC -> RB -> Legal) and 5 escalated cases with escalation history.
- Pre-compute and store overlap suggestions by running the matching service (Prompt 3) at the end of seeding once it exists; for now leave a hook function run_overlap_scan().

Also create a startup event that creates tables (no Alembic needed) and runs seed. Add GET /api/health returning {status, db: "postgres"|"sqlite", seeded: true}.

Deliver: working backend that boots, creates schema, seeds data, and /api/health works. Print a seed summary in the console (counts per table). Do not build the frontend yet.
```

---

## 2. PROMPT 2 – Backend API and Auth

```
Continue the AICTE CASELINK project. Implement the complete REST API in FastAPI. Use proper Pydantic response models, pagination, validation, consistent error format {"detail": "..."}, CORS enabled for the frontend, and OpenAPI docs at /docs.

AUTH & RBAC
- POST /api/auth/login (email, password) -> {access_token, token_type, user}
- GET /api/auth/me
- JWT expiry 8 hours. bcrypt hashing. Dependency get_current_user and require_roles(...).
- Permissions: EVERYONE authenticated can VIEW all institutions, cases, overlaps, dashboard, reports (single-window principle). Only the case's current bureau officers (or ADMIN) can UPDATE a case, add actions, transfer, escalate, dispose. Any RB/PGRC/CELL/REGIONAL officer can create cases. SENIOR_MGMT is read-only. ADMIN manages users and SLA rules.
- Every write endpoint writes an audit_log row via services/audit.py.

ENDPOINTS
Institutions
- GET /api/institutions?search=&region_id=&state=&approval_status=&has_open_cases=&page=&page_size= (search matches name, permanent_id, district)
- GET /api/institutions/{id}  -> full profile ("Institution 360"): details, region, counts (total / open / disposed / overdue), list of bureaus currently handling its open cases, active overlap links, repeat-complaint flag.
- GET /api/institutions/{id}/cases  -> consolidated case history, newest first.
- GET /api/institutions/{id}/timeline -> merged chronological timeline of all actions across all its cases with bureau, officer, case_no.
- POST /api/institutions (ADMIN/officers), PUT /api/institutions/{id}

Cases
- GET /api/cases with filters: q (free text across case_no, subject, institution name, permanent id), institution_id, permanent_id, bureau_id, region_id, category, status, priority, overdue (bool), date_from, date_to, assigned_officer_id, has_overlap (bool), sort_by, sort_dir, page, page_size. Return computed fields: age_days, days_to_due, is_overdue, overlap_count.
- GET /api/cases/{case_no or id} -> full case, institution summary, officer, action history, linked/overlapping cases, documents.
- POST /api/cases -> creates case. Auto-resolves institution via services/matching.resolve_institution() when institution_id not given (returns match_confidence). Auto-generates case_no, due_date from SLA rules, first action "Received", then triggers overlap detection for that institution and returns any new overlap suggestions in the response.
- POST /api/cases/{id}/actions (action_type, remarks, optional file upload up to 5 MB stored in /uploads; allowed pdf/jpg/png/docx), updates last_action, last_action_date, next_action.
- POST /api/cases/{id}/transfer (to_bureau_id, to_officer_id, remarks) -> status Transferred -> then Under Process at new bureau; writes action + alert for target bureau.
- POST /api/cases/{id}/escalate (to_user_id or to_bureau_id, reason) -> status Escalated + alert.
- POST /api/cases/{id}/dispose (remark, disposal_date) -> status Disposed; POST /api/cases/{id}/reopen.
- GET /api/cases/{id}/history  (chronological)
- GET /api/cases/export.csv (same filters, streamed)

Overlaps
- GET /api/overlaps?status=&band=&bureau_id=&region_id= -> list of suggested/confirmed links grouped by institution, with both cases, bureaus, scores, evidence.
- GET /api/overlaps/{id}
- POST /api/overlaps/{id}/review {decision: CONFIRM|REJECT, remark} -> updates status, writes audit, and on CONFIRM writes a "Linked" action on both cases and notifies both bureaus. Never auto-merge cases.
- POST /api/overlaps/manual {case_a_id, case_b_id, remark} -> manual linking.
- POST /api/overlaps/scan -> (ADMIN) re-run detection across all open cases.

Dashboard
- GET /api/dashboard/summary?region_id=&bureau_id=&date_from=&date_to= -> total, pending, under_process, disposed, transferred, escalated, overdue, due_within_7_days, overlap_open_count, disposal_rate %, avg_disposal_days.
- GET /api/dashboard/bureau-workload -> per bureau: open, overdue, disposed this month, avg age.
- GET /api/dashboard/status-distribution, /category-distribution, /region-distribution, /monthly-trend (received vs disposed, last 12 months), /ageing-buckets (0-7, 8-15, 16-30, 31-60, 60+ days of open cases), /top-institutions (most open complaints).
- GET /api/dashboard/recent-activity (latest 20 actions across all bureaus)

Alerts
- GET /api/alerts?type=&unread=&bureau_id=, POST /api/alerts/{id}/read, POST /api/alerts/read-all, GET /api/alerts/count
- services/sla.py: function generate_alerts() creating SLA_BREACH (past due), SLA_DUE_SOON (<=5 days), PENDING_REMINDER (no action > 15 days), ESCALATION and OVERLAP alerts without creating duplicates. Run on startup and every 15 minutes via a lightweight asyncio background task (no Celery/Redis).

Reports (JSON + CSV via ?format=csv)
- GET /api/reports/bureau-wise, /region-wise, /status-wise, /category-wise, /institution-history/{institution_id}, /ageing, /disposal-rate (monthly and quarterly), /overlaps, /performance (monthly/quarterly per bureau: received, disposed, disposal rate, avg days, overdue %).

Admin / Import
- GET/POST /api/users, PATCH /api/users/{id}  (ADMIN)
- GET/PUT /api/sla-rules (ADMIN)
- GET /api/audit-log (ADMIN, SENIOR_MGMT) with filters
- POST /api/import/institutions and POST /api/import/cases : CSV upload with column validation, per-row error reporting, duplicate skipping on permanent_id / case_no, results saved in import_jobs. Provide downloadable CSV templates at GET /api/import/template/{kind}.

Write the routers fully (no stubs or TODOs). Test every endpoint once with the seeded data using a quick script and fix failures. Print a short endpoint test summary.
```

---

## 3. PROMPT 3 – Matching / Overlap Detection Engine

```
Continue the AICTE CASELINK project. Implement the core innovation: services/matching.py – a transparent, rule-based plus fuzzy-similarity engine that identifies complaints relating to the same institution even when complaint wording or case references differ. Use only rapidfuzz and Python standard library. It must be explainable (show evidence) and must NEVER auto-merge: it only suggests; an authorized officer confirms.

A) NORMALISATION (normalize_text, normalize_institution_name, normalize_address)
- lowercase, strip punctuation, collapse spaces, unify "&"/"and", expand abbreviations (inst -> institute, engg -> engineering, tech -> technology, coll -> college, univ -> university, polytechnic/poly, mgmt -> management, govt -> government, sri/shri/shree, dr, st -> saint), remove stopwords like "the", "of" only for comparison, strip common suffix noise ("(autonomous)", "affiliated to ..."), normalise permanent IDs (strip spaces/hyphens/prefix).

B) INSTITUTION RESOLUTION: resolve_institution(raw_permanent_id, raw_name, raw_address) -> (institution_id | None, confidence, evidence)
 1. Exact normalised permanent ID match -> confidence 0.98 (if raw name also similar >=60 -> 1.0; if name is very dissimilar (<30) -> cap 0.6 and flag "ID/name conflict").
 2. Else fuzzy name (rapidfuzz token_set_ratio + WRatio blend) restricted by district/state/pincode when available; combine: 0.65*name_score + 0.25*address_score + 0.10*pincode/district match.
 3. Return top candidate if >= 0.85 (auto-assigned), 0.65–0.85 (assigned but flagged "needs verification", return top 3 candidates), <0.65 unresolved (case stays unlinked and shows in a "Unmatched institution" queue on the dashboard).

C) CASE-PAIR OVERLAP SCORING: score_pair(case_a, case_b) -> (score 0-1, evidence dict)
 Only compare cases of the SAME resolved institution that are still open OR were disposed within the last 90 days, and that are in DIFFERENT bureaus (also flag same-bureau exact duplicates as type "DUPLICATE").
 score = 0.40 * institution_match (use min of the two cases' match_confidence)
       + 0.30 * text_similarity (own simple TF-IDF-style weighted token overlap on subject+description using rapidfuzz.fuzz.token_set_ratio blended with Jaccard over key terms after removing stopwords)
       + 0.15 * category_similarity (1.0 same category; 0.6 for related categories defined in a small mapping e.g. Unapproved Courses <-> Fake Approval Claims <-> Admission Irregularities; else 0)
       + 0.10 * time_proximity (1.0 if received within 30 days of each other, decays to 0 at 365 days)
       + 0.05 * complainant_overlap (same complainant name/email fuzzy)
 Bands: score >= 0.80 HIGH ("Potential Overlapping Cases – Coordination Required"), 0.60–0.80 POSSIBLE, < 0.60 not stored. Exact same permanent ID with different bureaus always gets at least POSSIBLE.
 evidence = {matched_fields: [...], reasons: ["Same institution (AICTE ID 1-xxxx)", "Both cases open", "Handled by different bureaus: PGRC & RB", "Text similarity 72%", "Related categories", ...], shared_keywords: [...], bureaus: [...], days_apart: n}

D) SERVICE FUNCTIONS
- run_overlap_scan(): scan all institutions with >= 2 relevant cases, upsert case_links (SUGGESTED) without duplicating, never overwrite CONFIRMED/REJECTED decisions, create OVERLAP alerts for both bureaus.
- detect_for_case(case_id): incremental detection when a case is created or its institution changes (called by POST /api/cases and import).
- institution_multi_bureau_flag(institution_id): true if >= 2 bureaus currently hold open cases on it (this is the "same institution, multiple cells" signal even when text differs).
- find_possible_duplicates(subject, description, institution_id) used by the "new case" form to warn the officer BEFORE saving (GET /api/overlaps/precheck?institution_id=&text=).

E) TESTS
 Add backend/tests/test_matching.py with ~12 pytest cases proving: abbreviations resolved, wrong-ID-right-name handling, ID/name conflict flagged, threshold bands, same-bureau duplicate, no auto-merge, confirmed pairs not re-suggested. Run them and make them pass. Run run_overlap_scan() at the end of seeding and print counts per band; ensure the deliberate seed scenarios (12 PGRC+RB overlaps, 5 triple-bureau institutions, 8 messy-ID cases, 6 duplicate pairs) are all detected. Log precision against the seeded ground truth in the console.

Also add GET /api/overlaps/stats -> counts by band/status and average review time.
```

---

## 4. PROMPT 4 – Frontend (all pages)

```
Continue the AICTE CASELINK project. Build the complete React + TypeScript + Tailwind frontend in /frontend, fully wired to the existing FastAPI API (use TanStack Query; auto-refetch dashboard, alerts and case lists every 20 seconds to give a "real-time" feel; show a small "Live · updated hh:mm:ss" indicator). Handle loading skeletons, empty states, error toasts, and responsive layouts (desktop-first, works on tablet). Store JWT in memory + sessionStorage; redirect to /login on 401.

DESIGN SYSTEM – professional government-grade UI
- Palette: navy #1F3A6E (primary), deep navy #14284F (sidebar), saffron #F28C28 (accent), India green #138808 (success), amber #D97706 (warning), red #C62828 (danger), slate greys, white cards on #F4F6FA background.
- Font: Inter. 8px spacing grid. Rounded-xl cards, subtle shadows, clear table styling with sticky headers, zebra rows, status chips (Received=slate, Under Process=blue, Pending=amber, Transferred=purple, Escalated=red, Disposed=green), bureau chips with distinct colors, priority dots.
- Top bar: AICTE CASELINK wordmark, global search (institution name / AICTE ID / case no) with live dropdown, alerts bell with unread count, user menu with role + bureau. Left sidebar with icons. A subtle "SAMPLE DATA – DEMO ENVIRONMENT" ribbon in the footer.
- Fully accessible: labels, focus rings, keyboard navigation, AA contrast.

PAGES
1. /login – split layout, official look, demo credentials card with quick-fill buttons for each role (password Caselink@2026).
2. /dashboard – Command centre:
   - KPI cards: Total Received, Pending, Under Process, Disposed, Transferred, Escalated, Overdue (red), Due in 7 days, Open Overlaps (saffron), Disposal Rate %.
   - Filters row: region, bureau, date range (applies to all widgets).
   - Charts (Recharts): status donut, monthly received vs disposed line/area (12 months), bureau workload grouped bar (open vs overdue), ageing buckets bar, category horizontal bar, region distribution.
   - "Potential Overlapping Cases – Coordination Required" panel: top 5 overlaps with both case numbers, bureaus, score band chip, "Review" button.
   - Top institutions by open complaints table; recent activity feed; unmatched-institution queue.
3. /cases – Case register: powerful search + filter bar (institution name, AICTE ID, case no, bureau, region, category, status, priority, overdue toggle, overlap toggle, date range), saved column set, sortable paginated table with age and days-to-due coloring, row badges (⚠ overlap, ⏰ overdue, ↗ transferred), bulk CSV export, "New Case" button.
4. /cases/new – Form with institution typeahead; as the officer types institution name/ID show resolver result with confidence and candidates; before submit, call precheck and show a yellow "Possible overlap with existing cases" banner listing matches.
5. /cases/:id – Case detail: header with case no, status chip, priority, SLA countdown ring; left: details, complainant, description, institution summary card (link to profile); center: vertical action timeline (icon per action type, officer, bureau, timestamp, remarks, document download); right: "Linked / Overlapping cases" card with scores and evidence; action bar: Add Action (with file upload), Transfer, Escalate, Dispose, Reopen — shown only if the user has permission, each in a modal with validation.
6. /institutions – Searchable directory with region/state/approval filters, open-case counts, multi-bureau badge.
7. /institutions/:id – Institution 360° profile: details, KPI strip (total/open/disposed/overdue), "Bureaus currently handling" chips, overlap alerts banner, tabs: Cases | Unified Timeline (cross-bureau chronological) | Overlaps | Documents. Include repeat-complaint indicator.
8. /overlaps – Overlap Review Centre: tabs Suggested / Confirmed / Rejected; cards showing Case A ↔ Case B side by side (bureau, officer, status, age, summary), score bar with HIGH/POSSIBLE band, evidence list ("why flagged"), shared keywords highlighted in both descriptions, and buttons Confirm Link / Not Related (remark required) / Open both cases. Filters by bureau, region, band.
9. /alerts – Notification centre grouped by type (Overlap, SLA breach, Due soon, Pending reminder, Escalation) with mark-read, filters and deep links.
10. /reports – Report builder: choose report type (bureau-wise, region-wise, institution history, ageing, disposal rate, overlaps, monthly/quarterly performance), parameters, preview as table + chart, Export CSV, and a "Print / Save as PDF" button using a print-optimised stylesheet with AICTE header.
11. /import – CSV import wizard (institutions or cases): upload, download template, validation preview, per-row errors, results summary.
12. /admin – (ADMIN) users management, SLA rules editor, audit log viewer with filters, system health (db type, seed status).

Create reusable components: KpiCard, StatusChip, BureauChip, PriorityDot, DataTable, FilterBar, Timeline, ScoreBar, EvidenceList, EmptyState, ConfirmModal, Toast, Skeleton, SlaRing. Create a typed API client (axios or fetch) with interceptors. Role-aware navigation (hide pages the user can't use).

Make everything functional against the real API (no hardcoded mock data in the UI). Verify each page loads with seeded data, and fix console errors. Confirm the key demo flow works end-to-end: login as pgrc1 -> open dashboard -> open an overlap -> compare cases -> confirm link -> see "Linked" action appear in both case timelines -> alerts update.
```

---

## 5. PROMPT 5 – Polish, Docs, Demo Readiness

```
Final pass on AICTE CASELINK. Do only the following and nothing else:
1. Fix any remaining console errors, failed requests, TypeScript errors or layout overflow on /dashboard, /cases, /cases/:id, /institutions/:id, /overlaps, /reports.
2. Security hardening: JWT secret from env var (generate default for dev), bcrypt, rate-limit /api/auth/login (simple in-memory, 10/min per IP), file upload type/size validation, SQL via ORM only, no stack traces in responses, security headers, input length limits.
3. Add a "Guided Demo" button on the dashboard that opens a 5-step overlay tour (one institution, PGRC + RB cases, overlap detected, officer confirms, timeline shows both) using real seeded records.
4. Write README.md: project overview (problem 26264), architecture diagram (ASCII), tech stack, data model summary, how matching works (weights, bands, evidence), RBAC matrix, API summary, demo credentials, how to run on Replit, how to switch SQLite <-> PostgreSQL, how to load real data via CSV import, known limitations, and future integration plan (approved AICTE APIs/CPGRAMS adapters, SSO, email/SMS notifications, OCR for scanned complaints).
5. Add a /about page inside the app describing the CASELINK flow: Unify inputs -> Link the cases -> Flag overlaps -> Coordinate, and the principle "Alert is a recommendation – an authorized officer confirms the relationship."
6. Ensure the app starts cleanly from a fresh database with one run command, and that a "Reset demo data" button (ADMIN only) re-seeds.
Give me a final checklist of what works and the exact demo login credentials.
```

---

## 6. Demo Script (2-minute SIH presentation flow)

1. Login as `pgrc1@caselink.demo` → Dashboard shows KPIs, overdue, open overlaps.
2. Click an overlap card: "Institution A – PGRC case under process, RB action initiated".
3. Show evidence (same institution ID, different wording, 74% text similarity, different bureaus).
4. Confirm link → both cases get a "Linked" action → RB gets an alert.
5. Open Institution 360° → unified cross-bureau timeline.
6. Create a new case with a misspelled institution name → resolver maps it + precheck warns of overlap.
7. Reports → Bureau-wise performance → Export CSV / Print PDF.
8. Login as `director@caselink.demo` → read-only senior view.

**Acceptance checklist**
- [ ] 80 institutions, ~450 cases, 8 regions, 8 bureaus seeded
- [ ] Overlap scan finds the planted scenarios
- [ ] Case transfer / escalate / dispose write history + alerts
- [ ] SLA alerts appear (overdue + due-soon)
- [ ] Role permissions enforced (senior mgmt read-only)
- [ ] CSV import + export work
- [ ] Audit log records every write
- [ ] Runs from fresh DB with one command

---

## 7. BOLT.NEW VERSION (Free plan)

Bolt runs in the browser (Node only, no Python). So use **React + Vite + TypeScript + Supabase (PostgreSQL + Auth + Row Level Security)**; the matching engine runs as TypeScript in the app (or Supabase Edge Function). On Bolt free tier, paste the three prompts below separately and don't re-prompt for cosmetic changes.

**Bolt Prompt A – Foundation + DB**
```
Build "AICTE CASELINK – Integrated Institution Complaint Monitoring Dashboard" (SIH 2026, PS 26264) using React + Vite + TypeScript + Tailwind + React Router + Recharts + lucide-react, with Supabase (PostgreSQL + Auth) as backend. Connect Supabase and create SQL migrations for: regions (8 AICTE regional offices), bureaus (RB, PGRC, AB, ACAD, FIN, LEGAL, VIG, RO), profiles (role: ADMIN/RB_OFFICER/PGRC_OFFICER/CELL_OFFICER/REGIONAL_OFFICER/SENIOR_MGMT, bureau_id), institutions (permanent_id unique, name, normalized_name, address, district, state, pincode, region_id, approval_status), cases (case_no, institution_id, raw_institution_name, raw_permanent_id, category, subject, description, received_date, status [Received/Under Process/Pending/Transferred/Escalated/Disposed], priority, current_bureau_id, assigned_officer_id, last_action, last_action_date, next_action, due_date, disposal_date, match_confidence), case_actions (history with from/to bureau, officer, remarks, timestamp), case_links (case_a, case_b, institution_id, score, band, evidence jsonb, status SUGGESTED/CONFIRMED/REJECTED), alerts, sla_rules, audit_log. Enable Row Level Security: all authenticated users can read; only users of the case's current bureau (or ADMIN) can write; SENIOR_MGMT read-only. Create a seed SQL script with 80 FICTIONAL institutions (AICTE-style IDs, real districts/states), ~450 realistic synthetic cases over 12 months across bureaus with consistent action histories, ~25 overdue cases, and planted overlap scenarios (12 institutions with simultaneous PGRC + RB cases using different wording; 5 with 3 bureaus; 8 cases with misspelled institution names/missing IDs; 6 duplicate pairs). Create 10 demo users with password Caselink@2026 (pgrc1@caselink.demo, rb1@caselink.demo, ab1@caselink.demo, director@caselink.demo, admin@caselink.demo, etc). Build login page and role-aware layout shell (navy #1F3A6E + saffron #F28C28 government theme, sidebar, top bar with search and alerts bell). Do not build other pages yet.
```

**Bolt Prompt B – Matching engine + core pages**
```
Continue CASELINK. Implement src/lib/matching.ts in TypeScript (no external API): normalise institution names (abbreviation expansion: inst->institute, engg->engineering, tech->technology, coll->college, univ->university, govt->government), Levenshtein/Jaro-Winkler + token-set similarity, resolveInstitution(rawId, rawName, rawAddress) with confidence bands (>=0.85 auto, 0.65–0.85 verify, <0.65 unmatched), and scorePair(caseA, caseB) = 0.40 institution match + 0.30 text similarity (token overlap on subject+description) + 0.15 category similarity + 0.10 time proximity + 0.05 complainant overlap; bands HIGH >=0.80, POSSIBLE 0.60–0.80. It must output evidence (reasons + shared keywords) and only SUGGEST links – officers confirm or reject; never auto-merge. Run a scan after seeding and on case creation, writing to case_links and alerts. Then build pages: Dashboard (KPI cards: total, pending, under process, disposed, transferred, escalated, overdue, open overlaps; status donut, monthly trend, bureau workload bar, ageing buckets; overlap panel titled "Potential Overlapping Cases – Coordination Required"), Case Register (search + filters by institution, AICTE ID, case no, bureau, region, category, status, date range; sortable paginated table; CSV export), Case Detail (action timeline, linked cases, add action/transfer/escalate/dispose with history entries), New Case form (institution typeahead with resolver confidence and pre-save overlap warning). Use live Supabase data only, no hardcoded mock data.
```

**Bolt Prompt C – Remaining pages + polish**
```
Continue CASELINK. Add: Institution 360° profile (details, KPIs, bureaus currently handling, unified cross-bureau timeline, overlaps tab), Overlap Review Centre (side-by-side cases, score bar, evidence, Confirm / Not Related with remark), Alerts centre (overlap, SLA breach, due soon, pending reminders, escalation; generate alerts on load by checking due dates), Reports page (bureau-wise, region-wise, institution history, ageing, disposal rate, overlaps, monthly/quarterly performance) with CSV export and print-to-PDF stylesheet, CSV import page for institutions/cases with validation errors, Admin page (users, SLA rules, audit log). Show "SAMPLE DATA – DEMO ENVIRONMENT" in the footer. Fix all console/TypeScript errors, make mobile/tablet responsive, and add a README with demo credentials and the demo flow.
```

---

## 8. Troubleshooting on free plans

| Problem | Fix |
|---|---|
| Agent stops mid-build (credits/tokens) | Wait for reset, paste: "Continue from where you stopped; list what is done and finish only the remaining items." |
| Postgres not available | Do nothing; app falls back to SQLite. For deployment later, set `DATABASE_URL`. |
| Seed too slow / timeout | Say: "Reduce seed to 40 institutions and 200 cases; keep all planted scenarios." |
| Frontend can't reach API | Say: "Fix Vite proxy so /api goes to port 8000 and make both start from one run command." |
| Agent adds unrequested features | Say: "Revert extras; implement only what the prompt lists." |
| Charts empty | Say: "Dashboard endpoints return data? Verify with curl and fix the field names between API and charts." |
