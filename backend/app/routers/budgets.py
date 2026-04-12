from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.models import BudgetGoal, User, Category
from app.schemas.schemas import BudgetGoalCreate, BudgetGoalOut
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[BudgetGoalOut])
def get_budgets(month_year: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(BudgetGoal).filter(BudgetGoal.user_id == current_user.id)
    if month_year:
        query = query.filter(BudgetGoal.month_year == month_year)
    return query.all()

@router.post("/", response_model=BudgetGoalOut, status_code=201)
def set_budget(goal: BudgetGoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(Category).filter(Category.id == goal.category_id, Category.user_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    existing = db.query(BudgetGoal).filter(
        BudgetGoal.user_id == current_user.id,
        BudgetGoal.category_id == goal.category_id,
        BudgetGoal.month_year == goal.month_year
    ).first()
    
    if existing:
        existing.amount = goal.amount
        db.commit()
        db.refresh(existing)
        return existing

    db_goal = BudgetGoal(**goal.model_dump(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal
