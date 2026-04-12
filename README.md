# 💰 Budget Tracker & Planner

A production-ready full-stack personal finance application built with **FastAPI**, **React**, **PostgreSQL**, and **Recharts**. Designed to help users manage their finances, track expenses, set budgets, and achieve financial goals with ease.

---

## ✨ Complete Features Overview

### 📊 Financial Management
- **Dashboard** — Comprehensive financial overview with summary cards showing total balance, income, and expenses. Visualize spending patterns with:
  - 📈 Expense Pie Chart — Category-wise expense breakdown
  - 📊 Monthly Bar Chart — Month-on-month income vs. expenses comparison
  - 📉 30-Day Line Chart — Daily spending trends
  - Recent Transactions — Quick view of latest 5 transactions

- **Transactions** — Full transaction management system:
  - ➕ Create, Edit, Delete transactions (both income and expense)
  - 🔍 Advanced Filtering — Filter by type, account, category, date range
  - 📥 Search Functionality — Quick search through transactions
  - 📤 CSV Export — Export transaction data for analysis
  - 💰 Automatic Account Balance Tracking — Balances update in real-time
  - Date Picker — Easy date selection with validation

- **Accounts** — Multi-account support for comprehensive tracking:
  - Multiple Account Types — Cash, Bank Account, UPI, Credit Card, Wallet, etc.
  - 💾 Individual Balance Tracking — Each account maintains separate balance
  - Transaction Account Association — Link transactions to specific accounts
  - Auto Balance Updates — Balances automatically adjusted on transactions
  - Account Management — Create, edit, and delete accounts as needed

- **Categories** — Fully dynamic category system:
  - 📌 Income Categories — Salary, Bonus, Investment Returns, etc.
  - 📌 Expense Categories — Food, Transport, Utilities, Entertainment, etc.
  - ✏️ Full CRUD Operations — Create, read, update, and delete categories
  - Database-Driven — Categories stored in PostgreSQL for consistency
  - Flexible Organization — Organize transactions by custom categories

### 📅 Planning & Tracking Tools
- **Budget Goals** — Set and monitor budget limits:
  - 🎯 Monthly Budget Setting — Set spending limits per category per month
  - 📊 Budget vs. Actual Tracking — Compare planned vs. actual spending
  - Month-Year Selection — Set budgets for different months
  - Warning Alerts — Get notified when approaching budget limits
  - Visual Budget Progress — See how much of your budget is used

- **Calendar View** — Monthly calendar with financial data:
  - 📆 Daily Transaction Summary — See income/expense for each day
  - Click-to-View Details — Click any date to see transactions for that day
  - Month Navigation — Move between months easily
  - Visual Indicators — Different colors for income vs. expense days

- **Todo/Task Management** — Productivity alongside finances:
  - ✅ Create Todo Lists — Organize tasks by projects or categories
  - 📝 Task Management — Add, complete, and delete individual tasks
  - ✔️ Task Status Tracking — Mark tasks as complete or pending
  - Multiple Lists — Keep separate todo lists for different areas
  - Task Organization — Stay organized with structured task management

### 🔐 Security & Privacy
- **Password Manager** — Secure password storage:
  - 🔒 Encrypted Storage — Passwords encrypted in database
  - Create/Update/Delete — Full CRUD for password entries
  - Password Organization — Store passwords for different services
  - Secure Retrieval — Protected access to stored passwords
  - Safe Deletion — Securely remove old password entries

- **Secure Vault** — File encryption and safe storage:
  - 🔐 File Encryption — Client-side encryption before uploading
  - 📁 File Upload/Download — Upload and retrieve encrypted files
  - 📄 Multiple File Types — Support for documents, images, and more
  - 🗑️ Secure Deletion — Permanently remove files
  - File Management — View, organize, and manage uploaded files
  - Size Tracking — Monitor storage usage of uploaded files

