import json
import httpx
from core.config import settings

async def send_security_alert(user_id: str, event: str, risk_score: float, details: dict):
    """
    Sends a security alert to configured webhooks (e.g., Discord, Slack).
    """
    # For demo, we'll just log to console if no webhook is configured
    message = {
        "title": "🚨 Security Alert",
        "description": f"A high-risk event was detected for user {user_id}",
        "fields": [
            {"name": "Event", "value": event},
            {"name": "Risk Score", "value": str(risk_score)},
            {"name": "Details", "value": json.dumps(details)}
        ],
        "color": 15158332 # Red
    }
    
    print(f"SECURITY ALERT: {json.dumps(message)}")
    
    # In a real app:
    # if settings.discord_webhook_url:
    #     async with httpx.AsyncClient() as client:
    #         await client.post(settings.discord_webhook_url, json={"embeds": [message]})
