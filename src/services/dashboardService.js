const db = require('../config/db');

async function getDashboardStats(user) {
  if (user.role_key === 'ADMIN') {
    return getAdminStats();
  } else if (user.role_key === 'MANAGER') {
    return getManagerStats(user.id);
  } else {
    return getEmployeeStats(user.id);
  }
}

async function getAdminStats() {
  // 1. Active employee count
  const [empRows] = await db.query(
    `SELECT COUNT(*) AS active_employee_count FROM users WHERE status = 'ACTIVE'`
  );

  // 2. Total project count
  const [projRows] = await db.query(
    `SELECT COUNT(*) AS total_projects,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_projects,
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_projects
     FROM projects`
  );

  // 3. Tasks by status
  const [statusRows] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM tasks
     GROUP BY status`
  );
  const tasksByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    UNDER_REVIEW: 0,
    COMPLETED: 0,
    BLOCKED: 0
  };
  statusRows.forEach(r => {
    tasksByStatus[r.status] = r.count;
  });

  // 4. Overdue task count
  const [overdueRows] = await db.query(
    `SELECT COUNT(*) AS overdue_count
     FROM tasks
     WHERE status != 'COMPLETED' AND due_date IS NOT NULL AND due_date < CURDATE()`
  );

  // 5. Total tasks & completion rate
  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
  const completionRate = totalTasks > 0 ? Math.round((tasksByStatus.COMPLETED / totalTasks) * 100) : 0;

  // 6. Recent tasks
  const [recentTasks] = await db.query(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name, u.name AS assignee_name
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     LEFT JOIN users u ON ta.user_id = u.id
     ORDER BY t.created_at DESC
     LIMIT 5`
  );

  return {
    role: 'ADMIN',
    metrics: {
      activeEmployees: empRows[0].active_employee_count,
      totalProjects: projRows[0].total_projects || 0,
      activeProjects: projRows[0].active_projects || 0,
      completedProjects: projRows[0].completed_projects || 0,
      totalTasks,
      overdueTasks: overdueRows[0].overdue_count,
      completionRate,
      tasksByStatus
    },
    recentTasks
  };
}

async function getManagerStats(managerId) {
  // 1. Manager's project count
  const [projRows] = await db.query(
    `SELECT COUNT(*) AS total_projects,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_projects
     FROM projects
     WHERE manager_id = ?`,
    [managerId]
  );

  // 2. Tasks in manager's projects
  const [statusRows] = await db.query(
    `SELECT t.status, COUNT(*) AS count
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE p.manager_id = ?
     GROUP BY t.status`,
    [managerId]
  );
  const tasksByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    UNDER_REVIEW: 0,
    COMPLETED: 0,
    BLOCKED: 0
  };
  statusRows.forEach(r => {
    tasksByStatus[r.status] = r.count;
  });

  // 3. Overdue tasks in manager's projects
  const [overdueRows] = await db.query(
    `SELECT COUNT(*) AS overdue_count
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE p.manager_id = ? AND t.status != 'COMPLETED' AND t.due_date IS NOT NULL AND t.due_date < CURDATE()`,
    [managerId]
  );

  // 4. Tasks awaiting review
  const awaitingReview = tasksByStatus.UNDER_REVIEW || 0;

  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
  const openTasks = totalTasks - tasksByStatus.COMPLETED;
  const completionRate = totalTasks > 0 ? Math.round((tasksByStatus.COMPLETED / totalTasks) * 100) : 0;

  // 5. Recent tasks
  const [recentTasks] = await db.query(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name, u.name AS assignee_name
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     LEFT JOIN users u ON ta.user_id = u.id
     WHERE p.manager_id = ?
     ORDER BY t.created_at DESC
     LIMIT 5`,
    [managerId]
  );

  return {
    role: 'MANAGER',
    metrics: {
      totalProjects: projRows[0].total_projects || 0,
      activeProjects: projRows[0].active_projects || 0,
      totalTasks,
      openTasks,
      awaitingReview,
      overdueTasks: overdueRows[0].overdue_count,
      completionRate,
      tasksByStatus
    },
    recentTasks
  };
}

async function getEmployeeStats(employeeId) {
  // 1. Assigned tasks by status
  const [statusRows] = await db.query(
    `SELECT t.status, COUNT(*) AS count
     FROM tasks t
     JOIN task_assignees ta ON ta.task_id = t.id
     WHERE ta.user_id = ?
     GROUP BY t.status`,
    [employeeId]
  );
  const tasksByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    UNDER_REVIEW: 0,
    COMPLETED: 0,
    BLOCKED: 0
  };
  statusRows.forEach(r => {
    tasksByStatus[r.status] = r.count;
  });

  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);

  // 2. Overdue tasks
  const [overdueRows] = await db.query(
    `SELECT COUNT(*) AS overdue_count
     FROM tasks t
     JOIN task_assignees ta ON ta.task_id = t.id
     WHERE ta.user_id = ? AND t.status != 'COMPLETED' AND t.due_date IS NOT NULL AND t.due_date < CURDATE()`,
    [employeeId]
  );

  // 3. Due soon tasks (next 3 days)
  const [dueSoonRows] = await db.query(
    `SELECT COUNT(*) AS due_soon_count
     FROM tasks t
     JOIN task_assignees ta ON ta.task_id = t.id
     WHERE ta.user_id = ? AND t.status != 'COMPLETED' AND t.due_date IS NOT NULL
       AND t.due_date >= CURDATE() AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)`,
    [employeeId]
  );

  const completionRate = totalTasks > 0 ? Math.round((tasksByStatus.COMPLETED / totalTasks) * 100) : 0;

  // 4. Employee's assigned tasks
  const [recentTasks] = await db.query(
    `SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     JOIN task_assignees ta ON ta.task_id = t.id
     WHERE ta.user_id = ?
     ORDER BY t.due_date ASC, t.created_at DESC
     LIMIT 5`,
    [employeeId]
  );

  return {
    role: 'EMPLOYEE',
    metrics: {
      totalAssignedTasks: totalTasks,
      inProgressTasks: tasksByStatus.IN_PROGRESS,
      overdueTasks: overdueRows[0].overdue_count,
      dueSoonTasks: dueSoonRows[0].due_soon_count,
      completionRate,
      tasksByStatus
    },
    recentTasks
  };
}

module.exports = {
  getDashboardStats
};