- **Two-Factor Authentication (2FA/MFA)**:
  - 🔐 TOTP Support — Generate TOTP secrets for authentication apps
  - QR Code Generation — Easy setup with authenticator apps
  - 2FA Enable/Disable — Toggle 2FA on and off with OTP verification
  - Enhanced Security — Additional protection for user accounts
  - Standard Protocol — Compatible with Google Authenticator, Microsoft Authenticator, etc.

### 🤖 AI-Powered Features
- **AI Chatbot** — Intelligent financial assistant:
  - 💬 Real-Time Conversations — Chat with AI for financial advice
  - Google Generative AI Integration — Powered by Google's Gemini API
  - Financial Guidance — Get suggestions for budgeting and savings
  - 24/7 Availability — Access AI assistant anytime
  - Context-Aware Responses — Intelligent financial recommendations
  - Markdown Support — Formatted responses for better readability

### 👤 User Account Management
- **User Profile Management**:
  - 👥 Profile Updates — Update name and personal information
  - 📧 Email Management — Change email address securely
  - 🔑 Password Management — Change password with validation
  - Account Information — View current account details

- **Authentication**:
  - 🔐 Secure Registration — Create new accounts with email verification
  - Login System — Username/email and password authentication
  - JWT Tokens — Secure token-based authentication
  - Password Hashing — bcrypt for secure password storage
  - Session Management — Maintain user sessions

### ⚙️ Settings & Customization
- **Settings Dashboard**:
  - 🎨 Theme Preferences — Dark/Light mode toggle
  - Personalization — Customize user experience
  - Account Preferences — Manage notification and security settings

### 📱 Technical Features
- **Responsive Design** — Mobile-first architecture:
  - 📱 Mobile Optimized — Perfect on phones, tablets, and desktops
  - Adaptive Layouts — UI adjusts to screen size
  - Touch-Friendly — Easy navigation on mobile devices
  - PWA Ready — Progressive Web App capabilities

- **Currency Support**:
  - 💵 Indian Rupee Default — Pre-configured for INR (₹)
  - Multi-Currency Expansion — Designed for future currency support
  - Currency Formatting — Proper formatting for financial data

- **Data Export**:
  - 📊 CSV Export — Export transactions in CSV format
  - Excel Compatible — Open exported data in Excel or sheets
  - Bulk Data Download — Export multiple transactions at once

- **Real-Time Updates**:
  - Auto-Refresh — Data updates automatically
  - Instant Calculations — Balance and summaries calculate in real-time
  - Live Charts — Charts update as new data is added

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | Fast, modern UI with hot module replacement |
| Styling | Tailwind CSS | Utility-first responsive design |
| Charts | Recharts | Beautiful data visualizations |
| Routing | React Router v6 | Client-side navigation |
| HTTP Client | Axios | API communication with interceptors |
| State Management | React Context | User authentication & app state |
| Backend | Python 3.12 | Modern, readable server-side code |
| Framework | FastAPI | High-performance async API with auto-docs |
| ORM | SQLAlchemy 2.0 | Database abstraction and query building |
| Database | PostgreSQL | Reliable relational database |
| Auth | JWT + bcrypt | Secure token & password authentication |
| 2FA | PyOTP | Time-based one-time passwords |
| AI | Google Generative AI | Intelligent financial chatbot |
| Encryption | CryptoJS | Client-side file encryption for vault |
| Deployment | Vercel (Frontend) | Serverless frontend hosting |
| Deployment | Render (Backend) | Container-based backend hosting |
| Database Hosting | Neon / Supabase | PostgreSQL in the cloud |

---

## 🎯 Feature Roadmap

### ✅ Completed
- ✅ Multi-account transaction tracking
- ✅ Dynamic category management
- ✅ Budget goals with progress tracking
- ✅ Data visualization with charts
- ✅ Calendar view for daily tracking
- ✅ 2FA/MFA authentication
- ✅ Password manager with encryption
- ✅ Secure file vault with encryption
- ✅ AI-powered financial chatbot
- ✅ CSV export functionality
- ✅ Responsive mobile design
- ✅ Dark/Light theme support

