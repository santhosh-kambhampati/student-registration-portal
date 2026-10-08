document.addEventListener('DOMContentLoaded', async () => {
  let allStudents = [];
  let studentToDelete = null;

  // Header Elements
  const adminUserEmail = document.getElementById('adminUserEmail');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const adminGlobalAlert = document.getElementById('adminGlobalAlert');

  // Stats Elements
  const statTotalStudents = document.getElementById('statTotalStudents');
  const statTotalClasses = document.getElementById('statTotalClasses');
  const statAvgMarks = document.getElementById('statAvgMarks');
  const filteredCountBadge = document.getElementById('filteredCountBadge');

  // Filter Elements
  const filterName = document.getElementById('filterName');
  const filterClass = document.getElementById('filterClass');
  const filterMinAge = document.getElementById('filterMinAge');
  const filterMaxAge = document.getElementById('filterMaxAge');
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  // Table Body
  const tableBody = document.getElementById('studentsTableBody');

  // Edit Modal Elements
  const adminEditModalEl = document.getElementById('adminEditModal');
  const adminEditModal = new bootstrap.Modal(adminEditModalEl);
  const adminEditForm = document.getElementById('adminEditForm');
  const adminModalAlert = document.getElementById('adminModalAlert');
  const editStudentId = document.getElementById('editStudentId');
  const editUserId = document.getElementById('editUserId');
  const editName = document.getElementById('editName');
  const editEmail = document.getElementById('editEmail');
  const editDob = document.getElementById('editDob');
  const editGender = document.getElementById('editGender');
  const editQualification = document.getElementById('editQualification');
  const editClass = document.getElementById('editClass');
  const editSubject = document.getElementById('editSubject');
  const editMarks = document.getElementById('editMarks');
  const editAadhaar = document.getElementById('editAadhaar');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const saveEditSpinner = document.getElementById('saveEditSpinner');
  const saveEditBtnText = document.getElementById('saveEditBtnText');

  // Delete Modal Elements
  const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
  const deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalEl);
  const deleteStudentName = document.getElementById('deleteStudentName');
  const deleteStudentInfo = document.getElementById('deleteStudentInfo');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const confirmDeleteSpinner = document.getElementById('confirmDeleteSpinner');
  const confirmDeleteBtnText = document.getElementById('confirmDeleteBtnText');

  function showAlert(message, type = 'success') {
    adminGlobalAlert.className = `alert alert-${type} mb-4`;
    adminGlobalAlert.textContent = message;
    adminGlobalAlert.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      adminGlobalAlert.classList.add('d-none');
    }, 5000);
  }

  // 1. Verify Admin Authentication & Role
  async function checkAdminAuth() {
    try {
      const meEndpoint = window.apiUrl ? window.apiUrl('/api/auth/me') : '/api/auth/me';
      const res = await fetch(meEndpoint);
      if (!res.ok) {
        window.location.href = 'login.html';
        return false;
      }
      const data = await res.json();
      if (!data.success || !data.user || data.user.role !== 'admin') {
        alert('Access denied. Administrator privileges required.');
        window.location.href = 'login.html';
        return false;
      }
      adminUserEmail.textContent = data.user.email;
      return true;
    } catch (err) {
      console.error('Admin auth check failed:', err);
      window.location.href = 'login.html';
      return false;
    }
  }

  // 2. Load Students List with Filters
  async function loadStudents() {
    try {
      const queryParams = new URLSearchParams();

      const nameVal = filterName.value.trim();
      const classVal = filterClass.value;
      const minAgeVal = filterMinAge.value.trim();
      const maxAgeVal = filterMaxAge.value.trim();

      if (nameVal) queryParams.append('name', nameVal);
      if (classVal && classVal !== 'All') queryParams.append('class', classVal);
      if (minAgeVal) queryParams.append('minAge', minAgeVal);
      if (maxAgeVal) queryParams.append('maxAge', maxAgeVal);

      const path = `/api/admin/students?${queryParams.toString()}`;
      const url = window.apiUrl ? window.apiUrl(path) : path;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to load students');
      }

      const data = await res.json();
      allStudents = data.students || [];

      renderTable(allStudents);
      updateStats(allStudents);
      populateClassFilterOptions(allStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-circle me-1"></i> Failed to load student records from server.
          </td>
        </tr>
      `;
    }
  }

  // 3. Render Table
  function renderTable(students) {
    filteredCountBadge.textContent = `${students.length} ${students.length === 1 ? 'Student' : 'Students'}`;

    if (students.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>
            No student records match the selected search criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = students.map((s) => {
      const dobFormatted = s.date_of_birth ? s.date_of_birth.substring(0, 10) : '-';
      const ageDisplay = s.age !== null && s.age !== undefined ? `${s.age} yrs` : '-';
      const marksDisplay = parseFloat(s.marks).toFixed(1);
      const aadhaarUrl = window.apiUrl ? window.apiUrl(`/api/admin/students/${s.id}/aadhaar`) : `/api/admin/students/${s.id}/aadhaar`;

      return `
        <tr data-student-id="${s.id}">
          <td class="fw-bold text-primary">${escapeHtml(s.user_id)}</td>
          <td class="fw-medium">${escapeHtml(s.name)}</td>
          <td><span class="text-muted small">${escapeHtml(s.email)}</span></td>
          <td><span class="badge bg-light text-dark border">${ageDisplay}</span></td>
          <td>${escapeHtml(s.gender)}</td>
          <td><span class="small">${escapeHtml(s.qualification)}</span></td>
          <td><span class="badge bg-secondary bg-opacity-10 text-secondary">${escapeHtml(s.class)}</span></td>
          <td>${escapeHtml(s.subject)}</td>
          <td class="fw-bold text-success">${marksDisplay}</td>
          <td>
            <a href="${aadhaarUrl}" target="_blank" class="btn btn-outline-primary btn-sm py-1 px-2">
              <i class="bi bi-file-earmark-pdf me-1"></i> View Aadhaar
            </a>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary edit-btn" data-id="${s.id}" title="Edit student">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger delete-btn" data-id="${s.id}" title="Delete student">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row event listeners
    tableBody.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    tableBody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
  }

  // 4. Update Overview Stats
  function updateStats(students) {
    statTotalStudents.textContent = students.length;

    const distinctClasses = new Set(students.map(s => s.class).filter(Boolean));
    statTotalClasses.textContent = distinctClasses.size;

    if (students.length > 0) {
      const totalMarks = students.reduce((acc, curr) => acc + parseFloat(curr.marks || 0), 0);
      statAvgMarks.textContent = (totalMarks / students.length).toFixed(1);
    } else {
      statAvgMarks.textContent = '0.0';
    }
  }

  // 5. Populate Class Filter Dropdown
  let classesPopulated = false;
  function populateClassFilterOptions(students) {
    if (classesPopulated) return;
    const currentSelected = filterClass.value;
    const classes = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `Class ${c}`;
      filterClass.appendChild(opt);
    });

    if (currentSelected) {
      filterClass.value = currentSelected;
    }
    classesPopulated = true;
  }

  // 6. Instant Filter Listeners
  let debounceTimer;
  function triggerFilteredSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadStudents();
    }, 250);
  }

  filterName.addEventListener('input', triggerFilteredSearch);
  filterClass.addEventListener('change', loadStudents);
  filterMinAge.addEventListener('input', triggerFilteredSearch);
  filterMaxAge.addEventListener('input', triggerFilteredSearch);
  applyFilterBtn.addEventListener('click', loadStudents);

  clearFiltersBtn.addEventListener('click', () => {
    filterName.value = '';
    filterClass.value = 'All';
    filterMinAge.value = '';
    filterMaxAge.value = '';
    loadStudents();
  });

  // 7. Open Edit Modal
  function openEditModal(studentId) {
    const student = allStudents.find(s => String(s.id) === String(studentId));
    if (!student) return;

    adminModalAlert.classList.add('d-none');
    adminEditForm.reset();

    editStudentId.value = student.id;
    editUserId.value = student.user_id;
    editName.value = student.name;
    editEmail.value = student.email;
    editDob.value = student.date_of_birth ? student.date_of_birth.substring(0, 10) : '';
    editGender.value = student.gender || 'Male';
    editQualification.value = student.qualification || "High School";
    editClass.value = student.class || '';
    editSubject.value = student.subject || '';
    editMarks.value = student.marks || '';

    const interestList = student.interests ? student.interests.split(',').map(i => i.trim()) : [];
    document.querySelectorAll('.admin-edit-interest').forEach(cb => {
      cb.checked = interestList.includes(cb.value);
    });

    adminEditModal.show();
  }

  // 8. Submit Edit Form
  adminEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminModalAlert.classList.add('d-none');

    const studentId = editStudentId.value;
    const selectedInterests = Array.from(document.querySelectorAll('.admin-edit-interest:checked')).map(cb => cb.value);

    if (selectedInterests.length === 0) {
      adminModalAlert.className = 'alert alert-danger mb-3';
      adminModalAlert.textContent = 'Please select at least one interest.';
      adminModalAlert.classList.remove('d-none');
      return;
    }

    const formData = new FormData();
    formData.append('date_of_birth', editDob.value);
    formData.append('gender', editGender.value);
    formData.append('qualification', editQualification.value);
    formData.append('interests', selectedInterests.join(', '));
    formData.append('class', editClass.value.trim());
    formData.append('subject', editSubject.value.trim());
    formData.append('marks', editMarks.value);

    const newAadhaarFile = editAadhaar.files[0];
    if (newAadhaarFile) {
      if (!newAadhaarFile.name.toLowerCase().endsWith('.pdf')) {
        adminModalAlert.className = 'alert alert-danger mb-3';
        adminModalAlert.textContent = 'Only PDF files are allowed.';
        adminModalAlert.classList.remove('d-none');
        return;
      }
      formData.append('aadhaar', newAadhaarFile);
    }

    saveEditBtn.disabled = true;
    saveEditSpinner.classList.remove('d-none');
    saveEditBtnText.textContent = ' Saving...';

    try {
      const updateEndpoint = window.apiUrl ? window.apiUrl(`/api/admin/students/${studentId}`) : `/api/admin/students/${studentId}`;
      const response = await fetch(updateEndpoint, {
        method: 'PUT',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        adminEditModal.hide();
        await loadStudents();
        showAlert(`Student ${data.student?.name} details updated successfully.`, 'success');
      } else {
        adminModalAlert.className = 'alert alert-danger mb-3';
        adminModalAlert.textContent = data.message || 'Failed to update student.';
        adminModalAlert.classList.remove('d-none');
      }
    } catch (err) {
      console.error('Error updating student:', err);
      adminModalAlert.className = 'alert alert-danger mb-3';
      adminModalAlert.textContent = 'Server connection error. Please try again.';
      adminModalAlert.classList.remove('d-none');
    } finally {
      saveEditBtn.disabled = false;
      saveEditSpinner.classList.add('d-none');
      saveEditBtnText.innerHTML = '<i class="bi bi-save me-1"></i> Save Changes';
    }
  });

  // 9. Open Delete Confirmation Modal
  function openDeleteModal(studentId) {
    const student = allStudents.find(s => String(s.id) === String(studentId));
    if (!student) return;

    studentToDelete = student;
    deleteStudentName.textContent = student.name;
    deleteStudentInfo.textContent = `User ID: ${student.user_id} | Email: ${student.email} | Class: ${student.class}`;

    deleteConfirmModal.show();
  }

  // 10. Confirm Delete
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!studentToDelete) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteSpinner.classList.remove('d-none');
    confirmDeleteBtnText.textContent = ' Deleting...';

    try {
      const deleteEndpoint = window.apiUrl ? window.apiUrl(`/api/admin/students/${studentToDelete.id}`) : `/api/admin/students/${studentToDelete.id}`;
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        deleteConfirmModal.hide();
        showAlert(data.message || `Student ${studentToDelete.name} deleted successfully.`, 'success');
        studentToDelete = null;
        await loadStudents();
      } else {
        alert(data.message || 'Failed to delete student.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Server error occurred while deleting student.');
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteSpinner.classList.add('d-none');
      confirmDeleteBtnText.innerHTML = '<i class="bi bi-trash3-fill me-1"></i> Delete Student';
    }
  });

  // 11. Admin Logout
  adminLogoutBtn.addEventListener('click', async () => {
    try {
      const logoutEndpoint = window.apiUrl ? window.apiUrl('/api/auth/logout') : '/api/auth/logout';
      await fetch(logoutEndpoint, { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = 'login.html';
    }
  });

  // Helper escape function
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Boot
  const authed = await checkAdminAuth();
  if (authed) {
    loadStudents();
  }
});
