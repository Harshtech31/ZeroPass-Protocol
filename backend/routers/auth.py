import json
import base64
import logging
from datetime import datetime, timezone
from typing import Mapping
from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity, AuthenticatorSelectionCriteria, UserVerificationRequirement, PublicKeyCredentialDescriptor
from fido2.utils import websafe_decode, websafe_encode
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.database import get_db
from db.redis import get_redis
from core.config import settings
from core.security import create_access_token, create_refresh_token, verify_token, get_current_user
from core.rate_limit import RateLimit
from models.user import User, WebAuthnCredential, RefreshToken
from services.audit import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

rp = PublicKeyCredentialRpEntity(id=settings.webauthn_rp_id, name=settings.webauthn_rp_name)
server = Fido2Server(rp)

def bytes_to_base64(obj):
    if isinstance(obj, bytes):
        return websafe_encode(obj)
    if hasattr(obj, "serialize"): # Handle CoseKey and others
        return websafe_encode(obj.serialize())
    if isinstance(obj, Mapping):
        return {k: bytes_to_base64(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [bytes_to_base64(i) for i in obj]
    if hasattr(obj, "__dict__"): # Handle objects with attributes
        return {k: bytes_to_base64(v) for k, v in vars(obj).items() if not k.startswith('_')}
    return obj

from core.security import create_access_token, create_refresh_token, verify_token

@router.post("/register/begin", dependencies=[Depends(RateLimit(3, 60))])
async def register_begin(username: str, db: Session = Depends(get_db), redis = Depends(get_redis)):
    """Begin WebAuthn registration."""
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        user = User(
            username=username, 
            email=f"{username}@example.com"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    credentials = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
    
    options, state = server.register_begin(
        {"id": user.id.encode(), "name": user.username, "displayName": user.username},
        credentials=[PublicKeyCredentialDescriptor(type="public-key", id=websafe_decode(c.credential_id)) for c in credentials],
        user_verification=UserVerificationRequirement.REQUIRED
    )

    redis.setex(f"webauthn_state:{user.id}", 300, json.dumps(state))
    
    # Helper to get attributes safely from fido2 objects
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    # Manually build a clean JSON-serializable dict for the browser
    # In this version of fido2, the actual options are in options.public_key
    pk = options.public_key
    return {
        "rp": {
            "id": get_val(pk.rp, "id"),
            "name": get_val(pk.rp, "name")
        },
        "user": {
            "id": bytes_to_base64(get_val(pk.user, "id")),
            "name": get_val(pk.user, "name"),
            "displayName": get_val(pk.user, "display_name")
        },
        "challenge": bytes_to_base64(pk.challenge),
        "pubKeyCredParams": [
            {"type": p.type, "alg": p.alg} for p in pk.pub_key_cred_params
        ],
        "timeout": getattr(pk, "timeout", 60000),
        "excludeCredentials": [
            {"type": c.type, "id": bytes_to_base64(c.id)} for c in pk.exclude_credentials
        ] if pk.exclude_credentials else [],
        "authenticatorSelection": {
            "authenticatorAttachment": getattr(pk.authenticator_selection, "authenticator_attachment", None),
            "requireResidentKey": getattr(pk.authenticator_selection, "require_resident_key", False),
            "userVerification": getattr(pk.authenticator_selection, "user_verification", "required")
        } if pk.authenticator_selection else None,
        "attestation": getattr(pk, "attestation", "direct")
    }

@router.post("/register/complete")
async def register_complete(
    username: str,
    response: dict = Body(...),
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    """Complete WebAuthn registration."""
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    state_json = redis.get(f"webauthn_state:{user.id}")
    if not state_json:
        raise HTTPException(status_code=400, detail="Registration state not found or expired")
    
    state = json.loads(state_json)
    
    try:
        auth_data = server.register_complete(state, response)
        
        from fido2 import cbor
        new_credential = WebAuthnCredential(
            user_id=user.id,
            credential_id=websafe_encode(auth_data.credential_data.credential_id),
            public_key=websafe_encode(cbor.encode(auth_data.credential_data.public_key)),
            sign_count=auth_data.counter
        )
        db.add(new_credential)
        db.commit()
        
        redis.delete(f"webauthn_state:{user.id}")
        log_event(db, user.id, "Device Registered", risk_score=0.0)
        
        return {"status": "success", "message": "Device registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login/begin", dependencies=[Depends(RateLimit(5, 60))])
async def login_begin(username: str, db: Session = Depends(get_db), redis = Depends(get_redis)):
    """Begin WebAuthn login."""
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    credentials = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
    if not credentials:
        raise HTTPException(status_code=400, detail="No devices registered for this account. Please register a device first.")

    options, state = server.authenticate_begin(
        credentials=[PublicKeyCredentialDescriptor(type="public-key", id=websafe_decode(c.credential_id)) for c in credentials],
        user_verification=UserVerificationRequirement.REQUIRED
    )

    redis.setex(f"webauthn_state:{user.id}", 300, json.dumps(state))
    
    # In this version of fido2, the actual options are in options.public_key
    pk = options.public_key
    return {
        "challenge": bytes_to_base64(pk.challenge),
        "timeout": getattr(pk, "timeout", 60000),
        "rpId": getattr(pk, "rp_id", None),
        "allowCredentials": [
            {"type": c.type, "id": bytes_to_base64(c.id)} for c in pk.allow_credentials
        ] if pk.allow_credentials else [],
        "userVerification": getattr(pk, "user_verification", "required")
    }

@router.post("/login/complete")
async def login_complete(
    username: str,
    request: Request,
    response: dict = Body(...),
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    """Complete WebAuthn login and issue Access + Refresh tokens."""
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    state_json = redis.get(f"webauthn_state:{user.id}")
    if not state_json:
        raise HTTPException(status_code=400, detail="Login state not found or expired")
    
    state = json.loads(state_json)
    
    try:
        from fido2.cose import CoseKey
        from fido2.webauthn import AttestedCredentialData
        from fido2 import cbor

        credentials_db = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
        credentials = []
        for c in credentials_db:
            # Reconstruct the credential from its components
            from fido2.cose import CoseKey
            pk_bytes = websafe_decode(c.public_key)
            cred_id = websafe_decode(c.credential_id)
            credentials.append(AttestedCredentialData(
                # Use b"\0"*16 for aaguid if unknown
                b"\0" * 16 + len(cred_id).to_bytes(2, "big") + cred_id + pk_bytes
            ))

        auth_data = server.authenticate_complete(
            state,
            credentials=credentials,
            response=response
        )
        
        # Find the credential in the database
        cred_id_encoded = websafe_encode(auth_data.credential_id)
        cred = db.scalar(select(WebAuthnCredential).where(WebAuthnCredential.credential_id == cred_id_encoded))
        
        if not cred:
            raise HTTPException(
                status_code=401, 
                detail="This device is not recognized or has been revoked. Please use a registered device."
            )

        # Update sign count
        # In some fido2 versions, auth_data is the AuthenticatorData object itself
        new_counter = getattr(auth_data, "counter", getattr(getattr(auth_data, "authenticator_data", object()), "counter", 0))
        
        cred.sign_count = new_counter
        db.commit()

        # --- AI RISK ANALYSIS (C++ Engine) ---
        from core.security_engine import security_engine
        from services.alerts import send_security_alert
        import asyncio
        
        risk = security_engine.get_risk_score(
            user_id=str(user.id),
            device_id=cred_id_encoded,
            ip_address=request.client.host
        )
        
        # Log the risk score
        log_event(db, user.id, f"Risk Analysis: {risk['risk_level']}", risk_score=risk["score"])
        
        # Decision Logic
        if risk["risk_level"] == "HIGH":
            asyncio.create_task(send_security_alert(user.id, "High Risk Login Blocked", risk["score"], {"ip": request.client.host}))
            raise HTTPException(
                status_code=403, 
                detail="Login blocked due to high security risk. Please contact support."
            )
        
        if risk["risk_level"] == "MEDIUM":
            asyncio.create_task(send_security_alert(user.id, "Medium Risk Login Detected", risk["score"], {"ip": request.client.host}))

        # --- Issue Tokens ---
        access_token = create_access_token(data={"sub": user.username, "id": user.id, "role": user.role})
        refresh_token = create_refresh_token(db, user.id)
        
        redis.delete(f"webauthn_state:{user.id}")
        
        return {
            "status": "authenticated", 
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/refresh")
async def refresh_token(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """Rotate refresh token and issue new access token."""
    db_token = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token == refresh_token)
        .where(RefreshToken.revoked == False)
    )
    
    if not db_token or db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    user = db.scalar(select(User).where(User.id == db_token.user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Revoke old token
    db_token.revoked = True
    db.commit()

    # Issue new ones
    new_access_token = create_access_token(data={"sub": user.username, "id": user.id, "role": user.role})
    new_refresh_token = create_refresh_token(db, user.id)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """Revoke a refresh token."""
    db_token = db.scalar(select(RefreshToken).where(RefreshToken.token == refresh_token))
    if db_token:
        db_token.revoked = True
        db.commit()
    return {"status": "success", "message": "Logged out successfully"}

@router.post("/step-up/begin")
async def step_up_begin(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Begin a step-up authentication flow."""
    credentials_db = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
    
    if not credentials_db:
        raise HTTPException(status_code=400, detail="No devices registered")

    options, state = server.authenticate_begin(
        credentials=[PublicKeyCredentialDescriptor(type="public-key", id=websafe_decode(c.credential_id)) for c in credentials_db]
    )
    
    from db.redis import redis_client
    redis_client.setex(f"step_up_state:{user.id}", 300, json.dumps(state))
    
    # Standardize for frontend
    if hasattr(options, 'public_key'):
        return bytes_to_base64(options.public_key)
    return bytes_to_base64(options)

@router.post("/step-up/complete")
async def step_up_complete(
    response: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a step-up authentication flow."""
    from db.redis import redis_client
    state_json = redis_client.get(f"step_up_state:{user.id}")
    if not state_json:
        raise HTTPException(status_code=400, detail="Step-up session expired")
    
    state = json.loads(state_json)
    credentials_db = db.scalars(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)).all()
    
    try:
        from fido2.webauthn import AttestedCredentialData
        credentials = []
        for c in credentials_db:
            pk_bytes = websafe_decode(c.public_key)
            cred_id = websafe_decode(c.credential_id)
            credentials.append(AttestedCredentialData(
                b"\0" * 16 + len(cred_id).to_bytes(2, "big") + cred_id + pk_bytes
            ))

        # Verify signature
        server.authenticate_complete(
            state,
            credentials=credentials,
            response=response
        )
        
        # Mark as elevated for 5 minutes
        from db.redis import redis_client
        redis_client.setex(f"step_up_verified:{user.id}", 300, "true")
        redis_client.delete(f"step_up_state:{user.id}")
        
        return {"status": "success", "message": "Identity verified. Session elevated."}
    except Exception as e:
        logger.error(f"Step-up verification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
