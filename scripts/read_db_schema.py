import sqlite3

conn = sqlite3.connect("analyst.db")
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(query_log);")
print("query_log schema:")
for col in cursor.fetchall():
    print(col)
