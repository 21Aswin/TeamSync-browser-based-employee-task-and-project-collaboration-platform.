const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  console.log('[SEED] Starting database seeding...');
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Seed Roles
    console.log('[SEED] Seeding roles...');
    const roles = [
      ['ADMIN', 'Administrator'],
      ['MANAGER', 'Project Manager'],
      ['EMPLOYEE', 'Employee']
    ];
    for (const [key, name] of roles) {
      await conn.query(
        `INSERT INTO roles (role_key, role_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`,
        [key, name]
      );
    }

    const [roleRows] = await conn.query('SELECT id, role_key FROM roles');
    const roleMap = {};
    roleRows.forEach(r => { roleMap[r.role_key] = r.id; });

    // 2. Seed Departments
    console.log('[SEED] Seeding departments...');
    const departments = [
      ['Engineering', 'ENG', 'ACTIVE'],
      ['Operations', 'OPS', 'ACTIVE'],
      ['Product Design', 'DES', 'ACTIVE'],
      ['Marketing', 'MKT', 'ACTIVE']
    ];
    for (const [name, code, status] of departments) {
      await conn.query(
        `INSERT INTO departments (name, code, status) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)`,
        [name, code, status]
      );
    }

    const [deptRows] = await conn.query('SELECT id, code FROM departments');
    const deptMap = {};
    deptRows.forEach(d => { deptMap[d.code] = d.id; });

    // 3. Seed Users
    console.log('[SEED] Seeding users with bcrypt password...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password@123', salt);

    const demoUsers = [
      {
        name: 'Sarah Connor',
        email: 'admin@teamsync.internal',
        role_id: roleMap['ADMIN'],
        department_id: deptMap['OPS'],
        job_title: 'Platform Administrator',
        status: 'ACTIVE'
      },
      {
        name: 'Alex Morgan',
        email: 'manager@teamsync.internal',
        role_id: roleMap['MANAGER'],
        department_id: deptMap['ENG'],
        job_title: 'Engineering Manager',
        status: 'ACTIVE'
      },
      {
        name: 'David Chen',
        email: 'employee@teamsync.internal',
        role_id: roleMap['EMPLOYEE'],
        department_id: deptMap['ENG'],
        job_title: 'Full Stack Engineer',
        status: 'ACTIVE'
      },
      {
        name: 'Priya Patel',
        email: 'priya@teamsync.internal',
        role_id: roleMap['EMPLOYEE'],
        department_id: deptMap['DES'],
        job_title: 'Product Designer',
        status: 'ACTIVE'
      },
      {
        name: 'Marcus Bell',
        email: 'inactive@teamsync.internal',
        role_id: roleMap['EMPLOYEE'],
        department_id: deptMap['OPS'],
        job_title: 'Former Associate',
        status: 'INACTIVE'
      }
    ];

    for (const u of demoUsers) {
      await conn.query(
        `INSERT INTO users (name, email, password_hash, role_id, department_id, job_title, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           password_hash = VALUES(password_hash),
           role_id = VALUES(role_id),
           department_id = VALUES(department_id),
           job_title = VALUES(job_title),
           status = VALUES(status)`,
        [u.name, u.email, passwordHash, u.role_id, u.department_id, u.job_title, u.status]
      );
    }

    const [userRows] = await conn.query('SELECT id, email FROM users');
    const userMap = {};
    userRows.forEach(u => { userMap[u.email] = u.id; });

    const adminId = userMap['admin@teamsync.internal'];
    const managerId = userMap['manager@teamsync.internal'];
    const employeeId = userMap['employee@teamsync.internal'];
    const priyaId = userMap['priya@teamsync.internal'];

    // 4. Seed Projects
    console.log('[SEED] Seeding sample projects...');
    const projects = [
      {
        code: 'PRJ-NEBULA',
        name: 'Nebula Core Cloud Migration',
        description: 'Transition internal infrastructure and microservices to scalable container architecture with high-availability replication.',
        manager_id: managerId,
        created_by: adminId,
        status: 'ACTIVE',
        start_date: '2026-11-01',
        due_date: '2026-11-30'
      },
      {
        code: 'PRJ-PORTAL',
        name: 'Client Self-Service Portal 2.0',
        description: 'Redesign client reporting interface using Stitch Warm Sand Precision visual system and real-time event sync.',
        manager_id: managerId,
        created_by: managerId,
        status: 'ACTIVE',
        start_date: '2026-11-05',
        due_date: '2026-12-15'
      }
    ];

    for (const p of projects) {
      await conn.query(
        `INSERT INTO projects (project_code, name, description, manager_id, created_by, status, start_date, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           status = VALUES(status),
           start_date = VALUES(start_date),
           due_date = VALUES(due_date)`,
        [p.code, p.name, p.description, p.manager_id, p.created_by, p.status, p.start_date, p.due_date]
      );
    }

    const [projRows] = await conn.query('SELECT id, project_code FROM projects');
    const projMap = {};
    projRows.forEach(p => { projMap[p.project_code] = p.id; });

    const nebulaId = projMap['PRJ-NEBULA'];
    const portalId = projMap['PRJ-PORTAL'];

    // 5. Seed Project Members
    console.log('[SEED] Seeding project members...');
    const members = [
      [nebulaId, managerId],
      [nebulaId, employeeId],
      [nebulaId, priyaId],
      [portalId, managerId],
      [portalId, employeeId]
    ];
    for (const [pId, uId] of members) {
      await conn.query(
        `INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)`,
        [pId, uId]
      );
    }

    // 6. Seed Tasks
    console.log('[SEED] Seeding tasks...');
    const tasks = [
      {
        project_id: nebulaId,
        title: 'Configure VPC Peering & Security Groups',
        description: 'Set up isolated subnets, ingress routing, and hardened security group rules for database clusters.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        created_by: managerId,
        assignee_id: employeeId,
        start_date: '2026-11-06',
        due_date: '2026-11-15'
      },
      {
        project_id: nebulaId,
        title: 'Implement Database Connection Pooling & Auto-Failover',
        description: 'Standardize MySQL connection pool size and configure read replica routing.',
        status: 'TODO',
        priority: 'MEDIUM',
        created_by: managerId,
        assignee_id: employeeId,
        start_date: '2026-11-08',
        due_date: '2026-11-18'
      },
      {
        project_id: nebulaId,
        title: 'Audit Docker Base Images for CVEs',
        description: 'Scan minimal Alpine and Debian base images for vulnerabilities and update registry digests.',
        status: 'UNDER_REVIEW',
        priority: 'URGENT',
        created_by: managerId,
        assignee_id: priyaId,
        start_date: '2026-11-02',
        due_date: '2026-11-10'
      },
      {
        project_id: portalId,
        title: 'Design Warm Sand Precision Theme Tokens',
        description: 'Implement color tokens (#F6F3EC, #EEE9DF, #0E7490) and responsive grid layout.',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        created_by: managerId,
        assignee_id: priyaId,
        start_date: '2026-11-01',
        due_date: '2026-11-08'
      }
    ];

    for (const t of tasks) {
      const [existing] = await conn.query(
        'SELECT id FROM tasks WHERE project_id = ? AND title = ?',
        [t.project_id, t.title]
      );

      let taskId;
      if (existing.length === 0) {
        const [res] = await conn.query(
          `INSERT INTO tasks (project_id, title, description, status, priority, created_by, start_date, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.project_id, t.title, t.description, t.status, t.priority, t.created_by, t.start_date, t.due_date]
        );
        taskId = res.insertId;

        // Assignee
        await conn.query(
          `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
          [taskId, t.assignee_id, managerId]
        );

        // Initial History
        await conn.query(
          `INSERT INTO task_history (task_id, actor_id, action, old_value, new_value)
           VALUES (?, ?, 'TASK_CREATED', NULL, ?)`,
          [taskId, managerId, t.status]
        );

        // Notification for assignee
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
           VALUES (?, 'TASK_ASSIGNED', 'New task assigned', ?, 'TASK', ?)`,
          [t.assignee_id, `You were assigned task: ${t.title}`, taskId]
        );

        // Comment
        await conn.query(
          `INSERT INTO task_comments (task_id, user_id, body)
           VALUES (?, ?, 'Initial requirement specifications verified. Ready to proceed.')`,
          [taskId, managerId]
        );
      }
    }

    // 7. Seed Welcome Notifications for all seeded accounts (Admin, Manager, Employees)
    console.log('[SEED] Seeding welcome notifications for users...');
    const [allUsers] = await conn.query('SELECT id, name, role_id FROM users');
    for (const u of allUsers) {
      await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
         VALUES (?, 'WELCOME_ALERT', 'Welcome to TeamSync Workspace! 🎉', ?, 'SYSTEM', NULL)`,
        [u.id, `Hello ${u.name}, welcome to your TeamSync collaboration workspace. You can track projects, manage tasks, and stay synced with your team.`]
      );
    }

    await conn.commit();
    console.log('[SEED] Seeding completed successfully!');
    console.log('[SEED] Demo Users created with password: Password@123');
    console.log('       - Admin:    admin@teamsync.internal');
    console.log('       - Manager:  manager@teamsync.internal');
    console.log('       - Employee: employee@teamsync.internal');
    console.log('       - Employee: priya@teamsync.internal');
    console.log('       - Inactive: inactive@teamsync.internal (status INACTIVE)');
  } catch (error) {
    await conn.rollback();
    console.error('[SEED] Error seeding database:', error);
    process.exit(1);
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
