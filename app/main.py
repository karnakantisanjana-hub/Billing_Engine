import os
from pathlib import Path
from fastapi import FastAPI, Request, Depends, HTTPException, Header, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_user
from app.pdf_utils import generate_pdf_invoice_stream
from app.models import Customer, Subscription, Invoice, User, Plan, Payment
from starlette.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, Body
import shutil
import time

from app.routers import (
    plans,
    customers,
    subscriptions,
    admin_auth,
    payments,
    billing_cycles,
    refunds,
)

try:
    from app.routers import (
        invoices,
        audit_logs,
        reports,
    )
    OPTIONAL_ROUTERS_AVAILABLE = True
except ImportError:
    OPTIONAL_ROUTERS_AVAILABLE = False

app = FastAPI(
    title="SaaS Billing API",
    description="Multi-tenant SaaS Billing Engine with Customer Portal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

FRONTEND_URLS = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080"
 ).split(",")
FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

static_dir = Path("app/static")
if static_dir.exists():
    app.mount(
        "/static",
        StaticFiles(directory="app/static"),
        name="static"
    )

app.include_router(plans.router)
app.include_router(customers.router)
app.include_router(subscriptions.router)
app.include_router(admin_auth.router)
app.include_router(payments.router)
app.include_router(refunds.router)

if OPTIONAL_ROUTERS_AVAILABLE:
    app.include_router(invoices.router, prefix="/api/v1", tags=["Invoices"])
    app.include_router(payments.router, prefix="/api/v1", tags=["Payments"])
    app.include_router(billing_cycles.router, prefix="/api/v1", tags=["Billing Cycles"])
    app.include_router(audit_logs.router, prefix="/api/v1", tags=["Audit Logs"])
    app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SaaS Billing API",
        "version": "1.0.0",
        "timestamp": str(__import__('datetime').datetime.utcnow())
    }

UPLOAD_DIR = Path("app/static/uploads/profile_pictures")

@app.get("/api/profile")
def get_profile(user: User = Depends(require_user)):
    """API Profile Endpoint queried by React Dashboard"""
    pic_url = ""
    if user.profile_picture:
        pic_url = f"/static/uploads/profile_pictures/{user.profile_picture}"
    return {
        "id": user.id,
        "name": user.full_name or user.username,
        "email": user.email,
        "username": user.username,
        "role": user.role or "admin",
        "full_name": user.full_name or "",
        "created_at": str(user.created_at) if user.created_at else "N/A",
        "profile_picture": pic_url
    }

@app.post("/api/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Upload user profile picture"""
    allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only image files are allowed (JPG, PNG, GIF, WEBP)")
    
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"user_{user.id}_{int(time.time())}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    if user.profile_picture:
        old_path = UPLOAD_DIR / user.profile_picture
        if old_path.exists():
            old_path.unlink()
    
    user.profile_picture = filename
    db.commit()
    
    return {
        "message": "Profile picture updated",
        "url": f"/static/uploads/profile_pictures/{filename}"
    }

@app.put("/api/profile")
def update_profile(user: User = Depends(require_user)):
    """Update user profile"""
    from pydantic import BaseModel
    
    class ProfileUpdate(BaseModel):
        name: str = ""
        email: str = ""
    
    return {"message": "Profile updated", "status": "success"}

@app.put("/api/profile/change-password")
def change_password(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    current_password: str = Body(...),
    new_password: str = Body(...)
):
    """Change user password"""
    if not verify_password(current_password, user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    user.password = hash_password(new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@app.get("/api/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    try:
        active_subscribers = db.query(Subscription).filter(Subscription.status == "active").count()
        unpaid_invoices = db.query(Invoice).filter(Invoice.status.ilike("%unpaid%")).count()
        failed_recoveries = db.query(Payment).filter(Payment.status == "failed").count()
        
        mrr = 0.0
        active_subs = db.query(Subscription).filter(Subscription.status == "active").all()
        for sub in active_subs:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            if plan and plan.price:
                mrr += float(plan.price)
        
        plan_breakdown = db.query(
            Plan.name.label("plan_name"),
            func.count(Subscription.id).label("subscriber_count")
        ).join(Subscription, Subscription.plan_id == Plan.id).filter(
            Subscription.status == "active"
        ).group_by(Plan.name).all()
        
        plan_breakdown = [
            {"plan_name": item.plan_name, "subscriber_count": item.subscriber_count}
            for item in plan_breakdown
        ]
        
        return {
            "monthly_recurring_revenue": round(mrr, 2),
            "active_subscribers": active_subscribers,
            "unpaid_invoices": unpaid_invoices,
            "failed_recoveries": failed_recoveries,
            "chart_data": [
                {"month": "Jan", "mrr": 12000},
                {"month": "Feb", "mrr": 18000},
                {"month": "Mar", "mrr": 25000},
                {"month": "Apr", "mrr": 28000},
                {"month": "May", "mrr": 34000},
                {"month": "Jun", "mrr": 42000},
            ],
            "plan_breakdown": plan_breakdown if plan_breakdown else []
        }
    except Exception as e:
        print(f"Error serving dashboard summary: {e}")
        return {
            "monthly_recurring_revenue": 0,
            "active_subscribers": 0,
            "unpaid_invoices": 0,
            "failed_recoveries": 0,
            "chart_data": [],
            "plan_breakdown": []
        }

@app.get("/api/invoices/{id}/pdf")
def download_pdf_invoice(id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")
        
    pdf_stream = generate_pdf_invoice_stream(invoice)
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"}
    )

# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found",
            "path": str(request.url),
            "documentation": "/docs"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc),
            "documentation": "/docs"
        }
    )

# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    RELOAD = os.getenv("RELOAD", "True").lower() == "true"
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        log_level="info"
    )