### 🔄 Planned Enhancements
- 📱 Mobile app (React Native)
- 📧 Email notifications & alerts
- 💳 Bank integration (Open Banking APIs)
- 📊 Advanced analytics & reports
- 🎯 Savings goals tracking
- 👥 Family account sharing
- 💱 Real-time currency conversion
- 📈 Investment portfolio tracking
- 🎯 Spending predictions with ML
- 📱 Offline mode with sync

---

## 🔐 Security Features

The application implements multiple layers of security:

### Authentication & Authorization
- **JWT-based Authentication** — Stateless, secure token-based auth
- **Password Security** — Passwords hashed with bcrypt, never stored in plain text
- **Email Verification** — Secure registration with email verification
- **Session Management** — Automatic token expiration and refresh

### Data Protection
- **HTTPS in Production** — All data encrypted in transit
- **Two-Factor Authentication (2FA)** — TOTP-based MFA for additional security
- **Client-Side Encryption** — Files encrypted before uploading to vault
- **Database-Level Encryption** — Passwords stored encrypted
- **CORS Protection** — Defense against cross-origin attacks
- **SQL Injection Prevention** — SQLAlchemy ORM prevents SQL injection

### Privacy
- **User-Specific Data** — Each user only sees their own data
- **No Third-Party Tracking** — No ads or trackers
- **Data Isolation** — Transactions, accounts, and files isolated by user

---

## 👨‍💼 User Account Structure

### Registration & Login
1. **Register** — Create account with email and password
2. **Login** — Enter credentials to get JWT token
3. **Token Storage** — Frontend stores JWT in localStorage
4. **Authenticated Requests** — All API calls include JWT in Authorization header

### 2FA Setup
1. Generate TOTP secret in settings
2. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
3. Confirm by entering 6-digit code
4. 2FA now required on login

### Profile Management
- Update name and basic profile info
- Change email address securely
- Change password with validation
- Enable/disable 2FA
- View account creation date

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

---

## 💡 Usage Examples

### 1. Creating a Transaction

**Frontend:**
```javascript
import { transactionsApi } from '../../api/client'

const addTransaction = async () => {
  try {
    const newTxn = await transactionsApi.create({
      date: "2024-04-12",
      type: "expense",           // or "income"
      amount: 500,
      category_id: 5,
      account_id: 1,
      notes: "Lunch with client"
    })
    console.log("Transaction created:", newTxn)
  } catch (error) {
    console.error("Error:", error)
  }
}
```

### 2. Filtering Transactions

**Frontend:**
```javascript
// Get transactions for a date range
const txns = await transactionsApi.getAll({
  type: "expense",
  account_id: 1,
  start_date: "2024-04-01T00:00:00Z",
  end_date: "2024-04-30T23:59:59Z",
  limit: 50
})
```

### 3. Setting Budget Goals

**Frontend:**
```javascript
import { budgetsApi } from '../../api/client'

const setBudget = async () => {
  const budget = await budgetsApi.set({
    month_year: "2024-04",
    category_id: 3,
    limit: 5000
  })
  console.log("Budget set:", budget)
}
```

### 4. Uploading to Secure Vault

**Frontend:**
```javascript
import CryptoJS from 'crypto-js'
import { vaultApi } from '../../api/client'

const uploadSecureFile = async (file) => {
  // Read file as base64
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target.result
    
    // Encrypt with user's password
    const password = "user-vault-password"
    const encrypted = CryptoJS.AES.encrypt(content, password).toString()
    
    // Upload
    const formData = new FormData()
    formData.append('filename', file.name)
    formData.append('mimetype', file.type)
    formData.append('size', file.size)
    formData.append('encrypted_content', encrypted)
    
    const result = await vaultApi.upload(formData)
    console.log("File uploaded:", result)
  }
  reader.readAsArrayBuffer(file)
}
```

### 5. Enabling 2FA

**Frontend:**
```javascript
import { mfaApi } from '../../api/client'

// Step 1: Generate secret
const { secret, uri } = await mfaApi.generate()

// Display QR code (uri contains the QR data)
// User scans with authenticator app

// Step 2: Verify after user enters 6-digit code
const otp_code = "123456"  // From authenticator app
await mfaApi.verify(otp_code)
console.log("2FA enabled!")
```

