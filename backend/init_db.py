from db.database import engine, Base
from models.user import User, WebAuthnCredential
from services.audit import AuditLog

print("Initializing database...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully.")
