import os
import io
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, List
from supabase import create_client, Client
from PIL import Image
import uuid

load_dotenv()

app = FastAPI(title="Clippings API")

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class ClippingRequest(BaseModel):
    title: str
    image_url: str
    price: Optional[float] = None
    currency: str = "USD"
    original_url: Optional[str] = None
    raw_metadata: Optional[Any] = None

@app.get("/")
async def root():
    return {"message": "Clippings API is running"}

@app.get("/items")
async def get_items():
    response = supabase.table("items").select("*").execute()
    return response.data

@app.post("/clip")
async def clip_item(request: ClippingRequest):
    # Move heavy import here so the server boots fast
    from rembg import remove
    
    print(f"\n--- NEW CLIP REQUEST: {request.title} ---")
    
    try:
        # 1. Download
        print(f"1. Downloading image: {request.image_url[:50]}...")
        img_response = requests.get(request.image_url, timeout=10)
        img_response.raise_for_status()
        input_image = img_response.content
        print("   Success: Image downloaded.")

        # 2. Remove background
        print("2. Removing background (AI)...")
        output_image = remove(input_image)
        print("   Success: Background removed.")

        # 3. Storage
        print("3. Uploading to Supabase Storage...")
        file_name = f"{uuid.uuid4()}.png"
        bucket_name = "clippings"
        
        storage_response = supabase.storage.from_(bucket_name).upload(
            file_name, 
            output_image,
            {"content-type": "image/png"}
        )
        print(f"   Success: Uploaded as {file_name}.")

        # Get URL
        processed_image_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        print(f"   Public URL: {processed_image_url}")

        # 4. Save to Database
        print("4. Saving to Database...")
        data = {
            "id": str(uuid.uuid4()),
            "title": request.title,
            "image_url": str(processed_image_url),
            "price": request.price,
            "currency": request.currency,
            "original_url": request.original_url,
            "raw_metadata": request.raw_metadata,
            "x_pos": 100,
            "y_pos": 150,
            "rotation": 0,
            "user_id": "00000000-0000-0000-0000-000000000000"
        }
        
        db_response = supabase.table("items").insert(data).execute()
        print("--- CLIP COMPLETE! ---\n")
        return {"status": "success", "item": db_response.data[0]}

    except Exception as e:
        print(f"!!! ERROR DURING CLIPPING !!!")
        print(f"Details: {str(e)}")
        # Print the traceback for even more detail if needed
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
