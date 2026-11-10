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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <label class="form-label" style="margin-bottom:0;">Password</label>
          <a href="javascript:void(0)" onclick="openForgotPasswordModal()" style="font-size:12px;color:var(--primary);text-decoration:none;font-weight:600;">Forgot Password?</a>
        </div>
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

<!-- Forgot / Reset Password Modal -->
<div id="forgot-password-modal" class="modal-backdrop">
  <div class="modal-dialog" style="max-width:440px;">
    <div class="modal-header">
      <h3 id="fp-modal-title">Reset Your Password</h3>
      <button class="icon-btn btn-sm" onclick="closeForgotPasswordModal()">✕</button>
    </div>

    <!-- Step 1: Request Reset Token -->
    <form id="fp-step1-form" onsubmit="handleForgotPasswordRequest(event)">
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
          Enter your registered work email address below. We'll verify your account and provide a password reset token.
        </p>

        <div class="form-group">
          <label class="form-label">Work Email <span class="req">*</span></label>
          <input type="email" id="fp-email" class="form-control" placeholder="name@teamsync.internal" required>
        </div>

        <div id="fp-step1-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:14px;"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeForgotPasswordModal()">Cancel</button>
        <button type="submit" id="fp-step1-btn" class="btn btn-primary">
          <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          Continue
        </button>
      </div>
    </form>

    <!-- Step 2: Set New Password -->
    <form id="fp-step2-form" onsubmit="handleResetPasswordSubmit(event)" style="display:none;">
      <div class="modal-body">
        <div style="background-color:var(--surface-hover);padding:10px 14px;border-radius:var(--radius-md);margin-bottom:16px;border:1px solid var(--border-color);font-size:12px;">
          <span style="color:var(--text-muted);">Resetting password for:</span><br>
          <strong id="fp-target-email" style="color:var(--text-main);"></strong>
        </div>

        <div class="form-group">
          <label class="form-label">Security Reset Token <span class="req">*</span></label>
          <input type="text" id="fp-token" class="form-control" required readonly style="background-color:var(--surface-hover);font-family:monospace;font-size:11px;">
        </div>

        <div class="form-group">
          <label class="form-label">New Password <span class="req">*</span></label>
          <input type="password" id="fp-new-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm New Password <span class="req">*</span></label>
          <input type="password" id="fp-confirm-password" class="form-control" placeholder="Re-type password" minlength="6" required>
        </div>

        <div id="fp-step2-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:14px;"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="backToStep1()">Back</button>
        <button type="submit" id="fp-step2-btn" class="btn btn-primary">
          <svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
          Save New Password
        </button>
      </div>
    </form>
  </div>
</div>

<script>
function fillDemoAcc(email) {
  document.getElementById('php-login-email').value = email;
  document.getElementById('php-login-password').value = 'Password@123';
}

function openForgotPasswordModal() {
  const currentEmail = document.getElementById('php-login-email').value.trim();
  if (currentEmail) {
    document.getElementById('fp-email').value = currentEmail;
  }
  document.getElementById('fp-step1-form').style.display = 'flex';
  document.getElementById('fp-step2-form').style.display = 'none';
  document.getElementById('fp-step1-error').style.display = 'none';
  document.getElementById('fp-step2-error').style.display = 'none';
  document.getElementById('fp-modal-title').textContent = 'Reset Your Password';
  document.getElementById('forgot-password-modal').classList.add('show');
}

function closeForgotPasswordModal() {
  document.getElementById('forgot-password-modal').classList.remove('show');
}

function backToStep1() {
  document.getElementById('fp-step1-form').style.display = 'flex';
  document.getElementById('fp-step2-form').style.display = 'none';
  document.getElementById('fp-modal-title').textContent = 'Reset Your Password';
}

async function handleForgotPasswordRequest(e) {
  e.preventDefault();
  const email = document.getElementById('fp-email').value.trim();
  const btn = document.getElementById('fp-step1-btn');
  const errBox = document.getElementById('fp-step1-error');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errBox.style.display = 'none';

  try {
    const data = await API.forgotPassword(email);
    document.getElementById('fp-target-email').textContent = data.email;
    document.getElementById('fp-token').value = data.token;
    document.getElementById('fp-new-password').value = '';
    document.getElementById('fp-confirm-password').value = '';

    document.getElementById('fp-step1-form').style.display = 'none';
    document.getElementById('fp-step2-form').style.display = 'flex';
    document.getElementById('fp-modal-title').textContent = 'Enter New Password';
    showToast('Reset verification token generated!', 'info');
  } catch (err) {
    errBox.textContent = err.message || 'Account not found or inactive.';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg> Continue`;
  }
}

async function handleResetPasswordSubmit(e) {
  e.preventDefault();
  const token = document.getElementById('fp-token').value;
  const newPassword = document.getElementById('fp-new-password').value;
  const confirmPassword = document.getElementById('fp-confirm-password').value;
  const btn = document.getElementById('fp-step2-btn');
  const errBox = document.getElementById('fp-step2-error');
  errBox.style.display = 'none';

  if (newPassword !== confirmPassword) {
    errBox.textContent = 'New passwords do not match.';
    errBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const res = await API.resetPassword(token, newPassword);
    closeForgotPasswordModal();
    showToast(res.message || 'Password reset successfully! Please sign in.', 'success');

    // Fill login email and new password so user can sign in immediately
    const email = document.getElementById('fp-target-email').textContent;
    document.getElementById('php-login-email').value = email;
    document.getElementById('php-login-password').value = newPassword;
  } catch (err) {
    errBox.textContent = err.message || 'Failed to reset password.';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg style="width:15px;height:15px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg> Save New Password`;
  }
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
