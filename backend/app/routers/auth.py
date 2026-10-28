import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import Token, LoginRequest, UserResponse
from app.auth import verify_password, create_access_token, get_current_user
from app.services.audit import log_audit

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# In-memory rate limiting: 10 logins per min per IP
login_attempts = defaultdict(list)

def check_rate_limit(ip: str):
    now = time.time()
    # Retain attempts in last 60s
    login_attempts[ip] = [t for t in login_attempts[ip] if now - t < 60]
    if len(login_attempts[ip]) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 1 minute before retrying."
        )
    login_attempts[ip].append(now)

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    user = db.query(User).filter(User.email == login_req.email).first()
    if not user or not verify_password(login_req.password, user.password_hash):
        log_audit(db, None, "LOGIN_FAILED", "USER", None, {"email": login_req.email}, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "bureau_id": user.bureau_id})
    log_audit(db, user.id, "LOGIN_SUCCESS", "USER", str(user.id), {"email": user.email}, client_ip)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
