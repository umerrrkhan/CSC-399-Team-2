from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os, requests, base64

load_dotenv()

app = FastAPI()

# ─── Enable CORS ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ────────────────────────────────────────────────────────────

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

# ─── In-Memory Data ─────────────────────────────────────────────────────────────

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

# ─── SQLite Setup ──────────────────────────────────────────────────────────────

SQLALCHEMY_DATABASE_URL = "sqlite:///./items.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
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

# ─── Routes ───────────────────────────────────────────────────────────────────

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
def get_item_prices(term: Optional[str] = None):
    if not term:
        raise HTTPException(status_code=400, detail="Query param `term` is required")

    cid = os.getenv("KROGER_CLIENT_ID")
    cs  = os.getenv("KROGER_CLIENT_SECRET")
    if not cid or not cs:
        raise HTTPException(status_code=500, detail="Missing Kroger API credentials")

    # fetch OAuth token
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

    # query Kroger products
    pr = requests.get(
        "https://api-ce.kroger.com/v1/products",
        headers={"Authorization": f"Bearer {token}"},
        params={"filter.term": term, "filter.limit": 10}
    )
    pr.raise_for_status()
    data = pr.json().get("data", [])

    results = []
    for item in data:
        name        = item.get("description") or term
        price_block = item.get("items", [{}])[0].get("price", {})
        kroger_price = price_block.get("regular", {}).get("amount")
        results.append({
            "name": name,
            "kroger_price": kroger_price
        })

    return results
