# TeamSync — Database Schema & Entity Relationship (ER) Documentation

## MySQL 8.0 Relational Architecture

The database is built on MySQL 8.0 using the **InnoDB** storage engine to support ACID transactions, strict foreign keys, and unique integrity constraints.

### Entity Relationship Diagram

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned_to"
    DEPARTMENTS ||--o{ USERS : "belongs_to"
    USERS ||--o{ PROJECTS : "manages"
    USERS ||--o{ PROJECTS : "created_by"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has_members"
    USERS ||--o{ PROJECT_MEMBERS : "is_member"
    PROJECTS ||--o{ TASKS : "contains"
    USERS ||--o{ TASKS : "created_by"
    TASKS ||--o{ TASK_ASSIGNEES : "assigned_to"
    USERS ||--o{ TASK_ASSIGNEES : "is_assigned"
    TASKS ||--o{ TASK_COMMENTS : "has_comments"
    USERS ||--o{ TASK_COMMENTS : "authored_by"
    TASKS ||--o{ TASK_HISTORY : "tracks_history"
    USERS ||--o{ TASK_HISTORY : "performed_by"
    USERS ||--o{ NOTIFICATIONS : "receives"

    ROLES {
        int id PK
        string role_key UK "ADMIN | MANAGER | EMPLOYEE"
        string role_name
        timestamp created_at
    }

    DEPARTMENTS {
        int id PK
        string name
        string code UK
        enum status "ACTIVE | INACTIVE"
        timestamp created_at
    }

    USERS {
        int id PK
        int department_id FK
        int role_id FK
        string name
        string email UK
        string password_hash
        string job_title
        enum status "ACTIVE | INACTIVE"
        timestamp created_at
        timestamp updated_at
    }

    PROJECTS {
        int id PK
        string project_code UK
        string name
        text description
        int manager_id FK
        enum status "PLANNING | ACTIVE | ON_HOLD | COMPLETED"
        date start_date
        date due_date
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    PROJECT_MEMBERS {
        int id PK
        int project_id FK
        int user_id FK
        timestamp joined_at
    }

    TASKS {
        int id PK
        int project_id FK
        string title
        text description
        enum status "TODO | IN_PROGRESS | UNDER_REVIEW | COMPLETED | BLOCKED"
        enum priority "LOW | MEDIUM | HIGH | URGENT"
        int created_by FK
        date start_date
        date due_date
        timestamp created_at
        timestamp updated_at
    }

    TASK_ASSIGNEES {
        int id PK
        int task_id FK
        int user_id FK
        int assigned_by FK
        timestamp assigned_at
    }

    TASK_COMMENTS {
        int id PK
        int task_id FK
        int user_id FK
        text body
        timestamp created_at
    }

    TASK_HISTORY {
        int id PK
        int task_id FK
        int actor_id FK
        string action
        string old_value
        string new_value
        timestamp created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        string type
        string title
        text body
        string reference_type
        int reference_id
        timestamp read_at
        timestamp created_at
    }
```

### Key Constraints and Indexes

1. **Unique Constraints:**
   - `users.email`
   - `departments.code`
   - `projects.project_code`
   - `project_members(project_id, user_id)`
   - `task_assignees(task_id, user_id)`

2. **Performance Indexes:**
   - `projects(manager_id, status)`
   - `tasks(project_id, status)`
   - `tasks(due_date)`
   - `task_assignees(user_id, task_id)`
   - `notifications(user_id, read_at, created_at)`
   - `task_comments(task_id, created_at)`
   - `task_history(task_id, created_at)`
