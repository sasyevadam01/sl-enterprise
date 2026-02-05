import requests

# Test API direttamente
BASE = "http://localhost:8000"

# Autenticazione usando OAuth2 form
auth = requests.post(f"{BASE}/auth/token", data={"username": "super_admin", "password": "admin123"})
print(f"Login status: {auth.status_code}")
if auth.status_code != 200:
    print("❌ Errore login:", auth.text)
else:
    token = auth.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== TEST /leaves/ ===")
    r = requests.get(f"{BASE}/leaves/", headers=headers)
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Numero richieste TOTALI: {len(data)}")
    
    pending_count = len([l for l in data if l.get('status') == 'pending'])
    print(f"Di cui PENDING: {pending_count}")
    
    for leave in data[:10]:
        print(f"  ID:{leave['id']} | emp:{leave.get('employee_id')} | {leave.get('status')} | {leave.get('leave_type')}")
    
    print("\n=== TEST /leaves/pending ===")
    r2 = requests.get(f"{BASE}/leaves/pending", headers=headers)
    print(f"Status: {r2.status_code}")
    if r2.status_code == 200:
        pending = r2.json()
        print(f"Numero pending: {len(pending)}")
        for leave in pending:
            print(f"  ID:{leave['id']} | emp:{leave.get('employee_id')} | {leave.get('status')}")
    else:
        print("Errore:", r2.text)
