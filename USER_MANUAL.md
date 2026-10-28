# CASELINK: Comprehensive User Manual & Operations Guide

**All India Council for Technical Education (AICTE)**  
*Regulation Bureau (RB) · Single-Window Institution Complaint Monitoring & Status Dashboard with Cross-Bureau Overlap Detection*  
**Problem Statement:** SIH 2026 — PS 26264  
**Software Version:** 1.0.0 (Production Release)

---

## 📑 Table of Contents
1. [Introduction & System Overview](#1-introduction--system-overview)
2. [User Roles & Access Permissions](#2-user-roles--access-permissions)
3. [Logging In & Account Switcher](#3-logging-in--account-switcher)
4. [Navigating the Navigation Bar & Sidebar](#4-navigating-the-navigation-bar--sidebar)
5. [Module 1: Executive Dashboard](#5-module-1-executive-dashboard)
6. [Module 2: Grievance & Case Directory](#6-module-2-grievance--case-directory)
7. [Module 3: Filing a New Case with Live Duplicate Check](#7-module-3-filing-a-new-case-with-live-duplicate-check)
8. [Module 4: Case Detail & 360° Investigation View](#8-module-4-case-detail--360-investigation-view)
9. [Module 5: Overlap Detection Hub (Matching Engine)](#9-module-5-overlap-detection-hub-matching-engine)
10. [Module 6: Institutions 360° Profile & History](#10-module-6-institutions-360-profile--history)
11. [Module 7: Alerts & SLA Compliance Queue](#11-module-7-alerts--sla-compliance-queue)
12. [Module 8: Analytics & Cross-Bureau Reports](#12-module-8-analytics--cross-bureau-reports)
13. [Module 9: Bulk CSV Data Import Wizard](#13-module-9-bulk-csv-data-import-wizard)
14. [Module 10: System Administration & SLA Rules](#14-module-10-system-administration--sla-rules)
15. [SIH Guided Tour & Hackathon Presentation Mode](#15-sih-guided-tour--hackathon-presentation-mode)
16. [Frequently Asked Questions (FAQ) & Troubleshooting](#16-frequently-asked-questions-faq--troubleshooting)

---

## 1. Introduction & System Overview

### 1.1 What is CASELINK?
AICTE oversees more than 10,000 technical institutions across India. Grievances and compliance reports are received from students, parents, faculty, whistleblowers, and state authorities through multiple channels.

Historically, complaints were processed in **silos** across 8 separate AICTE bureaus:
1. **RB** — Regulation Bureau (Policy compliance, unauthorized branches)
2. **PGRC** — Public Grievance Redressal Cell (Student fee disputes, harassment, certificate withholding)
3. **AB** — Approval Bureau (Infrastructure deficit, faculty cadred deficits, unapproved intake)
4. **ACAD** — Academic Bureau (Curriculum non-compliance, examination malpractices)
5. **FIN** — Finance Bureau (Capitation fees, scholarship fund misappropriation)
6. **LEGAL** — Legal Cell (High Court/Supreme Court writ petitions, status quo orders)
7. **VIG** — Vigilance Cell (Corruption, fraudulent degrees, fake trust members)
8. **RO** — Regional Offices (8 Regional Offices conducting ground inspections)

**The Problem:** Without a unified platform, an institution could be under investigation in 3 separate bureaus simultaneously without any bureau knowing about the others. This led to contradictory orders, duplicate physical inspections, and institutions exploiting departmental blindspots.

**The Solution:** CASELINK provides:
- A **Single-Window Institutional Intelligence View** showing all past and current complaints for any college in one aggregated timeline.
- A **RapidFuzz Multi-Signal Matching Engine** that automatically detects cross-bureau overlaps in real time using 5 distinct signals.
- **Strict Human-in-the-Loop Verification**: Potential overlaps are highlighted for officer review; cases are **never auto-merged**.

---

## 2. User Roles & Access Permissions

CASELINK features 6 granular, role-based access control (RBAC) tiers:

| Role Code | Role Name | Intended User | Scope of Access | Key Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `ADMIN` | System Administrator | AICTE IT Cell Administrator | National (All Bureaus) | Manage users, configure SLA rules, trigger engine re-indexing, view system logs. |
| `RB_OFFICER` | Regulation Bureau Officer | RB Desk Officer / Director | Regulation Bureau | Full case management in RB, view national overlaps, review and confirm links. |
| `PGRC_OFFICER` | Grievance Officer | Grievance Cell Officer | PGRC | Manage student/faculty complaints, unmask PII, initiate inter-bureau transfers. |
| `CELL_OFFICER` | Bureau Desk Officer | AB, ACAD, FIN, LEGAL, VIG | Assigned Bureau | Manage cases assigned to their specific bureau, add hearing notes, upload orders. |
| `REGIONAL_OFFICER`| Regional Officer | Regional Director / Inspector | Assigned Region (e.g. Northern) | Inspect and manage cases regarding institutions within their territorial jurisdiction. |
| `SENIOR_MGMT` | Senior Management | Member Secretary / Chairman | National (Read-Only) | Executive oversight: national heatmaps, cross-bureau matrix, SLA audit reports. |

---

## 3. Logging In & Account Switcher

### 3.1 Login Steps
1. Navigate to the portal URL (e.g., `http://localhost:5000` or your deployed Render link).
2. Enter your registered **Official Email Address** and **Password**.
3. Click the blue button: **"Sign In to Portal"**.

### 3.2 Quick-Fill Persona Badges (For Demo & Testing)
Below the login form, 5 quick-login buttons allow instant role testing without typing:
- **PGRC Officer (PGRC)** — `pgrc1@caselink.demo` *(Recommended for first walkthrough)*
- **RB Officer (Regulation)** — `rb1@caselink.demo`
- **Approval Bureau (AB)** — `ab1@caselink.demo`
- **Vigilance (VIG)** — `vig1@caselink.demo`
- **Senior Management (HQ)** — `mgmt@caselink.demo` *(Read-only)*
- **System Admin (IT)** — `admin@caselink.demo`

> **Standard Password for all Demo Accounts:** `Caselink@2026`

### 3.3 Logging Out
To log out securely:
1. Locate your user profile pill in the top-right corner of the top navigation bar.
2. Click the red **"Logout"** icon. You will be redirected to the login screen with your session token cleared.

---

## 4. Navigating the Navigation Bar & Sidebar

- **Top Navigation Bar**:
  - **Government Header**: AICTE Emblem, "AICTE CASELINK", and Regulation Bureau branding.
  - **Active Region & Bureau Indicator**: Shows which bureau and region you are logged into.
  - **Start Guided Demo Tour**: Button to launch the 5-step interactive walkthrough.
  - **User Pill**: Displays your full name, assigned role badge, and logout trigger.
- **Left Sidebar**:
  - 📊 **Dashboard**: Real-time KPI summaries, bureau distribution charts, urgent cases.
  - 📁 **All Cases**: Filterable directory of all complaints across AICTE.
  - ➕ **Register New Case**: Intake form with real-time duplicate check drawer.
  - 🔗 **Overlap Hub**: Cross-bureau candidate pairs with similarity scores.
  - 🏛️ **Institutions**: 360° directory of technical institutions.
  - 🔔 **Alerts Queue**: SLA breach warnings and transfer notifications.
  - 📈 **Analytics & Reports**: 8x8 Bureau cross-matrix and CSV exports.
  - 📥 **Import CSV**: Drag-and-drop wizard for bulk historical case files.
  - ⚙️ **Admin Panel**: User provisioning and SLA deadline settings *(visible to Admins)*.
  - ℹ️ **About & Architecture**: Project details, PS 26264 notes, and algorithm specs.

---

## 5. Module 1: Executive Dashboard

The dashboard provides a bird's-eye view of complaint health across the country.

### 5.1 Key Performance Indicator (KPI) Cards
1. **Total Cases**: Total complaints registered across all 8 bureaus (Default seed: 450 cases).
2. **Open / In-Progress**: Active cases currently undergoing inquiry, hearing, or inspection.
3. **SLA Breaches**: Cases that have exceeded their bureau-mandated resolution deadline without closure (displayed with red warning indicator).
4. **Overlaps Detected**: Confirmed or suspected duplicate complaints flagged across bureaus.

### 5.2 Visual Analytics
- **Complaints by Bureau**: Bar chart showing active case volume across RB, PGRC, AB, ACAD, FIN, LEGAL, VIG, and RO.
- **Regional Distribution**: Breakdown of cases across the 8 AICTE geographical regions (Northern, Southern, Western, etc.).

### 5.3 Urgent Cases Queue
Directly below the charts is a list of the most critical complaints:
- Prioritized by **Emergency / High Priority** and **SLA Breach Days**.
- Clicking any case takes you directly to its 360° Case Detail view.

---

## 6. Module 2: Grievance & Case Directory

The **All Cases** screen (`/cases`) allows officers to search, filter, and track complaints across the system.

### 6.1 Multi-Facet Filtering
You can filter cases using the top toolbar:
- **Search Bar**: Type any Case Number (e.g., `PGRC-2026-0001`), Institution Name, or Subject keyword.
- **Bureau Dropdown**: Filter to a specific bureau (e.g., *Regulation Bureau*, *Vigilance Cell*).
- **Status Dropdown**: Filter by `NEW`, `UNDER_INQUIRY`, `SHOW_CAUSE_ISSUED`, `HEARING_SCHEDULED`, `RESOLVED`, or `CLOSED`.
- **Priority Filter**: Filter by `LOW`, `MEDIUM`, `HIGH`, or `EMERGENCY`.
- **Region Filter**: Filter by one of the 8 AICTE regions.

### 6.2 Table Columns & Indicators
- **Case Number**: Official sequential reference code.
- **Institution**: Registered name and AICTE Permanent ID.
- **Subject**: Summary title of the grievance.
- **Bureau & Source**: Handling bureau and source channel (Portal, CPGRAMS, Email, Court Order).
- **SLA Status**: Color-coded countdown badge:
  - 🟢 **Green**: On Track (> 5 days remaining).
  - 🟡 **Amber**: Due Soon (1–5 days remaining).
  - 🔴 **Red**: SLA Breached (e.g., *Breached by 14 days*).
- **Action Button**: Click **"View Case"** to inspect full history.

### 6.3 Exporting Case Data
Click the **"Export CSV"** button on the top right to download the currently filtered view as an Excel-compatible CSV file for offline reporting.

---

## 7. Module 3: Filing a New Case with Live Duplicate Check

The **Register New Case** screen (`/cases/new`) is designed for fast, accurate intake while actively preventing duplicate investigations.

### 7.1 Step-by-Step Intake Process
1. **Select Institution**:
   - Start typing the college name or AICTE Permanent ID (e.g. `1-10293847`).
   - Select the matching institution from the dropdown. The state, city, and region will automatically populate.
2. **Grievance Details**:
   - **Case Title / Subject**: Brief description of the issue (e.g., *"Unauthorized collection of capitation fees for admission"*).
   - **Category**: Select the primary violation type (*Fee Issues*, *Faculty Shortage*, *Ragging*, *Infrastructure Deficit*, *Unapproved Courses*, etc.).
   - **Detailed Description**: Full transcript or summary of the complainant's grievance.
3. **Complainant Information**:
   - **Complainant Name**: Full name or "Anonymous".
   - **Type**: Select *Student*, *Parent*, *Faculty / Staff*, *Management*, or *Whistleblower*.
   - **Email & Phone Number**: Stored securely with PII encryption.
4. **Intake Metadata**:
   - **Source Channel**: *Web Portal*, *Email*, *CPGRAMS*, *Post / Physical*, or *Court Directive*.
   - **Priority**: *Low*, *Medium*, *High*, or *Emergency*.
   - **Handling Bureau**: Defaults to your assigned bureau or allows assignment.
5. **Attach Supporting Documents**:
   - Upload fee receipts, inspection photographs, or official letters (PDF, PNG, JPG).

### 7.2 The Live Duplicate Detection Drawer (Key Feature)
As you type the **Institution Name** and **Subject**, CASELINK's RapidFuzz engine silently scans existing complaints in the background:
- If a similar case is found in any bureau, a **"Similar Cases Detected"** alert card appears in the right sidebar.
- Click **"Inspect Candidate"** to view the existing case in a slide-out drawer without losing your current form input!
- If the complaint is identical, you can choose to append notes to the existing case rather than filing a duplicate.

6. Click **"Submit Complaint Case"** to create the official record.

---

## 8. Module 4: Case Detail & 360° Investigation View

Clicking any case opens its comprehensive dossier (`/cases/:id`).

### 8.1 Header & Status Control
- **Case Reference**: Permanent badge with status chip.
- **Status Transition Menu**: Authorized officers can update the case lifecycle state:
  - `NEW` ➔ `UNDER_INQUIRY` ➔ `SHOW_CAUSE_ISSUED` ➔ `HEARING_SCHEDULED` ➔ `RESOLVED` ➔ `CLOSED`.
- **SLA Countdown Timer**: Shows exact business days remaining until compliance breach.

### 8.2 Complainant Details & PII Masking
To comply with the **Digital Personal Data Protection (DPDP) Act 2023**:
- By default, complainant contact info is masked (`s****@gmail.com`, `+91 98****1234`).
- Authorized officers can click the **Eye icon ("Unmask PII")** to reveal full contact details for official outreach. Every unmasking event is logged to the immutable audit trail.

### 8.3 Chronological Action Timeline
The left column shows every action ever taken on this case:
- Initial registration date and intake officer.
- Show-cause notices issued.
- Hearing minutes and physical inspection reports.
- Inter-bureau transfer events.

### 8.4 Adding an Action Note / Notice
To log an update:
1. Scroll to the **"Add Case Action"** section at the bottom of the timeline.
2. Select **Action Type**: *Internal Note*, *Notice Issued*, *Hearing Scheduled*, *Status Update*, or *Inspection Report*.
3. Type the **Notes / Remarks**.
4. *(Optional)* Attach an official order or PDF report.
5. Click **"Record Action"**.

### 8.5 Inter-Bureau Transfer Protocol
If a case was filed in PGRC but involves severe infrastructure fraud falling under the **Approval Bureau (AB)**:
1. Click the **"Transfer Bureau"** button on the top right.
2. Select the **Destination Bureau** from the dropdown.
3. Enter the **Transfer Justification Reason** (e.g., *"Grievance reveals complete absence of laboratories requiring Approval Bureau inspection"*).
4. Click **"Execute Transfer"**.
5. The case is re-routed to the destination bureau, an automatic alert is dispatched to their desk officer, and a permanent transfer record is etched into the audit log.

### 8.6 Linked Overlap Cases Widget
If this complaint has been linked to a complaint in another bureau, the **"Cross-Bureau Linked Cases"** box shows:
- The related Case ID and Bureau name.
- Similarity confidence percentage.
- Link confirmation status (*Pending Review*, *Confirmed Link*, *Dismissed*).
- Click the link to jump directly to the counterpart case.

---

## 9. Module 5: Overlap Detection Hub (Matching Engine)

The **Overlap Hub** (`/overlaps`) is the brain of CASELINK. It resolves cross-bureau duplication and identifies multi-bureau violations.

### 9.1 How the Matching Engine Works
The engine scores every new case against active complaints using a **5-Signal Weighted Formula**:
1. **Institution Identity (40% Weight)**: Exact AICTE Permanent ID match or fuzzy token-sort similarity on college names.
2. **Textual Similarity (30% Weight)**: Semantic token-set ratio blended with character n-gram Jaccard similarity across subject lines and complaint bodies.
3. **Category Proximity (15% Weight)**: Exact category match scores 1.0; related categories (e.g. *Capitation Fee* vs *Fee Refund Dispute*) score 0.6.
4. **Temporal Proximity (10% Weight)**: Exponential decay based on days between filings ($\Delta t$). Cases filed within 30 days receive high scores.
5. **Complainant Correlation (5% Weight)**: Matches complainant phone/email hash or student/faculty classification.

### 9.2 Similarity Decision Bands
- 🔴 **High Overlap ($\ge 80\%$)**: Urgent red badge. High probability of being the exact same underlying incident.
- 🟡 **Possible Overlap ($55\% - 79\%$)**: Amber badge. Probable related incident (e.g., staff salary dispute occurring alongside student fee strike).
- ⚪ **Low Overlap ($< 55\%$)**: Screened out to prevent officer fatigue.

### 9.3 Reviewing an Overlap Pair
1. Locate any candidate card in the Overlap Hub.
2. Click **"Review Pair"** to open the side-by-side comparison modal.
3. The modal displays:
   - **Left Panel**: Case A details (Bureau, Institution, Subject, Date, Description).
   - **Right Panel**: Case B details.
   - **Center Panel**: The exact score breakdown bar chart showing points contributed by Institution, Text, Category, Time, and Complainant.
4. **Choose Action**:
   - **"Confirm Link"**: Click if the complaints are related. Enter a coordination note (e.g., *"Coordinating joint hearing with Approval Bureau"*). Both cases are formally linked.
   - **"Dismiss Overlap"**: Click if the similarity is coincidental (e.g., two different students having unrelated fee queries). Enter a dismissal reason. The candidate is archived.

---

## 10. Module 6: Institutions 360° Profile & History

The **Institutions Directory** (`/institutions`) eliminates the information gap between bureaus.

### 10.1 Searching Institutions
- Search across all approved colleges by **College Name**, **AICTE Permanent ID**, or **City**.
- Each card shows the total active complaints, approval status, and state.

### 10.2 The 360° Institution Profile (`/institutions/:id`)
Clicking any institution displays its master profile:
- **Master Data**: AICTE Permanent ID, Institution Category (Engineering, Management, Pharmacy), Year of Establishment, Affiliated University, and Approved Intake.
- **Cross-Bureau Complaint History Timeline**:
  - A unified chronological feed showing **every case filed across all 8 bureaus** for this institution.
  - An officer can immediately see: *"This college had a PGRC fee complaint in March, an Approval Bureau show-cause notice in May, and a Vigilance inquiry in August."*
- **Active Risk Index**: Summarizes whether the institution has repeated violations across multiple departments.

---

## 11. Module 7: Alerts & SLA Compliance Queue

The **Alerts** page (`/alerts`) acts as an automated compliance task queue.

### 11.1 Types of Alerts
1. **SLA Breach Warning (Red)**: The case has surpassed the statutory resolution period without a closed status.
2. **SLA Due Soon (Amber)**: The case will breach SLA within the next 48 to 72 hours. Immediate desk action required.
3. **Pending Inter-Bureau Transfer (Blue)**: Another bureau has transferred a case to your desk awaiting formal acceptance.
4. **High-Confidence Overlap Detected (Purple)**: A new case filed has an $80\%+$ similarity to an active case in your bureau.

### 11.2 Dismissing / Resolving Alerts
- Officers can click **"Mark Read"** or **"Take Action"** to navigate directly to the relevant case.

---

## 12. Module 8: Analytics & Cross-Bureau Reports

The **Analytics & Reports** page (`/reports`) is designed for executive decision-makers, Regional Directors, and the Member Secretary.

### 12.1 The 8x8 Bureau Overlap Cross-Matrix
A heat-mapped grid displaying where complaint overlaps occur:
- The rows represent Bureau 1 and columns represent Bureau 2.
- Cell values indicate how many institutions have overlapping cases between those two bureaus.
- *Example*: Clicking the cell intersecting **PGRC** and **Approval Bureau** reveals all 18 colleges that have both student grievances and approval non-compliance orders active.

### 12.2 Resolution Performance by Bureau
- Average resolution time in days per bureau.
- On-time resolution rate vs breach rate.

### 12.3 One-Click Reports Export
Click **"Download Bureau-Wise Summary (CSV)"** to generate a spreadsheet for official Ministry reviews or parliamentary question answers.

---

## 13. Module 9: Bulk CSV Data Import Wizard

The **Import Wizard** (`/imports`) enables importing historical complaint records from legacy spreadsheets.

### 13.1 How to Import Cases
1. Navigate to **Import CSV** in the sidebar.
2. Click **"Download Sample CSV Template"** to inspect the required column format:
   - `permanent_id`, `institution_name`, `bureau`, `complainant_name`, `complainant_type`, `complainant_email`, `complainant_phone`, `subject`, `description`, `category`, `priority`, `channel`.
3. Drag and drop your `.csv` file into the upload zone.
4. Click **"Validate and Import"**.
5. The wizard verifies AICTE Permanent IDs against registered institutions, flags any row errors, imports valid cases, and automatically initiates an overlap scan across the new records.

---

## 14. Module 10: System Administration & SLA Rules

*(Available only to users with the `ADMIN` role)*

### 14.1 User Provisioning
1. Navigate to **Admin Panel** (`/admin`).
2. View existing users across all bureaus.
3. Click **"Add New Officer"**:
   - Provide Name, Email, Role (`RB_OFFICER`, `PGRC_OFFICER`, etc.), and Assigned Bureau.
   - Set initial password.

### 14.2 Bureau SLA Deadline Configuration
Each bureau can have custom compliance resolution windows:
- Public Grievance Redressal Cell (PGRC): Default **30 days**.
- Regulation Bureau (RB): Default **45 days**.
- Vigilance Cell (VIG): Default **60 days**.
- Regional Offices (RO): Default **21 days**.
Admins can adjust the number of allowed days and click **"Save SLA Rules"** to update global thresholds.

### 14.3 Re-indexing the Matching Engine
If thousands of new cases are imported in bulk, click **"Re-run National Overlap Scan"** to re-calculate all pairwise similarity scores across the database.

---

## 15. SIH Guided Tour & Hackathon Presentation Mode

CASELINK includes a built-in **Jury Presentation Mode**:
- Click the yellow **"Start Guided Tour"** button located in the top navigation bar at any time.
- The interactive guide highlights each core capability step by step:
  1. *Executive Dashboard & Multi-Bureau Volumes*
  2. *Live Overlap Detection & Matching Formula*
  3. *Side-by-Side Review & Human-in-the-Loop Confirmation*
  4. *360° Institution Profile & Cross-Bureau Aggregation*
  5. *Exporting Audit Reports for Ministry Oversight*
- You can click **Next** or press the **Esc** key to exit at any time.

---

## 16. Frequently Asked Questions (FAQ) & Troubleshooting

**Q1: What happens if an institution's name is spelled slightly differently?**  
*A:* CASELINK's RapidFuzz engine uses token-sort and token-set algorithms that ignore word order, punctuation, and legal suffixes (e.g., *"Trust"*, *"Foundation"*, *"Pvt Ltd"*). It also cross-references the AICTE Permanent ID for 100% exact resolution when available.

**Q2: Does CASELINK ever merge or delete cases automatically?**  
*A:* **No.** Government integrity requires that official case numbers and evidence trails remain distinct. CASELINK creates mutual cross-links between cases, enabling coordinated joint actions without altering original records.

**Q3: Can a Regional Officer modify cases belonging to another region?**  
*A:* No. Access control restricts Regional Officers to institutions and complaints situated within their designated geographic boundaries.

**Q4: How do I reset demo data to its initial clean state?**  
*A:* Run this one-line command from the `backend/` directory:
```bash
python -c "from app.database import engine, Base; from app.seed import run_seed; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine); run_seed()"
```
This regenerates the 80 institutions, 450 cases, and 816 overlap candidates with deterministic seed `2026`.
