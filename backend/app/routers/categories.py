from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.models.models import Category, CategoryType, User
from app.schemas.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.services.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[CategoryOut])
def get_categories(type: Optional[CategoryType] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Category).filter(Category.user_id == current_user.id)
    if type:
        query = query.filter(Category.type == type)
    return query.order_by(Category.name).all()


@router.post("/", response_model=CategoryOut, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Category).filter(
        Category.name == category.name,
        Category.type == category.type,
        Category.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    db_cat = Category(**category.model_dump(), user_id=current_user.id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, update: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
