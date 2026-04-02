from sqlalchemy.orm import Session
from app.models.models import Category, CategoryType


EXPENSE_CATEGORIES = [
    {"name": "Food & Dining", "icon": "utensils", "color": "#f97316"},
    {"name": "Transport", "icon": "car", "color": "#3b82f6"},
    {"name": "Shopping", "icon": "shopping-bag", "color": "#ec4899"},
    {"name": "Bills & Utilities", "icon": "zap", "color": "#eab308"},
    {"name": "Entertainment", "icon": "film", "color": "#8b5cf6"},
    {"name": "Health", "icon": "heart", "color": "#ef4444"},
    {"name": "Fuel", "icon": "droplet", "color": "#14b8a6"},
    {"name": "Electronics", "icon": "cpu", "color": "#6366f1"},
    {"name": "Education", "icon": "book", "color": "#0ea5e9"},
    {"name": "Games", "icon": "gamepad", "color": "#a855f7"},
    {"name": "Travel", "icon": "map-pin", "color": "#22c55e"},
    {"name": "Groceries", "icon": "shopping-cart", "color": "#f59e0b"},
    {"name": "Clothing", "icon": "shirt", "color": "#f43f5e"},
    {"name": "Home & Garden", "icon": "home", "color": "#10b981"},
    {"name": "Other", "icon": "tag", "color": "#6b7280"},
]

INCOME_CATEGORIES = [
    {"name": "Salary", "icon": "briefcase", "color": "#22c55e"},
    {"name": "Freelance", "icon": "laptop", "color": "#0ea5e9"},
    {"name": "Business", "icon": "building", "color": "#8b5cf6"},
    {"name": "Investment", "icon": "trending-up", "color": "#f97316"},
    {"name": "Rental Income", "icon": "home", "color": "#14b8a6"},
    {"name": "Gift", "icon": "gift", "color": "#ec4899"},
    {"name": "Refund", "icon": "refresh-cw", "color": "#eab308"},
    {"name": "Other Income", "icon": "plus-circle", "color": "#6b7280"},
]


def seed_default_categories_for_user(db: Session, user_id: int):
    """Seed default categories for a newly registered user."""
    categories = []
    for cat in EXPENSE_CATEGORIES:
        categories.append(Category(type=CategoryType.expense, user_id=user_id, **cat))
    for cat in INCOME_CATEGORIES:
        categories.append(Category(type=CategoryType.income, user_id=user_id, **cat))
    db.bulk_save_objects(categories)
    db.commit()
    print(f"✅ Seeded {len(categories)} default categories for user {user_id}")


# Keep for backward compat - no-op now (seeding is per-user on register)
def seed_default_categories(db: Session):
    pass

