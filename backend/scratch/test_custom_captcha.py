import asyncio
import httpx
import os
import base64
from unittest.mock import MagicMock

# Mock Redis
class MockRedis:
    def __init__(self):
        self.data = {}
    def setex(self, key, time, value):
        self.data[key] = value
    def get(self, key):
        val = self.data.get(key)
        if val and isinstance(val, str):
            return val.encode()
        return val
    def delete(self, key):
        if key in self.data:
            del self.data[key]

# Simplified version of the logic in auth.py
async def test_captcha_flow():
    print("Testing Custom Captcha Flow...")
    redis = MockRedis()
    username = "testuser"
    
    # 1. Generate
    asset_dir = "backend/assets/captcha"
    sets = [d for d in os.listdir(asset_dir) if os.path.isdir(os.path.join(asset_dir, d))]
    selected_set = sets[0]
    set_path = os.path.join(asset_dir, selected_set)
    
    # Verify images exist
    if not os.path.exists(os.path.join(set_path, "normal.png")):
        raise RuntimeError("normal.png missing")
    if not os.path.exists(os.path.join(set_path, "odd.png")):
        raise RuntimeError("odd.png missing")
    print(f"Using set: {selected_set}")

    # (Logic from generate endpoint)
    with open(os.path.join(set_path, "normal.png"), "rb") as f:
        normal_b64 = base64.b64encode(f.read()).decode()
    with open(os.path.join(set_path, "odd.png"), "rb") as f:
        odd_b64 = base64.b64encode(f.read()).decode()
    
    images = [normal_b64] * 5
    images.append(odd_b64)
    
    import secrets
    indices = list(range(6))
    secrets.SystemRandom().shuffle(indices)
    
    odd_index = -1
    for i, original_pos in enumerate(indices):
        if original_pos == 5:
            odd_index = i
            
    redis.setex(f"reg_captcha_answer:{username}", 300, str(odd_index))
    print(f"Correct index stored in Redis: {odd_index}")

    # 2. Verify Success
    stored_index = redis.get(f"reg_captcha_answer:{username}")
    if stored_index.decode() != str(odd_index):
        raise RuntimeError("Verification logic failed")
    print("Verification Success: Index matches.")

    # 3. Verify Failure
    wrong_index = (odd_index + 1) % 6
    if str(wrong_index) == stored_index.decode():
        raise RuntimeError("Failure logic failed")
    print(f"Verification Failure: Wrong index {wrong_index} correctly identified.")

if __name__ == "__main__":
    asyncio.run(test_captcha_flow())
