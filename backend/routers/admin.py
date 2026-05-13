from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.database import get_db
from core.security import get_current_user, requires_step_up
from models.user import User, UserRole

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
