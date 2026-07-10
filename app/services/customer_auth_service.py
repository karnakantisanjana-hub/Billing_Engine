from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Customer
from app.utils.jwt_utils import PasswordUtils, JWTTokenHandler
from typing import Tuple, Optional


class CustomerAuthService:
    """Service for customer authentication operations"""
    
    @staticmethod
    def register_customer(
        db: Session,
        name: str,
        email: str,
        password: str,
        company_name: Optional[str] = None
    ) -> Customer:
        """Register a new customer with password"""
        
        # Check if email already exists
        existing_customer = db.query(Customer).filter(
            Customer.email == email
        ).first()
        
        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = PasswordUtils.hash_password(password)
        
        # Create new customer
        customer = Customer(
            name=name,
            email=email,
            password=hashed_password,
            company_name=company_name,
            is_active=True
        )
        
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        return customer
    
    @staticmethod
    def authenticate_customer(
        db: Session,
        email: str,
        password: str
    ) -> Tuple[Customer, str, str, int, int]:
        """
        Authenticate customer and generate tokens
        Returns: (customer, access_token, refresh_token, access_expires_in, refresh_expires_in)
        """
        
        # Find customer
        customer = db.query(Customer).filter(
            Customer.email == email
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not customer.password or not PasswordUtils.verify_password(password, customer.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if customer is active
        if not customer.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customer account is inactive"
            )
        
        # Create tokens
        access_token, access_expires_in = JWTTokenHandler.create_access_token(
            customer_id=customer.id,
            email=customer.email
        )
        
        refresh_token, refresh_expires_in = JWTTokenHandler.create_refresh_token(
            customer_id=customer.id,
            email=customer.email
        )
        
        return customer, access_token, refresh_token, access_expires_in, refresh_expires_in
    
    @staticmethod
    def refresh_access_token(
        db: Session,
        refresh_token: str
    ) -> Tuple[str, int]:
        """Generate new access token from refresh token"""
        
        # Decode refresh token
        payload = JWTTokenHandler.decode_token(refresh_token, token_type="refresh")
        
        customer_id = int(payload.get("sub"))
        email = payload.get("email")
        
        # Verify customer still exists and is active
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.is_active == True
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Customer not found or inactive"
            )
        
        # Create new access token
        access_token, expires_in = JWTTokenHandler.create_access_token(
            customer_id=customer.id,
            email=customer.email
        )
        
        return access_token, expires_in