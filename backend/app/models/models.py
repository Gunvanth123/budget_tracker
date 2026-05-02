from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database.db import Base


class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class AccountType(str, enum.Enum):
    cash = "cash"
    bank = "bank"
    upi = "upi"
    credit_card = "credit_card"
    savings = "savings"
    other = "other"


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    master_password_hash = Column(String(255), nullable=True)
    profile_picture = Column(Text, nullable=True)
    last_email_change = Column(DateTime(timezone=True), nullable=True)
    totp_secret = Column(String(255), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    
    # New Security Fields
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_otp = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    mfa_preference = Column(String(20), default="none", nullable=False) # none, app, email
    has_seen_onboarding = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Google Drive Integration
    gdrive_token = Column(Text, nullable=True) # JSON string of credentials
    gdrive_folder_id = Column(String(255), nullable=True)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    todo_lists = relationship("TodoList", back_populates="user", cascade="all, delete-orphan")
    passwords = relationship("PasswordEntry", back_populates="user", cascade="all, delete-orphan")
    budget_goals = relationship("BudgetGoal", back_populates="user", cascade="all, delete-orphan")
    secure_files = relationship("SecureFile", back_populates="user", cascade="all, delete-orphan")
    vault_categories = relationship("VaultCategory", back_populates="user", cascade="all, delete-orphan")
    password_categories = relationship("PasswordCategory", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    popcorn_entries = relationship("PopcornEntry", back_populates="user", cascade="all, delete-orphan")
    usage_stats = relationship("UsageStats", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(CategoryType), nullable=False)
    icon = Column(String(50), nullable=True, default="tag")
    color = Column(String(20), nullable=True, default="#6366f1")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budget_goals = relationship("BudgetGoal", back_populates="category")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(AccountType), nullable=False, default=AccountType.bank)
    balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="INR")
    color = Column(String(20), nullable=True, default="#6366f1")
    is_default = Column(Boolean, default=False, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    currency = Column(String(10), nullable=False, default="INR")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class TodoList(Base):
    __tablename__ = "todo_lists"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="todo_lists")
    tasks = relationship("TodoTask", back_populates="todo_list", cascade="all, delete-orphan", order_by="TodoTask.created_at")


class TodoTask(Base):
    __tablename__ = "todo_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    todo_list_id = Column(Integer, ForeignKey("todo_lists.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    todo_list = relationship("TodoList", back_populates="tasks")


class PasswordEntry(Base):
    __tablename__ = "password_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    website = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    encrypted_password = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category_id = Column(Integer, ForeignKey("password_categories.id"), nullable=True)
    backup_codes = Column(Text, nullable=True) # AES-256 encrypted base64 payload

    user = relationship("User", back_populates="passwords")
    category = relationship("PasswordCategory", back_populates="entries")

class PasswordCategory(Base):
    __tablename__ = "password_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="password_categories")
    entries = relationship("PasswordEntry", back_populates="category")

class BudgetGoal(Base):
    __tablename__ = "budget_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    month_year = Column(String(7), nullable=False) # e.g. "2024-05"
    
    user = relationship("User", back_populates="budget_goals")
    category = relationship("Category", back_populates="budget_goals")

class SecureFile(Base):
    __tablename__ = "secure_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    encrypted_content = Column(Text, nullable=True) # AES-256 encrypted base64 payload (nullable for GDrive storage)
    gdrive_file_id = Column(String(255), nullable=True)
    storage_location = Column(String(20), default="database") # 'database' or 'gdrive'
    mimetype = Column(String(100), nullable=True)
    size = Column(Integer, nullable=True) # size in bytes
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="secure_files")
    category_id = Column(Integer, ForeignKey("vault_categories.id"), nullable=True)
    category = relationship("VaultCategory", back_populates="files")

class VaultCategory(Base):
    __tablename__ = "vault_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gdrive_folder_id = Column(String(255), nullable=True) # ID of the folder in GDrive for this category
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="vault_categories")
    files = relationship("SecureFile", back_populates="category")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    month_year = Column(String(7), nullable=False) # e.g. "2024-05"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")

class PopcornEntry(Base):
    __tablename__ = "popcorn_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # Anime movie, TV show, etc.
    language = Column(String(100), nullable=True)
    rating = Column(Float, nullable=True) # 1-5 popcorns
    synopsis = Column(Text, nullable=True)
    reasons_for_liking = Column(Text, nullable=True)
    genres = Column(Text, nullable=True) # Comma-separated or JSON list
    poster_url = Column(Text, nullable=True) # Local or GDrive public URL if applicable
    gdrive_file_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="popcorn_entries")

class UsageStats(Base):
    __tablename__ = "usage_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feature_id = Column(String(50), nullable=False) # 'passwords', 'vault', 'popcorn', 'todo', etc.
    count = Column(Integer, default=0, nullable=False)
    last_used = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="usage_stats")
