# marketBasketAPI.py
import os
import requests
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv, find_dotenv

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

def get_kroger_access_token() -> str:
    url = "https://api.kroger.com/v1/connect/oauth2/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "scope": "product.compact profile.compact"
    }
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
        if loc:
            params["filter.locationId"] = loc
    headers = {"Authorization": f"Bearer {token}"}

    resp = requests.get(url, headers=headers, params=params, timeout=5)
    resp.raise_for_status()
    items: List[ItemPrice] = []
    for p in resp.json().get("data", []):
        desc = p.get("description", "Unknown")
        price = p.get("items", [{}])[0].get("price", {}).get("regular")
        if price is not None:
            items.append(ItemPrice(name=desc, kroger_price=price))
    return items

@app.get("/item-prices/", response_model=List[ItemPrice])
def get_item_prices(term: str, zip: Optional[str] = None):
    try:
        return fetch_item_prices(term, zip)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Kroger API error: {e}")

@app.post("/price-triggers/", response_model=PriceTrigger)
def create_price_trigger(trigger: PriceTriggerIn):
    global next_trigger_id
    try:
        prices = fetch_item_prices(trigger.name, trigger.zip)
        current = prices[0].kroger_price if prices else None
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to set trigger: {e}")

    new = PriceTrigger(
        id=next_trigger_id,
        name=trigger.name,
        target_price=trigger.target_price,
        current_price=current
    )
    triggers.append(new)
    next_trigger_id += 1
    return new

@app.get("/price-triggers/", response_model=List[PriceTrigger])
def list_price_triggers():
    for t in triggers:
        try:
            prices = fetch_item_prices(t.name, None)
            t.current_price = prices[0].kroger_price if prices else t.current_price
        except:
            pass
    return triggers

@app.get("/recommendations/", response_model=List[Recommendation])
def recommendations():
    recs: List[Recommendation] = []
    for t in triggers:
        try:
            for it in fetch_item_prices(t.name, None):
                if abs(it.kroger_price - t.target_price) <= 0.5:
                    recs.append(Recommendation(name=it.name, kroger_price=it.kroger_price))
        except:
            continue
    if not recs:
        for term in ["milk", "eggs", "bread"]:
            try:
                for it in fetch_item_prices(term, None)[:3]:
                    recs.append(Recommendation(name=it.name, kroger_price=it.kroger_price))
            except:
                pass
    return recs
