from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "ZeroPass Protocol API"
    debug: bool = False

    # Database
    database_url: str = "postgresql://user:pass@localhost:5432/zeropass"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "changeme-super-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15  # Short-lived access token
    jwt_refresh_expire_days: int = 7 # Long-lived refresh token

    # C++ Security Engine (gRPC)
    # OAuth
    app_name: str = "ZeroPass Protocol"
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    security_engine_url: str = "localhost:50051"

    # WebAuthn / FIDO2
    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "ZeroPass Protocol"
    webauthn_origin: str = "http://localhost:3005"

    class Config:
        env_file = ".env"


settings = Settings()
