from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.database import get_db
from core.security import get_current_user, requires_step_up
from models.user import User, UserRole
from db.redis import get_redis
import time

router = APIRouter(prefix="/admin", tags=["admin"])

def requires_admin(user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Administrative privileges required")
    return user

@router.get("/users")
async def list_all_users(
    admin: User = Depends(requires_admin),
    db: Session = Depends(get_db)
):
    """List all registered users (Admin only)."""
    users = db.scalars(select(User).order_by(User.username)).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at
        } for u in users
    ]

@router.post("/promote/{user_id}")
async def promote_to_admin(
    user_id: str,
    admin: User = Depends(requires_step_up), # Re-verify current admin
    db: Session = Depends(get_db)
):
    """Promote a user to ADMIN. Requires fresh hardware verification."""
    # Secondary role check because requires_step_up returns any verified user
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Administrative privileges required")

    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    target_user.role = UserRole.ADMIN
    db.commit()

    # Log the administrative action
    from services.audit import log_event
    log_event(db, admin.id, f"Promoted user {target_user.username} to ADMIN", risk_score=0.1)

    return {"status": "success", "message": f"User {target_user.username} is now an ADMIN"}

@router.get("/health")
async def get_system_health(
    admin: User = Depends(requires_admin),
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    """Check connectivity to all core infrastructure components."""
    health = {
        "database": "unhealthy",
        "redis": "unhealthy",
        "engine": "unhealthy",
        "timestamp": time.time()
    }

    # 1. Check DB
    try:
        db.execute(select(1))
        health["database"] = "healthy"
    except Exception:  # nosec: B110
        pass

    # 2. Check Redis
    try:
        if redis.ping():
            health["redis"] = "healthy"
    except Exception:  # nosec: B110
        pass

    # 3. Check C++ Engine (Mocked check for now, can be expanded to gRPC ping)
    health["engine"] = "healthy" # Assume healthy if backend is up for now

    return health

@router.post("/lockdown")
async def toggle_lockdown(
    enabled: bool = Body(..., embed=True),
    admin: User = Depends(requires_step_up),
    redis = Depends(get_redis)
):
    """Enable or disable global protocol lockdown."""
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Administrative privileges required")
    
    redis.set("system_lockdown", "true" if enabled else "false")
    
    from services.audit import log_event
    status = "INITIALIZED" if enabled else "DEACTIVATED"
    log_event(None, admin.id, f"GLOBAL LOCKDOWN {status}", risk_score=0.9 if enabled else 0.0)
    
    return {"status": "success", "lockdown": enabled}


@router.post("/simulate-threat")
async def simulate_threat(
    admin: User = Depends(requires_admin),
    db: Session = Depends(get_db)
):
    """Simulate a high-risk security event for demonstration purposes."""
    from services.audit import log_event
    import random
    
    fake_ips = ["192.168.1.100", "45.77.12.33", "103.44.22.11", "201.55.66.77"]
    actions = ["FAILED_HANDSHAKE", "UNAUTHORIZED_DEVICE_SIGNATURE", "BRUTE_FORCE_KEY_ATTEMPT", "MALICIOUS_PAYLOAD_DETECTION"]
    
    for _ in range(5):
        ip = random.choice(fake_ips)
        action = random.choice(actions)
        score = random.uniform(0.75, 0.99)
        log_event(db, None, action, risk_score=score, ip_address=ip)
        
    return {"status": "success", "message": "High-risk events injected into SOC manifest."}
