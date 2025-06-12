# marketBasketAPI.py
import os
import requests
import traceback
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv, find_dotenv
from sqlalchemy import Column, Integer, String, Float, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import base64
from fastapi import Query
import openai
from sqlalchemy import Boolean
from fastapi import Header, Depends
from jose import jwt
from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from auth import get_current_user
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import declarative_base, relationship
from database import get_db
from models import User, SearchTerm, Base, PriceTriggerDB
from auth import get_current_user, TokenPayload
from openai import OpenAI 
from fastapi import status

router = APIRouter()

# explicitly locate and load your .env
dotenv_path = find_dotenv()
load_dotenv(dotenv_path)
print("🔑 Loaded KROGER_CLIENT_ID:", os.getenv("KROGER_CLIENT_ID"))
print("🔑 Loaded KROGER_CLIENT_SECRET:", os.getenv("KROGER_CLIENT_SECRET"))

if not (os.getenv("KROGER_CLIENT_ID") and os.getenv("KROGER_CLIENT_SECRET")):
    raise RuntimeError("Missing Kroger credentials in .env")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

triggers: List["PriceTrigger"] = []
next_trigger_id = 1

class ItemPrice(BaseModel):
    name: str
    kroger_price: float

class PriceTriggerIn(BaseModel):
    name: str
    target_price: float
    zip: Optional[str] = None

class PriceTrigger(BaseModel):
    id: int
    name: str
    target_price: float
    current_price: Optional[float] = None

class Recommendation(BaseModel):
    name: str
    kroger_price: float



Base = declarative_base()

def get_kroger_access_token() -> str:
    url = "https://api.kroger.com/v1/connect/oauth2/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "client_credentials", "scope": "product.compact"}
    resp = requests.post(
        url,
        headers=headers,
        data=data,
        auth=(os.getenv("KROGER_CLIENT_ID"), os.getenv("KROGER_CLIENT_SECRET")),
        timeout=5
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def get_nearest_location_id(zip: str) -> Optional[str]:
    token = get_kroger_access_token()
    url = "https://api.kroger.com/v1/locations"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(
        url,
        headers=headers,
        params={"filter.zipCode.near": zip, "filter.limit": 1},
        timeout=5
    )
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return data[0].get("locationId") if data else None

def fetch_item_prices(term: str, zip: Optional[str]) -> List[ItemPrice]:
    token = get_kroger_access_token()
    url = "https://api.kroger.com/v1/products"
    params = {"filter.term": term, "filter.limit": 20}

    if zip:
        loc = get_nearest_location_id(zip)
        print(f"🔍 Nearest location ID for ZIP {zip}: {loc}")
        if loc:
            params["filter.locationId"] = loc

    headers = {"Authorization": f"Bearer {token}"}
    print(f"📡 Requesting Kroger API with params: {params}")

    resp = requests.get(url, headers=headers, params=params, timeout=5)
    resp.raise_for_status()
    data = resp.json()
    print("📦 Kroger API response data sample:", data.get("data", [])[:2])  # show first 2 items

    items: List[ItemPrice] = []
    for p in data.get("data", []):
        desc = p.get("description") or "Unknown"

        price = None
        items_list = p.get("items")
        if items_list and isinstance(items_list, list):
            first_item = items_list[0]
            price_info = first_item.get("price", {})
            if isinstance(price_info, dict):
                price = price_info.get("regular")

        # include the item even if price is None
        items.append(ItemPrice(name=desc, kroger_price=price if price is not None else 0.0))

    print(f"✅ Found {len(items)} items (including those without price).")
    return items



@app.get("/item-prices/", response_model=List[ItemPrice])
def get_item_prices(
    term: str,
    zip: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)  
):
    try:
        # ✅ Save search with user
        search = SearchTerm(term=term, user_id=current_user.id)
        db.add(search)
        db.commit()

        return fetch_item_prices(term, zip)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Kroger API error: {e}")


@app.post("/price-triggers/", response_model=PriceTrigger)
def create_price_trigger(
    trigger: PriceTriggerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        prices = fetch_item_prices(trigger.name, trigger.zip)
        current_price = prices[0].kroger_price if prices else None

        new_trigger = PriceTriggerDB(
            name=trigger.name,
            target_price=trigger.target_price,
            current_price=current_price,
            zip_code=trigger.zip,
            user_id=current_user.id
        )

        db.add(new_trigger)
        db.commit()
        db.refresh(new_trigger)

        return PriceTrigger(
            id=new_trigger.id,
            name=new_trigger.name,
            target_price=new_trigger.target_price,
            current_price=new_trigger.current_price
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to set trigger: {e}")


@app.get("/price-triggers/", response_model=List[PriceTrigger])
def list_price_triggers(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    user_triggers = (
        db.query(PriceTriggerDB)
        .filter(PriceTriggerDB.user_id == current_user.id)
        .all()
    )

    # Refresh current prices
    triggers = []
    for t in user_triggers:
        try:
            items = fetch_item_prices(t.name, t.zip_code)
            if items:
                t.current_price = items[0].kroger_price
                db.commit()
        except:
            pass

        triggers.append(
            PriceTrigger(
                id=t.id,
                name=t.name,
                target_price=t.target_price,
                current_price=t.current_price
            )
        )

    return triggers



@app.get("/recommendations/", response_model=List[Recommendation])
def recommendations(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    print(f"✅ /recommendations/ called by user ID: {current_user.id}")
    recs: List[Recommendation] = []

    # ✅ Use the correct table
    triggers = (
        db.query(PriceTriggerDB)
        .filter(PriceTriggerDB.user_id == current_user.id)
        .all()
    )

    print(f"🧠 Found {len(triggers)} trigger(s) for user.")
    for t in triggers:
        print(f"➡️ Trigger: {t.name}, Target: {t.target_price}, ZIP: {t.zip_code}")

    if not triggers:
        return []

    for trigger in triggers:
        try:
            items = fetch_item_prices(trigger.name, trigger.zip_code)
            if items:
                top_item = items[0]
                recs.append(
                    Recommendation(
                        name=top_item.name,
                        kroger_price=top_item.kroger_price
                    )
                )
        except Exception as e:
            print(f"❌ Error with trigger '{trigger.name}': {e}")
            continue

    print(f"📦 Returning {len(recs)} recommendation(s).")
    return recs


# @router.get("/recommendations/", response_model=List[Recommendation])
# def recommendations(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     recs: List[Recommendation] = []

#     # 🧠 Get user's price triggers from the DB
#     triggers = db.query(PriceTrigger).filter(PriceTrigger.user_id == current_user.id).all()

#     for trigger in triggers:
#         try:
#             items = fetch_item_prices(trigger.name, trigger.zip)
#             if items:
#                 item = items[0]  # Use top result
#                 recs.append(Recommendation(name=item.name, kroger_price=item.kroger_price))
#         except Exception as e:
#             print(f"⚠️ Error fetching price for '{trigger.name}': {e}")
#             continue

#     return recs


@app.delete("/price-triggers/{trigger_id}")
def delete_trigger(trigger_id: int, db: Session = Depends(get_db), current_user: TokenPayload = Depends(get_current_user)):
    trigger = db.query(PriceTriggerDB).filter_by(id=trigger_id, user_id=current_user.sub).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found.")

    db.delete(trigger)
    db.commit()

    return {"message": "Trigger deleted."}



