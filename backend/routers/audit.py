from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.database import get_db
from core.security import get_current_user, RoleChecker, UserRole
from models.user import User
from services.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/logs")
async def get_audit_logs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List recent security events for the current user."""
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.user_id == user.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(50)
    ).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "risk_score": l.risk_score,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "timestamp": l.timestamp
        } for l in logs
    ]

@router.get("/stats", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.ANALYST]))])
async def get_audit_stats(db: Session = Depends(get_db)):
    """Get global security statistics for the SOC dashboard."""
    total_attempts = db.query(AuditLog).count()
    failed_attempts = db.query(AuditLog).filter(AuditLog.action.contains("Failed")).count()
    high_risk_events = db.query(AuditLog).filter(AuditLog.risk_score > 0.7).count()
    
    # Get last 24h events
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_count = db.query(AuditLog).filter(AuditLog.timestamp >= last_24h).count()
    
    return {
        "total_attempts": total_attempts,
        "failed_attempts": failed_attempts,
        "high_risk_events": high_risk_events,
        "recent_24h": recent_count,
    }
