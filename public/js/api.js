/**
 * TeamSync REST API Client (Vanilla JavaScript Fetch API)
 */

const API = {
  baseUrl: '/api/v1',

  getToken() {
    return localStorage.getItem('teamsync_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('teamsync_token', token);
    } else {
      localStorage.removeItem('teamsync_token');
    }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('teamsync_user'));
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('teamsync_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('teamsync_user');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.setToken(null);
          this.setUser(null);
          window.location.hash = '#login';
          window.dispatchEvent(new Event('auth:logout'));
        }
        const errorObj = data.error || { message: 'An unexpected server error occurred.' };
        throw errorObj;
      }

      return data;
    } catch (err) {
      console.error(`[API_ERROR] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.data.token);
    this.setUser(res.data.user);
    return res.data;
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network failure on logout
    } finally {
      this.setToken(null);
      this.setUser(null);
      window.location.hash = '#login';
      window.dispatchEvent(new Event('auth:logout'));
    }
  },

  async getMe() {
    const res = await this.request('/auth/me');
    this.setUser(res.data);
    return res.data;
  },

  // Departments
  async getDepartments() {
    const res = await this.request('/departments');
    return res.data;
  },

  async createDepartment(data) {
    const res = await this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // Users
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/users${query ? '?' + query : ''}`);
    return res;
  },

  async createUser(data) {
    const res = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateUser(id, data) {
    const res = await this.request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // Projects
  async getProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/projects${query ? '?' + query : ''}`);
    return res;
  },

  async getProject(id) {
    const res = await this.request(`/projects/${id}`);
    return res.data;
  },

  async createProject(data) {
    const res = await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateProject(id, data) {
    const res = await this.request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async addProjectMember(projectId, userId) {
    const res = await this.request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return res.data;
  },

  async removeProjectMember(projectId, userId) {
    const res = await this.request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  // Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/tasks${query ? '?' + query : ''}`);
    return res;
  },

  async getTask(id) {
    const res = await this.request(`/tasks/${id}`);
    return res.data;
  },

  async createTask(projectId, data) {
    const res = await this.request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateTaskStatus(taskId, status) {
    const res = await this.request(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.data;
  },

  async addTaskComment(taskId, body) {
    const res = await this.request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    return res.data;
  },

  // Notifications
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/notifications${query ? '?' + query : ''}`);
    return res;
  },

  async markNotificationRead(id) {
    const res = await this.request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async markAllNotificationsRead() {
    const res = await this.request('/notifications/read-all', {
      method: 'POST'
    });
    return res.data;
  },

  // Dashboard
  async getDashboardStats() {
    const res = await this.request('/dashboard/stats');
    return res.data;
  }
};

// UI Helper: Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
