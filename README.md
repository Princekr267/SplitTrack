# SplitOrbit 💸 — Shared Expense & Repayment Tracker for Friends

SplitOrbit is a production-grade **PERN-stack** (PostgreSQL, Express, React, Node.js) web application designed to solve shared expense tracking and part-repayments for friend outings and road trips. When one person (the host) pays for group activities, SplitOrbit acts as the single source of truth for who owes how much, who paid what, and whether it was cash or online.

---

## 🌟 Key Features

### 1. Integer Paise Precision (INR ₹)
- **Zero Floating-Point Errors**: All money values are strictly stored and computed as integer paise (`₹1.00 = 100 paise`).
- **Mathematical Invariant**: Every group balance calculation enforces $\sum \text{net} \equiv 0$ with remainders distributed to avoid lost paise.
- **Split Modes**: Equal split with remainder rounding, Exact manual paise split with sum validation, and Percentage basis-points split ($\sum \text{basis points} = 10,000$).

### 2. WhatsApp-Ready Copy & Share Passbooks
- **1-Click WhatsApp Statements**: Formatted short statements or itemized passbook breakdowns ready to paste into WhatsApp chats.
- **Direct `wa.me` Deep Link**: Auto-populates itemized statements directly to the friend's phone number.
- **Level 1 Public Passbook Link (`/s/:token`)**: Read-only, unguessable 32-byte token link. Privacy middleware guarantees friends only see their own splits and repayments—never leaking other members' names, totals, or balances.

### 3. Account Claim Flow & Multi-Group Friend Passbook
- **Level 2 Claim Invite (`/invite/:code`)**: Single-use 7-day invite codes for friends to claim their person profile and link it to their SplitOrbit account.
- **Atomic Race Protection**: Database transaction enforces `WHERE linked_user_id IS NULL`, preventing concurrent claims.
- **Friend Passbook (`/friend`)**: Friends log in to see all groups where they are members, view itemized activity, and submit repayments directly to the host.
- **Repayment Lifecycle**: Repayments submitted by friends start as `pending`. Group hosts review and **Accept** (crediting to the ledger) or **Reject** with a mandatory reason. Friends can edit and resubmit rejected payments.

### 4. Built-in Floating Safe Calculator
- **Zero `eval` / Function constructors**: Built on a pure **Shunting-Yard algorithm** and Reverse Polish Notation (RPN) evaluator with AST token validation.
- **Mobile Bottom-Sheet & Desktop Widget**: Persistent floating calculator accessible on every page.
- **Session History & Split Remainder Calculator**: Computes equal splits and remainder breakdown in paise in real time.

### 5. Group Lifecycle & Settlement Governance
- **Host Person Atomicity**: Every group automatically and atomically creates the host person within the same database transaction. Enforces a PostgreSQL partial unique index (`is_host = true`).
- **Zero-Balance Settle Verification**: Groups can only be locked and settled when all member balances are ₹0.00.
- **Reopen Group**: Host can reopen settled groups if additional shared costs occur.

### 6. Admin Control Center & Immutable Audit Trail
- **System Overview**: Live aggregate metrics of total recorded expenses volume, settled repayments, pending approvals, and active accounts.
- **User Governance**: Searchable user directory with one-click account activation / deactivation switches (preventing self-deactivation).
- **Immutable Audit Trail**: Append-only audit table with database trigger prohibiting UPDATE and DELETE mutations. Captures actor, role, action, entity, IP address, and before/after JSON snapshots.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router 6, Tailwind CSS, Axios (`withCredentials: true`), Lucide Icons |
| **Backend** | Node.js (ES Modules), Express, Helmet, CORS, Rate Limiting, Cookie Parser |
| **Database & ORM** | PostgreSQL (v16), Drizzle ORM (`drizzle-orm/node-postgres`), Drizzle Kit migrations |
| **Authentication** | JWT stored in `httpOnly`, `sameSite: strict` secure cookies, bcrypt password hashing |
| **Validation** | Zod validation schemas for all request bodies, params, and queries |
| **Testing** | Vitest & Supertest running against a live PostgreSQL test database |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14 or higher (or Docker)

### 2. Database Setup via Docker (Optional)
A `docker-compose.yml` is included to spin up isolated development and test PostgreSQL instances:
```bash
docker compose up -d
```
- **Dev Database**: `postgresql://splittrack:splittrack@localhost:5432/splittrack`
- **Test Database**: `postgresql://splittrack:splittrack@localhost:5433/splittrack_test`

