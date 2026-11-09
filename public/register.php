<?php
/**
 * TeamSync — Employee & Manager Account Registration Page
 * Pure PHP Template + Vanilla JS Fetch API
 * Theme: Stitch Warm Sand Precision (#F6F3EC, #EEE9DF, #0E7490)
 */
$pageTitle = "Create an Account — TeamSync";
include __DIR__ . '/includes/header.php';
?>

<div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background-color:var(--bg-canvas);padding:24px;">
  <div class="card" style="width:100%;max-width:520px;padding:36px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);">
    
    <div style="text-align:center;margin-bottom:24px;">
      <div class="brand-icon" style="margin:0 auto 12px;width:40px;height:40px;font-size:22px;">T</div>
      <h2 style="font-size:24px;font-weight:700;color:var(--text-main);margin-bottom:4px;">Join TeamSync</h2>
      <p style="font-size:13px;color:var(--text-muted);">Create your employee or manager account to collaborate on projects</p>
    </div>

    <form id="register-form" onsubmit="handleRegister(event)">
      <div class="form-group">
        <label class="form-label">Full Name <span class="req">*</span></label>
        <input type="text" id="reg-name" class="form-control" placeholder="e.g. John Doe" required autofocus>
      </div>

      <div class="form-group">
        <label class="form-label">Work Email <span class="req">*</span></label>
        <input type="email" id="reg-email" class="form-control" placeholder="name@teamsync.internal" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Password <span class="req">*</span></label>
          <input type="password" id="reg-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password <span class="req">*</span></label>
          <input type="password" id="reg-confirm-password" class="form-control" placeholder="Re-type password" minlength="6" required>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Account Role <span class="req">*</span></label>
          <select id="reg-role" class="form-control" required>
            <option value="3" selected>Employee</option>
            <option value="2">Project Manager</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <select id="reg-dept" class="form-control">
            <option value="">Select Department...</option>
            <option value="1">Engineering</option>
            <option value="2">Operations</option>
            <option value="3">Product Design</option>
            <option value="4">Marketing</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Job Title</label>
        <input type="text" id="reg-title" class="form-control" placeholder="e.g. Frontend Developer, QA Engineer">
      </div>

      <div id="register-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:16px;"></div>

      <button type="submit" id="reg-submit-btn" class="btn btn-primary" style="width:100%;height:42px;font-size:14px;font-weight:600;margin-top:8px;">
        Create Account
      </button>
    </form>

    <div style="margin-top:24px;text-align:center;font-size:13px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:16px;">
      Already have an account? <a href="/login.php" style="font-weight:600;color:var(--primary);">Sign In</a>
    </div>

  </div>
</div>

<script>
async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-submit-btn');
  const errBox = document.getElementById('register-error');
  errBox.style.display = 'none';

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  const role_id = parseInt(document.getElementById('reg-role').value, 10);
  const department_id = document.getElementById('reg-dept').value ? parseInt(document.getElementById('reg-dept').value, 10) : null;
  const job_title = document.getElementById('reg-title').value.trim();

  if (password !== confirmPassword) {
    errBox.textContent = 'Passwords do not match.';
    errBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating Account...';

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role_id, department_id, job_title })
    });

    const data = await res.json();

    if (!res.ok) {
      throw data.error || { message: 'Registration failed.' };
    }

    // Save token and user info
    localStorage.setItem('teamsync_token', data.data.token);
    localStorage.setItem('teamsync_user', JSON.stringify(data.data.user));

    showToast('Account registered successfully! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/index.php#dashboard';
    }, 800);
  } catch (err) {
    errBox.textContent = err.message || 'Registration failed. Please try again.';
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}
</script>

<?php
include __DIR__ . '/includes/footer.php';
?>
