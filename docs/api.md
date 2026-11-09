# TeamSync REST API Specification

Version: `v1`  
Base URL: `/api/v1`

---

## Authentication & Authorization

All protected routes require an HTTP header:
`Authorization: Bearer <jwt_token>`  
Or an HTTP-only secure cookie named `token`.

### Standard Response Format
- **Success:**
```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, ... }
}
```

- **Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error description",
    "details": []
  }
}
```

---

## Endpoints

### 1. Authentication

#### `POST /auth/login` (Public, Rate-Limited)
- **Body:**
```json
{ "email": "admin@teamsync.internal", "password": "Password@123" }
```
- **Success (200):**
```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "name": "Sarah Connor",
      "email": "admin@teamsync.internal",
      "role_key": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```
- **Errors:** `401 INVALID_CREDENTIALS`, `403 ACCOUNT_INACTIVE`, `429 TOO_MANY_REQUESTS`.

#### `POST /auth/logout` (Authenticated)
- Clears session cookies and invalidates client session state.

#### `GET /auth/me` (Authenticated)
- Returns authenticated caller's identity and permissions.

---

### 2. Departments

#### `GET /departments` (Authenticated)
- Returns list of active departments with active employee count.

#### `POST /departments` (ADMIN Only)
- **Body:** `{ "name": "Quality Assurance", "code": "QA" }`
- **Errors:** `400 DUPLICATE_CODE`, `403 FORBIDDEN`.

---

### 3. Users / Employees

#### `GET /users` (Authenticated, Scoped)
- **Query Params:** `role`, `departmentId`, `status`, `search`, `page`, `limit`.

#### `POST /users` (ADMIN Only)
- **Body:**
```json
{
  "name": "Alex Mercer",
  "email": "alex.m@teamsync.internal",
  "password": "Password@123",
  "role_id": 3,
  "department_id": 1,
  "job_title": "Backend Engineer"
}
```

#### `PATCH /users/:id` (ADMIN Only)
- Edit role, department, job title, or status (`ACTIVE` / `INACTIVE`).

---

### 4. Projects

#### `GET /projects` (Authenticated, Scoped)
- ADMIN sees all; MANAGER / EMPLOYEE sees projects where they are manager or member.
- **Query Params:** `search`, `status`, `page`, `limit`.

#### `POST /projects` (ADMIN / MANAGER)
- **Body:**
```json
{
  "name": "Cloud Native Kubernetes Migration",
  "project_code": "PRJ-K8S",
  "description": "Cluster migration to multi-region setup.",
  "start_date": "2026-11-10",
  "due_date": "2026-11-30",
  "member_ids": [2, 3]
}
```

#### `GET /projects/:id` (Admin or Project Member)
- Returns project metadata, manager details, and members list.

#### `PATCH /projects/:id` (Admin or Assigned Manager)
- Update title, description, dates, or status (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`).

#### `POST /projects/:id/members` (Admin or Assigned Manager)
- **Body:** `{ "userId": 4 }`

#### `DELETE /projects/:id/members/:userId` (Admin or Assigned Manager)
- Removes member from project.

---

### 5. Tasks

#### `GET /tasks` (Authenticated, Scoped)
- **Query Params:** `projectId`, `status`, `priority`, `assigneeId`, `assignedToMe`, `search`, `page`, `limit`, `sortBy`, `sortOrder`.

#### `POST /projects/:id/tasks` (Admin or Assigned Manager)
- **Body:**
```json
{
  "title": "Build user profile endpoint",
  "description": "Implement GET /api/v1/auth/me",
  "priority": "HIGH",
  "assigneeId": 3,
  "startDate": "2026-11-10",
  "dueDate": "2026-11-15"
}
```

#### `GET /tasks/:id` (Authorized Project Member)
- Returns full task details, assigned member, discussion comments, and audit history.

#### `PATCH /tasks/:id/status` (Assignee / Authorized Manager / Admin)
- **Body:** `{ "status": "IN_PROGRESS" }`
- Enforces centralized status rules:
  - `TODO` → `IN_PROGRESS`, `BLOCKED`
  - `IN_PROGRESS` → `UNDER_REVIEW`, `BLOCKED`, `TODO`
  - `UNDER_REVIEW` → `COMPLETED` (Manager/Admin review only!), `IN_PROGRESS`
  - `BLOCKED` → `IN_PROGRESS`
  - `COMPLETED` → `IN_PROGRESS` (Manager/Admin only)

#### `POST /tasks/:id/comments` (Authorized Project Member)
- **Body:** `{ "body": "Unit tests and integration mocks completed." }`

---

### 6. Notifications

#### `GET /notifications` (Authenticated, Own Only)
- **Query Params:** `unreadOnly=true`, `page`, `limit`.

#### `PATCH /notifications/:id/read` (Notification Owner Only)
- Marks notification read.

#### `POST /notifications/read-all` (Authenticated)
- Marks all unread notifications read for the current user.

---

### 7. Dashboard

#### `GET /dashboard/stats` (Authenticated, Role-Scoped)
- Returns live database aggregated metrics calculated strictly according to caller role.
