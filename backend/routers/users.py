from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from db.database import get_db
from core.security import get_current_user, requires_step_up
from models.user import User, WebAuthnCredential
from services.recovery import generate_recovery_codes, verify_and_use_code

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_current_user_profile(user: User = Depends(get_current_user)):
    """Return current authenticated user's profile."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active
    }

@router.get("/devices")
async def get_user_devices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all registered devices for the current user."""
    devices = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
    return [
        {
            "id": d.id,
            "credential_id": d.credential_id,
            "device_name": d.device_name or "Unknown Device",
            "sign_count": d.sign_count,
            "created_at": d.created_at
        } for d in devices
    ]

@router.patch("/devices/{device_id}")
async def rename_device(
    device_id: str,
    name: str = Body(..., embed=True),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rename a registered device."""
    device = db.scalar(
        select(WebAuthnCredential)
        .where(WebAuthnCredential.id == device_id)
        .where(WebAuthnCredential.user_id == user.id)
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.device_name = name
    db.commit()
    return {"status": "success", "message": "Device renamed"}

@router.delete("/devices/{device_id}")
async def revoke_device(
    device_id: str,
    user: User = Depends(requires_step_up),
    db: Session = Depends(get_db)
):
    """Revoke a registered device."""
    device = db.scalar(
        select(WebAuthnCredential)
        .where(WebAuthnCredential.id == device_id)
        .where(WebAuthnCredential.user_id == user.id)
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(device)
    db.commit()
    return {"status": "success", "message": "Device revoked"}

@router.post("/recovery/generate")
async def create_recovery_codes(
    user: User = Depends(requires_step_up),
    db: Session = Depends(get_db)
):
    """Generate new recovery codes for the user."""
    plain_codes, hashed_json = generate_recovery_codes()
    user.recovery_codes = hashed_json
    db.commit()
    return {"recovery_codes": plain_codes}

@router.post("/recovery/verify")
async def use_recovery_code(
    username: str = Body(...),
    code: str = Body(...),
    db: Session = Depends(get_db)
):
    """Use a recovery code to gain emergency access."""
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if verify_and_use_code(db, user, code):
        from core.security import create_access_token, create_refresh_token
        
        access_token = create_access_token(data={"sub": user.username, "id": user.id, "role": user.role})
        refresh_token = create_refresh_token(db, user.id)
        
        from services.audit import log_event
        log_event(db, user.id, "Recovery Code Used", risk_score=0.1)
        
        return {
            "status": "authenticated", 
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    raise HTTPException(status_code=400, detail="Invalid recovery code")
