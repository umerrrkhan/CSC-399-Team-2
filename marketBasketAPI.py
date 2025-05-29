from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import requests
import base64
from fastapi import Query

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class Brand(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class Term(BaseModel):
    id: int
    name: str
    price: float
    brand: str
    location: str

    class Config:
        from_attributes = True

class Location(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""

    class Config:
        from_attributes = True

class TermCreate(BaseModel):
    name: str
    price: float
    brand: str
    location: str

    class Config:
        from_attributes = True

class TermRead(TermCreate):
    id: int

# In-Memory Data
brands = [
    Brand(id=1, name="Kroger"),
    Brand(id=2, name="Degree"),
    Brand(id=3, name="General Mills")
]

terms = [
    Term(id=1, name="strawberries", price=3.49, brand="Kroger", location="chicago"),
    Term(id=2, name="deodorant",  price=5.99, brand="Degree",  location="naperville"),
    Term(id=3, name="cereal",     price=4.79, brand="General Mills", location="brookfield")
]

locations = [
    Location(id=1, name="chicago",    description="City in Illinois"),
    Location(id=2, name="naperville", description="Suburb of Chicago"),
    Location(id=3, name="brookfield", description="Another suburb")
]

# SQLite Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./items.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class TermDB(Base):
    __tablename__ = "terms"
    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String)
    price    = Column(Float)
    brand    = Column(String)
    location = Column(String)

Base.metadata.create_all(bind=engine)

# Helper Function to Get Kroger Token
def get_kroger_token():
    cid = os.getenv("KROGER_CLIENT_ID")
    cs = os.getenv("KROGER_CLIENT_SECRET")
    if not cid or not cs:
        raise HTTPException(status_code=500, detail="Missing Kroger API credentials")

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
    return token_resp.json().get("access_token")

# Routes
@app.post("/terms/", response_model=TermRead)
def create_term(term: TermCreate):
    with SessionLocal() as session:
        db_term = TermDB(**term.model_dump())
        session.add(db_term)
        session.commit()
        session.refresh(db_term)
        return TermRead.model_validate(db_term)

@app.delete("/terms/{term_id}", response_model=Term)
def delete_term(term_id: int):
    with SessionLocal() as session:
        term_db = session.query(TermDB).filter(TermDB.id == term_id).first()
        if not term_db:
            raise HTTPException(status_code=404, detail="Item not found")
        session.delete(term_db)
        session.commit()
        return Term.model_validate(term_db)

@app.get("/brands/", response_model=List[Brand])
def get_brands():
    return brands

@app.get("/terms/", response_model=List[Term])
def get_terms():
    with SessionLocal() as session:
        db_terms = session.query(TermDB).all()
        return [Term.model_validate(t) for t in db_terms]

@app.get("/locations/", response_model=List[Location])
def get_locations():
    return locations


@app.get("/item-prices/")
def get_item_prices(term: str = Query(...), zipcode: str = Query(...)):
    if not term or not zipcode:
        raise HTTPException(status_code=400, detail="Query parameters 'term' and 'zipcode' are required")

    token = get_kroger_token()

    # get nearest store's location ID
    location_id = get_nearest_location_id(token, zipcode)
    if not location_id:
        raise HTTPException(status_code=404, detail="No Kroger locations found near this ZIP code. Please try another ZIP code!")

    # set up product search query
    params = {
        "filter.term": term,
        "filter.locationId": location_id,
        "filter.limit": 10
    }

    # product search
    try:
        product_resp = requests.get(
            "https://api-ce.kroger.com/v1/products",
            headers={"Authorization": f"Bearer {token}"},
            params=params
        )
        product_resp.raise_for_status()
    except requests.HTTPError as e:
        print(f"Error from Kroger API for locationId {location_id}: {e}")
        raise HTTPException(status_code=500, detail="No Kroger locations found near this ZIP code. " \
        "Please try another ZIP code!")

    data = product_resp.json().get("data", [])

    # extract name and price
    results = []
    for item in data:
        name = item.get("description", term)
        item_details = item.get("items", [])

        kroger_price = None
        for detail in item_details:
            price = detail.get("price", {})
            kroger_price = (
                price.get("regular") or
                price.get("promo") or
                price.get("discounted")
            )
            if kroger_price:
                break

        results.append({
            "name": name,
            "kroger_price": kroger_price
        })

    return results


@app.get("/kroger-locations/")
def get_kroger_locations(zipcode: str):
    token = get_kroger_token()
    resp = requests.get(
        "https://api-ce.kroger.com/v1/locations",
        headers={"Authorization": f"Bearer {token}"},
        params={"filter.zipCode.near": zipcode, "filter.limit": 5}
    )
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return [
        {
            "name": loc.get("name"),
            "locationId": loc.get("locationId"),
            "address": loc.get("address", {}).get("addressLine1", ""),
            "city": loc.get("address", {}).get("city", "")
        }
        for loc in data
    ]

def get_nearest_location_id(token: str, zipcode: str) -> Optional[str]:
    location_resp = requests.get(
        "https://api-ce.kroger.com/v1/locations",
        headers={"Authorization": f"Bearer {token}"},
        params={"filter.zipCode.near": zipcode, "filter.limit": 1}
    )
    location_resp.raise_for_status()
    locations = location_resp.json().get("data", [])
    if not locations:
        return None
    return locations[0].get("locationId")


