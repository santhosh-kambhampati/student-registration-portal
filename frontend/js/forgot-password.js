document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtnText = document.getElementById('submitBtnText');
  const devResetBox = document.getElementById('devResetBox');
  const directResetLink = document.getElementById('directResetLink');

  function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} mb-4`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  }

  function hideAlert() {
    alertBox.classList.add('d-none');
    alertBox.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    devResetBox.classList.add('d-none');

    const email = document.getElementById('email').value.trim();
    if (!email) {
      form.classList.add('was-validated');
      showAlert('Please enter your email address.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitSpinner.classList.remove('d-none');
    submitBtnText.textContent = ' Processing...';

    try {
      const forgotEndpoint = window.apiUrl ? window.apiUrl('/api/auth/forgot-password') : '/api/auth/forgot-password';
      const response = await fetch(forgotEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert(data.message || 'Reset link created successfully.', 'success');
        if (data.resetUrl) {
          directResetLink.href = data.resetUrl;
          devResetBox.classList.remove('d-none');
        }
      } else {
        showAlert(data.message || 'Failed to process request. Please check the email.', 'danger');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      showAlert('Server connection error. Please try again.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
      submitBtnText.innerHTML = '<i class="bi bi-send me-1"></i> Generate Reset Link';
    }
  });
});
