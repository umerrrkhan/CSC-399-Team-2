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
import openai
from sqlalchemy import Boolean
from fastapi import Header, Depends
from jose import jwt
import requests

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

class TriggerCreate(BaseModel):
    user_id: str
    item_name: str
    target_price: float



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

class PriceTrigger(Base):
    __tablename__ = "price_triggers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    item_name = Column(String)
    target_price = Column(Float)
    active = Column(Boolean, default=True)  # allows disabling after triggered

Base.metadata.create_all(bind=engine)

# helper function to get Kroger token
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
def get_item_prices(term: str = Query(...), zipcode: Optional[str] = Query(None)):
    if not term:
        raise HTTPException(status_code=400, detail="Query parameter 'term' is required")

    token = get_kroger_token()

    params = {
        "filter.term": term,
        "filter.limit": 20
    }

    if zipcode:
        location_id = get_nearest_location_id(token, zipcode)
        if not location_id:
            raise HTTPException(status_code=404, detail="No Kroger locations found near this ZIP code. Please try another ZIP code!")
        params["filter.locationId"] = location_id

    # product search
    try:
        product_resp = requests.get(
            "https://api-ce.kroger.com/v1/products",
            headers={"Authorization": f"Bearer {token}"},
            params=params
        )
        product_resp.raise_for_status()
    except requests.HTTPError as e:
        print(f"Error from Kroger API: {e}")
        raise HTTPException(status_code=500, detail="No Kroger locations found near this ZIP code. Please try another ZIP code!")

    data = product_resp.json().get("data", [])

    # extract name and price (only if location is provided)
    results = []
    for item in data:
        name = item.get("description", term)
        kroger_price = None

        if zipcode:
            item_details = item.get("items", [])
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
            "kroger_price": kroger_price  # will be none if no zipcode
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


@app.get("/recommendations/")
def get_recommendations(user_id: str):
    with SessionLocal() as session:
        # get last 5 search terms
        searches = (
            session.query(UserSearch.search_term)
            .filter(UserSearch.user_id == user_id)
            .order_by(UserSearch.id.desc())
            .limit(5)
            .all()
        )

        search_terms = [s[0] for s in searches]
        if not search_terms:
            return {"message": "No recent searches to recommend from."}

        # prompt for openAI
        prompt = (
            "The user recently searched for these grocery items: "
            f"{', '.join(search_terms)}. "
            "Suggest 5 additional grocery items they might be interested in. "
            "Return only a list of product names."
        )

        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that suggests grocery items."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )

            suggestions_text = response.choices[0].message["content"]
            # clean response (assume it's a list, bullet points, or CSV)
            suggestions = [line.strip("- ").strip() for line in suggestions_text.splitlines() if line.strip()]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")

        # search for those suggestions in DB to return term info
        results = []
        for item_name in suggestions:
            match = (
                session.query(TermDB)
                .filter(TermDB.name.ilike(f"%{item_name}%"))
                .first()
            )
            if match:
                results.append(Term.model_validate(match))
            else:
                # include a suggestion as a fallback
                results.append(Term(id=-1, name=item_name))

        return [{"name": r.name} for r in results]

@app.post("/price-triggers/")
def create_trigger(trigger: TriggerCreate):
    with SessionLocal() as session:
        new_trigger = PriceTrigger(**trigger.model_dump())
        session.add(new_trigger)
        session.commit()
        return {"message": "Trigger set successfully!"}
    
@app.get("/check-triggers/")
def check_price_triggers():
    with SessionLocal() as session:
        triggers = session.query(PriceTrigger).filter(PriceTrigger.active == True).all()
        results = []

        for trig in triggers:
            # get the current price
            try:
                price_info = get_item_prices(term=trig.item_name)  # modify as needed
                current_price = float(price_info[0]["kroger_price"])
            except:
                continue

            if current_price <= trig.target_price:
                results.append({
                    "user_id": trig.user_id,
                    "item_name": trig.item_name,
                    "current_price": current_price,
                    "target_price": trig.target_price
                })
                
                # disable trigger if only want it to fire once
                trig.active = False
                session.commit()

        return results
    

@app.post("/login/")
def login_and_check_triggers(Authorization: str = Header(...)):
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = Authorization.split(" ")[1]
    claims = verify_jwt_token(token)

    # You can use 'sub' as unique user_id, or 'email'
    user_id = claims.get("sub") or claims.get("email")
    if not user_id:
        raise HTTPException(status_code=400, detail="Unable to determine user ID from token")

    return check_user_triggers(user_id)


def check_user_triggers(user_id: str):
    with SessionLocal() as session:
        triggers = (
            session.query(PriceTrigger)
            .filter(PriceTrigger.user_id == user_id, PriceTrigger.active == True)
            .all()
        )
        results = []

        for trig in triggers:
            try:
                price_info = get_item_prices(term=trig.item_name)
                current_price = float(price_info[0]["kroger_price"])
            except:
                continue

            if current_price <= trig.target_price:
                results.append({
                    "user_id": trig.user_id,
                    "item_name": trig.item_name,
                    "current_price": current_price,
                    "target_price": trig.target_price
                })

                trig.active = False
                session.commit()

        return results

COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"

# cache JWKS
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"
JWKS = requests.get(JWKS_URL).json()

def verify_jwt_token(token: str):
    header = jwt.get_unverified_header(token)
    key = next(k for k in JWKS["keys"] if k["kid"] == header["kid"])
    try:
        payload = jwt.decode(token, key, algorithms=["RS256"], audience=COGNITO_CLIENT_ID, issuer=COGNITO_ISSUER)
        return payload  # includes sub, email, etc.
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")



























# scheduler for price checking

from apscheduler.schedulers.background import BackgroundScheduler
import atexit

# initialize scheduler
scheduler = BackgroundScheduler()

# schedule job to run every hour
scheduler.add_job(check_price_triggers, "interval", hours=1)

# start scheduler
scheduler.start()

# shutdown cleanly on exit
atexit.register(lambda: scheduler.shutdown())