# app/routers/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Customer
from app.utils.jwt_utils import JWTTokenHandler

security = HTTPBearer(auto_error=False)


async def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Customer:
    """
    Dependency to get current authenticated customer from JWT token
    
    Usage in routes:
        @router.get("/my-subscriptions")
        async def get_subscriptions(customer: Customer = Depends(get_current_customer)):
            return {"subscriptions": customer.subscriptions}
    """
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # Decode and validate token
    payload = JWTTokenHandler.decode_token(token, token_type="access")
    
    customer_id = int(payload.get("sub"))
    
    # Fetch customer from database
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.is_active == True
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return customer