from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from collections import defaultdict

from app.database.db import get_db
from app.models.models import Transaction, Account, Category, TransactionType, User
from app.schemas.schemas import DashboardOut, SummaryOut, CategoryBreakdown, MonthlyData, DailyData
from app.services.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    uid = current_user.id

    total_balance = db.query(func.sum(Account.balance)).filter(Account.user_id == uid).scalar() or 0.0
    total_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == uid, Transaction.type == TransactionType.income
    ).scalar() or 0.0
    total_expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == uid, Transaction.type == TransactionType.expense
    ).scalar() or 0.0

    summary = SummaryOut(
        total_balance=round(total_balance, 2),
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        net=round(total_income - total_expense, 2),
    )

    cat_data = (
        db.query(Category.name, Category.color, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == uid, Transaction.type == TransactionType.expense)
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    total_exp = sum(r.total for r in cat_data) or 1
    expense_by_category = [
        CategoryBreakdown(
            category=r.name,
            amount=round(r.total, 2),
            color=r.color or "#6366f1",
            percentage=round((r.total / total_exp) * 100, 1),
        ) for r in cat_data
    ]

    monthly: dict = {}
    for i in range(2, -1, -1):
        month_date = now - timedelta(days=i * 30)
        key = month_date.strftime("%b %Y")
        monthly[key] = {"income": 0.0, "expense": 0.0}

    start_3m = now - timedelta(days=90)
    for txn in db.query(Transaction).filter(Transaction.user_id == uid, Transaction.date >= start_3m).all():
        key = txn.date.strftime("%b %Y")
        if key in monthly:
            monthly[key][txn.type.value] += txn.amount

    monthly_comparison = [
        MonthlyData(month=k, income=round(v["income"], 2), expense=round(v["expense"], 2))
        for k, v in monthly.items()
    ]

    daily: dict = {}
    for i in range(29, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily[day] = {"income": 0.0, "expense": 0.0}

    start_30d = now - timedelta(days=30)
    for txn in db.query(Transaction).filter(Transaction.user_id == uid, Transaction.date >= start_30d).all():
        day = txn.date.strftime("%Y-%m-%d")
        if day in daily:
            daily[day][txn.type.value] += txn.amount

    daily_trends = [
        DailyData(date=k, income=round(v["income"], 2), expense=round(v["expense"], 2))
        for k, v in daily.items()
    ]

    return DashboardOut(
        summary=summary,
        expense_by_category=expense_by_category,
        monthly_comparison=monthly_comparison,
        daily_trends=daily_trends,
    )


@router.get("/calendar")
def get_calendar_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    start = now - timedelta(days=30)
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id, Transaction.date >= start).all()

    calendar: dict = defaultdict(lambda: {"income": 0.0, "expense": 0.0, "transactions": []})
    for txn in txns:
        day = txn.date.strftime("%Y-%m-%d")
        calendar[day][txn.type.value] += txn.amount
        calendar[day]["transactions"].append({
            "id": txn.id,
            "type": txn.type.value,
            "amount": txn.amount,
            "notes": txn.notes,
            "category": txn.category.name if txn.category else "",
            "account": txn.account.name if txn.account else "",
        })

    return {
        k: {"income": round(v["income"], 2), "expense": round(v["expense"], 2), "transactions": v["transactions"]}
        for k, v in calendar.items()
    }
