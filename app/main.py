from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from pathlib import Path
from fastapi import Request,Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from fastapi.responses import RedirectResponse
from app.routers import admin_auth
from app.auth import hash_password, verify_password, create_access_token, get_current_user
# ============================================================================
# ADMIN/BUSINESS ROUTERS (Existing)
# ============================================================================
from app.routers import (
    plans,
    customers,
    subscriptions,
)

# ============================================================================
# CUSTOMER PORTAL ROUTERS (New)
# ============================================================================
from app.routers import (
    customer_auth,
    customer_portal,
)

# ============================================================================
# OPTIONAL ROUTERS (if you have them)
# ============================================================================
try:
    from app.routers import (
        invoices,
        payments,
        billing_cycles,
        audit_logs,
        reports,
    )
    OPTIONAL_ROUTERS_AVAILABLE = True
except ImportError:
    OPTIONAL_ROUTERS_AVAILABLE = False

# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================
app = FastAPI(
    title="SaaS Billing API",
    description="Multi-tenant SaaS Billing Engine with Customer Portal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


templates = Jinja2Templates(directory="templates")
# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS Configuration
FRONTEND_URLS = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080"
).split(",")

FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=".*",
    expose_headers=["Content-Length", "X-JSON-Response-Size"],
)


# ============================================================================
# STATIC FILES MOUNTING
# ============================================================================

static_dir = Path("app/static")
if static_dir.exists():
    app.mount(
        "/static",
        StaticFiles(directory="app/static"),
        name="static"
    )


# ============================================================================
# ADMIN/BUSINESS API ROUTERS
# ============================================================================

# Plans Management
app.include_router(plans.router)

# Customers Management
app.include_router(customers.router)

# Subscriptions Management
app.include_router(subscriptions.router)

app.include_router(admin_auth.router)
# ============================================================================
# OPTIONAL ROUTERS (if available)
# ============================================================================

if OPTIONAL_ROUTERS_AVAILABLE:
    # Invoices Management
    app.include_router(invoices.router)
    
    # Payments Management
    app.include_router(payments.router)
    
    # Billing Cycles Management
    app.include_router(billing_cycles.router)
    
    # Audit Logs
    app.include_router(audit_logs.router)
    
    # Reports
    app.include_router(reports.router)


# ============================================================================
# CUSTOMER PORTAL API ROUTERS (NEW)
# ============================================================================

# Customer Authentication (Register, Login, Refresh Token)
app.include_router(customer_auth.router)

# Customer Portal (Subscriptions, Invoices, Profile)
app.include_router(customer_portal.router)


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def landing(request: Request):
    return templates.TemplateResponse(
        "landing.html",
        {
            "request": request
        }
    )
@app.get("/signin", response_class=HTMLResponse)
async def signin(request: Request):
    return templates.TemplateResponse(
        "signin.html",
        {"request": request}
    )


@app.get("/signup", response_class=HTMLResponse)
async def signup(request: Request):
    return templates.TemplateResponse(
        "signup.html",
        {"request": request}
    )
@app.get("/customer/login", response_class=HTMLResponse)
async def customer_login(request: Request):
    return templates.TemplateResponse(
        "customer_login.html",
        {"request": request}
    )
@app.get("/customer/dashboard", response_class=HTMLResponse)
async def customer_dashboard(request: Request):
    return templates.TemplateResponse(
        "customer_dashboard.html",
        {"request": request}
    )
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request}
    )
@app.get("/customer/dashboard", response_class=HTMLResponse)
async def customer_dashboard(request: Request):
    return templates.TemplateResponse(
        "customer_dashboard.html",
        {"request": request}
    )
@app.get("/health")
async def health_check():
    """
    Health check endpoint - Returns API status
    """
    return {
        "status": "healthy",
        "service": "SaaS Billing API",
        "version": "1.0.0",
        "timestamp": str(__import__('datetime').datetime.utcnow())
    }
@app.get("/profile", response_class=HTMLResponse)
def profile_page(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/signin", status_code=303)
    return templates.TemplateResponse(request, "profile.html", {"user": user})

@app.get("/api/v1/info")
async def api_info():
    """
    API Information endpoint - Returns available endpoints
    """
    return {
        "service": "SaaS Billing API",
        "version": "1.0.0",
        "description": "Multi-tenant SaaS Billing Engine with Customer Portal",
        "admin_endpoints": {
            "plans": "/docs#/plans",
            "customers": "/docs#/customers",
            "subscriptions": "/docs#/subscriptions",
            "invoices": "/docs#/invoices",
            "payments": "/docs#/payments",
            "billing_cycles": "/docs#/billing-cycles",
            "audit_logs": "/docs#/audit-logs",
            "reports": "/docs#/reports"
        },
        "customer_endpoints": {
            "auth": {
                "register": "POST /api/v1/customer/auth/register",
                "login": "POST /api/v1/customer/auth/login",
                "refresh": "POST /api/v1/customer/auth/refresh",
                "me": "GET /api/v1/customer/auth/me"
            },
            "portal": {
                "profile": "GET /api/v1/customer/portal/profile",
                "subscriptions": "GET /api/v1/customer/portal/subscriptions",
                "invoices": "GET /api/v1/customer/portal/invoices",
                "change_password": "POST /api/v1/customer/portal/change-password"
            }
        }
    }


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """
    Handle 404 Not Found errors
    """
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
    """
    Handle 500 Internal Server errors
    """
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc),
            "documentation": "/docs"
        }
    )


# ============================================================================
# STARTUP EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup event handler
    """
    print("=" * 80)
    print("🚀 SaaS Billing API Starting Up")
    print("=" * 80)
    print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"📍 CORS Origins: {', '.join(FRONTEND_URLS)}")
    print(f"📍 Optional Routers: {'Available' if OPTIONAL_ROUTERS_AVAILABLE else 'Not Available'}")
    print("=" * 80)
    print("✅ API Ready!")
    print("📖 Documentation: http://localhost:8000/docs")
    print("=" * 80)


@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler
    """
    print("\n" + "=" * 80)
    print("🛑 SaaS Billing API Shutting Down")
    print("=" * 80)



# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Configuration from environment variables
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    RELOAD = os.getenv("RELOAD", "True").lower() == "true"
    
    print(f"\n🚀 Starting server on {HOST}:{PORT}")
    print(f"📖 View API docs at http://{HOST}:{PORT}/docs\n")
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        log_level="info"
    )
