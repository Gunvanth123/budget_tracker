from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from app.models.models import CategoryType, AccountType, TransactionType


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: CategoryType
    icon: Optional[str] = "tag"
    color: Optional[str] = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Account Schemas ──────────────────────────────────────────────────────────

class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    balance: float = 0.0
    currency: str = "INR"
    color: Optional[str] = "#6366f1"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[float] = None
    color: Optional[str] = None

class AccountOut(AccountBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Transaction Schemas ──────────────────────────────────────────────────────

class TransactionBase(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None
    date: datetime
    currency: str = "INR"
    account_id: int
    category_id: int

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    notes: Optional[str] = None
    date: Optional[datetime] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None

class TransactionOut(TransactionBase):
    id: int
    created_at: datetime
    account: AccountOut
    category: CategoryOut

    class Config:
        from_attributes = True


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class SummaryOut(BaseModel):
    total_balance: float
    total_income: float
    total_expense: float
    net: float
    opening_balance: float  # Computed: money put in before any transactions

class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    color: str
    percentage: float

class MonthlyData(BaseModel):
    month: str
    income: float
    expense: float

class DailyData(BaseModel):
    date: str
    income: float
    expense: float

class DashboardOut(BaseModel):
    summary: SummaryOut
    expense_by_category: list[CategoryBreakdown]
    monthly_comparison: list[MonthlyData]
    daily_trends: list[DailyData]

# ─── Password Manager Schemas ─────────────────────────────────────────────────

class MasterPasswordSetup(BaseModel):
    master_password: str

class MasterPasswordVerify(BaseModel):
    master_password: str

class PasswordEntryBase(BaseModel):
    website: str
    username: str
    encrypted_password: str
    notes: Optional[str] = None

class PasswordEntryCreate(PasswordEntryBase):
    pass

class PasswordEntryUpdate(BaseModel):
    website: Optional[str] = None
    username: Optional[str] = None
    encrypted_password: Optional[str] = None
    notes: Optional[str] = None

class PasswordEntryOut(PasswordEntryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
