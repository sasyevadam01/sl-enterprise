import requests
import json
import os
import secrets

# Create dummy images
from PIL import Image
from io import BytesIO

def create_test_image():
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

url = "http://127.0.0.1:8000/fleet/checklists"

# Direct Request to FastAPI (simulating what the frontend does)
# We need to setup the mock environment similar to previous script but with Request object
# Actually it is easier to use requests against the running server IF I can bypass auth or have token.
# BUT since I cannot easily get token, I will reuse the internal calling approach which was successful before
# but adapted for the new Request signature.

import sys
import asyncio
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from routers.fleet import create_checklist
from models.core import User
from starlette.datastructures import FormData, UploadFile as StarletteUploadFile, Headers

async def test():
    db = SessionLocal()
    
    # Mock User
    user = User(id=1, username="test", role="admin")
    
    # Create dummy file content
    file_content = create_test_image()
    
    # Create Mock UploadFile for Tablet Photo
    # In the router: tablet_photo = form.get("photo") which returns an UploadFile object (from starlette)
    # We need to mock what request.form() returns.
    
    # Mocking starlette UploadFile behavior is tricky because it has async read.
    # Let's mock the object returned by form.get("photo")
    
    mock_tablet_photo = MagicMock()
    mock_tablet_photo.filename = "tablet.jpg"
    mock_tablet_photo.content_type = "image/jpeg"
    mock_tablet_photo.read = AsyncMock(return_value=file_content)
    
    # Mock UploadFile for Issue Photo
    mock_issue_photo = MagicMock()
    mock_issue_photo.filename = "issue.jpg"
    mock_issue_photo.content_type = "image/jpeg"
    mock_issue_photo.read = AsyncMock(return_value=file_content)

    # Prepare Checklist Data
    # Use vehicle ID 3 as found before
    checklist_data = {
        "vehicle_id": 3,
        "checklist_data": {
            "plastiche_integre": True,
            "freni": {
                "status": False, 
                "note": "Freni rotti test", 
                "photo_temp_id": "temp_123" 
            }
        }
    }
    
    # Mock Form Data
    mock_form = MagicMock()
    
    def get_side_effect(key, default=None):
        if key == "checklist_data":
            return json.dumps(checklist_data)
        if key == "notes":
            return "Test notes main"
        if key == "tablet_status":
            return "ok"
        if key == "photo":
            return mock_tablet_photo
        if key == "issue_photo_freni":
            return mock_issue_photo
        return default

    mock_form.get = MagicMock(side_effect=get_side_effect)
    
    # Mock Request
    mock_request = MagicMock()
    mock_request.form = AsyncMock(return_value=mock_form)
    
    print("Calling create_checklist V2...")
    try:
        result = await create_checklist(
            request=mock_request,
            db=db,
            current_user=user
        )
        print("Success:", result.id)
    except Exception as e:
        print("CAUGHT EXCEPTION:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(test())
