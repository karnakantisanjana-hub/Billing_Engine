import os
from pathlib import Path
from fastapi import FastAPI, Request, Depends, HTTPException, Header, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.openapi.utils import get_openapi
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_user
from app.pdf_utils import generate_pdf_invoice_stream
from app.models import Customer, Subscription, Invoice, User, Plan, Payment, Language, Translation, UserPreference
from starlette.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, Body
import shutil
import time
from app.routers import dashboard_metrics
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    plans,
    customers,
    subscriptions,
    admin_auth,
    payments,
    refunds,
    invoice_management,
    billing_cycles,
)

# ─── Languages Router ──────────────────────────────────────────────────────────
try:
    from app.routers import languages
    LANGUAGES_ROUTER_AVAILABLE = True
except ImportError as e:
    print("LANGUAGES ROUTER FAILED TO IMPORT:", e)
    LANGUAGES_ROUTER_AVAILABLE = False

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

# ─── Swagger Authorization ─────────────────────────────────────────────────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    skip_paths = ["/api/auth/login", "/health", "/openapi.json", "/docs", "/redoc"]
    for path in openapi_schema.get("paths", {}):
        for method in openapi_schema["paths"][path]:
            operation = openapi_schema["paths"][path][method]
            if not any(skip in path for skip in skip_paths):
                operation["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
app.include_router(billing_cycles.router, tags=["Billing Cycles"])

# ─── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URLS = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080"
).split(",")
FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# ─── Static Files ──────────────────────────────────────────────────────────────
static_dir = Path("app/static")
if static_dir.exists():
    app.mount(
        "/static",
        StaticFiles(directory="app/static"),
        name="static"
    )

# ─── Routers ───────────────────────────────────────────────────────────────────
app.include_router(plans.router)
app.include_router(customers.router)
app.include_router(subscriptions.router)
app.include_router(admin_auth.router)
app.include_router(payments.router)
app.include_router(refunds.router)
app.include_router(dashboard_metrics.router)
app.include_router(invoice_management.router)
app.include_router(plans.router)


if LANGUAGES_ROUTER_AVAILABLE:
    app.include_router(languages.router, tags=["Languages"])

if OPTIONAL_ROUTERS_AVAILABLE:
    app.include_router(invoices.router, prefix="/api/v1", tags=["Invoices"])
    app.include_router(payments.router, prefix="/api/v1", tags=["Payments"])
    app.include_router(audit_logs.router, prefix="/api/v1", tags=["Audit Logs"])
    app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])

# ============================================================================
# API ENDPOINTS
# ============================================================================
app.include_router(plans.router, prefix="/api/v1")

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
