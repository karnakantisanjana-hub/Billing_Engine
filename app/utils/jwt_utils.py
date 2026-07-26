from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt
from fastapi import HTTPException, status
import bcrypt
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-to-a-long-random-string")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS", "7"))


class PasswordUtils:
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


class JWTTokenHandler:
    @staticmethod
    def create_access_token(customer_id: int, email: str, expires_delta: Optional[timedelta] = None) -> Tuple[str, int]:
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta or timedelta(minutes=CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode = {"sub": str(customer_id), "email": email, "iat": int(now.timestamp()), "exp": int(expire.timestamp()), "type": "access"}
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM), int((expire - now).total_seconds())

    @staticmethod
    def create_refresh_token(customer_id: int, email: str, expires_delta: Optional[timedelta] = None) -> Tuple[str, int]:
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta or timedelta(days=CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS))
        to_encode = {"sub": str(customer_id), "email": email, "iat": int(now.timestamp()), "exp": int(expire.timestamp()), "type": "refresh"}
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM), int((expire - now).total_seconds())

    @staticmethod
    def decode_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                raise credentials_exception
            if payload.get("sub") is None or payload.get("email") is None:
                raise credentials_exception
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired", headers={"WWW-Authenticate": "Bearer"})
        except jwt.PyJWTError:
            raise credentials_exception