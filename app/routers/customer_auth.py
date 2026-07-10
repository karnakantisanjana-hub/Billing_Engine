# app/routers/customer_auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.customer_auth_service import CustomerAuthService
from app.routers.dependencies import get_current_customer
from app.models import Customer
from datetime import datetime

router = APIRouter(
    prefix="/api/v1/customer/auth",
    tags=["customer-auth"]
)


class CustomerRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: str = None


class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_expires_in: int
    refresh_expires_in: int
    customer_id: int


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    company_name: str = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/register", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def register_customer(
    request: CustomerRegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new customer"""
    customer = CustomerAuthService.register_customer(
        db=db,
        name=request.name,
        email=request.email,
        password=request.password,
        company_name=request.company_name
    )
    return customer


@router.post("/login", response_model=TokenResponse)
async def customer_login(
    request: CustomerLoginRequest,
    db: Session = Depends(get_db)
):
    """Customer login - returns JWT tokens"""
    customer, access_token, refresh_token, access_expires_in, refresh_expires_in = (
        CustomerAuthService.authenticate_customer(
            db=db,
            email=request.email,
            password=request.password
        )
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        access_expires_in=access_expires_in,
        refresh_expires_in=refresh_expires_in,
        customer_id=customer.id
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    access_token, expires_in = CustomerAuthService.refresh_access_token(
        db=db,
        refresh_token=refresh_token
    )
    
    # Decode to get customer_id
    from app.utils.jwt_utils import JWTTokenHandler
    payload = JWTTokenHandler.decode_token(refresh_token, token_type="refresh")
    customer_id = int(payload.get("sub"))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        access_expires_in=expires_in,
        refresh_expires_in=604800,  # 7 days
        customer_id=customer_id
    )


@router.get("/me", response_model=CustomerResponse)
async def get_current_customer_info(
    customer: Customer = Depends(get_current_customer)
):
    """Get current authenticated customer's information"""
    return customer