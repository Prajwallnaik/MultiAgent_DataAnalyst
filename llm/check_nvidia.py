import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY", "").strip()
print(f"API Key start: {api_key[:10]}...")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

# 1. Test listing models
try:
    print("Fetching models...")
    r = requests.get("https://integrate.api.nvidia.com/v1/models", headers=headers)
    print(f"List Models Status: {r.status_code}")
    if r.status_code == 200:
        models = r.json()
        ids = [m["id"] for m in models.get("data", [])]
        print("Available models:")
        for i in sorted(ids):
            print(f"  - {i}")
    else:
        print(r.text)
except Exception as e:
    print(f"Error listing models: {e}")

# 2. Test chat completion with a basic request
payload = {
    "model": "nvidia/nemotron-3-ultra-550b-a55b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.2,
    "max_tokens": 10
}

try:
    print("\nTesting chat completions with nemotron-3-ultra-550b-a55b...")
    r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload)
    print(f"Chat completions status: {r.status_code}")
    print(r.text)
except Exception as e:
    print(f"Error testing chat: {e}")
