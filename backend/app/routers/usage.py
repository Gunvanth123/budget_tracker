from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.models import UsageStats, User
from app.schemas.schemas import UsageUpdate, UsageStatsOut
from app.routers.auth import get_current_user
from sqlalchemy.sql import func

router = APIRouter(prefix="/usage", tags=["usage"])

@router.post("/track")
def track_usage(
    data: UsageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = db.query(UsageStats).filter(
        UsageStats.user_id == current_user.id,
        UsageStats.feature_id == data.feature_id
    ).first()

    if not stats:
        stats = UsageStats(
            user_id=current_user.id,
            feature_id=data.feature_id,
            count=1
        )
        db.add(stats)
    else:
        stats.count += 1
    
    db.commit()
    return {"status": "success"}

@router.get("/top", response_model=list[UsageStatsOut])
def get_top_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get top features used by the user
    stats = db.query(UsageStats).filter(
        UsageStats.user_id == current_user.id
    ).order_by(UsageStats.count.desc()).limit(10).all()
    
    return stats
