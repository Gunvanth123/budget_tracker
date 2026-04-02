# 💰 Budget Tracker & Planner

A production-ready full-stack personal finance application built with **FastAPI**, **React**, **PostgreSQL**, and **Recharts**.

---

## ✨ Features

- **Dashboard** — Summary cards, Expense Pie chart, Monthly Bar chart, 30-day Line chart
- **Transactions** — Add/edit/delete income & expense entries with full filtering
- **Accounts** — Multiple accounts (Cash, Bank, UPI, Credit Card, etc.) with auto balance tracking
- **Categories** — Fully dynamic from DB — add, edit, delete income/expense categories
- **Calendar View** — Month view showing daily income/expense, click any date for detail
- **Responsive** — Mobile-first, works on all screen sizes
- **Currency** — Indian Rupee (₹) default, designed for multi-currency expansion

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts, React Router |
| Backend | Python 3.12, FastAPI, SQLAlchemy ORM |
| Database | PostgreSQL (Supabase / Neon / Railway / local) |
| Deployment | Vercel (frontend), Render (backend) |

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL (local or cloud)

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd budget-tracker
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

**Edit `.env`:**
```env
DATABASE_URL=postgresql://postgres:admin@localhost:5432/budget_tracker
```

**Create the database:**
```bash
# Using psql
createdb budget_tracker

# Or run migrations with Alembic
alembic upgrade head
```

**Start the backend:**
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

> On first start, the app **auto-creates all tables** and **seeds 23 default categories**.

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# For local dev, leave VITE_API_URL empty (uses Vite proxy → port 8000)
```

**Start the frontend:**
```bash
npm run dev
```

App will be at `http://localhost:3000`

---

## 🐳 Docker Compose (Recommended for Local)

```bash
# From the root directory
docker-compose up --build
```

This starts:
- PostgreSQL on port 5432
- FastAPI backend on port 8000
- React frontend on port 3000

---

## ☁️ Deployment

### Database — Neon (Free, Recommended)

1. Go to [neon.tech](https://neon.tech) → Create account → New project
2. Copy the **connection string** — looks like:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Use this as `DATABASE_URL` in your backend deployment

**Alternative: Supabase**
1. Go to [supabase.com](https://supabase.com) → New project
2. Go to Settings → Database → Connection String (URI)
3. Use that as your `DATABASE_URL`

---

### Backend — Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo, set **root directory** to `backend`
3. Set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable:
   - `DATABASE_URL` = your Neon/Supabase connection string
5. Deploy → Copy the URL (e.g. `https://budget-tracker-api.onrender.com`)

> The `render.yaml` file in `/backend` enables one-click deploy if you use Render's IaC approach.

---

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo, set **root directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://budget-tracker-api.onrender.com`)
4. Deploy

**Alternative: Netlify**
1. Go to [netlify.com](https://netlify.com) → New Site → Import from Git
2. Set **base directory** to `frontend`, **build command** to `npm run build`, **publish** to `dist`
3. Add env var `VITE_API_URL` as above

---

## 📁 Project Structure

```
budget-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + lifespan
│   │   ├── database/
│   │   │   └── db.py            # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── models.py        # Account, Category, Transaction models
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── accounts.py      # GET/POST/PUT/DELETE /api/accounts
│   │   │   ├── categories.py    # GET/POST/PUT/DELETE /api/categories
│   │   │   ├── transactions.py  # GET/POST/PUT/DELETE /api/transactions
│   │   │   └── dashboard.py     # GET /api/dashboard + /calendar
│   │   └── services/
│   │       └── seed.py          # Auto-seed default categories
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios API wrappers
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Sidebar + topbar
│   │   │   ├── Modal.jsx        # Reusable modal
│   │   │   ├── dashboard/       # Dashboard + all charts
│   │   │   ├── transactions/    # Transaction list + form
│   │   │   ├── accounts/        # Account management
│   │   │   ├── categories/      # Category management
│   │   │   └── calendar/        # Calendar view
│   │   ├── utils/
│   │   │   └── helpers.js       # formatCurrency, formatDate, constants
│   │   ├── App.jsx              # Router
│   │   ├── main.jsx             # React entry
│   │   └── index.css            # Tailwind + custom design tokens
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── netlify.toml
│
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/` | List all accounts |
| POST | `/api/accounts/` | Create account |
| PUT | `/api/accounts/{id}` | Update account |
| DELETE | `/api/accounts/{id}` | Delete account |
| GET | `/api/categories/?type=expense` | List categories (filter by type) |
| POST | `/api/categories/` | Create category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete category |
| GET | `/api/transactions/` | List transactions (with filters) |
| POST | `/api/transactions/` | Create transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/dashboard/` | Full dashboard data |
| GET | `/api/dashboard/calendar` | Last 30 days calendar data |

Full interactive docs: `http://localhost:8000/docs`

---

## 🌍 Multi-Currency Support

The system is designed for future currency switching:
- Every account and transaction stores a `currency` field (default `INR`)
- `formatCurrency()` in `helpers.js` uses the `Intl.NumberFormat` API
- To add a currency selector: update the `currency` field on accounts/transactions and pass it to `formatCurrency(amount, currency)`

---

## 🔐 Adding Authentication (Optional Bonus)

To add JWT auth:

**Backend:**
1. `pip install python-jose[cryptography] passlib[bcrypt]`
2. Add a `users` table + `auth` router with `/register` and `/login`
3. Add `get_current_user` dependency to protected routes

**Frontend:**
1. Add login/register pages
2. Store JWT in `localStorage`
3. Add `Authorization: Bearer <token>` header in `client.js`

---

## 📤 CSV Export (Optional Bonus)

Add to `transactions.py` router:

```python
from fastapi.responses import StreamingResponse
import csv, io

@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    txns = db.query(Transaction).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Amount", "Category", "Account", "Notes"])
    for t in txns:
        writer.writerow([t.date, t.type.value, t.amount, t.category.name, t.account.name, t.notes])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"})
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| `CORS error` | Set `allow_origins` in `main.py` to your frontend URL |
| `postgres://` URL error | The app auto-converts `postgres://` → `postgresql://` |
| Tables not created | Run `alembic upgrade head` or restart the backend (auto-creates on startup) |
| Categories empty | Backend seeds on first boot — check logs for "✅ Seeded" |
| Vite proxy not working | Ensure backend is on port 8000 and `vite.config.js` proxy is set |

---

## 📄 License

MIT — free to use, modify, and distribute.
