import sqlite3

conn = sqlite3.connect("analyst.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, user_query, execution_success, error_message, insight_text FROM query_log ORDER BY id DESC LIMIT 5;")
    rows = cursor.fetchall()
    print("\nRecent queries:")
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"Query: {row[1]}")
        print(f"Success: {row[2]}")
        print(f"Error: {row[3]}")
        print(f"Insight: {row[4][:100] if row[4] else None}...")
        print("-" * 40)
except Exception as e:
    print(f"Error reading query_log: {e}")
