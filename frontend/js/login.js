document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('alertBox');
  const loginBtn = document.getElementById('loginBtn');
  const loginSpinner = document.getElementById('loginSpinner');
  const loginBtnText = document.getElementById('loginBtnText');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');

  // Check if session is already active
  try {
    const meEndpoint = window.apiUrl ? window.apiUrl('/api/auth/me') : '/api/auth/me';
    const res = await fetch(meEndpoint);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === 'admin') {
          window.location.href = 'admin-dashboard.html';
          return;
        } else {
          window.location.href = 'student-dashboard.html';
          return;
        }
      }
    }
  } catch {
    // Ignore and proceed to normal login
  }

  // Password Visibility Toggle
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordIcon.classList.toggle('bi-eye', !isPassword);
    togglePasswordIcon.classList.toggle('bi-eye-slash', isPassword);
  });

  function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} mb-4`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  }

  function hideAlert() {
    alertBox.classList.add('d-none');
    alertBox.textContent = '';
  }

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      form.classList.add('was-validated');
      showAlert('Please enter both email and password.', 'warning');
      return;
    }

    loginBtn.disabled = true;
    loginSpinner.classList.remove('d-none');
    loginBtnText.textContent = ' Signing In...';

    try {
      const loginEndpoint = window.apiUrl ? window.apiUrl('/api/auth/login') : '/api/auth/login';
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        showAlert('Login successful! Redirecting...', 'success');

        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
          } else {
            window.location.href = 'student-dashboard.html';
          }
        }, 800);
      } else {
        showAlert(data.message || 'Invalid email or password.', 'danger');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Server connection error. Please try again later.', 'danger');
    } finally {
      loginBtn.disabled = false;
      loginSpinner.classList.add('d-none');
      loginBtnText.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In';
    }
  });
});
