# auth.py
import os
import requests
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
from models import User
from fastapi import Header
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
import httpx
import json
from typing import Dict



load_dotenv()


COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID") 


# if not all([COGNITO_REGION, COGNITO_POOL_ID, COGNITO_CLIENT_ID]):
#     raise RuntimeError("Missing Cognito config in environment variables.")

# JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}/.well-known/jwks.json"
# ALGORITHM = "RS256"

# ⬇️ Get these from your Cognito setup
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # this is a dummy route

class TokenPayload(BaseModel):
    sub: str
    email: str = None

jwks: Dict = {}

def get_jwks():
    global jwks
    if not jwks:
        url = f"{COGNITO_ISSUER}/.well-known/jwks.json"
        response = requests.get(url)
        jwks = response.json()
    return jwks


def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    try:
        unverified_header = jwt.get_unverified_header(token)
        jwks_data = get_jwks()
        key = next(
            (k for k in jwks_data["keys"] if k["kid"] == unverified_header["kid"]),
            None
        )
        if not key:
            raise HTTPException(status_code=401, detail="Invalid JWT key.")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=COGNITO_CLIENT_ID,
            issuer=COGNITO_ISSUER
        )

        return TokenPayload(sub=payload["sub"], email=payload.get("email"))

    except JWTError as e:
        print("JWT error:", e)
        raise HTTPException(status_code=401, detail="Token verification failed")
