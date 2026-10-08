document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtnText = document.getElementById('submitBtnText');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const aadhaarInput = document.getElementById('aadhaar');
  const genderError = document.getElementById('genderError');
  const interestsError = document.getElementById('interestsError');

  // Password Visibility Toggle
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordIcon.classList.toggle('bi-eye', !isPassword);
    togglePasswordIcon.classList.toggle('bi-eye-slash', isPassword);
  });

  // Helper to show alert message
  function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} mb-4`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertBox.classList.add('d-none');
    alertBox.textContent = '';
  }

  // File change validation
  aadhaarInput.addEventListener('change', () => {
    const file = aadhaarInput.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.pdf')) {
        aadhaarInput.value = '';
        showAlert('Invalid file format. Only PDF files are allowed.', 'danger');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        aadhaarInput.value = '';
        showAlert('File size exceeds maximum limit of 5 MB.', 'danger');
        return;
      }
      hideAlert();
    }
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    let isValid = true;

    // Reset validation states
    form.classList.remove('was-validated');
    genderError.classList.add('d-none');
    interestsError.classList.add('d-none');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const dob = document.getElementById('date_of_birth').value;
    const gender = form.querySelector('input[name="gender"]:checked');
    const qualification = document.getElementById('qualification').value;
    const selectedInterests = Array.from(form.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.value);
    const studentClass = document.getElementById('class').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const marksVal = document.getElementById('marks').value;
    const aadhaarFile = aadhaarInput.files[0];

    // Validate fields
    if (!name) {
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      isValid = false;
    }

    if (!password || password.length < 6) {
      isValid = false;
    }

    if (!dob) {
      isValid = false;
    } else {
      const parsedDob = new Date(dob);
      if (isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
        isValid = false;
      }
    }

    if (!gender) {
      genderError.classList.remove('d-none');
      isValid = false;
    }

    if (!qualification) {
      isValid = false;
    }

    if (selectedInterests.length === 0) {
      interestsError.classList.remove('d-none');
      isValid = false;
    }

    if (!studentClass) {
      isValid = false;
    }

    if (!subject) {
      isValid = false;
    }

    const marks = parseFloat(marksVal);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      isValid = false;
    }

    if (!aadhaarFile) {
      isValid = false;
      showAlert('Aadhaar PDF document is mandatory.', 'danger');
      return;
    } else {
      const fileName = aadhaarFile.name.toLowerCase();
      if (!fileName.endsWith('.pdf')) {
        showAlert('Invalid file format. Only PDF files are allowed.', 'danger');
        return;
      }
      if (aadhaarFile.size > 5 * 1024 * 1024) {
        showAlert('File size exceeds maximum limit of 5 MB.', 'danger');
        return;
      }
    }

    if (!isValid || !form.checkValidity()) {
      form.classList.add('was-validated');
      showAlert('Please check and complete all required fields correctly.', 'warning');
      return;
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('date_of_birth', dob);
    formData.append('gender', gender.value);
    formData.append('qualification', qualification);
    selectedInterests.forEach(item => formData.append('interests', item));
    formData.append('class', studentClass);
    formData.append('subject', subject);
    formData.append('marks', marks);
    formData.append('aadhaar', aadhaarFile);

    // Set Loading State
    submitBtn.disabled = true;
    submitSpinner.classList.remove('d-none');
    submitBtnText.textContent = ' Registering...';

    try {
      const endpoint = window.apiUrl ? window.apiUrl('/api/auth/register') : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert(
          `Registration successful! Welcome, ${data.student?.name} (Student ID: ${data.student?.user_id}). Redirecting to login...`,
          'success'
        );
        form.reset();
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        // EXACT wording requirement check for duplicate email:
        // "This email is already registered."
        if (response.status === 409 || (data.message && data.message.includes('already registered'))) {
          showAlert('This email is already registered.', 'danger');
        } else {
          showAlert(data.message || 'Registration failed. Please check your inputs.', 'danger');
        }
      }
    } catch (err) {
      console.error('Registration fetch error:', err);
      showAlert('Unable to connect to server. Please ensure the backend is running.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
      submitBtnText.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Register Student';
    }
  });
});
