import sys
import pandas as pd
from fastapi.testclient import TestClient

# Import the FastAPI app from api.py
try:
    from api import app, _sessions
except Exception as e:
    print(f"Error importing api: {e}")
    sys.exit(1)

# Create a test client
client = TestClient(app)

# 1. Create a simple dummy DataFrame
df = pd.DataFrame({
    "Year": [2021, 2022, 2023],
    "Location": ["New York", "London", "Tokyo"],
    "Casualties": [10, 20, 30],
    "Cause": ["Accident", "Natural", "Technical"],
    "Weather": ["Sunny", "Rainy", "Cloudy"]
})

# 2. Mock a session
session_id = "test-session-id"
_sessions[session_id] = {
    "df": df,
    "schema_context": "Columns: Year, Location, Casualties, Cause, Weather",
    "filename": "test_dataset.csv"
}

# 3. Call /api/query
print("Sending request to /api/query...")
try:
    response = client.post("/api/query", data={
        "session_id": session_id,
        "query": "perform the EDA"
    })
    print(f"Response status code: {response.status_code}")
    print("Response text:")
    print(response.text)
except Exception as e:
    import traceback
    print("Error calling API endpoint:")
    traceback.print_exc()
