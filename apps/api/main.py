import os
import io
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, List
from supabase import create_client, Client
from dotenv import load_dotenv
from PIL import Image
import uuid

load_dotenv()

app = FastAPI(title="Clippings API")

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("!!! WARNING: SUPABASE_URL or SUPABASE_KEY is missing from environment !!!")

supabase: Client = create_client(url, key) if (url and key) else None

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
    return {"message": "Clippings API is running", "supabase_connected": supabase is not None}

@app.get("/items")
async def get_items():
    if not supabase: return {"error": "Supabase not configured"}
    try:
        response = supabase.table("items").select("*").execute()
        return response.data
    except Exception as e:
        return {"error": str(e)}

@app.post("/clip")
async def clip_item(request: ClippingRequest):
    print(f"\n--- NEW CLIP REQUEST: {request.title} ---")
    
    if not supabase:
        return {"status": "error", "message": "Server error: Supabase credentials missing"}
    
    try:
        from rembg import remove
    except ImportError:
        return {"status": "error", "message": "rembg library not installed on server"}

    try:
        # 1. Download
        print(f"1. Downloading image: {request.image_url[:50]}...")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        img_response = requests.get(request.image_url, timeout=10, headers=headers)
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
        public_url_response = supabase.storage.from_(bucket_name).get_public_url(file_name)
        processed_image_url = public_url_response
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
        return {"status": "error", "message": str(e)}
