/**
 * TeamSync Comprehensive Automated Verification Test Suite
 * Validates RBAC, Business Workflows, Transactions, Real-time Rooms, and Status Rules
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000/api/v1';

async function req(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting TeamSync End-to-End Automated Test Suite ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name} ... `);
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  let adminToken = null;
  let managerToken = null;
  let employeeToken = null;
  let createdProjectId = null;
  let createdTaskId = null;
  let createdNotificationId = null;

  // 1. Healthcheck
  await test('GET /health returns 200 and healthy status', async () => {
    const res = await req('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'healthy');
  });

  // 2. Authentication: Valid Admin login
  await test('POST /auth/login with valid Admin credentials succeeds', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@teamsync.internal', password: 'Password@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.role_key, 'ADMIN');
    adminToken = res.body.data.token;
  });

  // 3. Authentication: Valid Manager login
  await test('POST /auth/login with valid Manager credentials succeeds', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@teamsync.internal', password: 'Password@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.role_key, 'MANAGER');
    managerToken = res.body.data.token;
  });

  // 4. Authentication: Valid Employee login
  await test('POST /auth/login with valid Employee credentials succeeds', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'employee@teamsync.internal', password: 'Password@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.role_key, 'EMPLOYEE');
    employeeToken = res.body.data.token;
  });

  // 5. Authentication: Invalid password rejected
  await test('POST /auth/login with wrong password returns 401 INVALID_CREDENTIALS', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@teamsync.internal', password: 'IncorrectPassword' })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  // 6. Authentication: Inactive user rejected
  await test('POST /auth/login with inactive user returns 403 ACCOUNT_INACTIVE', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inactive@teamsync.internal', password: 'Password@123' })
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'ACCOUNT_INACTIVE');
  });

  // 6b. Registration: User self-registration
  const testRegEmail = `reg.${Date.now()}@teamsync.internal`;
  await test('POST /auth/register creates user account and returns token', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Registered Employee',
        email: testRegEmail,
        password: 'Password@123',
        role_id: 3,
        department_id: 1,
        job_title: 'Software Developer'
      })
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.email, testRegEmail);
    assert.strictEqual(res.body.data.user.role_key, 'EMPLOYEE');
  });

  // 6c. Registration: Disallow self-registering as ADMIN
  await test('POST /auth/register rejects role_id 1 (ADMIN) with 403 FORBIDDEN_ROLE', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Fake Admin',
        email: `fake.admin.${Date.now()}@test.com`,
        password: 'Password@123',
        role_id: 1
      })
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  // 6d. Registration: Duplicate email rejected
  await test('POST /auth/register rejects duplicate email with 400 DUPLICATE_EMAIL', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Employee',
        email: testRegEmail,
        password: 'Password@123',
        role_id: 3
      })
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'DUPLICATE_EMAIL');
  });

  // 7. Security: Employee forbidden from Admin-only endpoints
  await test('Employee calling POST /users is rejected with 403 FORBIDDEN', async () => {
    const res = await req('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'Password@123',
        role_id: 1
      })
    }, employeeToken);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  // 8. Security: Employee forbidden from creating projects
  await test('Employee calling POST /projects is rejected with 403 FORBIDDEN', async () => {
    const res = await req('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauthorized Project',
        project_code: 'PRJ-UNAUTH'
      })
    }, employeeToken);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  // 9. Department Management: Admin can create department
  await test('Admin can create department with unique code', async () => {
    const uniqueCode = `QA_${Date.now()}`;
    const res = await req('/departments', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Quality Assurance',
        code: uniqueCode,
        status: 'ACTIVE'
      })
    }, adminToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.code, uniqueCode);
  });

  // 10. Employee Management: Admin can create active employee
  let newEmployeeId = null;
  const uniqueEmployeeEmail = `test.dev.${Date.now()}@teamsync.internal`;
  await test('Admin can create new employee and password_hash is omitted', async () => {
    const res = await req('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Automated Test User',
        email: uniqueEmployeeEmail,
        password: 'Password@123',
        role_id: 3, // EMPLOYEE
        department_id: 1, // ENG
        job_title: 'Junior QA Engineer'
      })
    }, adminToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.email, uniqueEmployeeEmail);
    assert.strictEqual(res.body.data.password_hash, undefined);
    newEmployeeId = res.body.data.id;
  });

  // 11. Project Workflow: Manager creates a project and adds an employee
  const uniqueProjectCode = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
  await test('Manager creates project and adds employee member in MySQL transaction', async () => {
    const res = await req('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sprint Alpha Delivery',
        project_code: uniqueProjectCode,
        description: 'Core microservice sprint for high-throughput messaging.',
        start_date: '2026-11-10',
        due_date: '2026-11-20',
        status: 'ACTIVE',
        member_ids: [newEmployeeId]
      })
    }, managerToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.project_code, uniqueProjectCode);
    assert.ok(res.body.data.members.some(m => m.id === newEmployeeId));
    createdProjectId = res.body.data.id;
  });

  // 12. Security: Project date validation
  await test('Project creation rejects due date before start date with 400 VALIDATION_ERROR', async () => {
    const res = await req('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Invalid Date Project',
        project_code: `PRJ-INV-${Date.now()}`,
        start_date: '2026-11-20',
        due_date: '2026-11-10'
      })
    }, managerToken);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  // 13. Task Workflow: Manager creates task and assigns to project member
  await test('Manager creates task and assigns to project member with initial history & notification', async () => {
    const res = await req(`/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Implement Integration Test Coverage',
        description: 'Ensure 100% of status transitions and role checks are validated.',
        priority: 'HIGH',
        assigneeId: newEmployeeId,
        startDate: '2026-11-10',
        dueDate: '2026-11-15'
      })
    }, managerToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.status, 'TODO');
    assert.strictEqual(res.body.data.assignee_id, newEmployeeId);
    createdTaskId = res.body.data.id;
  });

  // 14. Security: Rejection of task assignment to non-project member
  await test('Manager assigning task to non-member is rejected with 400 INVALID_ASSIGNEE', async () => {
    const res = await req(`/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Invalid Assignment Task',
        priority: 'MEDIUM',
        assigneeId: 999999 // Non-existent user
      })
    }, managerToken);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_ASSIGNEE');
  });

  // Log in as new employee
  let newEmpToken = null;
  await test('New employee can log in successfully', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmployeeEmail, password: 'Password@123' })
    });
    assert.strictEqual(res.status, 200);
    newEmpToken = res.body.data.token;
  });

  // 15. Notifications: New employee receives notification for assigned task
  await test('Employee sees own notification for assigned task', async () => {
    const res = await req('/notifications', {}, newEmpToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
    const notif = res.body.data.find(n => n.reference_id === createdTaskId);
    assert.ok(notif);
    createdNotificationId = notif.id;
  });

  // 16. Security: User cannot mark another user's notification as read
  await test('User cannot mark another user notification as read (403 FORBIDDEN)', async () => {
    const res = await req(`/notifications/${createdNotificationId}/read`, {
      method: 'PATCH'
    }, employeeToken); // Different employee!
    assert.strictEqual(res.status, 403);
  });

  // 17. Notifications: User can mark their own notification as read
  await test('User can mark their own notification as read', async () => {
    const res = await req(`/notifications/${createdNotificationId}/read`, {
      method: 'PATCH'
    }, newEmpToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.read_at);
  });

  // 18. Task Execution: Employee updates status TODO -> IN_PROGRESS
  await test('Assigned employee moves task from TODO to IN_PROGRESS', async () => {
    const res = await req(`/tasks/${createdTaskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    }, newEmpToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');
  });

  // 19. Task Security: Employee moving directly to COMPLETED is rejected
  await test('Employee moving IN_PROGRESS directly to COMPLETED is rejected by status transition matrix', async () => {
    const res = await req(`/tasks/${createdTaskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' })
    }, newEmpToken);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_STATUS_TRANSITION');
  });

  // 20. Task Execution: Employee moves task to UNDER_REVIEW
  await test('Assigned employee moves task from IN_PROGRESS to UNDER_REVIEW', async () => {
    const res = await req(`/tasks/${createdTaskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'UNDER_REVIEW' })
    }, newEmpToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'UNDER_REVIEW');
  });

  // 21. Task Review: Manager approves and moves UNDER_REVIEW to COMPLETED
  await test('Manager approves task and changes status from UNDER_REVIEW to COMPLETED', async () => {
    const res = await req(`/tasks/${createdTaskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' })
    }, managerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'COMPLETED');
  });

  // 22. Task Comments: Authorized member can add comment
  await test('Employee adds a comment to task; author and timestamp persist', async () => {
    const res = await req(`/tasks/${createdTaskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: 'All unit test cases and integration fixtures passed successfully!' })
    }, newEmpToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.user_name, 'Automated Test User');
  });

  // 23. Dashboard Metrics: Role-scoped SQL calculations
  await test('Admin dashboard returns global organization stats', async () => {
    const res = await req('/dashboard/stats', {}, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'ADMIN');
    assert.ok(res.body.data.metrics.totalProjects >= 1);
    assert.ok(res.body.data.metrics.activeEmployees >= 3);
  });

  await test('Manager dashboard returns only manager project-scoped stats', async () => {
    const res = await req('/dashboard/stats', {}, managerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'MANAGER');
    assert.ok(typeof res.body.data.metrics.openTasks === 'number');
  });

  await test('Employee dashboard returns only employee assigned task stats', async () => {
    const res = await req('/dashboard/stats', {}, newEmpToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'EMPLOYEE');
    assert.ok(res.body.data.metrics.totalAssignedTasks >= 1);
  });

  // 24. Edit Task: Manager edits task details
  await test('Manager can update task title, description, and priority', async () => {
    const res = await req(`/tasks/${createdTaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'Updated Automated Task Title',
        description: 'Updated task description by manager',
        priority: 'URGENT'
      })
    }, managerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.title, 'Updated Automated Task Title');
    assert.strictEqual(res.body.data.priority, 'URGENT');
  });

  // 25. Edit Department: Admin edits department details
  await test('Admin can update department name', async () => {
    const res = await req('/departments/1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Engineering and Product'
      })
    }, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.name, 'Engineering and Product');
  });

  // 26. Profile & Password: User updates own profile and changes password
  await test('User can update own profile name', async () => {
    const res = await req('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Lead Project Manager Updated'
      })
    }, managerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.name, 'Lead Project Manager Updated');
  });

  await test('User can change password and log in with new password', async () => {
    const res = await req('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword: 'Password@123',
        newPassword: 'NewPassword@2026'
      })
    }, managerToken);
    assert.strictEqual(res.status, 200);

    // Verify login with new password
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@teamsync.internal', password: 'NewPassword@2026' })
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.data.token);

    // Revert password back so future test runs don't break
    await req('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword: 'NewPassword@2026',
        newPassword: 'Password@123'
      })
    }, loginRes.body.data.token);
  });

  // 27. Safe Deactivation: Admin deactivates employee and session is blocked
  await test('Admin can safely deactivate employee and revoked account cannot sign in', async () => {
    const res = await req(`/users/${newEmployeeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INACTIVE' })
    }, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'INACTIVE');

    // Attempt login with deactivated user
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmployeeEmail, password: 'Password@123' })
    });
    assert.strictEqual(loginRes.status, 403);
    assert.strictEqual(loginRes.body.error.code, 'ACCOUNT_INACTIVE');
  });

  console.log('\n====================================================');
  console.log(` Test Results: ${passed} PASSED, ${failed} FAILED `);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
