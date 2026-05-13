import time
from fastapi import HTTPException, Request, status
from db.redis import get_redis

async def rate_limit(request: Request, limit: int, window: int):
    """
    Simple sliding window rate limiter using Redis.
    limit: max requests
    window: time window in seconds
    """
    redis = get_redis()
    client_ip = request.client.host
    endpoint = request.url.path
    key = f"rate_limit:{client_ip}:{endpoint}"
    
    current_time = time.time()
    
    # Use Redis sorted set to track requests
    # Remove old requests
    redis.zremrangebyscore(key, 0, current_time - window)
    
    # Count current requests
    request_count = redis.zcard(key)
    
    if request_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )
    
    # Add current request
    redis.zadd(key, {str(current_time): current_time})
    # Set expiry on the whole set
    redis.expire(key, window)

def RateLimit(limit: int, window: int):
    async def dependency(request: Request):
        await rate_limit(request, limit, window)
    return dependency
