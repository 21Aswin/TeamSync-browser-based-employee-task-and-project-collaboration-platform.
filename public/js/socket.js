/**
 * TeamSync Realtime Socket.IO Client
 */

function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // AudioContext blocked without user interaction
  }
}

const Realtime = {
  socket: null,
  currentProjectId: null,

  connect() {
    const token = API.getToken();
    if (!token) return;

    if (this.socket && this.socket.connected) {
      return; // Already connected
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    if (typeof io === 'undefined') {
      console.warn('[REALTIME] Socket.IO script not loaded yet.');
      return;
    }

    this.socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[REALTIME] Connected to TeamSync Socket server. Socket ID:', this.socket.id);
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId);
      }
      // Reconcile notifications on reconnect
      window.dispatchEvent(new CustomEvent('realtime:reconnect'));
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[REALTIME] Connection notice:', err.message);
    });

    // Event: New task created in project
    this.socket.on('task:created', (data) => {
      console.log('[REALTIME] Event task:created received:', data);
      window.dispatchEvent(new CustomEvent('task:created', { detail: data }));
      playNotificationChime();
      showToast(`New task created: "${data.task.title}"`, 'info');
    });

    // Event: Task assigned to current user
    this.socket.on('task:assigned', (data) => {
      console.log('[REALTIME] Event task:assigned received:', data);
      window.dispatchEvent(new CustomEvent('task:assigned', { detail: data }));
      playNotificationChime();
      showToast(`You have been assigned: "${data.task.title}"`, 'info');
    });

    // Event: Task status changed in project
    this.socket.on('task:status_changed', (data) => {
      console.log('[REALTIME] Event task:status_changed received:', data);
      window.dispatchEvent(new CustomEvent('task:status_changed', { detail: data }));
      playNotificationChime();
      showToast(`Task status changed to ${data.newStatus}: "${data.task.title}"`, 'info');
    });

    // Event: Task comment added
    this.socket.on('task:comment_added', (data) => {
      console.log('[REALTIME] Event task:comment_added received:', data);
      window.dispatchEvent(new CustomEvent('task:comment_added', { detail: data }));
    });

    // Event: Notification arrived
    this.socket.on('notification:new', (data) => {
      console.log('[REALTIME] Event notification:new received:', data);
      window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
      playNotificationChime();
      const notif = data.notification || data;
      if (notif && notif.title) {
        showToast(`🔔 ${notif.title}: ${notif.body || ''}`, 'info');
      }
      // Update badge in topbar: increase count and show badge
      const badge = document.getElementById('notif-unread-count');
      if (badge) {
        const isHidden = badge.style.display === 'none' || badge.textContent === '0' || !badge.textContent;
        const count = isHidden ? 1 : parseInt(badge.textContent, 10) + 1;
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      }
    });

    this.socket.on('error', (err) => {
      console.warn('[REALTIME] Server error:', err.message);
      if (err.message) showToast(err.message, 'error');
    });
  },

  joinProject(projectId) {
    this.currentProjectId = projectId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('project:join', { projectId });
    }
  },

  leaveProject(projectId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('project:leave', { projectId });
    }
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  },

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
};
