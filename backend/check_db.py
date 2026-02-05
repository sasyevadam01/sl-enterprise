import sqlite3

conn = sqlite3.connect('sl_enterprise.db')
c = conn.cursor()

print("=== RICHIESTE PENDING E LORO DIPENDENTI ===")
c.execute('''
SELECT 
    lr.id, 
    lr.employee_id, 
    lr.requested_by,
    lr.leave_type,
    lr.status,
    e.first_name || ' ' || e.last_name as emp_name,
    u.username as requester_username
FROM leave_requests lr
LEFT JOIN employees e ON lr.employee_id = e.id
LEFT JOIN users u ON lr.requested_by = u.id
WHERE lr.status = 'pending'
ORDER BY lr.id DESC
''')

for r in c.fetchall():
    emp_status = "✅" if r[5] else "❌ MISSING"
    req_status = "✅" if r[6] else "⚠️ NULL"
    print(f"ID:{r[0]:3} | emp_id:{r[1]:3} {emp_status} {r[5] or 'N/A':20} | type:{r[3]:15} | req_by:{r[2]} {req_status} ({r[6] or 'N/A'})")

print("\n=== CONTEGGI ===")
c.execute('SELECT COUNT(*) FROM leave_requests WHERE status = "pending"')
print(f"Tot pending: {c.fetchone()[0]}")

c.execute('''
SELECT COUNT(*) FROM leave_requests lr 
LEFT JOIN employees e ON lr.employee_id = e.id 
WHERE lr.status = 'pending' AND e.id IS NULL
''')
print(f"Pending con emp MANCANTE: {c.fetchone()[0]}")

c.execute('''
SELECT COUNT(*) FROM leave_requests lr 
WHERE lr.status = 'pending' AND lr.requested_by IS NULL
''')
print(f"Pending con requester NULL: {c.fetchone()[0]}")

conn.close()
