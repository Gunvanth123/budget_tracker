from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from collections import defaultdict
import calendar
from typing import List, Optional

from app.database.db import get_db
from app.models.models import Transaction, Account, Category, TransactionType, User
from app.schemas.schemas import DashboardOut, SummaryOut, CategoryBreakdown, MonthlyData, DailyData
from app.services.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=DashboardOut)
def get_dashboard(
    month_year: Optional[str] = Query(None, regex=r"^(\d{4}-\d{2}|last_3_months)$"),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    uid = current_user.id
    
    is_range = month_year == "last_3_months"
    
    if is_range:
        start_of_month = (now - timedelta(days=90)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_month = now
        last_day = 30 # fallback for daily trends loop
    else:
        # If no month provided, use current
        if not month_year:
            target_date = now
            month_year = now.strftime("%Y-%m")
        else:
            target_date = datetime.strptime(month_year, "%Y-%m")

        # Start and end of the target month
        start_of_month = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day = calendar.monthrange(target_date.year, target_date.month)[1]
        end_of_month = target_date.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)

    # ── Summary ────────────────────────────────────────────────────────────────
    m_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == uid, 
        Transaction.type == TransactionType.income,
        Transaction.date >= start_of_month,
        Transaction.date <= end_of_month
    ).scalar() or 0.0
    
    m_expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == uid, 
        Transaction.type == TransactionType.expense,
        Transaction.date >= start_of_month,
        Transaction.date <= end_of_month
    ).scalar() or 0.0

    total_balance = db.query(func.sum(Account.balance)).filter(Account.user_id == uid).scalar() or 0.0

    summary = SummaryOut(
        total_balance=round(total_balance, 2),
        total_income=round(m_income, 2),
        total_expense=round(m_expense, 2),
        net=round(m_income - m_expense, 2),
        opening_balance=0.0,
    )

    # ── Expense by category ────────────────────────────────────────────────────
    cat_data = (
        db.query(Category.name, Category.color, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == uid, 
            Transaction.type == TransactionType.expense,
            Transaction.date >= start_of_month,
            Transaction.date <= end_of_month
        )
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

    # ── Monthly comparison ─────────────────────────────────────────────────────
    monthly: dict = {}
    c_year, c_month = now.year, now.month
    month_keys = []
    
    # If last_3_months is selected, show 3 months. Otherwise show 6.
    history_count = 2 if is_range else 5
    
    for i in range(history_count, -1, -1):
        m = c_month - i
        y = c_year
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append((y, m))

    for (y, m) in month_keys:
        key = datetime(y, m, 1).strftime("%b %Y")
        monthly[key] = {"income": 0.0, "expense": 0.0}

    start_history = datetime(month_keys[0][0], month_keys[0][1], 1)
    for txn in db.query(Transaction).filter(
        Transaction.user_id == uid, Transaction.date >= start_history
    ).all():
        key = txn.date.strftime("%b %Y")
        if key in monthly:
            monthly[key][txn.type.value] += txn.amount

    monthly_comparison = [
        MonthlyData(month=k, income=round(v["income"], 2), expense=round(v["expense"], 2))
        for k, v in monthly.items()
    ]

    # ── Daily trends ───────────────────────────────────────────────────────────
    daily: dict = {}
    if is_range:
        for i in range(29, -1, -1):
            day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            daily[day] = {"income": 0.0, "expense": 0.0}
    else:
        for d in range(1, last_day + 1):
            day_str = target_date.replace(day=d).strftime("%Y-%m-%d")
            daily[day_str] = {"income": 0.0, "expense": 0.0}

    for txn in db.query(Transaction).filter(
        Transaction.user_id == uid, 
        Transaction.date >= start_of_month,
        Transaction.date <= end_of_month
    ).all():
        day_str = txn.date.strftime("%Y-%m-%d")
        if day_str in daily:
            daily[day_str][txn.type.value] += txn.amount

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
