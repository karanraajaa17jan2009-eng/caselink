# CASELINK: AICTE Regulation Bureau Single-Window Complaint Monitoring & Status Dashboard with Cross-Bureau Overlap Detection

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026264-orange.svg)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Tailwind-61DAFB.svg)](https://react.dev)
[![RapidFuzz](https://img.shields.io/badge/Matching%20Engine-RapidFuzz%20%7C%20Deterministic-blueviolet.svg)](https://github.com/maxbachmann/RapidFuzz)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Official Solution for Smart India Hackathon (SIH) 2026**  
> **Problem Statement ID:** 26264  
> **Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India  
> **Bureau:** Regulation Bureau (RB)

---

## 🏛️ Executive Summary

AICTE receives thousands of grievances and compliance reports annually across **8 distinct operational bureaus** (Regulation Bureau, Public Grievance Redressal Cell, Approval Bureau, Academic Bureau, Finance Bureau, Legal Cell, Vigilance Cell, and Regional Offices). Historically, each bureau operated in informational silos:
- A student complaints of fee extortion to PGRC.
- A faculty member reports unapproved faculty cuts to the Approval Bureau.
- An anonymous whistleblower reports financial irregularities to Vigilance.

Because there was no unified institutional view, **the same institution could be under investigation in three bureaus simultaneously with zero cross-awareness**, causing duplicated inspections, contradictory orders, and delayed student relief.

**CASELINK** solves this by delivering:
1. **Single-Window Institutional Intelligence**: A unified 360° timeline of all complaints, inspections, notices, and actions across all 8 AICTE bureaus for every approved institution.
2. **Transparent, Multi-Signal Cross-Bureau Overlap Detection**: A deterministic, real-time matching engine powered by RapidFuzz scoring institutional identity, semantic similarity, category alignment, temporal proximity, and complainant patterns.
3. **Strict Human-in-the-Loop Safeguards**: Suspected overlaps are flagged with transparent score breakdowns; cases are **never auto-merged**, empowering officers to link, coordinate joint inspections, or dismiss false positives.
4. **Bureaucratic Workflow Engine**: Comprehensive transfer protocols, formal responses, multi-stage escalations, dynamic SLA trackers, and immutable audit logs.
5. **Zero External Data Leakage**: 100% self-hosted, deterministic, air-gappable architecture requiring no paid third-party APIs or cloud subscriptions.

---

## 📐 System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  CASELINK CLIENT                                  |
|                 React 18 + TypeScript + Vite + Tailwind CSS (Port 5000)           |
+-----------------------------------------------------------------------------------+
                                          |
                                [ RESTful JSON APIs ]
                                          v
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                    |
|                             Python 3.11 (Port 8000)                              |
|                                                                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | JWT Authentication |  | Role-Based Auth Guard|  | Dynamic SLA Cron Daemon   |  |
|  | (12 Demo Accounts) |  | (6 Granular Roles)   |  | (15-min background sweep) |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                     RAPIDFUZZ MULTI-SIGNAL MATCHING ENGINE                  |  |
|  |  * Fuzzy Token Match (0.40)  * Text Cosine/Jaccard (0.30)  * Category (0.15) |  |
|  |  * Temporal Decay (0.10)     * Complainant Signature (0.05)                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                     SQLALCHEMY 2.0 REPOSITORY LAYER                         |  |
|  |  11 Models: Region, Bureau, User, Institution, ComplaintCase, CaseAction,   |  |
|  |             CaseLink, Alert, SlaRule, AuditLog, ImportJob                   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                DATABASE LAYER                                     |
|             SQLite 3 (Development/Demo) / PostgreSQL 15+ (Production)             |
+-----------------------------------------------------------------------------------+
```

---

## 🧮 Matching Algorithm Deep Dive

Many grievance systems either rely on rigid database foreign keys (which fail when institution names vary, e.g., *"Delhi Inst. of Tech."* vs *"Delhi Institute of Technology & Mgmt"*), or non-deterministic cloud LLMs (which are slow, expensive, hallucinate, and breach government data privacy).

CASELINK uses a **deterministic 5-signal composite scoring engine** running in `< 15ms` per pair:

$$\text{Composite Score} = 0.40 \cdot S_{\text{inst}} + 0.30 \cdot S_{\text{text}} + 0.15 \cdot S_{\text{cat}} + 0.10 \cdot S_{\text{time}} + 0.05 \cdot S_{\text{comp}}$$

### 1. Signal Breakdown

| Signal | Weight | Formulation & Methodology |
| :--- | :---: | :--- |
| **Institution Resolution ($S_{\text{inst}}$)** | `40%` | Exact AICTE Permanent ID match yields `1.0`. Otherwise, normalized token-sort ratio with legal suffixes stripped (*"Pvt Ltd"*, *"Trust"*, *"Society"*). |
| **Subject & Description ($S_{\text{text}}$)** | `30%` | RapidFuzz token-set similarity blended with character n-gram Jaccard similarity across case title, subject, and body text. |
| **Category Alignment ($S_{\text{cat}}$)** | `15%` | Same category = `1.0`. Related category (e.g., *Faculty Ratio* vs *Service Conditions*, or *Capitation Fee* vs *Refund Dispute*) = `0.6`. |
| **Temporal Proximity ($S_{\text{time}}$)** | `10%` | Exponential decay over days difference: $\exp(-0.005 \cdot \Delta t)$. Cases filed within 30 days score $> 0.86$; within 180 days score $> 0.40$. |
| **Complainant Pattern ($S_{\text{comp}}$)** | `05%` | Matches masked complainant phone/email hash or complainant classification (*Student*, *Faculty*, *Whistleblower*). |

### 2. Decision Bands

- **Score $\ge 0.80$ (HIGH OVERLAP - Red Badge)**: Immediate notification generated for both bureau handling officers. Cross-bureau banner shown on case detail.
- **$0.55 \le \text{Score} < 0.80$ (POSSIBLE OVERLAP - Amber Badge)**: Displayed in the Overlap Hub for review with side-by-side comparison.
- **Score $< 0.55$ (LOW OVERLAP - Gray)**: Filtered out of default views to prevent alert fatigue.

---

## 👥 Role-Based Access Control (RBAC) Matrix

CASELINK enforces strict multi-tenant bureau separation with zero-trust audit trails:

| Role | Scope | Permitted Actions |
| :--- | :--- | :--- |
| `ADMIN` | System-Wide | User management, bureau SLA configuration, re-indexing, system settings. |
| `RB_OFFICER` | Regulation Bureau | Full access to Regulation Bureau cases, cross-bureau view, joint link reviews. |
| `PGRC_OFFICER` | Grievance Cell | Manage student/faculty complaints, initiate bureau transfers, link cases. |
| `CELL_OFFICER` | Specific Bureau | Manage bureau cases (Approval, Academic, Finance, Legal, Vigilance). |
| `REGIONAL_OFFICER` | Regional Office | View & manage institutions and cases within their assigned AICTE region. |
| `SENIOR_MGMT` | All Bureaus | Executive read-only oversight: national heatmaps, matrix reports, KPI audits. |

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

### One-Click Launch (Windows)
Double-click `start_caselink.bat` or run in PowerShell:
```powershell
python run.py
```
This boots both the FastAPI backend on `http://127.0.0.1:8000` and the React frontend on `http://localhost:5000`.

---

### Manual Step-by-Step Installation

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run pytest suite (11 unit tests)
pytest tests

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build   # Validates TypeScript & Tailwind bundle
npm run dev     # Runs on http://localhost:5000
```

---

## 🐳 Production Deployment Guide

### Option 1: Docker Compose (PostgreSQL + FastAPI + React SPA in One Command)
For turnkey production or cloud VM hosting:
```bash
docker compose up --build -d
```
- App & UI available at: `http://your-server-ip:8000`
- PostgreSQL 16 runs isolated with persistent storage.
- All 80 institutions, 450 cases, and 816 overlaps are automatically seeded on first launch.

### Option 2: Cloud PaaS (Render, Railway, Fly.io, GCP Cloud Run, AWS App Runner)
CASELINK features a self-contained multi-stage [Dockerfile](file:///e:/SIH/Dockerfile):
1. Connect your Git repository to your cloud provider.
2. Select **Docker** environment.
3. Configure environment variables (or let them default to SQLite):
   - `DATABASE_URL`: (e.g. `postgresql://user:pass@host:5432/db`)
   - `SECRET_KEY`: A secure random string
   - `PORT`: Automatically set by cloud host (defaults to `8000`)
4. Deploy! The container builds the React SPA and serves both frontend and API from a single lightweight container with zero CORS configuration needed.

### Option 3: Manual Production Setup on Linux VM (Ubuntu / Debian)
```bash
# 1. Build React frontend bundle
cd frontend && npm install && npm run build && cd ..

# 2. Setup Python environment
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Run with Gunicorn multi-worker ASGI
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

---

## 🔑 Demo Login Accounts

All demo accounts use the standard password: `Caselink@2026`

| Email | Role | Bureau / Scope | Key Use Case |
| :--- | :--- | :--- | :--- |
| `admin@caselink.demo` | `ADMIN` | System-Wide | Global SLA rules, user provisioning, import wizard. |
| `rb1@caselink.demo` | `RB_OFFICER` | Regulation Bureau | Handling regulatory violations & joint actions. |
| `pgrc1@caselink.demo` | `PGRC_OFFICER` | Grievance Cell | Resolving student complaints, cross-bureau links. |
| `ab1@caselink.demo` | `CELL_OFFICER` | Approval Bureau | Tracking intake cuts, land compliance, faculty norms. |
| `vig1@caselink.demo` | `CELL_OFFICER` | Vigilance Cell | Investigating whistleblower & financial fraud cases. |
| `ro_nr1@caselink.demo`| `REGIONAL_OFFICER`| Northern Region | Field inspections & regional institution monitoring. |
| `mgmt@caselink.demo` | `SENIOR_MGMT` | National AICTE | Read-only executive dashboard & export reports. |

---

## 🎬 2-Minute SIH Jury Demo Script

| Time | Screen | Action | Speaking Point |
| :---: | :--- | :--- | :--- |
| **0:00 - 0:25** | **Login & Dashboard** | Click `PGRC Officer` quick login. View Dashboard. Point to 4 KPI cards and Bureau Breakdown chart. | *"Welcome to CASELINK. Notice the real-time AICTE status: 450 cases across 8 bureaus. Our active SLA monitor automatically flags breaches without manual recalculation."* |
| **0:25 - 0:50** | **Overlap Detection** | Click **Overlap Hub** (`/overlaps`). Select the high-confidence pair (e.g. `PGRC-2026-0001` vs `RB-2026-0003`). | *"Here is the breakthrough: An institution filed under PGRC for withholding student documents was simultaneously reported to Regulation Bureau for unapproved closures. RapidFuzz computes an 89% composite similarity score across institution token matches, semantic n-grams, and category proximity."* |
| **0:50 - 1:15** | **Human-in-the-Loop Action** | Click **Review Pair** on the overlap card. Click **Confirm Link** with note: *"Coordinating joint inspection"*. | *"Unlike fragile black-box AI, CASELINK enforces strict human accountability. The officer confirms the link, creating a mutual cross-bureau link without destroying case history."* |
| **1:15 - 1:40** | **Institution 360° Profile** | Click **Institutions** (`/institutions`), search for the institution, and open its profile. | *"Now look at the 360° view. For the first time, any AICTE officer can inspect all past and present cases across all 8 bureaus in a unified chronological timeline, preventing institutions from playing bureaus against each other."* |
| **1:40 - 2:00** | **Reports & Export** | Navigate to **Analytics & Reports** (`/reports`). Click **Export CSV Report**. | *"Instant bureau cross-matrices, SLA breach audits, and one-click compliance reports. Zero recurring cloud fees, zero external data leakage, 100% compliant with the DPDP Act 2023."* |

---

## 📊 Evaluation & Seed Data Verification

To ensure full reproducibility for the SIH evaluation committee, CASELINK includes a deterministic database seeder (`seed=2026`) generating:
- **8 Geographic Regions**: Northern, North-Western, Central, Eastern, Southern, South-Western, Western, South-Central.
- **8 Operational Bureaus**: RB, PGRC, AB, ACAD, FIN, LEGAL, VIG, RO.
- **80 Fictional Institutions**: Realistic AICTE Permanent IDs, states, tiers, and faculties.
- **450 Complaint Cases**: Chronologically distributed over 18 months across multiple channels (Portal, Email, CPGRAMS, Court Order).
- **1,888 Case Actions**: Detailed case notes, inspections, hearings, and show-cause notices.
- **816 Detected Overlap Candidates**: Planted overlap clusters with verifiable high, medium, and low scores.
- **2,020 SLA Alerts**: Active, due soon, and breached compliance notices.

To re-seed the database at any time:
```bash
cd backend
python -c "from app.database import engine, Base; from app.seed import run_seed; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine); run_seed()"
```

---

## 🔒 Security, Compliance & DPDP Act 2023

1. **Immutable Audit Trail**: Every status change, note addition, transfer, and overlap confirmation writes an append-only row to the `audit_logs` table recording user ID, IP address, timestamp, old state, and new state.
2. **PII Masking**: Complainant phone numbers and email addresses are masked by default (`ab****@gmail.com`, `+91 98****1234`) with unmasking privileges restricted to authorized grievance officers.
3. **Data Sovereign**: Operates on-premises or on NIC/MeitY-approved government cloud with zero outbound dependencies to third-party AI providers.

---

## 🛣️ Future Roadmap (Phase 2 & 3)

- [ ] **DigiLocker Integration**: Direct fetching of student Marksheets and Institution Approval Letters.
- [ ] **CPGRAMS Bi-Directional Webhook**: Real-time sync with Central Government Public Grievance Portal.
- [ ] **Bhashini Speech-to-Text**: Voice-recorded grievance intake in 22 official Indian languages.
- [ ] **Geotagged Inspection Uploads**: Mobile evidence upload with automated GPS stamp verification for Regional Office visits.

---

## 👨‍💻 Team & Attribution

Developed with pride for **Smart India Hackathon (SIH) 2026**  
All India Council for Technical Education (AICTE), New Delhi  
*Serving 10,000+ technical institutions and millions of students nationwide.*
