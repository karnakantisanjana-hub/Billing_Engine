import os
import bcrypt
from datetime import datetime, timedelta
from fastapi import Request, Depends
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from fastapi import Request, Depends, HTTPException, status

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-to-a-long-random-string")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_access_token(data: dict, expires_minutes: int = EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = None

    auth_header = request.headers.get("Authorization")
    print("Authorization Header:", auth_header)

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    if not token:
        token = request.cookies.get("access_token")

    print("Token:", token)

    if not token:
        print("NO TOKEN FOUND")
        return None

    payload = decode_access_token(token)
    print("PAYLOAD:", payload)

    if not payload:
        print("TOKEN INVALID")
        return None

    user_id = payload.get("sub")
    print("USER ID:", user_id)

    user = db.query(User).filter(User.id == int(user_id)).first()
    print("USER:", user)

    return user

from fastapi import HTTPException, status


def require_user(user: User = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

from fastapi import Header
from app.models import Customer


def create_customer_token(customer_id: int, expires_minutes: int = EXPIRE_MINUTES):
    return create_access_token({"sub": str(customer_id), "type": "customer"}, expires_minutes)


def get_current_customer(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> Customer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)

    if not payload or payload.get("type") != "customer":
        raise HTTPException(status_code=401, detail="Invalid or expired customer token")

    customer_id = payload.get("sub")
    customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")

    return customer

def create_refresh_token(user_id: int, expires_minutes: int = 60 * 24 * 7):
    return create_access_token({"sub": str(user_id), "type": "admin_refresh"}, expires_minutes)