### 3. Backend Setup & Seeding
```bash
cd backend
npm install
npm run db:migrate    # Applies Drizzle migrations in backend/drizzle/
npm run seed          # Seeds demo users, groups, expenses, payments & tokens
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

### 5. Run Development Servers
From the root directory:
```bash
npm run dev           # Concurrently launches backend (:5000) and frontend (:5173)
```

Visit **http://localhost:5173** in your browser.

---

## 🔑 Demo Accounts

The database seed provides pre-configured accounts with realistic group expenses and repayments:

| Role | Email | Password | Access & Features |
|---|---|---|---|
| **Admin** | `admin@splitorbit.com` | `adminpassword123` | Admin Control Center (`/admin`), user toggling, audit trail |
| **Host** | `host@splitorbit.com` | `hostpassword123` | "Manali Road Trip" group, pending approvals inbox, settle modal |
| **Friend** | `friend@splitorbit.com` | `friendpassword123` | Friend Passbook (`/friend`), linked profile for Karan Patel |

### Demo Share & Invite Links
- **Public Passbook (Aarav Sharma)**: [http://localhost:5173/s/demo-share-token-aarav](http://localhost:5173/s/demo-share-token-aarav)
- **Claim Invite (Neha Verma)**: [http://localhost:5173/invite/demo-invite-code-neha](http://localhost:5173/invite/demo-invite-code-neha)

---

## 🧪 Automated Test Suite

SplitOrbit includes comprehensive backend test coverage tested directly against real PostgreSQL:

```bash
cd backend
npm test
```

### Test Coverage Highlights (29 Tests across 8 Test Suites):
1. **`split.test.js`**: Equal split rounding, exact sum validation, percentage basis points calculation.
2. **`balance.test.js`**: Invariant $\sum \text{net} \equiv 0$, cash/online payment deduction, pending payment exclusion from balances.
3. **`group.test.js`**: Host person atomic creation in transaction, partial unique index constraint enforcement, settle/reopen state transitions.
4. **`mathParser.test.js`**: Safe Shunting-Yard arithmetic evaluation, operator precedence, invalid syntax handling, zero `eval`.
5. **`privacy.test.js`**: Uniform 404 for invalid/revoked share tokens, strict column projection with zero leakage of group member data to friends.
6. **`claim.test.js`**: Race-free atomic claim profile flow, duplicate prevention, expired token handling.
7. **`payment-flow.test.js`**: End-to-end friend payment submission $\rightarrow$ host rejection $\rightarrow$ friend resubmission $\rightarrow$ host acceptance $\rightarrow$ balance deduction.
8. **`admin.test.js`**: Admin guard enforcement, system volume statistics, user status toggling, and audit log querying.

---

## 📡 API Reference Overview

### Auth (`/api/auth`)
- `POST /register`: Create a new user account
- `POST /login`: Authenticate and issue httpOnly JWT cookie
- `POST /logout`: Clear authentication cookie
- `GET /me`: Get current authenticated user profile

### Groups (`/api/groups`)
- `POST /`: Create group (atomically creates host person)
- `GET /`: List groups created by current user
- `GET /:groupId`: Get group details, people, balances, and summary
- `PATCH /:groupId`: Update group name and description
- `POST /:groupId/settle`: Settle and lock group (requires all balances to be ₹0)
- `POST /:groupId/reopen`: Reopen a settled group

### Expenses (`/api/groups/:groupId/expenses`)
- `POST /`: Add new expense with equal, exact, or percentage splits
- `GET /`: List all group expenses with itemized splits
- `GET /:expenseId`: Get specific expense details
- `PATCH /:expenseId`: Edit expense amount, title, and recalculate splits
- `DELETE /:expenseId`: Soft-delete expense

### Payments (`/api/groups/:groupId/payments`)
- `POST /`: Host records a payment (status: `accepted`)
- `GET /`: List all group payments
- `GET /pending`: List pending payments submitted by friends
- `POST /:paymentId/accept`: Host accepts pending payment
- `POST /:paymentId/reject`: Host rejects pending payment with required reason

### Share & Invite (`/api/s`, `/api/invite`)
- `GET /api/s/:token`: Public read-only passbook statement (strictly scoped to viewing person)
- `GET /api/invite/:code`: Inspect single-use claim invite
- `POST /api/invite/:code/accept`: Claim person profile and link to logged-in user account

### Friend Passbook (`/api/friend`)
- `GET /profiles`: List all claimed profiles across groups with balance summaries
- `POST /payments`: Friend submits repayment to host (status: `pending`)
- `PATCH /payments/:paymentId`: Friend edits and resubmits rejected payment

### Admin (`/api/admin`)
- `GET /stats`: Global system volume and account health metrics
- `GET /users`: Paginated user list with name/email search and role filter
- `PATCH /users/:userId/status`: Activate or deactivate a user account
- `GET /groups`: Platform-wide group registry
- `GET /audit-logs`: Query immutable audit trail logs with before/after diffs

### Server Administration CLI Commands (Backend)
Run these commands inside the `backend/` directory to manage administrative access:
- **Create Admin Account**:
  ```bash
  npm run create-admin
  ```
  Interactively prompts for username, display name, optional email/phone, and password. Creates an administrator with **no recovery codes** (admin accounts cannot be reset via web self-service).
- **Reset Admin Password**:
  ```bash
  npm run reset-admin-password
  ```
  Interactively prompts for admin username and new password. Enforces password security policy, hashes with bcrypt, updates DB, increments `token_version` by 1 to immediately terminate all active sessions, and logs an audit trail row (`actor: CLI`, reason: `server command`). Does not set a user-facing notice banner.

---

## 📄 License
MIT License. Built with ❤️ for friends who go out together.
