from fastapi import APIRouter, Depends, HTTPException, Request
from authlib.integrations.starlette_client import OAuth
from core.config import settings
from core.security import create_access_token, create_refresh_token
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User
from sqlalchemy import select

router = APIRouter(prefix="/oauth", tags=["oauth"])
oauth = OAuth()

# Configure OAuth providers (placeholders)
oauth.register(
    name='google',
    client_id=settings.google_client_id or 'placeholder',
    client_secret=settings.google_client_secret or 'placeholder',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@router.get("/login/{provider}")
async def oauth_login(provider: str, request: Request):
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not supported")
    redirect_uri = request.url_for('oauth_callback', provider=provider)
    return await client.authorize_redirect(request, str(redirect_uri))

@router.get("/callback/{provider}", name="oauth_callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    token = await client.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
    
    email = user_info.get('email')
    username = user_info.get('preferred_username') or email.split('@')[0]
    
    # Check if user exists
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(username=username, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Issue Tokens
    access_token = create_access_token(data={"sub": user.username, "id": user.id, "role": user.role})
    refresh_token = create_refresh_token(db, user.id)
    
    return {
        "status": "authenticated",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "username": user.username,
            "email": user.email
        }
    }
