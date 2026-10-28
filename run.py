"""
CASELINK - Single-Window Institution Complaint Monitoring & Status Dashboard
Full-stack runner: Launches FastAPI Backend (port 8000) and Vite Frontend (port 5000).
"""
import sys
import os
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Path to python in backend venv
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

def main():
    print("=" * 70)
    print("  CASELINK (AICTE Regulation Bureau) - Multi-Bureau Dashboard")
    print("  Problem Statement: SIH 2026 - PS 26264")
    print("=" * 70)
    print("\n[+] Starting FastAPI backend on http://127.0.0.1:8000 ...")
    
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR
    )

    print("[+] Starting Vite React frontend on http://localhost:5000 ...")
    frontend_proc = subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=FRONTEND_DIR
    )

    print("\n" + "=" * 70)
    print("  SYSTEM READY!")
    print("  Frontend UI : http://localhost:5000")
    print("  Backend API : http://127.0.0.1:8000")
    print("  Swagger Docs: http://127.0.0.1:8000/docs")
    print("-" * 70)
    print("  DEMO LOGIN CREDENTIALS:")
    print("  - Admin:             admin@caselink.demo / Caselink@2026")
    print("  - RB Officer:        rb1@caselink.demo / Caselink@2026")
    print("  - PGRC Officer:      pgrc1@caselink.demo / Caselink@2026")
    print("  - Approval Bureau:   ab1@caselink.demo / Caselink@2026")
    print("  - Senior Management: mgmt@caselink.demo / Caselink@2026 (Read-only)")
    print("=" * 70)
    print("Press Ctrl+C to terminate both servers...\n")

    def signal_handler(sig, frame):
        print("\nStopping CASELINK servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("Servers stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("Backend terminated unexpectedly.")
                frontend_proc.terminate()
                break
            if frontend_proc.poll() is not None:
                print("Frontend terminated unexpectedly.")
                backend_proc.terminate()
                break
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
