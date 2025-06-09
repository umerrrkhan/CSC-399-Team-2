from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv, find_dotenv
from jose import jwt, JWTError
import traceback
import requests
import os

# Load environment variables
dotenv_path = find_dotenv()
load_dotenv(dotenv_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth helper
COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")


def get_current_user(token: Optional[str] = Header(None, alias="Authorization")) -> str:
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        token = token.split(" ")[1]
        payload = jwt.get_unverified_claims(token)
        return payload.get("email")
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


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


# In-memory store for user-specific triggers
user_triggers = {}


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
        items.append(ItemPrice(name=desc, kroger_price=price if price is not None else 0.0))

    return items


@app.get("/item-prices/", response_model=List[ItemPrice])
def get_item_prices(term: str, zip: Optional[str] = None):
    try:
        return fetch_item_prices(term, zip)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Kroger API error: {e}")


@app.post("/price-triggers/", response_model=PriceTrigger)
def create_price_trigger(trigger: PriceTriggerIn, user_email: str = Depends(get_current_user)):
    try:
        prices = fetch_item_prices(trigger.name, trigger.zip)
        current = prices[0].kroger_price if prices else None
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to set trigger: {e}")

    new_trigger = PriceTrigger(
        id=len(user_triggers.get(user_email, [])) + 1,
        name=trigger.name,
        target_price=trigger.target_price,
        current_price=current
    )
    user_triggers.setdefault(user_email, []).append(new_trigger)
    return new_trigger


@app.get("/price-triggers/", response_model=List[PriceTrigger])
def list_price_triggers(user_email: str = Depends(get_current_user)):
    return user_triggers.get(user_email, [])


@app.get("/recommendations/", response_model=List[Recommendation])
def recommendations(user_email: str = Depends(get_current_user)):
    recs: List[Recommendation] = []
    for t in user_triggers.get(user_email, []):
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
