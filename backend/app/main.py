import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal, get_db_type
from app.seed import seed_database
from app.services.sla import generate_alerts

from app.routers import (
    auth, institutions, cases, overlaps, dashboard,
    alerts, reports, imports, users
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("caselink")

async def periodic_sla_alert_worker():
    while True:
        try:
            await asyncio.sleep(900)  # 15 minutes
            logger.info("Executing periodic SLA alert generation background check...")
            db = SessionLocal()
            try:
                generate_alerts(db)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in SLA alert worker: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and run seed
    logger.info("Booting AICTE CASELINK Application...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Start background task
    worker_task = asyncio.create_task(periodic_sla_alert_worker())
    yield
    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("CASELINK Application shutdown complete.")

app = FastAPI(
    title="AICTE CASELINK – Integrated Institution Complaint Monitoring & Status Dashboard",
    description="SIH 2026 Problem Statement 26264 · Regulation Bureau, AICTE",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Security Exception Handler: Prevent raw stack traces
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the administrator."}
    )

# Include Routers
app.include_router(auth.router)
app.include_router(institutions.router)
app.include_router(cases.router)
app.include_router(overlaps.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(imports.router)
app.include_router(users.router)

@app.get("/api/health")
def health_check():
    db = SessionLocal()
    try:
        db_type = get_db_type()
        from app.models import Institution
        count = db.query(Institution).count()
        return {
            "status": "ok",
            "db": db_type,
            "seeded": count > 0,
            "institutions_count": count
        }
    finally:
        db.close()

# Production Single-Container SPA Serving
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.isdir(frontend_dist):
    frontend_dist = os.environ.get("FRONTEND_DIST_DIR", "")

if frontend_dist and os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "docs", "openapi.json", "redoc", "uploads/")):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend index.html not found"})
else:
    @app.get("/")
    def root():
        return {
            "project": "AICTE CASELINK",
            "system": "Single-Window Institution Complaint Monitoring & Overlap Detection",
            "docs": "/docs",
            "health": "/api/health"
        }

