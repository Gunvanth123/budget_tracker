from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.db import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

from app.routers import accounts, transactions, categories, dashboard, todo, auth, passwords

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(accounts.router,     prefix="/api/accounts",     tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions",  tags=["Transactions"])
app.include_router(categories.router,   prefix="/api/categories",   tags=["Categories"])
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["Dashboard"])
app.include_router(todo.router,         prefix="/api/todo",         tags=["Todo"])
app.include_router(passwords.router,    prefix="/api/passwords",    tags=["Passwords"])

@app.get("/")
def root():
    return {"message": "Budget Tracker API v2", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
