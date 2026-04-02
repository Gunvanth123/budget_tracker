from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional

from app.database.db import get_db
from app.models.models import TodoList, TodoTask, User
from app.services.auth import get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    title: str
    completed: bool
    class Config:
        from_attributes = True

class TodoListOut(BaseModel):
    id: int
    title: str
    tasks: List[TaskOut] = []
    class Config:
        from_attributes = True

class CreateListRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)

class UpdateListRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)

class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)

class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None


# ── List endpoints ────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TodoListOut])
def get_lists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(TodoList).filter(TodoList.user_id == current_user.id).order_by(TodoList.created_at.asc()).all()


@router.post("/", response_model=TodoListOut, status_code=201)
def create_list(req: CreateListRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = TodoList(title=req.title, user_id=current_user.id)
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return lst


@router.put("/{list_id}", response_model=TodoListOut)
def update_list(list_id: int, req: UpdateListRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = db.query(TodoList).filter(TodoList.id == list_id, TodoList.user_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    lst.title = req.title
    db.commit()
    db.refresh(lst)
    return lst


@router.delete("/{list_id}", status_code=204)
def delete_list(list_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = db.query(TodoList).filter(TodoList.id == list_id, TodoList.user_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    db.delete(lst)
    db.commit()


# ── Task endpoints ────────────────────────────────────────────────────────────

@router.post("/{list_id}/tasks", response_model=TaskOut, status_code=201)
def create_task(list_id: int, req: CreateTaskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = db.query(TodoList).filter(TodoList.id == list_id, TodoList.user_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    task = TodoTask(title=req.title, todo_list_id=list_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{list_id}/tasks/{task_id}", response_model=TaskOut)
def update_task(list_id: int, task_id: int, req: UpdateTaskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = db.query(TodoList).filter(TodoList.id == list_id, TodoList.user_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    task = db.query(TodoTask).filter(TodoTask.id == task_id, TodoTask.todo_list_id == list_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if req.title is not None:
        task.title = req.title
    if req.completed is not None:
        task.completed = req.completed
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{list_id}/tasks/{task_id}", status_code=204)
def delete_task(list_id: int, task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lst = db.query(TodoList).filter(TodoList.id == list_id, TodoList.user_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    task = db.query(TodoTask).filter(TodoTask.id == task_id, TodoTask.todo_list_id == list_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
