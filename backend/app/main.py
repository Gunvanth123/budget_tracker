from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.db import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate the existing users table
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                columns = [
                    "master_password_hash VARCHAR(255)",
                    "profile_picture TEXT",
                    "last_email_change TIMESTAMP",
                    "totp_secret VARCHAR(255)",
                    "totp_enabled BOOLEAN DEFAULT FALSE",
                    "is_verified BOOLEAN DEFAULT FALSE",
                    "verification_otp VARCHAR(10)",
                    "otp_expires_at TIMESTAMP",
                    "mfa_preference VARCHAR(20) DEFAULT 'none'"
                ]
                for col in columns:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col};"))

                # Migrate accounts table
                conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;"))

                # Migrate password_entries table
                conn.execute(text("ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS backup_codes TEXT;"))
                conn.execute(text("ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS category_id INTEGER;"))
                conn.execute(text("ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"))

            elif engine.dialect.name == "sqlite":
                # Migrate users table
                columns = [
                    "master_password_hash VARCHAR(255)",
                    "profile_picture TEXT",
                    "last_email_change DATETIME",
                    "totp_secret VARCHAR(255)",
                    "totp_enabled BOOLEAN DEFAULT FALSE",
                    "is_verified BOOLEAN DEFAULT FALSE",
                    "verification_otp VARCHAR(10)",
                    "otp_expires_at DATETIME",
                    "mfa_preference VARCHAR(20) DEFAULT 'none'"
                ]
                for col in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col};"))
                    except Exception:
                        pass
                
                # Migrate accounts table
                try:
                    conn.execute(text("ALTER TABLE accounts ADD COLUMN is_default BOOLEAN DEFAULT FALSE;"))
                except Exception:
                    pass

                # Migrate password_entries table
                try:
                    conn.execute(text("ALTER TABLE password_entries ADD COLUMN backup_codes TEXT;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE password_entries ADD COLUMN category_id INTEGER;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE password_entries ADD COLUMN updated_at DATETIME;"))
                except Exception:
                    pass
    except Exception as e:
        print(f"Auto-migration skipped or failed: {e}")
        
    yield

app = FastAPI(
    title="Budget Tracker API",
    description="Production-ready Budget Tracker & Planner REST API",
    version="2.0.0",
    lifespan=lifespan,
)

from fastapi import Request, Response

@app.middleware("http")
async def cors_handler(request: Request, call_next):
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = Response()
        response.status_code = 204
        origin = request.headers.get("Origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # Handle actual requests
    response = await call_next(request)
    origin = request.headers.get("Origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    return response

from app.routers import accounts, transactions, categories, dashboard, todo, auth, passwords, budgets, users, ai, vault

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(users.router,        prefix="/api/users",        tags=["Users"])
app.include_router(accounts.router,     prefix="/api/accounts",     tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(categories.router,   prefix="/api/categories",   tags=["Categories"])
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["Dashboard"])
app.include_router(todo.router,         prefix="/api/todo",         tags=["Todo"])
app.include_router(passwords.router,    prefix="/api/passwords",    tags=["Passwords"])
app.include_router(budgets.router,      prefix="/api/budgets",      tags=["Budgets"])
app.include_router(vault.router,        prefix="/api/vault",        tags=["Vault"])
app.include_router(ai.router,           prefix="/api/ai",           tags=["AI"])

@app.get("/")
def root():
    return {"message": "Budget Tracker API v2", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
