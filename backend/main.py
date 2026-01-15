"""
SL Enterprise - Main Application
FastAPI entry point.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os

from database import create_tables
from routers import (
    auth, users, employees, leaves, disciplinary, notifications, expiries, fleet, returns,
    tasks, events, audit, hr_stats, shifts, announcements, facility, factory, kpi, roles,
    admin_settings, mobile, maintenance, reports, bonuses, chat
)


# ============================================================
# LIFESPAN (Startup/Shutdown events)
# ============================================================

from scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Esegue operazioni all'avvio e alla chiusura dell'app."""
# Startup: Crea tabelle DB
    print("[STARTUP] Inizializzazione database...")
    create_tables()
    
    # Auto-Migration: Aggiungi colonne mancanti (Hotfix Cross-DB)
    try:
        from database import engine
        from sqlalchemy import text, inspect
        
        inspector = inspect(engine)
        
        with engine.connect() as conn:
             # 1. banned_until su conversation_members
             if inspector.has_table("conversation_members"):
                 cols = [c['name'] for c in inspector.get_columns("conversation_members")]
                 if "banned_until" not in cols:
                     print("[MIGRATION] Aggiunto campo 'banned_until' a conversation_members")
                     conn.execute(text("ALTER TABLE conversation_members ADD COLUMN banned_until DATETIME NULL"))
                     conn.commit()

             # 2. deleted_at su messages
             if inspector.has_table("messages"):
                 cols = [c['name'] for c in inspector.get_columns("messages")]
                 if "deleted_at" not in cols:
                     print("[MIGRATION] Aggiunto campo 'deleted_at' a messages")
                     conn.execute(text("ALTER TABLE messages ADD COLUMN deleted_at DATETIME NULL"))
                     conn.commit()
    except Exception as e:
        print(f"[MIGRATION WARNING] Errore auto-migration: {e}")

    print("[STARTUP] Database pronto!")
    
    # Avvio Scheduler
    print("[STARTUP] Avvio Scheduler...")
    start_scheduler()
    
    yield  # App running
    
    # Shutdown
    print("[SHUTDOWN] Chiusura applicazione...")
    shutdown_scheduler()


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="SL Enterprise API",
    description="""
    ## Sistema Gestionale Aziendale
    
    Backend API per gestione:
    - **HR Suite**: Dipendenti, Certificazioni, Ferie, Disciplinare
    - **Admin Panel**: Utenti, Ruoli, Audit Log
    
    ---
    
    **Autenticazione**: JWT Bearer Token
    """,
    version="3.0.0",
    lifespan=lifespan
)

# Mount Uploads per Chat
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ============================================================
# ============================================================
# CORS - Standard FastAPI Middleware
# ============================================================
from fastapi.middleware.cors import CORSMiddleware as FastAPI_CORSMiddleware

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
    "http://93.186.255.104", # Production IP
    "http://93.186.255.104:80",
    "http://93.186.255.104:3000",
    "*" # Wildcard for safety during debugging
]

app.add_middleware(
    FastAPI_CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============================================================
# EXCEPTION HANDLERS (CORS Fix for Error Responses)
# ============================================================

from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from starlette.requests import Request

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure CORS headers are present even on error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers."""
    return JSONResponse(
        status_code=422,
        content={"detail": list(exc.errors())},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle ALL other errors (500) with CORS headers."""
    print(f"GLOBAL ERROR: {exc}") # Log to console
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )



# ============================================================
# ROUTERS
# ============================================================

# Auth & Users
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(audit.router)

# HR Suite
app.include_router(employees.router)
app.include_router(leaves.router)
app.include_router(disciplinary.router)
app.include_router(notifications.router)
app.include_router(expiries.router)
app.include_router(tasks.router)
app.include_router(events.router)
app.include_router(shifts.router)
app.include_router(hr_stats.router)
app.include_router(reports.router)
app.include_router(bonuses.router)
app.include_router(facility.router)
app.include_router(factory.router)

# Announcements
app.include_router(announcements.router)

# Parco Mezzi & Resi
app.include_router(fleet.router)
app.include_router(returns.router)

# Factory / Production
# app.include_router(factory.router)
app.include_router(kpi.router)
app.include_router(roles.router)  # KPI Configurator
app.include_router(mobile.router)
app.include_router(maintenance.router)

# Admin Settings
app.include_router(admin_settings.router)  # Departments, Job Roles, Banchine, Workstations

# Chat Interna
app.include_router(chat.router)

# ============================================================
# STATIC FILES (per preview documenti)
# ============================================================
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ============================================================
# ROOT ENDPOINTS
# ============================================================

@app.get("/", tags=["Root"])
def read_root():
    """Endpoint di benvenuto."""
    return {
        "status": "online",
        "message": "SL Enterprise Backend v2.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Root"])
def health_check():
    """Verifica stato del sistema."""
    return {
        "status": "healthy",
        "database": "connected",
        "version": "2.0.0"
    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
