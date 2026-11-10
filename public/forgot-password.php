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
        <div style="position:relative;display:flex;align-items:center;">
          <input type="password" id="standalone-new-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required style="padding-right:40px;">
          <button type="button" onclick="togglePasswordVisibility('standalone-new-password', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
            <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Confirm New Password <span class="req">*</span></label>
        <div style="position:relative;display:flex;align-items:center;">
          <input type="password" id="standalone-confirm-password" class="form-control" placeholder="Re-type password" minlength="6" required style="padding-right:40px;">
          <button type="button" onclick="togglePasswordVisibility('standalone-confirm-password', this)" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;" title="Show Password">
            <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
        </div>
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
function togglePasswordVisibility(inputId, btnEl) {
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
}

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
