# marketBasketAPI.py

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import os, requests, base64

load_dotenv()  # loads kroger creds from .env

app = FastAPI()
stores, items, categories = [], [], []

# ----- store endpoints -----
@app.get("/stores")
def get_stores():
    return stores

@app.post("/stores")
def add_store(name: str):
    stores.append(name)
    return stores

@app.delete("/stores/{i}")
def delete_store(i: int):
    stores.pop(i)
    return stores

# ----- item endpoints -----
@app.get("/items")
def get_items():
    return items

@app.post("/items")
def add_item(name: str, price: float, store: str, category: str):
    items.append({"name": name, "price": price, "store": store, "category": category})
    return items

@app.delete("/items/{i}")
def delete_item(i: int):
    items.pop(i)
    return items

# ----- category endpoints -----
@app.get("/categories")
def get_categories():
    return categories

@app.post("/categories")
def add_category(name: str, description: str = ""):
    categories.append({"name": name, "description": description})
    return categories

@app.delete("/categories/{i}")
def delete_category(i: int):
    categories.pop(i)
    return categories

# ----- smarter endpoint: kroger price lookup -----
@app.get("/item-prices")
def get_item_prices():
    cid = os.getenv("KROGER_CLIENT_ID")
    cs  = os.getenv("KROGER_CLIENT_SECRET")
    if not cid or not cs:
        raise HTTPException(500, "missing kroger creds")

    # get bearer token (certification env)
    creds = base64.b64encode(f"{cid}:{cs}".encode()).decode()
    token_resp = requests.post(
        "https://api-ce.kroger.com/v1/connect/oauth2/token",
        headers={
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data={"grant_type": "client_credentials", "scope": "product.compact"}
    )
    token_resp.raise_for_status()
    token = token_resp.json().get("access_token")

    results = []
    for it in items:
        pr = requests.get(
            "https://api-ce.kroger.com/v1/products",
            headers={"Authorization": f"Bearer {token}"},
            params={"filter.term": it["name"], "filter.limit": 1}
        )
        pr.raise_for_status()
        data = pr.json().get("data", [])

        # safe‐extract price
        kroger_price = None
        if data:
            first = data[0]
            if first.get("items"):
                first_item = first["items"][0]
                price_block = first_item.get("price")
                if price_block and price_block.get("regular"):
                    kroger_price = price_block["regular"].get("amount")

        results.append({
            "name":         it["name"],
            "your_price":   it.get("price"),
            "kroger_price": kroger_price
        })

    return results