### 6. Using the AI Chatbot

**Frontend:**
```javascript
import { aiApi } from '../../api/client'

const chat = async (message) => {
  const response = await aiApi.chat({
    message: "How can I reduce my food expenses?",
    conversation_history: []  // Optional
  })
  console.log("AI Response:", response.reply)
}
```

---

## 📚 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:admin@localhost:5432/budget_tracker

# AI (Optional - for chatbot)
GOOGLE_API_KEY=your_google_generative_ai_key

# Security
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOW_ORIGINS=["http://localhost:3000", "https://yourfrontend.com"]
```

### Frontend (.env)
```env
# API URL (leave empty for local dev, Vite will proxy to :8000)
# For production, set to your backend URL
VITE_API_URL=https://your-backend-api.onrender.com

# Optional: Add more vars as needed
VITE_APP_NAME=Budget Tracker
```

---

## 🚀 Performance Optimization

### Frontend Optimizations
- **Lazy Loading** — Routes loaded on-demand with React Router
- **Code Splitting** — Automatic with Vite
- **Image Optimization** — Compressed assets in `/public`
- **Caching** — Browser cache with proper headers
- **PWA** — Progressive Web App for offline support

### Backend Optimizations
- **Async/Await** — FastAPI uses async for concurrent requests
- **Database Indexing** — Indexes on frequently queried columns
- **Query Optimization** — Efficient SQLAlchemy queries
- **Connection Pooling** — Reuses DB connections
- **Caching** — Redis integration possible for future

---

## 📱 Mobile Responsiveness

The application is fully responsive with:
- **Breakpoints** — Tailwind CSS breakpoints (sm, md, lg, xl)
- **Touch-Friendly UI** — Large buttons and easy navigation
- **Mobile Navigation** — Hamburger menu on small screens
- **Responsive Tables** — Charts and tables adapt to screen size
- **PWA Support** — Works offline with service workers

---

## 🔄 Data Synchronization

### Real-Time Updates
- **Dashboard** — Refreshes automatically when transactions change
- **Balances** — Account balances update instantly
- **Charts** — Visual data updates without page reload
- **Recent Transactions** — Shows latest additions immediately

### Background Jobs (Future)
- Email notifications for budget alerts
- Scheduled reports generation
- Automatic account reconciliation
- Monthly budget reset

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

## ❓ Frequently Asked Questions

### Q: How do I change the currency from INR to another currency?
**A:** Currently set to INR by default. To change:
1. Update `helpers.js` currency constant
2. Modify the `Intl.NumberFormat` locale
3. Future versions will support per-account currency

### Q: Can I export all my data?
**A:** Yes! Use the CSV export feature in the Transactions page. This exports all transactions in a spreadsheet-friendly format.

### Q: Is my data safe in the Secure Vault?
**A:** Yes, files are encrypted with AES encryption on the client-side before uploading, and stored securely on the server. Only you can decrypt them.

### Q: How does the 2FA work?
**A:** We use TOTP (Time-based One-Time Password) - the same method used by Google, GitHub, etc. No phone number needed. Scan the QR code with an authenticator app and you're set.

### Q: Can I share my budget with family members?
**A:** Not yet, but it's on the roadmap! Currently, each account is individual. Multi-user support coming soon.

### Q: What if I lose my 2FA device?
**A:** You'll need recovery codes (to be implemented). For now, contact support to reset your 2FA.

### Q: How are passwords stored in the Password Manager?
**A:** Passwords are encrypted in the database. Never stored as plain text. They're decrypted on-demand.

### Q: Can I use this on my phone?
**A:** Yes! The app is fully mobile-responsive and works on phones, tablets, and desktops. A native mobile app is planned.

### Q: How often does the dashboard refresh?
**A:** Automatically when you perform actions. For manual refresh, just reload the page.

### Q: Is there an API I can use programmatically?
**A:** Yes! Full REST API with Swagger docs at `/docs`. All endpoints require JWT authentication.

### Q: Can I run this completely offline?
**A:** Not fully, but the PWA version allows limited offline access. Full offline sync coming later.

### Q: How much data can I store in the Secure Vault?
**A:** Depends on your database/hosting plan. No enforced limit, but recommend keeping files under 50MB each.

### Q: Do you store any analytics or track user behavior?
**A:** No advertising or behavioral tracking. We only collect data necessary for the app to function.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. Fork & Clone
```bash
git clone https://github.com/Gunvanth123/budget_tracker.git
cd budget_tracker
```

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes
- Follow the existing code style
- Add comments for complex logic
- Test thoroughly

### 4. Commit & Push
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 5. Create a Pull Request
Open a PR with:
- Clear description of changes
- Screenshots if UI changes
- Test cases if adding features

### Contribution Guidelines
- **Code Style** — Use Black for Python, Prettier for JS
- **Testing** — Add tests for new features
- **Documentation** — Update README if adding features
- **Commits** — Use conventional commits (feat:, fix:, docs:, etc.)

### Areas We Need Help With
- 🌍 Internationalization (i18n)
- 📱 Mobile app development
- 🎨 UI/UX improvements
- 🧪 Test coverage
- 📚 Documentation
- 🐛 Bug fixes and optimizations

---

## 📊 Project Statistics

- **Frontend** — ~15 React components, 3000+ lines of code
- **Backend** — ~10 FastAPI routers, 2000+ lines of code
- **Database** — 10+ tables with optimized queries
- **Features** — 12+ major features + security layers
- **Test Coverage** — Expanding (contributions welcome!)

---

## 🎓 Tech Stack Deep Dive

### Why These Technologies?

**FastAPI** — Modern Python framework with automatic API docs, type hints, and async support for handling multiple requests efficiently.

**React 18** — Component-based UI with hooks, context API, and great ecosystem. Fast and developer-friendly.

**PostgreSQL** — Reliable, open-source SQL database with excellent performance and ACID compliance.

**Tailwind CSS** — Utility-first CSS for rapid UI development with a consistent design system.

**Recharts** — React charting library built on D3, easy to integrate and customize.

**SQLAlchemy** — Powerful ORM for database abstraction, migrations, and query building.

---

## 📞 Support & Feedback

### Getting Help
1. **Check the FAQ** — Most common questions answered above
2. **Read the Code** — Documentation in code comments
3. **Check Issues** — Search existing GitHub issues
4. **Create an Issue** — For bugs and feature requests
5. **Discussions** — Ask questions in GitHub Discussions

### Report a Bug
When reporting a bug, include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if helpful
- Your environment (OS, browser, Node/Python versions)

### Feature Requests
1. Check if it's already planned (see roadmap above)
2. Describe the use case clearly
3. Explain why it would be valuable
4. Suggest implementation approach if possible

---

## 📜 License

MIT License — see LICENSE file for details.

This project is open source and available for anyone to use, modify, and distribute.

---

## 🙌 Acknowledgments

- **FastAPI** — For the amazing Python framework
- **React Team** — For the powerful UI library
- **PostgreSQL** — For reliable database
- **Open Source Community** — For all the libraries and tools
- **Contributors** — Thanks for making this project better!

---

## 🔗 Quick Links

- **Live Demo** — https://budget-tracker-frontend.vercel.app (when deployed)
- **API Docs** — https://budget-tracker-api.onrender.com/docs (when deployed)
- **GitHub Repository** — https://github.com/Gunvanth123/budget_tracker
- **Issues & Feature Requests** — Create a GitHub issue
- **Discussions** — Ask questions in GitHub Discussions

---

## 📈 Next Steps

1. **Clone the repo** — Get the code locally
2. **Follow Quick Start** — Set up development environment
3. **Explore Features** — Try all the features
4. **Customize** — Modify to suit your needs
5. **Deploy** — Get it live on the internet
6. **Contribute** — Improve the project

Happy budgeting! 💰

---

**Last Updated:** April 2024  
**Maintained By:** Guna Vanth  
**Repository:** github.com/Gunvanth123/budget_tracker
