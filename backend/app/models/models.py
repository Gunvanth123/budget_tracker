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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    todo_lists = relationship("TodoList", back_populates="user", cascade="all, delete-orphan")
    passwords = relationship("PasswordEntry", back_populates="user", cascade="all, delete-orphan")


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


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(AccountType), nullable=False, default=AccountType.bank)
    balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="INR")
    color = Column(String(20), nullable=True, default="#6366f1")
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
    date = Column(DateTime(timezone=True), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
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

    user = relationship("User", back_populates="passwords")
