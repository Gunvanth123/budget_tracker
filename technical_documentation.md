# Technical Documentation: Budget Tracker Pro

Budget Tracker Pro is a sophisticated, privacy-focused financial management application designed to provide users with a secure and intuitive way to track their expenses, manage budgets, and store sensitive documents.

## 1. Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS with a custom design system (CSS variables for theming, dark/light modes).
- **Icons**: Lucide React
- **Charts**: Recharts / Chart.js (implied by dashboard components)
- **State Management**: React Context API (AuthContext)
- **Navigation**: React Router DOM
- **Encryption**: CryptoJS (for local file/password encryption)
- **Utilities**: Axios (API Client), React Hot Toast (Notifications)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLAlchemy ORM (supports SQLite for local/dev, PostgreSQL for production)
- **Authentication**: JWT (JSON Web Tokens) with OAuth2 password flow.
- **Security**: Passlib (BCrypt for password hashing), PyOTP (MFA/TOTP).
- **Integrations**: 
  - **Google Drive API**: For secure cloud storage of encrypted files.
  - **Google Gemini AI**: For the AI Financial Advisor.

---

## 2. System Architecture

The application follows a standard Client-Server architecture:

1.  **Client (Frontend)**: Handles user interaction, local encryption of sensitive data, and rendering of financial analytics.
2.  **Server (Backend)**: Provides a RESTful API for data persistence, authentication, and integration with third-party services (Google).
3.  **Storage**:
    *   **Database**: Stores user profiles, accounts, categories, transactions, and metadata for vault files.
    *   **Google Drive**: (Optional) Stores the actual encrypted file blobs if the user connects their account.

---

## 3. Core Features & Flows

### A. Authentication & Security
- **Registration/Login**: Standard flow with JWT issuance.
- **Multi-Factor Authentication (MFA)**: Users can enable TOTP (Google Authenticator). The login flow detects if MFA is required and prompts for a 6-digit code.
- **Master Password**: Used for the Secure Vault and Password Manager to ensure end-to-end encryption. This password is never stored on the server.

### B. Financial Management
- **Accounts**: Users can create multiple accounts (Bank, Cash, Wallet, etc.) with different currencies.
- **Categories**: Custom categories for income and expenses with color-coding.
- **Transactions**: Recording of financial movements. The dashboard provides real-time updates of balances and trends.
- **Budgeting**: Users set monthly limits per category. The system tracks spending against these limits.

### C. AI Financial Advisor
- **Context-Aware**: The assistant has access to the user's current financial state (summarized) to provide tailored advice.
- **Actionable**: The AI can recognize intents (e.g., "Add a 500 rupee expense for groceries") and automatically trigger transaction creation through a structured `[ACTION]` protocol.

### D. Secure Vault
- **Local Encryption**: Files are encrypted in the browser using AES-256 (CryptoJS) before being sent to the server.
- **Storage Flexibility**: Files can be stored in the local database (as blobs) or synced to a dedicated folder in the user's Google Drive.
- **Preview & Recovery**: Encrypted files can be decrypted and previewed/downloaded only when the user provides their Master Password.

---

## 4. Feature Flow: Secure Vault Upload

1.  **User Action**: User selects files in the `VaultUploadModal`.
2.  **Local Processing**: 
    - The browser reads the file as an `ArrayBuffer`.
    - The file is encrypted using `CryptoJS.AES.encrypt` with the user's **Master Password**.
3.  **API Call**: The encrypted string is sent to the backend `/vault/upload` endpoint along with metadata (filename, mimetype, size).
4.  **Backend Processing**:
    - If Google Drive is linked: The backend uploads the encrypted blob to the "Elite Privacy Vault" folder on GDrive.
    - If not linked: The blob is stored in the `secure_files` database table.
5.  **Completion**: The file metadata is saved in the database, and the UI is refreshed.

---

## 5. Security Protocols

- **E2EE (End-to-End Encryption)**: Sensitive files and password entries are encrypted on the client side. The server only ever sees the encrypted ciphertext.
- **Session Management**: Secure JWTs stored in the browser (local storage or cookies) with expiration.
- **Zero-Knowledge Architecture**: For the Vault, the server has "zero knowledge" of the content of the files, as it lacks the decryption key (Master Password).

---

## 6. Maintenance & Scalability

- **Database Migrations**: Handled by Alembic in the backend.
- **Theme System**: Fully controlled via CSS variables in `index.css`, allowing for easy UI updates and brand consistency.
- **Modular Components**: React components are decoupled, making it easy to add new financial tools (e.g., Investment trackers) in the future.
