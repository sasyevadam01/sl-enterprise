
import requests
import json

BASE_URL = "http://localhost:8000"

def test_debug():
    print(f"Checking {BASE_URL}/health...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"Health: {r.status_code} {r.text}")
    except Exception as e:
        print(f"Server unreachable: {e}")
        return

    print(f"\nListing logistics requests...")
    try:
        # We need a token? Assuming public or I can get a fake one?
        # The endpoints likely require auth. 
        # I'll try to login first.
        
        # Login
        login_data = {"username": "admin", "password": "password123"} # Guessing defaults
        # Or better, since I don't know creds, I might need to bypass or read from DB.
        # But wait, the previous errors were 404, not 401/403.
        # 404 implies URL not found regardless of auth (usually).
        # FastAPI checks URL before Auth if using Depends? Actually Depends(get_current_user) is executed.
        # But if URL is wrong, it returns 404.
        
        r = requests.patch(f"{BASE_URL}/logistics/requests/999999/cancel", json={"reason": "debug"})
        print(f"Cancel (Fake ID): {r.status_code}")
        print(f"Response: {r.text}")
        
        if r.status_code == 404 and "Not Found" in r.text and "Richiesta non trovata" not in r.text:
            print("CONFIRMED: Generic 404 Not Found - Route missing!")
        elif r.status_code == 404 and "Richiesta non trovata" in r.text:
             print("Route EXISTS! Logic 404.")
        elif r.status_code == 401:
             print("Route EXISTS! (Got 401 Unauthorized)")
        elif r.status_code == 405:
             print("Route EXISTS! (Got 405 Method Not Allowed - wrong method?)")
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_debug()
