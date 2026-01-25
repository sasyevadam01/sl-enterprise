import requests
from jose import jwt
from datetime import datetime, timedelta

# Config (from .env)
SECRET_KEY = "z2OjLjiR232WTJNvJ8p2hipWCg2ln8TEVtQibX5kqCg"
ALGORITHM = "HS256"
API_URL = "http://127.0.0.1:8000"

def create_token(username):
    expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode = {"sub": username, "role": "super_admin", "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def test_endpoint():
    token = create_token("slaezza") # Username found previously
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Testing with token for user: slaezza")
    
    try:
        url = f"{API_URL}/logistics/requests?status=pending"
        print(f"Requesting: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text[:500]}...") # Print first 500 chars
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoint()
