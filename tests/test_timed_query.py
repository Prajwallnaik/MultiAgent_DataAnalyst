import time
import sys
import pandas as pd
from fastapi.testclient import TestClient

t_start = time.time()

from api import app, _sessions
client = TestClient(app)

df = pd.DataFrame({
    "Year": [2021, 2022, 2023],
    "Location": ["New York", "London", "Tokyo"],
    "Casualties": [10, 20, 30],
    "Cause": ["Accident", "Natural", "Technical"],
    "Weather": ["Sunny", "Rainy", "Cloudy"]
})

session_id = "test-session-id"
_sessions[session_id] = {
    "df": df,
    "schema_context": "Columns: Year, Location, Casualties, Cause, Weather",
    "filename": "test_dataset.csv"
}

print("Sending request to /api/query...")
t0 = time.time()
response = client.post("/api/query", data={
    "session_id": session_id,
    "query": "give me the line graph for casualties over year"
})
t_total = time.time() - t0

print(f"Status Code: {response.status_code}")
print(f"Total query execution time: {t_total:.2f} seconds")
if response.status_code == 200:
    data = response.json()
    print("Output Type:", data.get("output_type"))
    print("Code Type:", data.get("code_type"))
    print("Generated Code:\n", data.get("generated_code"))
    print("Insight:", data.get("insight_text"))
else:
    print("Error:", response.text)
