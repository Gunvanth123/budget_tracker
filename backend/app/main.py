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
                    "totp_enabled BOOLEAN DEFAULT FALSE"
                ]
                for col in columns:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col};"))
            elif engine.dialect.name == "sqlite":
                columns = [
                    "master_password_hash VARCHAR(255)",
                    "profile_picture TEXT",
                    "last_email_change DATETIME",
                    "totp_secret VARCHAR(255)",
                    "totp_enabled BOOLEAN DEFAULT FALSE"
                ]
                for col in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col};"))
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "*",  # Remove this in production, keep only your frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import accounts, transactions, categories, dashboard, todo, auth, passwords, budgets, users

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(users.router,        prefix="/api/users",        tags=["Users"])
app.include_router(accounts.router,     prefix="/api/accounts",     tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(categories.router,   prefix="/api/categories",   tags=["Categories"])
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["Dashboard"])
app.include_router(todo.router,         prefix="/api/todo",         tags=["Todo"])
app.include_router(passwords.router,    prefix="/api/passwords",    tags=["Passwords"])
app.include_router(budgets.router,      prefix="/api/budgets",      tags=["Budgets"])

@app.get("/")
def root():
    return {"message": "Budget Tracker API v2", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
