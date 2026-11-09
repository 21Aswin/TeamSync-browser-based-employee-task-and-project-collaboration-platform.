# TeamSync — Full-Stack Employee Task & Project Collaboration Platform

> **3-Day MVP Implementation**  
> **Visual Reference:** Google Stitch Project ID `9128582191813571979` (*Warm Sand Precision* design system).  
> **Repository:** `https://github.com/21Aswin/TeamSync-browser-based-employee-task-and-project-collaboration-platform..git`

---

## 1. Executive Summary

TeamSync is a browser-based employee task and project collaboration platform engineered with:
- **Frontend:** Pure HTML5, CSS3, PHP, and Vanilla JavaScript (Fetch API, zero heavy frameworks, served directly via Node.js Express with live PHP execution engine).
- **Backend:** Node.js with structured layers (Routes, Controllers, Services, Repositories).
- **Database:** MySQL 8.0 (Strict InnoDB, Foreign Keys, Unique Constraints, Parameterized Queries, and Transactions).
- **Real-time:** Socket.IO with authenticated connections and server-side authorized rooms.
- **Security:** JWT authentication, bcrypt password hashing, login rate limiting, and server-side RBAC.

### Stitch Design Theme Adherence:
- **Canvas / Background:** `#F6F3EC` (Warm Sand)
- **Secondary Surfaces & Sidebar:** `#EEE9DF`
- **Cards & Modals:** `#FFFEFA` (Crisp Warm Off-White)
- **Hairline Borders:** `1px solid #E5DED2`
- **Main Heading & Typography:** `#202A35` with Inter font
- **Brand Primary Accent:** `#0E7490` (Deep Cyan Teal)
- **Semantic Badges:** Accessible Green, Amber, Red, and Slate status chips.

---

## 2. Prerequisites

- **Node.js:** v18.0.0 or higher (Tested on Node v22.23.0)
- **MySQL:** 8.0 or higher with InnoDB support running locally on port 3306

---

## 3. Quick Start & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/21Aswin/TeamSync-browser-based-employee-task-and-project-collaboration-platform..git
cd TeamSync-browser-based-employee-task-and-project-collaboration-platform
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your local MySQL credentials:
```bash
cp .env.example .env
```

Default `.env` configuration:
```ini
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=teamsync_db
JWT_SECRET=teamsync_super_secret_jwt_key_2026_secured_32chars
JWT_EXPIRES_IN=24h
```

### 3. Migrate and Seed Database
Run the migration script to create all MySQL tables, constraints, and indexes:
```bash
npm run migrate
```
Run the seed script to populate roles, departments, projects, tasks, and demo users:
```bash
npm run seed
```

### 4. Start the Application Server
```bash
npm start
```
Open your browser to: **`http://localhost:3000`**

---

## 4. Default Demo Accounts

All demo accounts use the default password: **`Password@123`**

