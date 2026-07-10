from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt
from fastapi import HTTPException, status
import bcrypt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production-min-32-chars")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

class PasswordUtils:
    """Utilities for password hashing and verification"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plain password"""
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash"""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )


class JWTTokenHandler:
    """Handles JWT token creation and validation"""
    
    @staticmethod
    def create_access_token(
        customer_id: int,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> Tuple[str, int]:
        """
        Create an access token for customer
        Returns: (token, expires_in_seconds)
        """
        now = datetime.now(timezone.utc)
        
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": str(customer_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
            "type": "access"
        }
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        expires_in = int((expire - now).total_seconds())
        
        return encoded_jwt, expires_in
    
    @staticmethod
    def create_refresh_token(
        customer_id: int,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> Tuple[str, int]:
        """
        Create a refresh token for customer
        Returns: (token, expires_in_seconds)
        """
        now = datetime.now(timezone.utc)
        
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(days=CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = {
            "sub": str(customer_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
            "type": "refresh"
        }
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        expires_in = int((expire - now).total_seconds())
        
        return encoded_jwt, expires_in
    
    @staticmethod
    def decode_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        """
        Decode and validate JWT token
        Raises HTTPException if token is invalid or expired
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Verify token type
            if payload.get("type") != token_type:
                raise credentials_exception
            
            customer_id = payload.get("sub")
            email = payload.get("email")
            
            if customer_id is None or email is None:
                raise credentials_exception
            
            return payload
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise credentials_exception