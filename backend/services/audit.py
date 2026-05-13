from sqlalchemy.orm import Session
from models.user import User
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped
from db.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    risk_score: Mapped[float] = mapped_column(default=0.0)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

def log_event(db: Session, user_id: str, action: str, risk_score: float = 0.0, ip: str = None, ua: str = None):
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        risk_score=risk_score,
        ip_address=ip,
        user_agent=ua
    )
    db.add(new_log)
    db.commit()
