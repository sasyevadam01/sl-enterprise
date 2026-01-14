import urllib.request
import json
import os

# URL pointing to localhost inside the container
API_URL = "http://localhost:8000/employees/"

def test_api():
    print(f"--- TESTING API INTERNAL: {API_URL} ---")
    try:
        req = urllib.request.Request(API_URL)
        with urllib.request.urlopen(req) as response:
            status = response.status
            data = response.read()
            
            print(f"Status Code: {status}")
            
            try:
                json_data = json.loads(data)
                if isinstance(json_data, list):
                    print(f"Response is a List. Length: {len(json_data)}")
                    if len(json_data) > 0:
                        print("First item sample:", json_data[0])
                else:
                    print("Response is NOT a list:", type(json_data))
                    print(json_data)
            except json.JSONDecodeError:
                print("Failed to decode JSON. Raw data preview:")
                print(data[:200])
                
    except Exception as e:
        print(f"⚠️ API Call Failed: {e}")

if __name__ == "__main__":
    test_api()
