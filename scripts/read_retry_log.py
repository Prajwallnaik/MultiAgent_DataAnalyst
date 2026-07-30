import sqlite3

conn = sqlite3.connect("analyst.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT * FROM retry_log ORDER BY id DESC LIMIT 10;")
    rows = cursor.fetchall()
    print("Recent retries:")
    for row in rows:
        print(row)
except Exception as e:
    print(f"Error reading retry_log: {e}")
