import math
import time
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select
from models.user import User
from db.redis import get_redis

class ThreatDetectionService:
    def __init__(self, db: Session):
        self.db = db
        self.redis = get_redis()

    def check_impossible_travel(self, user_id: str, current_ip: str) -> Tuple[bool, float]:
        """
        Detects if a login is happening from a location too far from the last login.
        Returns (is_threat, risk_increase)
        """
        # Mocking geo-location for demo (in real app, use MaxMind or GeoIP API)
        # We'll store last IP and timestamp in Redis
        last_login_key = f"last_login_info:{user_id}"
        last_info_raw = self.redis.get(last_login_key)
        
        if not last_info_raw:
            # First login or expired, store current and return
            self._save_login_info(user_id, current_ip)
            return False, 0.0
        
        last_info = json.loads(last_info_raw)
        last_ip = last_info['ip']
        last_time = last_info['time']
        
        # If IP is same, no threat
        if last_ip == current_ip:
            self._save_login_info(user_id, current_ip)
            return False, 0.0
            
        # Simulate distance (real app would use lat/long)
        # For demo: if IP is in a different subnet, assume 2000km
        distance = 2000 if last_ip.split('.')[0] != current_ip.split('.')[0] else 0
        time_diff_hours = (time.time() - last_time) / 3600
        
        if time_diff_hours < 0.1: # less than 6 minutes
            speed = distance / max(time_diff_hours, 0.001)
            if speed > 1000: # over 1000 km/h
                return True, 0.8
        
        self._save_login_info(user_id, current_ip)
        return False, 0.0

    def check_brute_force(self, user_id: str) -> Tuple[bool, float]:
        """Check for repeated failed attempts."""
        key = f"failed_attempts:{user_id}"
        failed_count = self.redis.get(key)
        if failed_count and int(failed_count) > 5:
            return True, 0.5
        return False, 0.0

    def _save_login_info(self, user_id: str, ip: str):
        info = {'ip': ip, 'time': time.time()}
        self.redis.setex(f"last_login_info:{user_id}", 86400, json.dumps(info))

def analyze_threats(db: Session, user_id: str, ip: str) -> float:
    service = ThreatDetectionService(db)
    total_risk = 0.0
    
    # Run checks
    travel_threat, travel_risk = service.check_impossible_travel(user_id, ip)
    brute_threat, brute_risk = service.check_brute_force(user_id)
    
    total_risk = max(travel_risk, brute_risk)
    return total_risk
