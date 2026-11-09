<?php
/**
 * TeamSync — Login Page (PHP Entrypoint)
 * Theme: Stitch Warm Sand Precision (#F6F3EC, #EEE9DF, #0E7490)
 */
$pageTitle = "Sign In — TeamSync";
include __DIR__ . '/includes/header.php';
?>

<div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background-color:var(--bg-canvas);padding:24px;">
  <div class="card" style="width:100%;max-width:440px;padding:36px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);">
    
    <div style="text-align:center;margin-bottom:24px;">
      <div class="brand-icon" style="margin:0 auto 12px;width:40px;height:40px;font-size:22px;">T</div>
      <h2 style="font-size:22px;font-weight:700;color:var(--text-main);margin-bottom:4px;">Sign in to TeamSync</h2>
      <p style="font-size:13px;color:var(--text-muted);">Employee task and project collaboration platform</p>
    </div>

    <form id="php-login-form" onsubmit="handleLoginSubmit(event)">
      <div class="form-group">
        <label class="form-label">Work Email</label>
        <input type="email" id="php-login-email" class="form-control" placeholder="name@teamsync.internal" required autofocus>
      </div>

      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="php-login-password" class="form-control" placeholder="••••••••••••" required>
      </div>

      <div id="php-login-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:16px;"></div>

      <button type="submit" id="php-login-btn" class="btn btn-primary" style="width:100%;height:40px;font-size:14px;font-weight:600;">
        Sign In
      </button>
    </form>

    <div style="margin-top:20px;text-align:center;font-size:13px;color:var(--text-muted);">
      Don't have an account? <a href="/register.php" style="font-weight:600;color:var(--primary);">Create an Account</a>
    </div>

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-color);">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px;text-align:center;">
        Quick Demo Accounts (Password: Password@123)
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="fillDemoAcc('admin@teamsync.internal')">Admin</button>
        <button class="btn btn-secondary btn-sm" onclick="fillDemoAcc('manager@teamsync.internal')">Manager</button>
        <button class="btn btn-secondary btn-sm" onclick="fillDemoAcc('employee@teamsync.internal')">Employee</button>
      </div>
    </div>

  </div>
</div>

<script>
function fillDemoAcc(email) {
  document.getElementById('php-login-email').value = email;
  document.getElementById('php-login-password').value = 'Password@123';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('php-login-btn');
  const errBox = document.getElementById('php-login-error');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errBox.style.display = 'none';

  const email = document.getElementById('php-login-email').value;
  const password = document.getElementById('php-login-password').value;

  try {
    const data = await API.login(email, password);
    showToast('Welcome back, ' + data.user.name + '!', 'success');
    setTimeout(() => {
      window.location.href = '/index.php#dashboard';
    }, 400);
  } catch (err) {
    errBox.textContent = err.message || 'Login failed. Please check your credentials.';
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}
</script>

<?php
include __DIR__ . '/includes/footer.php';
?>
