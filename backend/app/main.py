from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.db import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate the existing tables
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                # USERS TABLE
                user_cols = [
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
                for col in user_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col.split(' ')[0]} {col.split(' ', 1)[1]};"))

                # ACCOUNTS TABLE
                conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;"))

                # PASSWORD ENTRIES TABLE
                pw_cols = [
                    "backup_codes TEXT",
                    "category_id INTEGER",
                    "updated_at TIMESTAMP"
                ]
                for col in pw_cols:
                    conn.execute(text(f"ALTER TABLE password_entries ADD COLUMN IF NOT EXISTS {col.split(' ')[0]} {col.split(' ', 1)[1]};"))

                # INDEXES
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_date ON transactions (date);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id);"))

            elif engine.dialect.name == "sqlite":
                # SQLite doesn't support IF NOT EXISTS for ADD COLUMN in older versions or some dialects, 
                # so we keep the try-except blocks but cleaner.
                user_cols = [
                    "master_password_hash VARCHAR(255)", "profile_picture TEXT", "last_email_change DATETIME",
                    "totp_secret VARCHAR(255)", "totp_enabled BOOLEAN DEFAULT FALSE", "is_verified BOOLEAN DEFAULT FALSE",
                    "verification_otp VARCHAR(10)", "otp_expires_at DATETIME", "mfa_preference VARCHAR(20) DEFAULT 'none'"
                ]
                for col in user_cols:
                    try: conn.execute(text(f"ALTER TABLE users ADD COLUMN {col};"))
                    except: pass
                
                try: conn.execute(text("ALTER TABLE accounts ADD COLUMN is_default BOOLEAN DEFAULT FALSE;"))
                except: pass

                pw_cols = ["backup_codes TEXT", "category_id INTEGER", "updated_at DATETIME"]
                for col in pw_cols:
                    try: conn.execute(text(f"ALTER TABLE password_entries ADD COLUMN {col};"))
                    except: pass
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

from app.routers import accounts, transactions, categories, dashboard, todo, auth, passwords, budgets, users, ai, vault, popcorn

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
app.include_router(popcorn.router,      prefix="/api/popcorn",      tags=["Popcorn"])

@app.get("/")
def root():
    return {"message": "Budget Tracker API v2", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
