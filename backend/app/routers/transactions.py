from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database.db import get_db
from app.models.models import Transaction, Account, TransactionType, User
from app.schemas.schemas import TransactionCreate, TransactionOut, TransactionUpdate
from app.services.auth import get_current_user

router = APIRouter()


def apply_filters(query, type, account_id, category_id, start_date, end_date, search):
    if type:
        query = query.filter(Transaction.type == type)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if search:
        query = query.filter(Transaction.notes.ilike(f"%{search}%"))
    return query

@router.get("/", response_model=List[TransactionOut])
def get_transactions(
    type: Optional[TransactionType] = None,
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).options(
        joinedload(Transaction.category),
        joinedload(Transaction.account)
    ).filter(Transaction.user_id == current_user.id)
    
    query = apply_filters(query, type, account_id, category_id, start_date, end_date, search)
    return query.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()

@router.get("/summary")
def get_transaction_summary(
    type: Optional[TransactionType] = None,
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    query = apply_filters(query, type, account_id, category_id, start_date, end_date, search)
    
    # Calculate totals
    income_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.income
    )
    income_total = apply_filters(income_total, None, account_id, category_id, start_date, end_date, search).scalar() or 0.0
    
    expense_total = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.expense
    )
    expense_total = apply_filters(expense_total, None, account_id, category_id, start_date, end_date, search).scalar() or 0.0
    
    count = query.count()
    
    return {
        "total_income": income_total,
        "total_expense": expense_total,
        "net_balance": income_total - expense_total,
        "count": count
    }


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(txn: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == txn.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db_txn = Transaction(**txn.model_dump(), user_id=current_user.id)
    db.add(db_txn)

    if txn.type == TransactionType.income:
        account.balance += txn.amount
    else:
        account.balance -= txn.amount

    db.commit()
    db.refresh(db_txn)
    return db_txn


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == current_user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.put("/{txn_id}", response_model=TransactionOut)
def update_transaction(txn_id: int, update: TransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == current_user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    account = db.query(Account).filter(Account.id == txn.account_id, Account.user_id == current_user.id).first()
    if txn.type == TransactionType.income:
        account.balance -= txn.amount
    else:
        account.balance += txn.amount

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)

    new_account = db.query(Account).filter(Account.id == txn.account_id, Account.user_id == current_user.id).first()
    if txn.type == TransactionType.income:
        new_account.balance += txn.amount
    else:
        new_account.balance -= txn.amount

    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == current_user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    account = db.query(Account).filter(Account.id == txn.account_id, Account.user_id == current_user.id).first()
    if account:
        if txn.type == TransactionType.income:
            account.balance -= txn.amount
        else:
            account.balance += txn.amount

    db.delete(txn)
    db.commit()
