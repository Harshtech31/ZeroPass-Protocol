import secrets
import string
import json
import hashlib
from typing import List, Tuple
from sqlalchemy.orm import Session
from models.user import User

def generate_recovery_codes(count: int = 10) -> Tuple[List[str], str]:
    """Generate plain codes and their hashed JSON representation."""
    plain_codes = []
    hashed_codes = []
    
    for _ in range(count):
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12))
        plain_codes.append(code)
        hashed_codes.append(hash_code(code))
        
    return plain_codes, json.dumps(hashed_codes)

def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def verify_and_use_code(db: Session, user: User, code: str) -> bool:
    if not user.recovery_codes:
        return False
    
    hashed_codes = json.loads(user.recovery_codes)
    target_hash = hash_code(code)
    
    if target_hash in hashed_codes:
        hashed_codes.remove(target_hash)
        user.recovery_codes = json.dumps(hashed_codes)
        db.commit()
        return True
    
    return False
