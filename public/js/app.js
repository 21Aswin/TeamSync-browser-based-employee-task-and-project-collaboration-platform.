/**
 * TeamSync Main Single Page Application Logic
 * Pure Vanilla JavaScript (No React / Vue / external framework)
 */

const App = {
  currentUser: null,
  currentRoute: 'dashboard',
  currentProjectId: null,
  currentTaskId: null,

  async init() {
    this.bindEvents();
    const token = API.getToken();
    if (token) {
      try {
        this.currentUser = await API.getMe();
        Realtime.connect();
        this.renderShell();
        this.navigate(window.location.hash.replace('#', '') || 'dashboard');
      } catch (e) {
        this.renderLogin();
      }
    } else {
      this.renderLogin();
    }
  },

  bindEvents() {
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(route);
    });

    window.addEventListener('auth:logout', () => {
      Realtime.disconnect();
      this.renderLogin();
    });

    // Realtime listeners to trigger view re-renders
    window.addEventListener('task:status_changed', (e) => {
      if (this.currentRoute === 'kanban' || this.currentRoute.startsWith('project/')) {
        this.refreshCurrentView();
      }
    });

    window.addEventListener('task:created', () => {
      if (this.currentRoute === 'kanban' || this.currentRoute.startsWith('project/') || this.currentRoute === 'tasks') {
        this.refreshCurrentView();
      }
    });

    window.addEventListener('task:comment_added', (e) => {
      if (this.currentTaskId === e.detail.taskId) {
        this.openTaskDetails(this.currentTaskId);
      }
    });
  },

  navigate(rawRoute) {
    if (!this.currentUser) {
      this.renderLogin();
      return;
    }

    const [route, param] = rawRoute.split('/');
    this.currentRoute = rawRoute;

    // Highlight active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-route') === route);
    });

    const container = document.getElementById('workspace');
    if (!container) return;

    switch (route) {
      case 'dashboard':
        this.renderDashboard(container);
        break;
      case 'projects':
        this.renderProjects(container);
        break;
      case 'project':
        this.renderProjectDetails(container, param);
        break;
      case 'tasks':
      case 'kanban':
        this.renderKanban(container, param);
        break;
      case 'employees':
        if (this.currentUser.role_key === 'ADMIN') {
          this.renderEmployees(container);
        } else {
          this.navigate('dashboard');
        }
        break;
      case 'departments':
        if (this.currentUser.role_key === 'ADMIN') {
          this.renderDepartments(container);
        } else {
          this.navigate('dashboard');
        }
        break;
      default:
        this.renderDashboard(container);
    }
  },

  refreshCurrentView() {
    this.navigate(this.currentRoute);
  },

  /* -------------------------------------------------------------
     SHELL & NAVIGATION RENDERING
     ------------------------------------------------------------- */
  renderShell() {
    const appEl = document.getElementById('app');
    const u = this.currentUser;
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    appEl.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="brand-icon">T</div>
          <span class="brand-title">TeamSync</span>
          <span class="brand-badge">${u.role_key}</span>
        </div>

        <nav class="nav-section">
          <div class="nav-label">Core Workspace</div>
          <div class="nav-item" data-route="dashboard" onclick="location.hash='#dashboard'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </div>
          <div class="nav-item" data-route="projects" onclick="location.hash='#projects'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            Projects
          </div>
          <div class="nav-item" data-route="kanban" onclick="location.hash='#kanban'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
            Task Board
          </div>

          ${u.role_key === 'ADMIN' ? `
            <div class="nav-label">Administration</div>
            <div class="nav-item" data-route="employees" onclick="location.hash='#employees'">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Employees
            </div>
            <div class="nav-item" data-route="departments" onclick="location.hash='#departments'">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              Departments
            </div>
          ` : ''}
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-badge">
            <div class="avatar">${initials}</div>
            <div class="user-meta">
              <div class="name" title="${u.name}">${u.name}</div>
              <span class="role-pill">${u.role_key}</span>
            </div>
            <button class="icon-btn btn-sm" onclick="API.logout()" title="Logout">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>
      </aside>

      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-left">
            <button class="icon-btn" id="mobile-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">
              <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 class="view-title" id="page-title">TeamSync Workspace</h1>
          </div>

          <div class="topbar-right">
            <div class="notif-btn-wrapper">
              <button class="icon-btn" onclick="App.toggleNotifications()" title="Notifications">
                <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span class="notif-badge" id="notif-unread-count" style="display:none;">0</span>
              </button>

              <div class="notif-dropdown" id="notif-dropdown">
                <div class="notif-header">
                  <span>Notifications</span>
                  <button class="btn btn-secondary btn-sm" onclick="App.markAllNotifsRead()">Mark all read</button>
                </div>
                <div class="notif-list" id="notif-list-container">
                  <div style="padding:16px;text-align:center;color:var(--text-muted);">Loading notifications...</div>
                </div>
              </div>
            </div>

            ${u.role_key !== 'EMPLOYEE' ? `
              <button class="btn btn-primary" onclick="App.openCreateTaskModal()">
                <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
                New Task
              </button>
            ` : ''}
          </div>
        </header>

        <main class="workspace-container" id="workspace">
          <!-- Dynamic Views -->
        </main>
      </div>

      <!-- Global Modal Backdrop -->
      <div class="modal-backdrop" id="modal-container" onclick="if(event.target===this) App.closeModal()"></div>
    `;

    this.loadNotificationCount();
  },

  /* -------------------------------------------------------------
     LOGIN VIEW
     ------------------------------------------------------------- */
  renderLogin() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background-color:var(--bg-canvas);padding:20px;">
        <div class="card" style="width:100%;max-width:440px;padding:32px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);">
          <div style="text-align:center;margin-bottom:24px;">
            <div class="brand-icon" style="margin:0 auto 12px;width:38px;height:38px;font-size:20px;">T</div>
            <h2 style="font-size:22px;font-weight:700;color:var(--text-main);margin-bottom:4px;">Sign in to TeamSync</h2>
            <p style="font-size:13px;color:var(--text-muted);">Employee task and project collaboration platform</p>
          </div>

          <form id="login-form" onsubmit="App.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Work Email</label>
              <input type="email" id="login-email" class="form-control" placeholder="name@teamsync.internal" required autofocus>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required>
            </div>

            <div id="login-error" style="display:none;padding:10px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:16px;"></div>

            <button type="submit" id="login-submit-btn" class="btn btn-primary" style="width:100%;height:40px;font-size:14px;font-weight:600;">
              Sign In
            </button>
          </form>

          <div style="margin-top:16px;text-align:center;font-size:13px;color:var(--text-muted);">
            Don't have an account? <a href="/register.php" style="font-weight:600;color:var(--primary);">Create an Account</a>
          </div>

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-color);">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px;text-align:center;">
              Quick Demo Accounts (Password: Password@123)
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="App.fillDemo('admin@teamsync.internal')">Admin</button>
              <button class="btn btn-secondary btn-sm" onclick="App.fillDemo('manager@teamsync.internal')">Manager</button>
              <button class="btn btn-secondary btn-sm" onclick="App.fillDemo('employee@teamsync.internal')">Employee</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  fillDemo(email) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = 'Password@123';
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-submit-btn');
    const errBox = document.getElementById('login-error');
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    errBox.style.display = 'none';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.login(email, password);
      this.currentUser = data.user;
      Realtime.connect();
      this.renderShell();
      this.navigate('dashboard');
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err) {
      errBox.textContent = err.message || 'Login failed. Please check your credentials.';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  },

  /* -------------------------------------------------------------
     DASHBOARD VIEW
     ------------------------------------------------------------- */
  async renderDashboard(container) {
    document.getElementById('page-title').textContent = `${this.currentUser.role_name} Dashboard`;
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading live dashboard metrics...</div>`;

    try {
      const stats = await API.getDashboardStats();
      const m = stats.metrics;

      let statCardsHtml = '';
      if (stats.role === 'ADMIN') {
        statCardsHtml = `
          <div class="stat-card">
            <div class="stat-label">Active Employees</div>
            <div class="stat-value">${m.activeEmployees}</div>
            <div class="stat-subtext">Across all departments</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Projects</div>
            <div class="stat-value">${m.totalProjects}</div>
            <div class="stat-subtext">${m.activeProjects} Active / ${m.completedProjects} Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value">${m.totalTasks}</div>
            <div class="stat-subtext">${m.completionRate}% completion rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Overdue Tasks</div>
            <div class="stat-value" style="color:var(--danger-text);">${m.overdueTasks}</div>
            <div class="stat-subtext">Requires immediate escalation</div>
          </div>
        `;
      } else if (stats.role === 'MANAGER') {
        statCardsHtml = `
          <div class="stat-card">
            <div class="stat-label">Managed Projects</div>
            <div class="stat-value">${m.totalProjects}</div>
            <div class="stat-subtext">${m.activeProjects} active project initiatives</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Open Project Tasks</div>
            <div class="stat-value">${m.openTasks}</div>
            <div class="stat-subtext">${m.completionRate}% overall completion rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Awaiting Review</div>
            <div class="stat-value" style="color:var(--info-text);">${m.awaitingReview}</div>
            <div class="stat-subtext">Ready for manager approval</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Overdue Tasks</div>
            <div class="stat-value" style="color:var(--danger-text);">${m.overdueTasks}</div>
            <div class="stat-subtext">Due date has passed</div>
          </div>
        `;
      } else {
        statCardsHtml = `
          <div class="stat-card">
            <div class="stat-label">Assigned Tasks</div>
            <div class="stat-value">${m.totalAssignedTasks}</div>
            <div class="stat-subtext">${m.completionRate}% completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">In Progress</div>
            <div class="stat-value" style="color:var(--warning-text);">${m.inProgressTasks}</div>
            <div class="stat-subtext">Actively being worked on</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Due Soon (3 Days)</div>
            <div class="stat-value" style="color:var(--primary);">${m.dueSoonTasks}</div>
            <div class="stat-subtext">Approaching deadline</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Overdue</div>
            <div class="stat-value" style="color:var(--danger-text);">${m.overdueTasks}</div>
            <div class="stat-subtext">Past due date</div>
          </div>
        `;
      }

      // Status breakdown
      const byStatus = m.tasksByStatus || {};

      container.innerHTML = `
        <div class="stat-grid">${statCardsHtml}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-xl);">
          <div class="card">
            <h3 style="font-size:15px;font-weight:600;margin-bottom:14px;">Task Status Breakdown</h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="badge status-TODO">To Do</span>
                <span style="font-weight:700;">${byStatus.TODO || 0}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="badge status-IN_PROGRESS">In Progress</span>
                <span style="font-weight:700;">${byStatus.IN_PROGRESS || 0}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="badge status-UNDER_REVIEW">Under Review</span>
                <span style="font-weight:700;">${byStatus.UNDER_REVIEW || 0}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="badge status-COMPLETED">Completed</span>
                <span style="font-weight:700;">${byStatus.COMPLETED || 0}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="badge status-BLOCKED">Blocked</span>
                <span style="font-weight:700;">${byStatus.BLOCKED || 0}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:15px;font-weight:600;margin-bottom:14px;">Recent Task Activity</h3>
            ${stats.recentTasks && stats.recentTasks.length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${stats.recentTasks.map(t => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid var(--border-color);cursor:pointer;" onclick="App.openTaskDetails(${t.id})">
                    <div>
                      <div style="font-weight:600;font-size:13px;">${t.title}</div>
                      <div style="font-size:11px;color:var(--text-muted);">${t.project_name} ${t.assignee_name ? '• ' + t.assignee_name : ''}</div>
                    </div>
                    <span class="badge status-${t.status}">${t.status.replace('_', ' ')}</span>
                  </div>
                `).join('')}
              </div>
            ` : '<div style="color:var(--text-muted);font-size:13px;padding:20px;text-align:center;">No recent tasks found.</div>'}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="padding:20px;color:var(--danger-text);">Error loading dashboard: ${err.message}</div>`;
    }
  },

  /* -------------------------------------------------------------
     PROJECTS VIEW
     ------------------------------------------------------------- */
  async renderProjects(container) {
    document.getElementById('page-title').textContent = 'Projects';
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="display:flex;gap:10px;align-items:center;">
          <input type="text" id="project-search-input" class="form-control" style="width:240px;" placeholder="Search projects..." oninput="App.debounceProjectSearch()">
          <select id="project-status-filter" class="form-control" style="width:160px;" onchange="App.filterProjects()">
            <option value="">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        ${this.currentUser.role_key !== 'EMPLOYEE' ? `
          <button class="btn btn-primary" onclick="App.openCreateProjectModal()">
            <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            New Project
          </button>
        ` : ''}
      </div>
      <div id="projects-list-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-md);">
        <div style="padding:40px;text-align:center;color:var(--text-muted);grid-column:1/-1;">Loading projects...</div>
      </div>
    `;

    this.filterProjects();
  },

  debounceProjectTimeout: null,
  debounceProjectSearch() {
    clearTimeout(this.debounceProjectTimeout);
    this.debounceProjectTimeout = setTimeout(() => this.filterProjects(), 300);
  },

  async filterProjects() {
    const grid = document.getElementById('projects-list-grid');
    if (!grid) return;
    const search = document.getElementById('project-search-input')?.value || '';
    const status = document.getElementById('project-status-filter')?.value || '';

    try {
      const res = await API.getProjects({ search, status });
      const projects = res.data;

      if (!projects || projects.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:48px;background:var(--surface-card);border:1px dashed var(--border-color);border-radius:var(--radius-lg);">
            <div style="font-size:16px;font-weight:600;color:var(--text-main);margin-bottom:6px;">No projects found</div>
            <p style="font-size:13px;color:var(--text-muted);">Create a new project or adjust your filters.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = projects.map(p => {
        const total = p.task_count || 0;
        const comp = p.completed_task_count || 0;
        const pct = total > 0 ? Math.round((comp / total) * 100) : 0;

        return `
          <div class="card" style="cursor:pointer;transition:transform 0.15s ease;" onclick="location.hash='#project/${p.id}'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <span class="badge badge-neutral">${p.project_code}</span>
              <span class="badge status-${p.status}">${p.status.replace('_', ' ')}</span>
            </div>
            <h3 style="font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:6px;">${p.name}</h3>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${p.description || 'No description provided.'}
            </p>

            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                <span>Progress</span>
                <span>${comp}/${total} Tasks (${pct}%)</span>
              </div>
              <div style="height:6px;background:var(--surface-secondary);border-radius:var(--radius-full);overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:var(--radius-full);"></div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:10px;">
              <span>Manager: <b>${p.manager_name}</b></span>
              <span>${p.member_count} Members</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--danger-text);padding:20px;">Failed to load projects: ${err.message}</div>`;
    }
  },

  /* -------------------------------------------------------------
     PROJECT DETAILS VIEW
     ------------------------------------------------------------- */
  async renderProjectDetails(container, projectId) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Loading project details...</div>`;
    try {
      const project = await API.getProject(projectId);
      document.getElementById('page-title').textContent = `${project.project_code}: ${project.name}`;

      // Join socket room
      Realtime.joinProject(projectId);

      // Fetch tasks for this project
      const tasksRes = await API.getTasks({ projectId });
      const tasks = tasksRes.data;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
              <span class="badge badge-neutral">${project.project_code}</span>
              <span class="badge status-${project.status}">${project.status.replace('_', ' ')}</span>
              <span style="font-size:12px;color:var(--text-muted);">Manager: <b>${project.manager_name}</b></span>
            </div>
            <p style="font-size:14px;color:var(--text-main);max-width:800px;">${project.description || 'No description.'}</p>
            <div style="font-size:12px;color:var(--text-tertiary);margin-top:6px;">
              Dates: ${project.start_date || 'N/A'} → ${project.due_date || 'N/A'}
            </div>
          </div>

          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" onclick="location.hash='#kanban/${projectId}'">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
              View Kanban Board
            </button>
            ${this.currentUser.role_key !== 'EMPLOYEE' ? `
              <button class="btn btn-primary" onclick="App.openCreateTaskModal(${projectId})">
                <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
                Add Task
              </button>
            ` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-md);">
          <!-- Tasks list -->
          <div class="card">
            <h3 style="font-size:15px;font-weight:600;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
              <span>Project Tasks (${tasks.length})</span>
            </h3>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${tasks.length > 0 ? tasks.map(t => `
                    <tr style="cursor:pointer;" onclick="App.openTaskDetails(${t.id})">
                      <td style="font-weight:600;">${t.title}</td>
                      <td>${t.assignee_name || '<span style="color:var(--text-tertiary);">Unassigned</span>'}</td>
                      <td><span class="badge priority-${t.priority}">${t.priority}</span></td>
                      <td><span class="badge status-${t.status}">${t.status.replace('_', ' ')}</span></td>
                      <td style="${t.is_overdue ? 'color:var(--danger-text);font-weight:700;' : ''}">${t.due_date || 'N/A'}</td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No tasks in this project yet.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Members list -->
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h3 style="font-size:15px;font-weight:600;">Team Members (${project.members.length})</h3>
              ${this.currentUser.role_key !== 'EMPLOYEE' ? `
                <button class="btn btn-secondary btn-sm" onclick="App.openAddMemberModal(${projectId})">+ Add</button>
              ` : ''}
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;">
              ${project.members.map(m => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--surface-secondary);border-radius:var(--radius-md);border:1px solid var(--border-color);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="avatar" style="width:30px;height:30px;font-size:11px;">${m.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
                    <div>
                      <div style="font-weight:600;font-size:12px;">${m.name}</div>
                      <div style="font-size:11px;color:var(--text-muted);">${m.role_name} • ${m.department_name || 'General'}</div>
                    </div>
                  </div>
                  ${this.currentUser.role_key !== 'EMPLOYEE' && m.id !== project.manager_id ? `
                    <button class="btn btn-secondary btn-sm" style="color:var(--danger-text);" onclick="App.removeMember(${projectId}, ${m.id})">×</button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color:var(--danger-text);padding:20px;">Error: ${err.message}</div>`;
    }
  },

  /* -------------------------------------------------------------
     KANBAN BOARD VIEW
     ------------------------------------------------------------- */
  async renderKanban(container, projectIdFilter = null) {
    document.getElementById('page-title').textContent = 'Task Kanban Board';

    const projectsRes = await API.getProjects();
    const projects = projectsRes.data || [];

    const selectedProjectId = projectIdFilter || (projects.length > 0 ? projects[0].id : null);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:10px;align-items:center;">
          <label style="font-size:13px;font-weight:600;">Project:</label>
          <select id="kanban-project-select" class="form-control" style="width:260px;" onchange="App.navigate('kanban/' + this.value)">
            ${projects.map(p => `
              <option value="${p.id}" ${p.id == selectedProjectId ? 'selected' : ''}>${p.project_code} - ${p.name}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:flex;gap:10px;">
          ${this.currentUser.role_key !== 'EMPLOYEE' && selectedProjectId ? `
            <button class="btn btn-primary" onclick="App.openCreateTaskModal(${selectedProjectId})">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
              Create Task
            </button>
          ` : ''}
        </div>
      </div>

      <div class="kanban-board" id="kanban-columns-wrapper">
        <div style="padding:40px;text-align:center;grid-column:1/-1;color:var(--text-muted);">Loading board cards...</div>
      </div>
    `;

    if (selectedProjectId) {
      Realtime.joinProject(selectedProjectId);
      this.loadKanbanTasks(selectedProjectId);
    }
  },

  async loadKanbanTasks(projectId) {
    const wrapper = document.getElementById('kanban-columns-wrapper');
    if (!wrapper) return;

    try {
      const res = await API.getTasks({ projectId });
      const tasks = res.data || [];

      const columns = [
        { key: 'TODO', label: 'To Do', color: 'neutral' },
        { key: 'IN_PROGRESS', label: 'In Progress', color: 'warning' },
        { key: 'UNDER_REVIEW', label: 'Under Review', color: 'info' },
        { key: 'COMPLETED', label: 'Completed', color: 'success' },
        { key: 'BLOCKED', label: 'Blocked', color: 'danger' }
      ];

      const tasksByCol = {};
      columns.forEach(c => { tasksByCol[c.key] = []; });
      tasks.forEach(t => {
        if (tasksByCol[t.status]) {
          tasksByCol[t.status].push(t);
        }
      });

      wrapper.innerHTML = columns.map(col => {
        const colTasks = tasksByCol[col.key];
        return `
          <div class="kanban-col" data-status="${col.key}">
            <div class="kanban-col-header">
              <div class="kanban-col-title">
                <span>${col.label}</span>
                <span class="badge badge-${col.color}">${colTasks.length}</span>
              </div>
            </div>

            <div class="kanban-cards-container"
                 data-status="${col.key}"
                 ondragover="App.handleDragOver(event)"
                 ondragleave="App.handleDragLeave(event)"
                 ondrop="App.handleDrop(event, '${col.key}')">
              ${colTasks.map(t => `
                <div class="task-card"
                     id="task-card-${t.id}"
                     draggable="true"
                     data-id="${t.id}"
                     data-current-status="${t.status}"
                     ondragstart="App.handleDragStart(event, ${t.id}, '${t.status}')"
                     ondragend="App.handleDragEnd(event)"
                     onclick="App.openTaskDetails(${t.id})">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span class="badge priority-${t.priority}">${t.priority}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">${t.due_date ? t.due_date : 'No date'}</span>
                  </div>

                  <div class="task-card-title">${t.title}</div>

                  <div class="task-card-meta">
                    <span>${t.assignee_name || 'Unassigned'}</span>
                    <span style="display:flex;align-items:center;gap:3px;">
                      <svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                      ${t.comment_count || 0}
                    </span>
                  </div>

                  ${t.is_overdue ? `
                    <div style="font-size:10px;font-weight:700;color:var(--danger-text);margin-top:6px;">⚠️ OVERDUE</div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      wrapper.innerHTML = `<div style="color:var(--danger-text);padding:20px;">Failed to load board: ${err.message}</div>`;
    }
  },

  /* Drag and Drop with Rollback on Failure */
  draggedTaskId: null,
  draggedOldStatus: null,

  handleDragStart(e, taskId, status) {
    this.draggedTaskId = taskId;
    this.draggedOldStatus = status;
    e.dataTransfer.setData('text/plain', taskId);
    e.currentTarget.classList.add('dragging');
  },

  handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.kanban-cards-container').forEach(el => el.classList.remove('drag-over'));
  },

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  },

  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  },

  async handleDrop(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const taskId = this.draggedTaskId;
    const oldStatus = this.draggedOldStatus;

    if (!taskId || oldStatus === targetStatus) return;

    // Optimistic UI move
    const cardEl = document.getElementById(`task-card-${taskId}`);
    const targetCol = e.currentTarget;

    if (cardEl && targetCol) {
      targetCol.appendChild(cardEl);
    }

    try {
      await API.updateTaskStatus(taskId, targetStatus);
      showToast(`Task moved to ${targetStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      // Revert card to original column on error!
      showToast(err.message || 'Status transition rejected.', 'error');
      this.refreshCurrentView();
    }
  },

  /* -------------------------------------------------------------
     TASK DETAILS MODAL (WITH COMMENTS & AUDIT HISTORY)
     ------------------------------------------------------------- */
  async openTaskDetails(taskId) {
    this.currentTaskId = taskId;
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    modal.innerHTML = `<div class="modal-dialog"><div class="modal-body" style="text-align:center;padding:40px;">Loading task details...</div></div>`;

    try {
      const task = await API.getTask(taskId);
      const u = this.currentUser;

      // Status transition options based on role
      const statuses = ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'BLOCKED'];

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width:680px;">
          <div class="modal-header">
            <div>
              <span class="badge badge-neutral">${task.project_code}</span>
              <span class="badge priority-${task.priority}" style="margin-left:6px;">${task.priority}</span>
            </div>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">${task.title}</h2>
            <p style="font-size:13px;color:var(--text-main);margin-bottom:16px;white-space:pre-wrap;">${task.description || 'No description provided.'}</p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--surface-secondary);padding:12px;border-radius:var(--radius-md);margin-bottom:20px;border:1px solid var(--border-color);">
              <div>
                <div style="font-size:11px;color:var(--text-muted);">Assignee</div>
                <div style="font-weight:600;font-size:13px;">${task.assignee_name || 'Unassigned'}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-muted);">Due Date</div>
                <div style="font-weight:600;font-size:13px;${task.is_overdue ? 'color:var(--danger-text);' : ''}">${task.due_date || 'N/A'}</div>
              </div>
              <div style="grid-column:1/-1;">
                <label class="form-label" style="margin-bottom:4px;">Change Status</label>
                <div style="display:flex;gap:8px;">
                  <select id="modal-status-select" class="form-control" style="width:200px;">
                    ${statuses.map(s => `
                      <option value="${s}" ${s === task.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>
                    `).join('')}
                  </select>
                  <button class="btn btn-primary btn-sm" onclick="App.handleStatusUpdateFromModal(${task.id})">Update Status</button>
                </div>
              </div>
            </div>

            <!-- Tabbed Discussions & History -->
            <div style="display:flex;gap:16px;border-bottom:1px solid var(--border-color);margin-bottom:12px;">
              <button class="btn btn-sm btn-secondary active" id="tab-btn-comments" onclick="App.switchModalTab('comments')">Comments (${task.comments.length})</button>
              <button class="btn btn-sm btn-secondary" id="tab-btn-history" onclick="App.switchModalTab('history')">Audit History (${task.history.length})</button>
            </div>

            <!-- Comments Section -->
            <div id="modal-tab-comments">
              <div style="display:flex;flex-direction:column;gap:10px;max-height:220px;overflow-y:auto;margin-bottom:14px;">
                ${task.comments.length > 0 ? task.comments.map(c => `
                  <div style="padding:10px;background:var(--surface-hover);border-radius:var(--radius-md);border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
                      <span style="font-weight:600;">${c.user_name} (${c.role_name})</span>
                      <span style="color:var(--text-tertiary);">${new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div style="font-size:13px;">${c.body}</div>
                  </div>
                `).join('') : '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">No comments yet. Start the discussion below.</div>'}
              </div>

              <form onsubmit="App.handleAddComment(event, ${task.id})">
                <div style="display:flex;gap:8px;">
                  <input type="text" id="modal-comment-input" class="form-control" placeholder="Add an update or comment..." required>
                  <button type="submit" class="btn btn-primary btn-sm">Post</button>
                </div>
              </form>
            </div>

            <!-- History Section -->
            <div id="modal-tab-history" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
                ${task.history.map(h => `
                  <div style="font-size:12px;padding:6px 10px;border-left:2px solid var(--primary);background:var(--surface-secondary);border-radius:var(--radius-sm);">
                    <span style="font-weight:600;">${h.actor_name}</span>: ${h.action.replace('_', ' ')}
                    ${h.new_value ? `→ <b>${h.new_value}</b>` : ''}
                    <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px;">${new Date(h.created_at).toLocaleString()}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      modal.innerHTML = `<div class="modal-dialog"><div class="modal-body" style="color:var(--danger-text);padding:20px;">Failed to load task: ${err.message}</div></div>`;
    }
  },

  switchModalTab(tab) {
    document.getElementById('modal-tab-comments').style.display = tab === 'comments' ? 'block' : 'none';
    document.getElementById('modal-tab-history').style.display = tab === 'history' ? 'block' : 'none';
  },

  async handleStatusUpdateFromModal(taskId) {
    const status = document.getElementById('modal-status-select').value;
    try {
      await API.updateTaskStatus(taskId, status);
      showToast(`Status updated to ${status.replace('_', ' ')}`, 'success');
      this.openTaskDetails(taskId);
      this.refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'Status transition rejected.', 'error');
    }
  },

  async handleAddComment(e, taskId) {
    e.preventDefault();
    const input = document.getElementById('modal-comment-input');
    const body = input.value;
    try {
      await API.addTaskComment(taskId, body);
      input.value = '';
      this.openTaskDetails(taskId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /* -------------------------------------------------------------
     CREATE PROJECT MODAL
     ------------------------------------------------------------- */
  async openCreateProjectModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');

    // Fetch active users to select members
    const usersRes = await API.getUsers({ status: 'ACTIVE' });
    const users = usersRes.data || [];

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Create New Project</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.handleCreateProject(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Project Name <span class="req">*</span></label>
              <input type="text" id="new-proj-name" class="form-control" placeholder="e.g. Mobile Payment Integration" required>
            </div>
            <div class="form-group">
              <label class="form-label">Unique Project Code <span class="req">*</span></label>
              <input type="text" id="new-proj-code" class="form-control" placeholder="e.g. PRJ-PAY" required style="text-transform:uppercase;">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="new-proj-desc" class="form-control" placeholder="Brief project summary..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" id="new-proj-start" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" id="new-proj-due" class="form-control">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Assign Project Members</label>
              <div style="max-height:140px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:8px;">
                ${users.map(u => `
                  <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer;">
                    <input type="checkbox" name="proj_members" value="${u.id}">
                    <span>${u.name} <small style="color:var(--text-muted);">(${u.role_key})</small></span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Project</button>
          </div>
        </form>
      </div>
    `;
  },

  async handleCreateProject(e) {
    e.preventDefault();
    const name = document.getElementById('new-proj-name').value;
    const project_code = document.getElementById('new-proj-code').value;
    const description = document.getElementById('new-proj-desc').value;
    const start_date = document.getElementById('new-proj-start').value || null;
    const due_date = document.getElementById('new-proj-due').value || null;

    const member_ids = Array.from(document.querySelectorAll('input[name="proj_members"]:checked')).map(cb => parseInt(cb.value, 10));

    try {
      await API.createProject({ name, project_code, description, start_date, due_date, member_ids });
      this.closeModal();
      showToast('Project created successfully!', 'success');
      this.navigate('projects');
    } catch (err) {
      showToast(err.message || 'Failed to create project.', 'error');
    }
  },

  /* -------------------------------------------------------------
     CREATE TASK MODAL
     ------------------------------------------------------------- */
  async openCreateTaskModal(preselectedProjectId = null) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');

    const projectsRes = await API.getProjects();
    const projects = projectsRes.data || [];

    const activeProjectId = preselectedProjectId || (projects.length > 0 ? projects[0].id : null);

    // Get members of active project
    let members = [];
    if (activeProjectId) {
      const proj = await API.getProject(activeProjectId);
      members = proj.members || [];
    }

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Create New Task</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.handleCreateTask(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Project <span class="req">*</span></label>
              <select id="new-task-project" class="form-control" onchange="App.loadTaskAssigneeOptions(this.value)" required>
                ${projects.map(p => `
                  <option value="${p.id}" ${p.id == activeProjectId ? 'selected' : ''}>${p.project_code} - ${p.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Title <span class="req">*</span></label>
              <input type="text" id="new-task-title" class="form-control" placeholder="What needs to be done?" required>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="new-task-desc" class="form-control" placeholder="Detailed requirements and context..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select id="new-task-priority" class="form-control">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM" selected>Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Assignee</label>
                <select id="new-task-assignee" class="form-control">
                  <option value="">Unassigned</option>
                  ${members.map(m => `
                    <option value="${m.id}">${m.name} (${m.role_name})</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" id="new-task-start" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" id="new-task-due" class="form-control">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Task</button>
          </div>
        </form>
      </div>
    `;
  },

  async loadTaskAssigneeOptions(projectId) {
    const sel = document.getElementById('new-task-assignee');
    if (!sel) return;
    try {
      const proj = await API.getProject(projectId);
      sel.innerHTML = `<option value="">Unassigned</option>` + (proj.members || []).map(m => `
        <option value="${m.id}">${m.name} (${m.role_name})</option>
      `).join('');
    } catch (e) {
      // Ignore
    }
  },

  async handleCreateTask(e) {
    e.preventDefault();
    const projectId = document.getElementById('new-task-project').value;
    const title = document.getElementById('new-task-title').value;
    const description = document.getElementById('new-task-desc').value;
    const priority = document.getElementById('new-task-priority').value;
    const assigneeId = document.getElementById('new-task-assignee').value || null;
    const startDate = document.getElementById('new-task-start').value || null;
    const dueDate = document.getElementById('new-task-due').value || null;

    try {
      await API.createTask(projectId, { title, description, priority, assigneeId, startDate, dueDate });
      this.closeModal();
      showToast('Task created and assigned!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'Failed to create task.', 'error');
    }
  },

  /* -------------------------------------------------------------
     EMPLOYEES MANAGEMENT VIEW (ADMIN)
     ------------------------------------------------------------- */
  async renderEmployees(container) {
    document.getElementById('page-title').textContent = 'Employee Management';
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <input type="text" id="emp-search" class="form-control" style="width:260px;" placeholder="Search employees..." oninput="App.loadEmployees()">
        <button class="btn btn-primary" onclick="App.openCreateEmployeeModal()">
          <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
          Add Employee
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="employees-tbody">
            <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Loading employees...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    this.loadEmployees();
  },

  async loadEmployees() {
    const tbody = document.getElementById('employees-tbody');
    if (!tbody) return;
    const search = document.getElementById('emp-search')?.value || '';

    try {
      const res = await API.getUsers({ search });
      const users = res.data || [];

      tbody.innerHTML = users.map(u => `
        <tr>
          <td style="font-weight:600;">${u.name}</td>
          <td>${u.email}</td>
          <td><span class="badge badge-neutral">${u.role_name}</span></td>
          <td>${u.department_name || '—'}</td>
          <td>${u.job_title || '—'}</td>
          <td>
            <span class="badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
              ${u.status}
            </span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="App.toggleUserStatus(${u.id}, '${u.status}')">
              ${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger-text);padding:20px;">Error: ${err.message}</td></tr>`;
    }
  },

  async toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change this employee status to ${newStatus}?`)) return;

    try {
      await API.updateUser(userId, { status: newStatus });
      showToast(`User status updated to ${newStatus}`, 'success');
      this.loadEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async openCreateEmployeeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');

    const depts = await API.getDepartments();

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Add New Employee</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.handleCreateEmployee(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input type="text" id="new-emp-name" class="form-control" placeholder="e.g. John Doe" required>
            </div>
            <div class="form-group">
              <label class="form-label">Work Email <span class="req">*</span></label>
              <input type="email" id="new-emp-email" class="form-control" placeholder="john.doe@teamsync.internal" required>
            </div>
            <div class="form-group">
              <label class="form-label">Temporary Password <span class="req">*</span></label>
              <input type="password" id="new-emp-password" class="form-control" value="Password@123" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label class="form-label">Role <span class="req">*</span></label>
                <select id="new-emp-role" class="form-control" required>
                  <option value="3">Employee</option>
                  <option value="2">Project Manager</option>
                  <option value="1">Administrator</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <select id="new-emp-dept" class="form-control">
                  <option value="">None</option>
                  ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Job Title</label>
              <input type="text" id="new-emp-title" class="form-control" placeholder="e.g. Frontend Engineer">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Employee</button>
          </div>
        </form>
      </div>
    `;
  },

  async handleCreateEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('new-emp-name').value;
    const email = document.getElementById('new-emp-email').value;
    const password = document.getElementById('new-emp-password').value;
    const role_id = parseInt(document.getElementById('new-emp-role').value, 10);
    const department_id = document.getElementById('new-emp-dept').value || null;
    const job_title = document.getElementById('new-emp-title').value || null;

    try {
      await API.createUser({ name, email, password, role_id, department_id, job_title });
      this.closeModal();
      showToast('Employee created successfully!', 'success');
      this.loadEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /* -------------------------------------------------------------
     DEPARTMENTS VIEW (ADMIN)
     ------------------------------------------------------------- */
  async renderDepartments(container) {
    document.getElementById('page-title').textContent = 'Department Management';
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span style="font-size:13px;color:var(--text-muted);">Manage organizational units</span>
        <button class="btn btn-primary" onclick="App.openCreateDepartmentModal()">
          <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
          Add Department
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Active Employees</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="depts-tbody">
            <tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted);">Loading departments...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    this.loadDepartments();
  },

  async loadDepartments() {
    const tbody = document.getElementById('depts-tbody');
    if (!tbody) return;
    try {
      const depts = await API.getDepartments();
      tbody.innerHTML = depts.map(d => `
        <tr>
          <td style="font-weight:700;"><span class="badge badge-neutral">${d.code}</span></td>
          <td style="font-weight:600;">${d.name}</td>
          <td>${d.employee_count}</td>
          <td><span class="badge badge-success">${d.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger-text);padding:20px;">Error: ${err.message}</td></tr>`;
    }
  },

  async openCreateDepartmentModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Add Department</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.handleCreateDepartment(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Department Name <span class="req">*</span></label>
              <input type="text" id="new-dept-name" class="form-control" placeholder="e.g. Legal & Compliance" required>
            </div>
            <div class="form-group">
              <label class="form-label">Department Code <span class="req">*</span></label>
              <input type="text" id="new-dept-code" class="form-control" placeholder="e.g. LGL" style="text-transform:uppercase;" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Department</button>
          </div>
        </form>
      </div>
    `;
  },

  async handleCreateDepartment(e) {
    e.preventDefault();
    const name = document.getElementById('new-dept-name').value;
    const code = document.getElementById('new-dept-code').value;

    try {
      await API.createDepartment({ name, code });
      this.closeModal();
      showToast('Department added successfully!', 'success');
      this.loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /* -------------------------------------------------------------
     NOTIFICATIONS POPOVER
     ------------------------------------------------------------- */
  async loadNotificationCount() {
    try {
      const res = await API.getNotifications({ limit: 1 });
      const badge = document.getElementById('notif-unread-count');
      if (badge && res.meta && res.meta.unreadCount > 0) {
        badge.textContent = res.meta.unreadCount;
        badge.style.display = 'flex';
      }
    } catch (e) {
      // Ignore
    }
  },

  async toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) return;
    const isShowing = dropdown.classList.toggle('show');

    if (isShowing) {
      const container = document.getElementById('notif-list-container');
      try {
        const res = await API.getNotifications({ limit: 10 });
        const notifs = res.data || [];

        if (notifs.length === 0) {
          container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">No notifications yet.</div>`;
          return;
        }

        container.innerHTML = notifs.map(n => `
          <div class="notif-item ${!n.read_at ? 'unread' : ''}" onclick="App.handleNotifClick(${n.id}, ${n.reference_id})">
            <div class="notif-title">${n.title}</div>
            <div class="notif-body">${n.body}</div>
            <div class="notif-time">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('');
      } catch (e) {
        container.innerHTML = `<div style="padding:16px;color:var(--danger-text);font-size:12px;">Error loading notifications.</div>`;
      }
    }
  },

  async handleNotifClick(notifId, taskId) {
    try {
      await API.markNotificationRead(notifId);
      document.getElementById('notif-dropdown').classList.remove('show');
      this.loadNotificationCount();
      if (taskId) {
        this.openTaskDetails(taskId);
      }
    } catch (e) {
      // Ignore
    }
  },

  async markAllNotifsRead() {
    try {
      await API.markAllNotificationsRead();
      const badge = document.getElementById('notif-unread-count');
      if (badge) badge.style.display = 'none';
      document.getElementById('notif-dropdown').classList.remove('show');
      showToast('All notifications marked as read', 'info');
    } catch (e) {
      // Ignore
    }
  },

  /* -------------------------------------------------------------
     MODAL CONTROLS
     ------------------------------------------------------------- */
  closeModal() {
    const modal = document.getElementById('modal-container');
    if (modal) {
      modal.classList.remove('show');
      modal.innerHTML = '';
    }
    this.currentTaskId = null;
  }
};

// Start application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
