import logging
import json
import time
import uuid
from pythonjsonlogger import jsonlogger
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response

def setup_logging():
    logger = logging.getLogger()
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s %(correlation_id)s',
        json_ensure_ascii=False
    )
    
    # Custom field for timestamp
    def add_custom_fields(log_record, record, message_dict):
        log_record['timestamp'] = datetime.now().isoformat()
        log_record['level'] = record.levelname
        
    logHandler.setFormatter(formatter)
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)

# For imports
from datetime import datetime
