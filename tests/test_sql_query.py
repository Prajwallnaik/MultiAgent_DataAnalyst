import time
import pandas as pd
from fastapi.testclient import TestClient
from api import app, _sessions

client = TestClient(app)

df = pd.DataFrame({
    "Region": ["North", "South", "East", "West"],
    "Sales": [1000, 2500, 1800, 3100],
    "Country": ["USA", "USA", "USA", "USA"]
})

session_id = "test-sql-session"
_sessions[session_id] = {
    "df": df,
    "schema_context": "Columns: Region, Sales, Country",
    "filename": "sales.csv"
}

query = "use SQL to retrieve the top performing region in sales"

print(f"Query: {query}")
resp = client.post("/api/query", data={"session_id": session_id, "query": query})
print("Status:", resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    print("Output Type:", data.get("output_type"))
    print("Code Type:", data.get("code_type"))
    print("Generated Code:\n", repr(data.get("generated_code")))
    print("Retry Count:", data.get("retry_count"))
    print("Failed Attempts:", data.get("failed_attempts"))
    print("Insight:", data.get("insight_text"))
    print("Result:", data.get("execution_result"))
