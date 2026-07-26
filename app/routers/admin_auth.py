from fastapi import APIRouter, Depends, HTTPException, Response, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AdminLoginRequest, TokenPairResponse
from app.auth import verify_password, create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/auth", tags=["Admin Auth (JSON)"])

@router.post("/signup")
def admin_signup(payload: dict, db: Session = Depends(get_db)):
    from app.auth import hash_password
    
    existing = db.query(User).filter(
        (User.email == payload.get("email")) | (User.username == payload.get("username"))
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    
    new_user = User(
        username=payload.get("username"),
        email=payload.get("email"),
        full_name=payload.get("full_name"),
        password=hash_password(payload.get("password")),
        role=payload.get("role", "admin")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Account created successfully", "user_id": new_user.id}

@router.post("/login", response_model=TokenPairResponse)
def admin_login_json(payload: AdminLoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": str(user.id), "type": "admin"})
    refresh_token = create_refresh_token(user.id)

    # Also set the cookie, so existing cookie-based routes (like /dashboard) keep working
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=3600
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}