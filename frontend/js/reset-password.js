document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetForm');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtnText = document.getElementById('submitBtnText');
  const successActionBox = document.getElementById('successActionBox');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const toggleNewPasswordBtn = document.getElementById('toggleNewPassword');
  const toggleNewPasswordIcon = document.getElementById('toggleNewPasswordIcon');

  // Parse token from query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} mb-4`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  }

  function hideAlert() {
    alertBox.classList.add('d-none');
    alertBox.textContent = '';
  }

  if (!token) {
    showAlert('Invalid or missing password reset token. Please request a new link.', 'warning');
    submitBtn.disabled = true;
    newPasswordInput.disabled = true;
    confirmPasswordInput.disabled = true;
    return;
  }

  // Toggle Password Visibility
  toggleNewPasswordBtn.addEventListener('click', () => {
    const isPassword = newPasswordInput.getAttribute('type') === 'password';
    newPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
    toggleNewPasswordIcon.classList.toggle('bi-eye', !isPassword);
    toggleNewPasswordIcon.classList.toggle('bi-eye-slash', isPassword);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || newPassword.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'danger');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match. Please re-enter.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitSpinner.classList.remove('d-none');
    submitBtnText.textContent = ' Updating...';

    try {
      const resetEndpoint = window.apiUrl ? window.apiUrl('/api/auth/reset-password') : '/api/auth/reset-password';
      const response = await fetch(resetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert(data.message || 'Password reset successfully! You can now log in.', 'success');
        form.classList.add('d-none');
        successActionBox.classList.remove('d-none');
      } else {
        showAlert(data.message || 'Invalid or expired reset token.', 'danger');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      showAlert('Server connection error. Please try again.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
      submitBtnText.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Update Password';
    }
  });
});
