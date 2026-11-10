<?php
/**
 * TeamSync — Dedicated Forgot & Reset Password Page
 * Theme: Stitch Warm Sand Precision (#F6F3EC, #EEE9DF, #0E7490)
 */
$pageTitle = "Reset Password — TeamSync";
include __DIR__ . '/includes/header.php';
?>

<div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background-color:var(--bg-canvas);padding:24px;">
  <div class="card" style="width:100%;max-width:440px;padding:36px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);">
    
    <div style="text-align:center;margin-bottom:24px;">
      <div class="brand-icon" style="margin:0 auto 12px;width:40px;height:40px;font-size:22px;">T</div>
      <h2 id="page-fp-title" style="font-size:22px;font-weight:700;color:var(--text-main);margin-bottom:4px;">Reset Password</h2>
      <p id="page-fp-desc" style="font-size:13px;color:var(--text-muted);">Recover access to your TeamSync account</p>
    </div>

    <!-- Step 1: Request Reset Token -->
    <form id="standalone-fp-step1" onsubmit="handleStandaloneFpRequest(event)">
      <div class="form-group">
        <label class="form-label">Work Email <span class="req">*</span></label>
        <input type="email" id="standalone-fp-email" class="form-control" placeholder="name@teamsync.internal" required autofocus>
      </div>

      <div id="standalone-step1-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:16px;"></div>

      <button type="submit" id="standalone-step1-btn" class="btn btn-primary" style="width:100%;height:40px;font-size:14px;font-weight:600;">
        Continue
      </button>

      <div style="margin-top:20px;text-align:center;font-size:13px;color:var(--text-muted);">
        Remember your password? <a href="/login.php" style="font-weight:600;color:var(--primary);">Sign In</a>
      </div>
    </form>

    <!-- Step 2: Set New Password -->
    <form id="standalone-fp-step2" onsubmit="handleStandaloneResetSubmit(event)" style="display:none;">
      <div style="background-color:var(--surface-hover);padding:10px 14px;border-radius:var(--radius-md);margin-bottom:16px;border:1px solid var(--border-color);font-size:12px;">
        <span style="color:var(--text-muted);">Resetting password for:</span><br>
        <strong id="standalone-target-email" style="color:var(--text-main);"></strong>
      </div>

      <div class="form-group">
        <label class="form-label">Security Reset Token <span class="req">*</span></label>
        <input type="text" id="standalone-token" class="form-control" required readonly style="background-color:var(--surface-hover);font-family:monospace;font-size:11px;">
      </div>

      <div class="form-group">
        <label class="form-label">New Password <span class="req">*</span></label>
        <input type="password" id="standalone-new-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required>
      </div>

      <div class="form-group">
        <label class="form-label">Confirm New Password <span class="req">*</span></label>
        <input type="password" id="standalone-confirm-password" class="form-control" placeholder="Re-type password" minlength="6" required>
      </div>

      <div id="standalone-step2-error" style="display:none;padding:10px 14px;background-color:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border);border-radius:var(--radius-md);font-size:12px;margin-bottom:16px;"></div>

      <div style="display:flex;gap:10px;">
        <button type="button" class="btn btn-secondary" onclick="backToStandaloneStep1()" style="flex:1;">Back</button>
        <button type="submit" id="standalone-step2-btn" class="btn btn-primary" style="flex:2;height:40px;font-size:14px;font-weight:600;">
          Save Password
        </button>
      </div>
    </form>

  </div>
</div>

<script>
function backToStandaloneStep1() {
  document.getElementById('standalone-fp-step1').style.display = 'block';
  document.getElementById('standalone-fp-step2').style.display = 'none';
  document.getElementById('page-fp-title').textContent = 'Reset Password';
}

async function handleStandaloneFpRequest(e) {
  e.preventDefault();
  const email = document.getElementById('standalone-fp-email').value.trim();
  const btn = document.getElementById('standalone-step1-btn');
  const errBox = document.getElementById('standalone-step1-error');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errBox.style.display = 'none';

  try {
    const data = await API.forgotPassword(email);
    document.getElementById('standalone-target-email').textContent = data.email;
    document.getElementById('standalone-token').value = data.token;
    document.getElementById('standalone-new-password').value = '';
    document.getElementById('standalone-confirm-password').value = '';

    document.getElementById('standalone-fp-step1').style.display = 'none';
    document.getElementById('standalone-fp-step2').style.display = 'block';
    document.getElementById('page-fp-title').textContent = 'Enter New Password';
    showToast('Reset verification token generated!', 'info');
  } catch (err) {
    errBox.textContent = err.message || 'Account not found or inactive.';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue';
  }
}

async function handleStandaloneResetSubmit(e) {
  e.preventDefault();
  const token = document.getElementById('standalone-token').value;
  const newPassword = document.getElementById('standalone-new-password').value;
  const confirmPassword = document.getElementById('standalone-confirm-password').value;
  const btn = document.getElementById('standalone-step2-btn');
  const errBox = document.getElementById('standalone-step2-error');
  errBox.style.display = 'none';

  if (newPassword !== confirmPassword) {
    errBox.textContent = 'New passwords do not match.';
    errBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await API.resetPassword(token, newPassword);
    showToast(res.message || 'Password reset successfully! Redirecting to login...', 'success');
    setTimeout(() => {
      window.location.href = '/login.php';
    }, 1000);
  } catch (err) {
    errBox.textContent = err.message || 'Failed to reset password.';
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save Password';
  }
}
</script>

<?php
include __DIR__ . '/includes/footer.php';
?>
