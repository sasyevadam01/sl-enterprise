import requests
import json
import os

# Create a dummy image
from PIL import Image
img = Image.new('RGB', (100, 100), color = 'red')
img.save('test_image.jpg')

url = "http://127.0.0.1:8000/fleet/checklists"

# Login first to get token (assuming standard login)
# Actually, let's try to bypass auth if possible or mock it, but wait, 
# the user is logged in. 
# I can try to hit the endpoint directly. If it requires auth, I'll get 401.
# But the user is getting 500, which means they are authorized but the server crashes.

# I need a valid token to reproduce it exactly if it depends on user.
# However, if I can't easily login via script, I might not get 500 involved.

# Let's try to see if I can run the FUNCTION directly by importing it and mocking dependencies.
# That might be easier than making an HTTP request without a token.

import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from routers.fleet import create_checklist
from models.core import User

# Mock stuff
from fastapi import UploadFile
from unittest.mock import AsyncMock, MagicMock

# We need an async loop
import asyncio

async def test():
    db = SessionLocal()
    
    # Mock User
    user = User(id=1, username="test", role="admin") # Adjust ID if needed
    
    # Mock UploadFile
    with open('test_image.jpg', 'rb') as f:
        file_content = f.read()
        
    mock_file = MagicMock()
    mock_file.read = AsyncMock(return_value=file_content)
    mock_file.filename = "test_image.jpg"
    mock_file.content_type = "image/jpeg"
    
    checklist_data = json.dumps({
        "vehicle_id": 3, # Valid vehicle
        "checklist_data": {"check1": True}
    })
    
    try:
        print("Calling create_checklist...")
        result = await create_checklist(
            checklist_data=checklist_data,
            notes="Test notes",
            tablet_status="ok",
            photo=mock_file,
            db=db,
            current_user=user
        )
        print("Success:", result)
    except Exception as e:
        print("CAUGHT EXCEPTION:")
        print(e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(test())
