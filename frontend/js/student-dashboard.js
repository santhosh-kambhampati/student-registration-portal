document.addEventListener('DOMContentLoaded', async () => {
  let currentStudentData = null;

  const globalAlert = document.getElementById('globalAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  // Display Elements
  const navStudentEmail = document.getElementById('navStudentEmail');
  const welcomeHeading = document.getElementById('welcomeHeading');
  const displayFullName = document.getElementById('displayFullName');
  const displayEmail = document.getElementById('displayEmail');
  const displayUserId = document.getElementById('displayUserId');
  const displayDob = document.getElementById('displayDob');
  const displayGender = document.getElementById('displayGender');
  const displayQualification = document.getElementById('displayQualification');
  const displayInterests = document.getElementById('displayInterests');
  const displayClass = document.getElementById('displayClass');
  const displaySubject = document.getElementById('displaySubject');
  const displayMarks = document.getElementById('displayMarks');
  const lastUpdatedText = document.getElementById('lastUpdatedText');
  const viewAadhaarBtn = document.getElementById('viewAadhaarBtn');

  // Edit Modal Elements
  const editProfileModalEl = document.getElementById('editProfileModal');
  const editProfileModal = new bootstrap.Modal(editProfileModalEl);
  const editProfileForm = document.getElementById('editProfileForm');
  const modalAlertBox = document.getElementById('modalAlertBox');
  const modalLockedName = document.getElementById('modalLockedName');
  const modalLockedEmail = document.getElementById('modalLockedEmail');
  const modalDob = document.getElementById('modalDob');
  const modalGender = document.getElementById('modalGender');
  const modalQualification = document.getElementById('modalQualification');
  const modalClass = document.getElementById('modalClass');
  const modalSubject = document.getElementById('modalSubject');
  const modalMarks = document.getElementById('modalMarks');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const saveProfileSpinner = document.getElementById('saveProfileSpinner');
  const saveProfileBtnText = document.getElementById('saveProfileBtnText');

  // Replace Aadhaar Modal Elements
  const replaceAadhaarModalEl = document.getElementById('replaceAadhaarModal');
  const replaceAadhaarModal = new bootstrap.Modal(replaceAadhaarModalEl);
  const replaceAadhaarForm = document.getElementById('replaceAadhaarForm');
  const replaceAlertBox = document.getElementById('replaceAlertBox');
  const newAadhaarFileInput = document.getElementById('newAadhaarFile');
  const uploadAadhaarBtn = document.getElementById('uploadAadhaarBtn');
  const uploadAadhaarSpinner = document.getElementById('uploadAadhaarSpinner');
  const uploadAadhaarBtnText = document.getElementById('uploadAadhaarBtnText');

  function showGlobalAlert(message, type = 'success') {
    globalAlert.className = `alert alert-${type} mb-4`;
    globalAlert.textContent = message;
    globalAlert.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      globalAlert.classList.add('d-none');
    }, 5000);
  }

  // 1. Authenticate Session
  async function checkAuth() {
    try {
      const meEndpoint = window.apiUrl ? window.apiUrl('/api/auth/me') : '/api/auth/me';
      const res = await fetch(meEndpoint);
      if (!res.ok) {
        window.location.href = 'login.html';
        return false;
      }
      const data = await res.json();
      if (!data.success || !data.user) {
        window.location.href = 'login.html';
        return false;
      }
      return true;
    } catch (err) {
      console.error('Auth verification error:', err);
      window.location.href = 'login.html';
      return false;
    }
  }

  // 2. Load Profile Data
  async function loadProfile() {
    try {
      const profileEndpoint = window.apiUrl ? window.apiUrl('/api/student/profile') : '/api/student/profile';
      const res = await fetch(profileEndpoint);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await res.json();
      if (data.success && data.student) {
        currentStudentData = data.student;
        renderProfile(currentStudentData);
      }
    } catch (err) {
      console.error('Error loading student profile:', err);
      showGlobalAlert('Failed to load profile details from server.', 'danger');
    }
  }

  function renderProfile(student) {
    navStudentEmail.textContent = student.email;
    // Welcome banner requirement: "Welcome, [User Name] (User ID: #[USER_ID])"
    welcomeHeading.textContent = `Welcome, ${student.name} (User ID: #${student.user_id})`;

    displayFullName.textContent = student.name;
    displayEmail.textContent = student.email;
    displayUserId.textContent = student.user_id;
    displayDob.textContent = student.date_of_birth ? student.date_of_birth.substring(0, 10) : '-';
    displayGender.textContent = student.gender || '-';
    displayQualification.textContent = student.qualification || '-';
    displayInterests.textContent = student.interests || '-';
    displayClass.textContent = student.class || '-';
    displaySubject.textContent = student.subject || '-';
    displayMarks.textContent = `${parseFloat(student.marks).toFixed(1)} / 100`;

    if (student.updated_at) {
      const d = new Date(student.updated_at);
      lastUpdatedText.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (student.aadhaar_file) {
      viewAadhaarBtn.classList.remove('disabled');
      const aadhaarUrl = window.apiUrl ? window.apiUrl('/api/student/aadhaar') : '/api/student/aadhaar';
      viewAadhaarBtn.setAttribute('href', aadhaarUrl);
    } else {
      viewAadhaarBtn.classList.add('disabled');
      viewAadhaarBtn.removeAttribute('href');
    }
  }

  // Populate Edit Modal
  editProfileModalEl.addEventListener('show.bs.modal', () => {
    if (!currentStudentData) return;
    modalAlertBox.classList.add('d-none');
    modalLockedName.value = currentStudentData.name;
    modalLockedEmail.value = currentStudentData.email;
    modalDob.value = currentStudentData.date_of_birth ? currentStudentData.date_of_birth.substring(0, 10) : '';
    modalGender.value = currentStudentData.gender || 'Male';
    modalQualification.value = currentStudentData.qualification || "High School";
    modalClass.value = currentStudentData.class || '';
    modalSubject.value = currentStudentData.subject || '';
    modalMarks.value = currentStudentData.marks || '';

    // Checkboxes
    const interestList = currentStudentData.interests ? currentStudentData.interests.split(',').map(s => s.trim()) : [];
    document.querySelectorAll('.modal-interest-cb').forEach(cb => {
      cb.checked = interestList.includes(cb.value);
    });
  });

  // Handle Edit Profile Form Submit
  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalAlertBox.classList.add('d-none');

    const selectedInterests = Array.from(document.querySelectorAll('.modal-interest-cb:checked')).map(cb => cb.value);
    if (selectedInterests.length === 0) {
      modalAlertBox.className = 'alert alert-danger mb-3';
      modalAlertBox.textContent = 'Please select at least one interest.';
      modalAlertBox.classList.remove('d-none');
      return;
    }

    const payload = {
      date_of_birth: modalDob.value,
      gender: modalGender.value,
      qualification: modalQualification.value,
      interests: selectedInterests.join(', '),
      class: modalClass.value.trim(),
      subject: modalSubject.value.trim(),
      marks: parseFloat(modalMarks.value)
    };

    saveProfileBtn.disabled = true;
    saveProfileSpinner.classList.remove('d-none');
    saveProfileBtnText.textContent = ' Saving...';

    try {
      const updateEndpoint = window.apiUrl ? window.apiUrl('/api/student/profile') : '/api/student/profile';
      const response = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        currentStudentData = data.student;
        renderProfile(currentStudentData);
        editProfileModal.hide();
        showGlobalAlert('Profile updated successfully!', 'success');
      } else {
        modalAlertBox.className = 'alert alert-danger mb-3';
        modalAlertBox.textContent = data.message || 'Failed to update profile.';
        modalAlertBox.classList.remove('d-none');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      modalAlertBox.className = 'alert alert-danger mb-3';
      modalAlertBox.textContent = 'Server connection error. Please try again.';
      modalAlertBox.classList.remove('d-none');
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileSpinner.classList.add('d-none');
      saveProfileBtnText.innerHTML = '<i class="bi bi-save me-1"></i> Save Changes';
    }
  });

  // Handle Replace Aadhaar Form Submit
  replaceAadhaarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    replaceAlertBox.classList.add('d-none');

    const file = newAadhaarFileInput.files[0];
    if (!file) {
      replaceAlertBox.className = 'alert alert-danger mb-3';
      replaceAlertBox.textContent = 'Please select a PDF file to upload.';
      replaceAlertBox.classList.remove('d-none');
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      replaceAlertBox.className = 'alert alert-danger mb-3';
      replaceAlertBox.textContent = 'Invalid file format. Only PDF files are allowed.';
      replaceAlertBox.classList.remove('d-none');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      replaceAlertBox.className = 'alert alert-danger mb-3';
      replaceAlertBox.textContent = 'File size exceeds 5 MB limit.';
      replaceAlertBox.classList.remove('d-none');
      return;
    }

    const formData = new FormData();
    formData.append('aadhaar', file);

    uploadAadhaarBtn.disabled = true;
    uploadAadhaarSpinner.classList.remove('d-none');
    uploadAadhaarBtnText.textContent = ' Uploading...';

    try {
      const uploadEndpoint = window.apiUrl ? window.apiUrl('/api/student/aadhaar') : '/api/student/aadhaar';
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        replaceAadhaarModal.hide();
        replaceAadhaarForm.reset();
        await loadProfile();
        showGlobalAlert('Aadhaar document updated successfully!', 'success');
      } else {
        replaceAlertBox.className = 'alert alert-danger mb-3';
        replaceAlertBox.textContent = data.message || 'Failed to replace Aadhaar document.';
        replaceAlertBox.classList.remove('d-none');
      }
    } catch (err) {
      console.error('Aadhaar upload error:', err);
      replaceAlertBox.className = 'alert alert-danger mb-3';
      replaceAlertBox.textContent = 'Server connection error. Please try again.';
      replaceAlertBox.classList.remove('d-none');
    } finally {
      uploadAadhaarBtn.disabled = false;
      uploadAadhaarSpinner.classList.add('d-none');
      uploadAadhaarBtnText.innerHTML = '<i class="bi bi-upload me-1"></i> Upload & Replace';
    }
  });

  // Logout Handler
  logoutBtn.addEventListener('click', async () => {
    try {
      const logoutEndpoint = window.apiUrl ? window.apiUrl('/api/auth/logout') : '/api/auth/logout';
      await fetch(logoutEndpoint, { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = 'login.html';
    }
  });

  // Init
  const authed = await checkAuth();
  if (authed) {
    loadProfile();
  }
});
