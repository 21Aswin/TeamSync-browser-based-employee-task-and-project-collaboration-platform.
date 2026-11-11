/**
 * TeamSync Main Single Page Application Logic
 * Pure Vanilla JavaScript (No React / Vue / external framework)
 * Follows Google Stitch "Warm Sand Precision" theme tokens
 */

const App = {
  currentUser: null,
  currentRoute: 'dashboard',
  currentProjectId: null,
  currentTaskId: null,
  projectsPage: 1,
  employeesPage: 1,
  kanbanMyTasksOnly: false,

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

    // Realtime notification arrived
    window.addEventListener('notification:new', () => {
      this.loadNotificationCount();
    });

    window.addEventListener('realtime:reconnect', () => {
      this.loadNotificationCount();
    });

    // Background polling fallback for notifications every 10 seconds
    if (this.notifPollTimer) clearInterval(this.notifPollTimer);
    this.notifPollTimer = setInterval(() => {
      if (this.currentUser) {
        this.loadNotificationCount();
      }
    }, 10000);

    // Close notifications & custom dropdowns when clicking anywhere outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notif-dropdown');
      const wrapper = document.querySelector('.notif-btn-wrapper');
      if (dropdown && dropdown.classList.contains('show') && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove('show');
      }

      // Close kanban project dropdown when clicking outside
      const projDropdown = document.getElementById('kanban-project-dropdown');
      const projTrigger = document.getElementById('kanban-project-picker-btn');
      if (projDropdown && projDropdown.classList.contains('show') && projTrigger && !projTrigger.contains(e.target) && !projDropdown.contains(e.target)) {
        projDropdown.classList.remove('show');
      }
    });

    // Close sidebar & dropdowns on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
        document.getElementById('kanban-project-dropdown')?.classList.remove('show');
      }
    });
  },

  navigate(rawRoute) {
    if (!this.currentUser) {
      this.renderLogin();
      return;
    }

    // Auto-close sidebar when user navigates to any page
    this.closeSidebar();

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
    if (!appEl) return;
    const u = this.currentUser;
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    appEl.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header" style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:var(--space-sm);">
            <div class="brand-icon">T</div>
            <span class="brand-title">TeamSync</span>
            <span class="brand-badge">${u.role_key}</span>
          </div>
          <button class="icon-btn btn-sm" onclick="App.closeSidebar()" title="Close Sidebar" style="color:var(--text-secondary);">✕</button>
        </div>

        <nav class="nav-section">
          <div class="nav-label">Core Workspace</div>
          <div class="nav-item" data-route="dashboard" onclick="App.closeSidebar(); location.hash='#dashboard'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </div>
          <div class="nav-item" data-route="projects" onclick="App.closeSidebar(); location.hash='#projects'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            Projects
          </div>
          <div class="nav-item" data-route="kanban" onclick="App.closeSidebar(); location.hash='#kanban'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
            Task Board
          </div>

          ${u.role_key === 'ADMIN' ? `
            <div class="nav-label">Administration</div>
            <div class="nav-item" data-route="employees" onclick="App.closeSidebar(); location.hash='#employees'">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Employees
            </div>
            <div class="nav-item" data-route="departments" onclick="App.closeSidebar(); location.hash='#departments'">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              Departments
            </div>
          ` : ''}
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-badge" style="cursor:pointer;" onclick="App.openProfileModal()" title="Click to view profile & settings">
            <div class="avatar">${initials}</div>
            <div class="user-meta">
              <div class="name" title="${u.name}">${u.name}</div>
              <span class="role-pill">${u.role_key}</span>
            </div>
            <button class="icon-btn btn-sm" onclick="event.stopPropagation(); API.logout();" title="Logout">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Global Sidebar Backdrop (closes drawer on click) -->
      <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="App.closeSidebar()"></div>

      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-left">
            <button class="icon-btn" id="sidebar-toggle-btn" onclick="App.toggleSidebar()" title="Toggle Menu">
              <svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
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
     SIDEBAR CONTROLS (Universal Drawer for Desktop & Mobile)
     ------------------------------------------------------------- */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('show', isOpen);
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
    if (backdrop && backdrop.classList.contains('show')) {
      backdrop.classList.remove('show');
    }
  },

  toggleMobileSidebar() {
    this.toggleSidebar();
  },

  closeMobileSidebar() {
    this.closeSidebar();
  },

  /* -------------------------------------------------------------
     DATE & TIME FORMATTING HELPERS
     ------------------------------------------------------------- */
  formatDateTime(dtStr) {
    if (!dtStr) return 'N/A';
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  },

  formatInputDateTime(dtStr) {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  /* -------------------------------------------------------------
     LOGIN VIEW
     ------------------------------------------------------------- */
  renderLogin() {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    // Preserve active login form and typing if already rendered
    if (document.getElementById('login-form')) return;

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
              <div style="position:relative;display:flex;align-items:center;">
                <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required style="padding-right:40px;">
                <button type="button" onclick="App.togglePasswordVisibility('login-password', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
                  <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
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

        <div class="dashboard-split-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-xl);">
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
     PROJECTS VIEW (WITH SEARCH, FILTER & PAGINATION)
     ------------------------------------------------------------- */
  async renderProjects(container) {
    document.getElementById('page-title').textContent = 'Projects';
    container.innerHTML = `
      <div class="page-header-bar">
        <div class="page-filter-group">
          <input type="text" id="project-search-input" class="form-control" placeholder="Search projects..." oninput="App.debounceProjectSearch()">
          <select id="project-status-filter" class="form-control" onchange="App.projectsPage=1; App.filterProjects()">
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
      <div id="projects-list-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(min(100%, 280px), 1fr));gap:var(--space-md);">
        <div style="padding:40px;text-align:center;color:var(--text-muted);grid-column:1/-1;">Loading projects...</div>
      </div>
      <div id="projects-pagination-container"></div>
    `;

    this.filterProjects();
  },

  debounceProjectTimeout: null,
  debounceProjectSearch() {
    clearTimeout(this.debounceProjectTimeout);
    this.debounceProjectTimeout = setTimeout(() => {
      this.projectsPage = 1;
      this.filterProjects();
    }, 300);
  },

  async filterProjects() {
    const grid = document.getElementById('projects-list-grid');
    const paginationEl = document.getElementById('projects-pagination-container');
    if (!grid) return;
    const search = document.getElementById('project-search-input')?.value || '';
    const status = document.getElementById('project-status-filter')?.value || '';

    try {
      const res = await API.getProjects({ search, status, page: this.projectsPage, limit: 9 });
      const projects = res.data || [];
      const meta = res.meta || { total: projects.length, page: 1, totalPages: 1 };

      if (!projects || projects.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:48px;background:var(--surface-card);border:1px dashed var(--border-color);border-radius:var(--radius-lg);">
            <div style="font-size:16px;font-weight:600;color:var(--text-main);margin-bottom:6px;">No projects found</div>
            <p style="font-size:13px;color:var(--text-muted);">Create a new project or adjust your filters.</p>
          </div>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
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

      // Render Pagination
      if (paginationEl && meta.totalPages > 1) {
        paginationEl.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding:12px 16px;background:var(--surface-card);border:1px solid var(--border-color);border-radius:var(--radius-md);">
            <div style="font-size:12px;color:var(--text-muted);">
              Showing Page <b>${meta.page}</b> of <b>${meta.totalPages}</b> (Total: ${meta.total} projects)
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" ${meta.page <= 1 ? 'disabled' : ''} onclick="App.projectsPage--; App.filterProjects();">← Previous</button>
              <button class="btn btn-secondary btn-sm" ${meta.page >= meta.totalPages ? 'disabled' : ''} onclick="App.projectsPage++; App.filterProjects();">Next →</button>
            </div>
          </div>
        `;
      } else if (paginationEl) {
        paginationEl.innerHTML = '';
      }
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--danger-text);padding:20px;">Failed to load projects: ${err.message}</div>`;
    }
  },

  /* -------------------------------------------------------------
     PROJECT DETAILS VIEW (WITH EDIT PROJECT)
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

      const canManage = this.currentUser.role_key === 'ADMIN' || this.currentUser.id === project.manager_id;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
              <span class="badge badge-neutral">${project.project_code}</span>
              <span class="badge status-${project.status}">${project.status.replace('_', ' ')}</span>
              <span style="font-size:12px;color:var(--text-muted);">Manager: <b>${project.manager_name}</b></span>
            </div>
            <p style="font-size:14px;color:var(--text-main);max-width:800px;">${project.description || 'No description.'}</p>
            <div style="font-size:12px;color:var(--text-tertiary);margin-top:6px;">
              Dates: ${App.formatDateTime(project.start_date)} → ${App.formatDateTime(project.due_date)}
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${canManage ? `
              <button class="btn btn-secondary" onclick="App.openEditProjectModal(${project.id})">
                <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                Edit Project
              </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="location.hash='#kanban/${projectId}'">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path></svg>
              View Kanban Board
            </button>
            ${canManage ? `
              <button class="btn btn-primary" onclick="App.openCreateTaskModal(${projectId})">
                <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
                Add Task
              </button>
            ` : ''}
          </div>
        </div>

        <div class="project-details-grid" style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-md);">
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
                      <td style="${t.is_overdue ? 'color:var(--danger-text);font-weight:700;' : ''}">${App.formatDateTime(t.due_date)}</td>
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
              ${canManage ? `
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
                  ${canManage && m.id !== project.manager_id ? `
                    <button class="btn btn-secondary btn-sm" style="color:var(--danger-text);" onclick="App.confirmRemoveMember(${projectId}, ${m.id}, '${m.name}')">×</button>
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

  confirmRemoveMember(projectId, userId, userName) {
    this.confirmDialog({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove <b>${userName}</b> from this project?`,
      confirmText: 'Remove Member',
      danger: true,
      onConfirm: async () => {
        try {
          await API.removeProjectMember(projectId, userId);
          showToast('Member removed from project.', 'info');
          this.refreshCurrentView();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    });
  },

  /* -------------------------------------------------------------
     ADD PROJECT MEMBER MODAL
     ------------------------------------------------------------- */
  async openAddMemberModal(projectId) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    try {
      const [proj, usersRes] = await Promise.all([
        API.getProject(projectId),
        API.getUsers({ status: 'ACTIVE' })
      ]);
      const currentMemberIds = new Set((proj.members || []).map(m => m.id));
      const availableUsers = (usersRes.data || []).filter(u => !currentMemberIds.has(u.id));

      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Add Member to Project: ${proj.project_code}</h3>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleAddMember(event, ${projectId})">
            <div class="modal-body">
              ${availableUsers.length === 0 ? `
                <div style="padding:24px;text-align:center;color:var(--text-muted);">
                  All active employees are already members of this project.
                </div>
              ` : `
                <div class="form-group">
                  <label class="form-label">Select Employee <span class="req">*</span></label>
                  <select id="add-member-user-id" class="form-control" required>
                    <option value="">-- Choose Employee --</option>
                    ${availableUsers.map(u => `
                      <option value="${u.id}">${u.name} (${u.role_key} - ${u.job_title || u.department_name || 'General'})</option>
                    `).join('')}
                  </select>
                </div>
              `}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
              ${availableUsers.length > 0 ? `
                <button type="submit" class="btn btn-primary" id="btn-save-member">
                  <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                  Add Member
                </button>
              ` : ''}
            </div>
          </form>
        </div>
      `;
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    }
  },

  async handleAddMember(e, projectId) {
    e.preventDefault();
    const userId = document.getElementById('add-member-user-id')?.value;
    if (!userId) return;
    const btn = document.getElementById('btn-save-member');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }
    try {
      await API.addProjectMember(projectId, parseInt(userId, 10));
      this.closeModal();
      showToast('Member added to project successfully!', 'success');
      this.renderProjectDetails(document.getElementById('main-content-view'), projectId);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg> Add Member`;
      }
      showToast(err.message || 'Failed to add member', 'error');
    }
  },

  /* -------------------------------------------------------------
     EDIT PROJECT MODAL
     ------------------------------------------------------------- */
  async openEditProjectModal(projectId) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    try {
      const project = await API.getProject(projectId);
      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Edit Project: ${project.project_code}</h3>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleUpdateProject(event, ${project.id})">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Project Name <span class="req">*</span></label>
                <input type="text" id="edit-proj-name" class="form-control" value="${project.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="edit-proj-desc" class="form-control">${project.description || ''}</textarea>
              </div>
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select id="edit-proj-status" class="form-control">
                    <option value="PLANNING" ${project.status === 'PLANNING' ? 'selected' : ''}>Planning</option>
                    <option value="ACTIVE" ${project.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                    <option value="ON_HOLD" ${project.status === 'ON_HOLD' ? 'selected' : ''}>On Hold</option>
                    <option value="COMPLETED" ${project.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Due Date & Time</label>
                  <input type="datetime-local" id="edit-proj-due" class="form-control" value="${App.formatInputDateTime(project.due_date)}">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-save-edit-proj">
                <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                Save Project Changes
              </button>
            </div>
          </form>
        </div>
      `;
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async handleUpdateProject(e, projectId) {
    e.preventDefault();
    const name = document.getElementById('edit-proj-name').value;
    const description = document.getElementById('edit-proj-desc').value;
    const status = document.getElementById('edit-proj-status').value;
    const due_date = document.getElementById('edit-proj-due').value || null;

    try {
      await API.updateProject(projectId, { name, description, status, due_date });
      this.closeModal();
      showToast('Project updated successfully!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  },

  /* -------------------------------------------------------------
     KANBAN BOARD VIEW (WITH MY TASKS TOGGLE)
     ------------------------------------------------------------- */
  async renderKanban(container, projectIdFilter = null) {
    document.getElementById('page-title').textContent = 'Task Kanban Board';

    const projectsRes = await API.getProjects();
    const projects = projectsRes.data || [];

    const selectedProjectId = projectIdFilter || (projects.length > 0 ? projects[0].id : null);
    const activeProject = projects.find(p => p.id == selectedProjectId) || (projects.length > 0 ? projects[0] : null);

    container.innerHTML = `
      <div class="kanban-header-bar">
        <div class="kanban-filter-group">
          <div class="kanban-select-wrapper" style="position:relative;">
            <label style="font-size:13px;font-weight:600;white-space:nowrap;">Project:</label>

            <!-- Custom Mobile-Responsive Project Picker (Wraps full project name line-by-line) -->
            <button type="button" id="kanban-project-picker-btn" class="custom-select-trigger" onclick="App.toggleKanbanProjectDropdown(event)" title="Change Project">
              <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden;text-align:left;line-height:1.35;flex:1;min-width:0;">
                <span style="font-size:11px;font-weight:700;color:var(--primary);">${activeProject ? activeProject.project_code : 'PROJECT'}</span>
                <span style="font-size:13px;font-weight:600;color:var(--text-main);white-space:normal;word-break:break-word;">
                  ${activeProject ? activeProject.name : 'Select a project...'}
                </span>
              </div>
              <svg style="width:16px;height:16px;flex-shrink:0;color:var(--text-muted);margin-left:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            <!-- Custom Dropdown Menu with Full Line-by-Line Names -->
            <div id="kanban-project-dropdown" class="custom-select-dropdown">
              ${projects.map(p => `
                <div class="custom-select-option ${p.id == selectedProjectId ? 'selected' : ''}" onclick="App.selectKanbanProject(${p.id})">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span class="badge badge-neutral" style="font-size:10px;font-weight:700;">${p.project_code}</span>
                    ${p.id == selectedProjectId ? '<span style="color:var(--primary);font-weight:700;font-size:11px;">✓ Active</span>' : ''}
                  </div>
                  <div style="font-size:13px;font-weight:600;color:var(--text-main);line-height:1.4;white-space:normal;word-break:break-word;">
                    ${p.name}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Hidden native select kept for programmatic compatibility -->
            <select id="kanban-project-select" style="display:none;" onchange="App.navigate('kanban/' + this.value)">
              ${projects.map(p => `
                <option value="${p.id}" ${p.id == selectedProjectId ? 'selected' : ''}>${p.project_code} - ${p.name}</option>
              `).join('')}
            </select>
          </div>

          <label class="kanban-checkbox-pill">
            <input type="checkbox" id="kanban-my-tasks-only" ${this.kanbanMyTasksOnly ? 'checked' : ''} onchange="App.toggleKanbanMyTasks()">
            <span>Assigned to me only</span>
          </label>
        </div>

        <div class="kanban-actions-wrap">
          ${this.currentUser.role_key !== 'EMPLOYEE' && selectedProjectId ? `
            <button class="btn btn-primary" onclick="App.openCreateTaskModal(${selectedProjectId})">
              <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
              Create Task
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Mobile Quick Column Tabs -->
      <div class="kanban-mobile-tabs" id="kanban-mobile-tabs">
        <button class="kanban-tab-btn active" data-col="ALL" onclick="App.scrollKanbanCol('ALL')">All</button>
        <button class="kanban-tab-btn" data-col="TODO" onclick="App.scrollKanbanCol('TODO')">To Do</button>
        <button class="kanban-tab-btn" data-col="IN_PROGRESS" onclick="App.scrollKanbanCol('IN_PROGRESS')">In Progress</button>
        <button class="kanban-tab-btn" data-col="UNDER_REVIEW" onclick="App.scrollKanbanCol('UNDER_REVIEW')">Review</button>
        <button class="kanban-tab-btn" data-col="COMPLETED" onclick="App.scrollKanbanCol('COMPLETED')">Done</button>
        <button class="kanban-tab-btn" data-col="BLOCKED" onclick="App.scrollKanbanCol('BLOCKED')">Blocked</button>
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

  toggleKanbanProjectDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('kanban-project-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
  },

  selectKanbanProject(projectId) {
    const dropdown = document.getElementById('kanban-project-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    const sel = document.getElementById('kanban-project-select');
    if (sel) sel.value = projectId;
    this.navigate('kanban/' + projectId);
  },

  scrollKanbanCol(status) {
    document.querySelectorAll('.kanban-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-col') === status);
    });

    const wrapper = document.getElementById('kanban-columns-wrapper');
    if (!wrapper) return;

    if (status === 'ALL') {
      wrapper.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      const col = wrapper.querySelector(`.kanban-col[data-status="${status}"]`);
      if (col) {
        col.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  },

  toggleKanbanMyTasks() {
    this.kanbanMyTasksOnly = document.getElementById('kanban-my-tasks-only').checked;
    const sel = document.getElementById('kanban-project-select');
    if (sel && sel.value) {
      this.loadKanbanTasks(sel.value);
    }
  },

  async loadKanbanTasks(projectId) {
    const wrapper = document.getElementById('kanban-columns-wrapper');
    if (!wrapper) return;

    try {
      const params = { projectId };
      if (this.kanbanMyTasksOnly) {
        params.assignedToMe = true;
      }
      const res = await API.getTasks(params);
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
                    <span style="font-size:11px;color:var(--text-tertiary);" title="Due Date & Time">${t.due_date ? App.formatDateTime(t.due_date) : 'No deadline'}</span>
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
     TASK DETAILS MODAL (WITH EDIT TASK OPTION)
     ------------------------------------------------------------- */
  async openTaskDetails(taskId) {
    const parsedId = parseInt(taskId, 10);
    if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
      return;
    }
    this.currentTaskId = parsedId;
    const modal = document.getElementById('modal-container');
    if (!modal) return;
    modal.classList.add('show');
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width:440px;">
        <div class="modal-header">
          <h3 style="font-size:15px;font-weight:600;">Task Details</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:36px;color:var(--text-muted);font-size:13px;">
          Loading task details...
        </div>
      </div>
    `;

    try {
      const task = await API.getTask(parsedId);
      const u = this.currentUser;
      const canManage = u.role_key === 'ADMIN' || u.id === task.manager_id;

      const statuses = ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'BLOCKED'];

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width:680px;">
          <div class="modal-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge badge-neutral">${task.project_code}</span>
              <span class="badge priority-${task.priority}">${task.priority}</span>
              ${canManage ? `
                <button class="btn btn-secondary btn-sm" onclick="App.openEditTaskModal(${task.id})">
                  <svg style="width:13px;height:13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  Edit Task
                </button>
              ` : ''}
            </div>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">${task.title}</h2>
            <p style="font-size:13px;color:var(--text-main);margin-bottom:16px;white-space:pre-wrap;">${task.description || 'No description provided.'}</p>

            <div class="form-row-2col" style="background:var(--surface-secondary);padding:12px;border-radius:var(--radius-md);margin-bottom:20px;border:1px solid var(--border-color);">
              <div>
                <div style="font-size:11px;color:var(--text-muted);">Assignee</div>
                <div style="font-weight:600;font-size:13px;">${task.assignee_name || 'Unassigned'}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text-muted);">Due Date & Time</div>
                <div style="font-weight:600;font-size:13px;${task.is_overdue ? 'color:var(--danger-text);' : ''}">${App.formatDateTime(task.due_date)}</div>
              </div>
              <div style="grid-column:1/-1;">
                <label class="form-label" style="margin-bottom:4px;">Change Status</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <select id="modal-status-select" class="form-control" style="flex:1;min-width:150px;">
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
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
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
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width:440px;">
          <div class="modal-header">
            <h3 style="color:var(--danger-text);font-size:15px;font-weight:600;">Task Not Available</h3>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;font-size:13px;color:var(--text-main);line-height:1.5;">
            ${err.message || 'The requested task could not be loaded or may have been deleted.'}
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;padding:12px 20px;background:var(--surface-secondary);border-top:1px solid var(--border-color);border-radius:0 0 var(--radius-md) var(--radius-md);">
            <button class="btn btn-secondary btn-sm" onclick="App.closeModal()">Close</button>
          </div>
        </div>
      `;
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
     EDIT TASK MODAL
     ------------------------------------------------------------- */
  async openEditTaskModal(taskId) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    try {
      const task = await API.getTask(taskId);
      const proj = await API.getProject(task.project_id);
      const members = proj.members || [];

      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Edit Task Details</h3>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleUpdateTask(event, ${task.id})">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Task Title <span class="req">*</span></label>
                <input type="text" id="edit-task-title" class="form-control" value="${task.title}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="edit-task-desc" class="form-control">${task.description || ''}</textarea>
              </div>
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label">Priority</label>
                  <select id="edit-task-priority" class="form-control">
                    <option value="LOW" ${task.priority === 'LOW' ? 'selected' : ''}>Low</option>
                    <option value="MEDIUM" ${task.priority === 'MEDIUM' ? 'selected' : ''}>Medium</option>
                    <option value="HIGH" ${task.priority === 'HIGH' ? 'selected' : ''}>High</option>
                    <option value="URGENT" ${task.priority === 'URGENT' ? 'selected' : ''}>Urgent</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Assignee</label>
                  <select id="edit-task-assignee" class="form-control">
                    <option value="">Unassigned</option>
                    ${members.map(m => `
                      <option value="${m.id}" ${m.id === task.assignee_id ? 'selected' : ''}>${m.name} (${m.role_name})</option>
                    `).join('')}
                  </select>
                </div>
              </div>
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label">Start Date & Time</label>
                  <input type="datetime-local" id="edit-task-start" class="form-control" value="${App.formatInputDateTime(task.start_date)}">
                </div>
                <div class="form-group">
                  <label class="form-label">Due Date & Time</label>
                  <input type="datetime-local" id="edit-task-due" class="form-control" value="${App.formatInputDateTime(task.due_date)}">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-save-edit-task">
                <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                Save Task Changes
              </button>
            </div>
          </form>
        </div>
      `;
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async handleUpdateTask(e, taskId) {
    e.preventDefault();
    const title = document.getElementById('edit-task-title').value;
    const description = document.getElementById('edit-task-desc').value;
    const priority = document.getElementById('edit-task-priority').value;
    const assigneeId = document.getElementById('edit-task-assignee').value || null;
    const startDate = document.getElementById('edit-task-start').value || null;
    const dueDate = document.getElementById('edit-task-due').value || null;

    try {
      await API.updateTask(taskId, { title, description, priority, assigneeId, startDate, dueDate });
      this.closeModal();
      showToast('Task updated successfully!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      showToast(err.message || 'Task update failed', 'error');
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
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Start Date & Time</label>
                <input type="datetime-local" id="new-proj-start" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Due Date & Time</label>
                <input type="datetime-local" id="new-proj-due" class="form-control">
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
            <button type="submit" class="btn btn-primary" id="btn-save-project">
              <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
              Save Project
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async handleCreateProject(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-project');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }
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
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg> Save Project`;
      }
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
                ${projects.map(p => {
                  const shortName = p.name.length > 28 ? p.name.substring(0, 26) + '…' : p.name;
                  return `<option value="${p.id}" ${p.id == activeProjectId ? 'selected' : ''} title="${p.name}">${p.project_code} — ${shortName}</option>`;
                }).join('')}
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
            <div class="form-row-2col">
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
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Start Date & Time</label>
                <input type="datetime-local" id="new-task-start" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Due Date & Time</label>
                <input type="datetime-local" id="new-task-due" class="form-control">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-task">
              <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
              Save & Create Task
            </button>
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
     EMPLOYEES MANAGEMENT VIEW (ADMIN - WITH EDIT & PAGINATION)
     ------------------------------------------------------------- */
  async renderEmployees(container) {
    document.getElementById('page-title').textContent = 'Employee Management';
    container.innerHTML = `
      <div class="page-header-bar">
        <div class="page-filter-group">
          <input type="text" id="emp-search" class="form-control" placeholder="Search employees..." oninput="App.employeesPage=1; App.loadEmployees()">
        </div>
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

      <div id="employees-pagination-container"></div>
    `;

    this.loadEmployees();
  },

  async loadEmployees() {
    const tbody = document.getElementById('employees-tbody');
    const paginationEl = document.getElementById('employees-pagination-container');
    if (!tbody) return;
    const search = document.getElementById('emp-search')?.value || '';

    try {
      const res = await API.getUsers({ search, page: this.employeesPage, limit: 10 });
      const users = res.data || [];
      const meta = res.meta || { total: users.length, page: 1, totalPages: 1 };

      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No employees found.</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

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
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openEditEmployeeModal(${u.id})">Edit</button>
              <button class="btn ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="App.toggleUserStatus(${u.id}, '${u.status}', '${u.name}')">
                ${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      if (paginationEl && meta.totalPages > 1) {
        paginationEl.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:12px 16px;background:var(--surface-card);border:1px solid var(--border-color);border-radius:var(--radius-md);">
            <div style="font-size:12px;color:var(--text-muted);">
              Page <b>${meta.page}</b> of <b>${meta.totalPages}</b> (Total: ${meta.total} employees)
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" ${meta.page <= 1 ? 'disabled' : ''} onclick="App.employeesPage--; App.loadEmployees();">← Previous</button>
              <button class="btn btn-secondary btn-sm" ${meta.page >= meta.totalPages ? 'disabled' : ''} onclick="App.employeesPage++; App.loadEmployees();">Next →</button>
            </div>
          </div>
        `;
      } else if (paginationEl) {
        paginationEl.innerHTML = '';
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger-text);padding:20px;">Error: ${err.message}</td></tr>`;
    }
  },

  async toggleUserStatus(userId, currentStatus, userName) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.confirmDialog({
      title: `${newStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} Employee`,
      message: `Are you sure you want to change <b>${userName}</b> status to <b>${newStatus}</b>? ${newStatus === 'INACTIVE' ? 'This user will be blocked from logging in.' : ''}`,
      confirmText: `${newStatus === 'INACTIVE' ? 'Deactivate Account' : 'Activate Account'}`,
      danger: newStatus === 'INACTIVE',
      onConfirm: async () => {
        try {
          await API.updateUser(userId, { status: newStatus });
          showToast(`User status updated to ${newStatus}`, 'success');
          this.loadEmployees();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
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
              <div style="position:relative;display:flex;align-items:center;">
                <input type="password" id="new-emp-password" class="form-control" value="Password@123" required style="padding-right:40px;">
                <button type="button" onclick="App.togglePasswordVisibility('new-emp-password', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
                  <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="form-row-2col">
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
            <button type="submit" class="btn btn-primary" id="btn-save-emp">
              <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
              Save Employee
            </button>
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
     EDIT EMPLOYEE MODAL (ADMIN)
     ------------------------------------------------------------- */
  async openEditEmployeeModal(userId) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    try {
      const user = await API.getUser(userId);
      const depts = await API.getDepartments();

      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Edit Employee: ${user.name}</h3>
            <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
          </div>
          <form onsubmit="App.handleUpdateEmployee(event, ${user.id})">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Full Name <span class="req">*</span></label>
                <input type="text" id="edit-emp-name" class="form-control" value="${user.name}" required>
              </div>
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label">Role <span class="req">*</span></label>
                  <select id="edit-emp-role" class="form-control" required>
                    <option value="3" ${user.role_id === 3 ? 'selected' : ''}>Employee</option>
                    <option value="2" ${user.role_id === 2 ? 'selected' : ''}>Project Manager</option>
                    <option value="1" ${user.role_id === 1 ? 'selected' : ''}>Administrator</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <select id="edit-emp-dept" class="form-control">
                    <option value="">None</option>
                    ${depts.map(d => `<option value="${d.id}" ${d.id === user.department_id ? 'selected' : ''}>${d.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Job Title</label>
                <input type="text" id="edit-emp-title" class="form-control" value="${user.job_title || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Account Status</label>
                <select id="edit-emp-status" class="form-control">
                  <option value="ACTIVE" ${user.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                  <option value="INACTIVE" ${user.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-save-edit-emp">
                <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                Save Employee Changes
              </button>
            </div>
          </form>
        </div>
      `;
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async handleUpdateEmployee(e, userId) {
    e.preventDefault();
    const name = document.getElementById('edit-emp-name').value;
    const role_id = parseInt(document.getElementById('edit-emp-role').value, 10);
    const department_id = document.getElementById('edit-emp-dept').value || null;
    const job_title = document.getElementById('edit-emp-title').value || null;
    const status = document.getElementById('edit-emp-status').value;

    try {
      await API.updateUser(userId, { name, role_id, department_id, job_title, status });
      this.closeModal();
      showToast('Employee updated successfully!', 'success');
      this.loadEmployees();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  },

  /* -------------------------------------------------------------
     DEPARTMENTS VIEW (ADMIN - WITH EDIT)
     ------------------------------------------------------------- */
  async renderDepartments(container) {
    document.getElementById('page-title').textContent = 'Department Management';
    container.innerHTML = `
      <div class="page-header-bar">
        <span style="font-size:13px;color:var(--text-muted);">Manage organizational units & team clusters</span>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="depts-tbody">
            <tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Loading departments...</td></tr>
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
          <td>
            <button class="btn btn-secondary btn-sm" onclick="App.openEditDepartmentModal(${d.id}, '${d.name}', '${d.code}')">Edit</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-text);padding:20px;">Error: ${err.message}</td></tr>`;
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
            <button type="submit" class="btn btn-primary" id="btn-save-dept">
              <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
              Save Department
            </button>
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
     EDIT DEPARTMENT MODAL (ADMIN)
     ------------------------------------------------------------- */
  openEditDepartmentModal(deptId, currentName, currentCode) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Edit Department: ${currentCode}</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.handleUpdateDepartment(event, ${deptId})">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Department Name <span class="req">*</span></label>
              <input type="text" id="edit-dept-name" class="form-control" value="${currentName}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Department Code <span class="req">*</span></label>
              <input type="text" id="edit-dept-code" class="form-control" value="${currentCode}" style="text-transform:uppercase;" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-edit-dept">
              <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
              Save Department Changes
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async handleUpdateDepartment(e, deptId) {
    e.preventDefault();
    const name = document.getElementById('edit-dept-name').value;
    const code = document.getElementById('edit-dept-code').value;
    try {
      await API.updateDepartment(deptId, { name, code });
      this.closeModal();
      showToast('Department updated successfully!', 'success');
      this.loadDepartments();
    } catch (err) {
      showToast(err.message || 'Department update failed', 'error');
    }
  },

  /* -------------------------------------------------------------
     USER PROFILE MODAL & PASSWORD UPDATE
     ------------------------------------------------------------- */
  openProfileModal() {
    this.closeSidebar();
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    const u = this.currentUser;

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width:480px;">
        <div class="modal-header">
          <h3>My Profile & Settings</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:12px;background:var(--surface-secondary);border-radius:var(--radius-md);border:1px solid var(--border-color);">
            <div class="avatar" style="width:48px;height:48px;font-size:18px;">${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
            <div>
              <h4 style="font-size:15px;font-weight:700;">${u.name}</h4>
              <div style="font-size:12px;color:var(--text-muted);">${u.email}</div>
              <div style="margin-top:4px;">
                <span class="badge badge-neutral">${u.role_name}</span>
                ${u.department_name ? `<span class="badge badge-neutral" style="margin-left:4px;">${u.department_name}</span>` : ''}
              </div>
            </div>
          </div>

          <form onsubmit="App.handleUpdateProfile(event)" style="margin-bottom:20px;">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="prof-name" class="form-control" value="${u.name}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Job Title</label>
              <input type="text" id="prof-title" class="form-control" value="${u.job_title || ''}" placeholder="e.g. Lead Software Engineer">
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Update Profile Info</button>
          </form>

          <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0;">

          <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;">Change Password</h4>
          <form onsubmit="App.handleChangePassword(event)">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <div style="position:relative;display:flex;align-items:center;">
                <input type="password" id="prof-cur-pass" class="form-control" placeholder="••••••••••••" required style="padding-right:40px;">
                <button type="button" onclick="App.togglePasswordVisibility('prof-cur-pass', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
                  <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">New Password (min 6 characters)</label>
              <div style="position:relative;display:flex;align-items:center;">
                <input type="password" id="prof-new-pass" class="form-control" placeholder="New secure password" minlength="6" required style="padding-right:40px;">
                <button type="button" onclick="App.togglePasswordVisibility('prof-new-pass', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
                  <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-secondary btn-sm">Change Password</button>
          </form>
        </div>
      </div>
    `;
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value;
    const job_title = document.getElementById('prof-title').value;
    try {
      const updated = await API.updateProfile({ name, job_title });
      this.currentUser = updated;
      this.renderShell();
      this.refreshCurrentView();
      this.closeModal();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Profile update failed', 'error');
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('prof-cur-pass').value;
    const newPassword = document.getElementById('prof-new-pass').value;
    try {
      await API.changePassword({ currentPassword, newPassword });
      this.closeModal();
      showToast('Password changed successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Password change failed', 'error');
    }
  },

  /* -------------------------------------------------------------
     CUSTOM STITCH CONFIRMATION DIALOG
     ------------------------------------------------------------- */
  confirmDialog({ title, message, confirmText = 'Confirm', danger = false, onConfirm }) {
    const modal = document.getElementById('modal-container');
    modal.classList.add('show');
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width:440px;">
        <div class="modal-header">
          <h3 style="color:${danger ? 'var(--danger-text)' : 'var(--text-main)'};">${title}</h3>
          <button class="icon-btn btn-sm" onclick="App.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--text-main);line-height:1.4;">${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="stitch-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.getElementById('stitch-confirm-btn').onclick = async () => {
      App.closeModal();
      if (onConfirm) await onConfirm();
    };
  },

  /* -------------------------------------------------------------
     PASSWORD VISIBILITY TOGGLE HELPER
     ------------------------------------------------------------- */
  togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const eyeOpen = `
      <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    `;
    const eyeSlash = `
      <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
      </svg>
    `;
    if (btnEl) {
      btnEl.innerHTML = isPassword ? eyeSlash : eyeOpen;
      btnEl.setAttribute('title', isPassword ? 'Hide Password' : 'Show Password');
    }
  },

  /* -------------------------------------------------------------
     NOTIFICATIONS POPOVER
     ------------------------------------------------------------- */
  async loadNotificationCount() {
    try {
      const res = await API.getNotifications({ limit: 1 });
      const badge = document.getElementById('notif-unread-count');
      if (badge) {
        const count = res.meta && typeof res.meta.unreadCount === 'number' ? res.meta.unreadCount : 0;
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
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
      // 1. Immediately reset the badge count to 0 in UI so it doesn't stay
      const badge = document.getElementById('notif-unread-count');
      if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
      }

      // 2. Fetch notifications to show
      const container = document.getElementById('notif-list-container');
      try {
        container.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">Loading notifications...</div>`;
        const res = await API.getNotifications({ limit: 25 });
        const notifs = res.data || [];

        // 3. Mark all as read in backend so subsequent visits and pages stay cleared
        API.markAllNotificationsRead().catch(() => {});

        if (notifs.length === 0) {
          container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet.</div>`;
          return;
        }

        container.innerHTML = notifs.map(n => {
          const isUnread = !n.read_at;
          const refTypeStr = n.reference_type ? `'${n.reference_type}'` : 'null';
          const refIdVal = (n.reference_id !== null && n.reference_id !== undefined) ? n.reference_id : 'null';
          return `
            <div class="notif-item ${isUnread ? 'unread' : ''}" style="${isUnread ? 'background-color:rgba(14,116,144,0.06);' : ''}" onclick="App.handleNotifClick(${n.id}, ${refTypeStr}, ${refIdVal})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div class="notif-title" style="font-weight:600;font-size:13px;color:var(--text-main);">${n.title}</div>
                ${isUnread ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:var(--primary);flex-shrink:0;margin-top:4px;" title="Unread"></span>' : ''}
              </div>
              <div class="notif-body" style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${n.body}</div>
              <div class="notif-time" style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">${new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `;
        }).join('');
      } catch (e) {
        container.innerHTML = `<div style="padding:16px;color:var(--danger-text);font-size:12px;">Error loading notifications.</div>`;
      }
    }
  },

  async handleNotifClick(notifId, refType, refId) {
    try {
      await API.markNotificationRead(notifId);
      document.getElementById('notif-dropdown')?.classList.remove('show');
      this.loadNotificationCount();

      const numId = parseInt(refId, 10);
      if (refType === 'TASK' && !isNaN(numId) && numId > 0) {
        this.openTaskDetails(numId);
      } else if (refType === 'PROJECT' && !isNaN(numId) && numId > 0) {
        this.navigate(`project/${numId}`);
      }
    } catch (e) {
      // Ignore
    }
  },

  async markAllNotifsRead() {
    try {
      await API.markAllNotificationsRead();
      const badge = document.getElementById('notif-unread-count');
      if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
      }
      showToast('All notifications marked as read', 'info');
      // Refresh notification list inside dropdown
      const container = document.getElementById('notif-list-container');
      if (container) {
        const notifItems = container.querySelectorAll('.notif-item');
        notifItems.forEach(item => {
          item.classList.remove('unread');
          item.style.backgroundColor = '';
          const dot = item.querySelector('span[title="Unread"]');
          if (dot) dot.remove();
        });
      }
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

// Expose App globally to window for inline onclick handlers
window.App = App;

// Start application on DOM Ready ONLY if #app element exists (prevents interfering with standalone pages)
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('app')) {
    App.init();
  }
});
