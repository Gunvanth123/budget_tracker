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
    is_default: bool = False

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[float] = None
    color: Optional[str] = None
    is_default: Optional[bool] = None

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


# ─── Usage Stats Schemas ──────────────────────────────────────────────────────

class UsageUpdate(BaseModel):
    feature_id: str

class UsageStatsOut(BaseModel):
    feature_id: str
    count: int
    last_used: datetime

    class Config:
        from_attributes = True


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class SummaryOut(BaseModel):
    total_balance: float
    total_income: float
    total_expense: float
    net: float
    forecasted_expense: float  # AI/Historical projection for the month

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
    quick_access: list[UsageStatsOut]

# ─── Password Manager Schemas ─────────────────────────────────────────────────

class MasterPasswordSetup(BaseModel):
    master_password: str

class MasterPasswordVerify(BaseModel):
    master_password: str

class PasswordEntryBase(BaseModel):
    website: str
    username: str
    encrypted_password: str
    backup_codes: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class PasswordEntryCreate(PasswordEntryBase):
    pass

class PasswordEntryUpdate(BaseModel):
    website: Optional[str] = None
    username: Optional[str] = None
    encrypted_password: Optional[str] = None
    backup_codes: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class PasswordCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class PasswordCategoryCreate(PasswordCategoryBase):
    pass

class PasswordCategoryOut(PasswordCategoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PasswordEntryOut(PasswordEntryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    category: Optional[PasswordCategoryOut] = None

    class Config:
        from_attributes = True

# ─── Budget & Goals Schemas ───────────────────────────────────────────────────

class BudgetGoalBase(BaseModel):
    category_id: int
    amount: float
    month_year: str # Format: "YYYY-MM"

class BudgetGoalCreate(BudgetGoalBase):
    pass

class BudgetGoalUpdate(BaseModel):
    amount: float

class BudgetGoalOut(BudgetGoalBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# ─── AI Chat Schemas ──────────────────────────────────────────────────────────

class ChatMessageBase(BaseModel):
    role: str
    content: str
    month_year: str # Format: "YYYY-MM"

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageOut(ChatMessageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
# ─── Vault Schemas ────────────────────────────────────────────────────────────

class VaultCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class VaultCategoryCreate(VaultCategoryBase):
    pass

class VaultCategoryOut(VaultCategoryBase):
    id: int
    user_id: int
    gdrive_folder_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VaultFileOut(BaseModel):
    id: int
    filename: str
    mimetype: Optional[str]
    size: Optional[int]
    storage_location: str
    created_at: datetime
    category_id: Optional[int] = None
    category: Optional[VaultCategoryOut] = None

    class Config:
        from_attributes = True

# ─── Popcorn Schemas ──────────────────────────────────────────────────────────

class PopcornEntryBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: str
    language: Optional[str] = None
    rating: Optional[float] = Field(None, ge=0, le=5)
    synopsis: Optional[str] = None
    reasons_for_liking: Optional[str] = None
    genres: Optional[str] = None # Comma-separated
    poster_url: Optional[str] = None
    gdrive_file_id: Optional[str] = None

class PopcornEntryCreate(PopcornEntryBase):
    pass

class PopcornEntryUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    rating: Optional[float] = None
    synopsis: Optional[str] = None
    reasons_for_liking: Optional[str] = None
    genres: Optional[str] = None
    poster_url: Optional[str] = None

class PopcornEntryOut(PopcornEntryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