| Role | Email | Name | Department | Permissions / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@teamsync.internal` | Sarah Connor | Operations | Full organization access, employee CRUD, department CRUD, all projects & tasks, org-wide metrics. |
| **MANAGER** | `manager@teamsync.internal` | Alex Morgan | Engineering | Create & manage assigned projects, add team members, create and assign tasks, approve reviews. |
| **EMPLOYEE** | `employee@teamsync.internal` | David Chen | Engineering | View assigned projects & tasks, move status (To Do → In Progress → Under Review), post comments. |
| **EMPLOYEE** | `priya@teamsync.internal` | Priya Patel | Product Design | View assigned projects, update tasks, collaborate. |
| **INACTIVE** | `inactive@teamsync.internal` | Marcus Bell | Operations | Deactivated account; login is rejected with `ACCOUNT_INACTIVE`. |

*(Note: On the login screen, quick 1-click buttons are provided to autofill each demo role for swift demonstration).*

---

## 5. End-to-End Demo Script (10–15 Minutes Walkthrough)

To demonstrate the full business workflow across two browser sessions:

1. **Step 1 — Admin Setup:**
   - Log in as `admin@teamsync.internal` (`Password@123`).
   - Navigate to **Departments** and click **"Add Department"** (e.g. `Quality Assurance` / `QA`).
   - Navigate to **Employees** and click **"Add Employee"** to create a new team member.

2. **Step 2 — Manager Project & Task Setup:**
   - Open a separate browser window (or Incognito mode) and log in as `manager@teamsync.internal`.
   - Go to **Projects** → **"New Project"**, name it `Sprint Alpha Delivery` (`PRJ-ALPHA`), and select your employee as a member.
   - Click into the project and click **"Add Task"**: assign a task to `David Chen` (e.g. `Build API Endpoints`).

3. **Step 3 — Real-Time Multi-Session Interaction:**
   - Position the **Manager** window and **Employee** (`employee@teamsync.internal`) window side by side.
   - In Employee's window:
     - Notice the notification bell badge increments in real time!
     - Open **Task Board (Kanban)**.
     - Drag the assigned task card from **"To Do"** to **"In Progress"**.
   - Notice in the Manager's window: **The card updates immediately without page reload via Socket.IO!**

4. **Step 4 — Status Transition Rules & Manager Review:**
   - As Employee, try dragging the card directly to **"Completed"** → Rejected by centralized backend transition matrix.
   - As Employee, move the card to **"Under Review"** and post a comment: *"Work completed, ready for QA review."*
   - In Manager's window: The task card appears in **"Under Review"**. The manager opens the task and clicks **"Completed"**.

5. **Step 5 — Role-Scoped Dashboard:**
   - Check the **Dashboard** in each account:
     - Admin sees global organization counts across all projects and departments.
     - Manager sees only their managed project metrics and open tasks.
     - Employee sees only their assigned workload, due-soon tasks, and personal completion rate.

---

## 6. Automated Testing & Verification

Run the comprehensive test suite verifying RBAC, transactions, boundary checks, and real-time socket events:
```bash
npm test
```

### Test Suite Summary:
- **`tests/run-all-tests.js`**: 27 positive and negative test cases verifying:
  - Valid login for all roles.
  - Invalid password rejected (`401 INVALID_CREDENTIALS`).
  - Inactive account rejected (`403 ACCOUNT_INACTIVE`).
  - Employee unauthorized endpoints rejected with `403 FORBIDDEN`.
  - Date validations (due date cannot precede start date).
  - MySQL transaction consistency on project/task creation.
  - Rejection of task assignment to non-project members.
  - Centralized task status transition validation.
  - Task comments and audit history persistence.
  - Own-only notification viewing and marking read.
  - Safe deactivation of employee accounts.
  - Role-scoped SQL dashboard calculations.
- **`tests/verify-realtime-sessions.js`**:
  - Live simultaneous connection between Manager and Employee sockets.
  - Project room joining with server-side authorization check.
  - Real-time `task:status_changed` event reception without browser refresh.

---

## 7. Project Architecture

```
teamsync/
├── .env.example              # Environment variables template
├── .gitignore                # Protects secrets and node_modules
├── package.json              # Dependencies and scripts
├── server.js                 # HTTP Server & Socket.IO initialization
├── src/
│   ├── app.js                # Express app setup & API routing
│   ├── config/
│   │   └── db.js             # MySQL 8 connection pool
│   ├── database/
│   │   ├── schema.sql        # MySQL DDL with InnoDB, Foreign Keys, Indexes
│   │   ├── migrate.js        # Migration execution script
│   │   └── seed.js           # Demo data seed script
│   ├── middleware/
│   │   └── auth.js           # JWT verification, role check, rate limiting
│   ├── controllers/          # Thin request/response handlers
│   ├── services/             # Business rules & database transactions
│   ├── realtime/
│   │   └── socket.js         # Authenticated Socket.IO & authorized rooms
│   └── utils/
│       ├── response.js       # Standardized JSON response formatting
│       └── statusRules.js    # Centralized status transition rules
├── public/                   # Frontend served by Node.js with PHP support
│   ├── index.php             # Main workspace PHP entrypoint
│   ├── register.php          # Dedicated Registration Page in PHP
│   ├── login.php             # Dedicated Login Page in PHP
│   ├── includes/             # PHP partials (header.php, footer.php)
│   ├── css/
│   │   └── style.css         # Stitch Warm Sand Precision CSS tokens
│   └── js/
│       ├── api.js            # Fetch API REST client
│       ├── socket.js         # Socket.IO client handler
│       └── app.js            # Vanilla JavaScript SPA controllers
├── tests/
│   ├── run-all-tests.js      # 27 automated API & RBAC tests
│   └── verify-realtime-sessions.js # Multi-session live sync test
└── docs/
    ├── api.md                # Complete REST API specification
    ├── er-diagram.md         # Database ER diagram & schema notes
    └── realtime-socket.md    # Socket.IO event architecture
```

---

## 8. Deferred Features (MVP Strict Scope Control)

As specified in the project scope, the following optional capabilities have been deliberately deferred:
- Project group chat.
- File attachments.
- CSV / Excel export.
- Advanced employee ranking and productivity scoring.
- Subtasks, recurring tasks, and dependency graph.
- Push notifications / native mobile apps.
