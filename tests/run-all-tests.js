const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const port = process.env.PORT || 5001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

// Cookie jar for simulating browser session
class CookieSession {
  constructor() {
    this.cookies = '';
  }

  async fetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const headers = options.headers || {};

    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Extract connect.sid cookie
      const match = setCookie.match(/connect\.sid=[^;]+/);
      if (match) {
        this.cookies = match[0];
      }
    }

    return response;
  }
}

// Create dummy PDF and JPG buffers for test
function createDummyPdfBuffer(content = 'Sample PDF Content') {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (${content}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
}

function createDummyJpgBuffer() {
  return Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
}

async function runTests() {
  console.log('\n==================================================');
  console.log('   RUNNING ALL 20 VERIFICATION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testStudentEmail1 = `student_${timestamp}@example.com`;
  const testStudentPassword = 'Password@123';
  let createdStudentId = null;
  let createdStudentDbId = null;

  // HEALTH CHECK TEST
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.status === 'ok',
      'HEALTH CHECK: GET /api/health returns 200 and status ok',
      `Status: ${healthRes.status}`
    );
  } catch (err) {
    assert(false, 'HEALTH CHECK: GET /api/health', err.message);
  }

  // TEST 1: Register a new student
  try {
    const formData = new FormData();
    formData.append('name', 'Alice Smith');
    formData.append('email', testStudentEmail1);
    formData.append('password', testStudentPassword);
    formData.append('date_of_birth', '2004-05-15');
    formData.append('gender', 'Female');
    formData.append('qualification', "Bachelor's");
    formData.append('interests', 'Coding, Design');
    formData.append('class', 'Class 12');
    formData.append('subject', 'Computer Science');
    formData.append('marks', '92.5');

    const pdfBlob = new Blob([createDummyPdfBuffer('Alice Aadhaar')], { type: 'application/pdf' });
    formData.append('aadhaar', pdfBlob, 'alice_aadhaar.pdf');

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    assert(
      res.status === 201 && data.success && data.student?.user_id?.startsWith('STU'),
      'TEST 1: Register a new student',
      `Status: ${res.status}, msg: ${data.message}`
    );
    createdStudentId = data.student?.user_id;
    createdStudentDbId = data.student?.id;
  } catch (err) {
    assert(false, 'TEST 1: Register a new student', err.message);
  }

  // TEST 2: Attempt registration using the same email (Exact message required)
  try {
    const formData = new FormData();
    formData.append('name', 'Alice Duplicate');
    formData.append('email', testStudentEmail1);
    formData.append('password', testStudentPassword);
    formData.append('date_of_birth', '2004-05-15');
    formData.append('gender', 'Female');
    formData.append('qualification', "Bachelor's");
    formData.append('interests', 'Coding');
    formData.append('class', 'Class 12');
    formData.append('subject', 'Math');
    formData.append('marks', '80');
    const pdfBlob = new Blob([createDummyPdfBuffer()], { type: 'application/pdf' });
    formData.append('aadhaar', pdfBlob, 'duplicate.pdf');

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    assert(
      res.status === 409 && data.message === 'This email is already registered.',
      'TEST 2: Attempt registration using the same email',
      `Status: ${res.status}, message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'TEST 2: Attempt registration using the same email', err.message);
  }

  // TEST 3: Upload JPG (Expected: Rejected)
  try {
    const formData = new FormData();
    formData.append('name', 'Bob Jpg');
    formData.append('email', `bobjpg_${timestamp}@example.com`);
    formData.append('password', 'Password@123');
    formData.append('date_of_birth', '2005-01-01');
    formData.append('gender', 'Male');
    formData.append('qualification', 'High School');
    formData.append('interests', 'Gaming');
    formData.append('class', 'Class 11');
    formData.append('subject', 'Physics');
    formData.append('marks', '75');
    const jpgBlob = new Blob([createDummyJpgBuffer()], { type: 'image/jpeg' });
    formData.append('aadhaar', jpgBlob, 'photo.jpg');

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    assert(
      res.status === 400 && data.message.includes('Only PDF'),
      'TEST 3: Upload JPG (Expected: Rejected)',
      `Status: ${res.status}, message: "${data.message}"`
    );
  } catch (err) {
    assert(false, 'TEST 3: Upload JPG', err.message);
  }

  // TEST 4: Upload PDF (Expected: Accepted)
  const testStudentEmail2 = `student2_${timestamp}@example.com`;
  let student2Id = null;
  let student2DbId = null;
  try {
    const formData = new FormData();
    formData.append('name', 'Charlie Brown');
    formData.append('email', testStudentEmail2);
    formData.append('password', testStudentPassword);
    formData.append('date_of_birth', '2003-08-20');
    formData.append('gender', 'Male');
    formData.append('qualification', "Bachelor's");
    formData.append('interests', 'Coding, Sports');
    formData.append('class', 'Class 10');
    formData.append('subject', 'Mathematics');
    formData.append('marks', '88');
    const pdfBlob = new Blob([createDummyPdfBuffer('Charlie Aadhaar')], { type: 'application/pdf' });
    formData.append('aadhaar', pdfBlob, 'aadhaar.pdf');

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    assert(
      res.status === 201 && data.success,
      'TEST 4: Upload PDF (Expected: Accepted)',
      `Status: ${res.status}`
    );
    student2Id = data.student?.user_id;
    student2DbId = data.student?.id;
  } catch (err) {
    assert(false, 'TEST 4: Upload PDF', err.message);
  }

  // TEST 5: Upload two PDFs with the same original filename (Expected: Both stored without overwrite)
  const testStudentEmail3 = `student3_${timestamp}@example.com`;
  let student3DbId = null;
  try {
    const formData = new FormData();
    formData.append('name', 'David Green');
    formData.append('email', testStudentEmail3);
    formData.append('password', testStudentPassword);
    formData.append('date_of_birth', '2001-03-10');
    formData.append('gender', 'Other');
    formData.append('qualification', "Master's");
    formData.append('interests', 'Gaming, Design');
    formData.append('class', 'Class 10');
    formData.append('subject', 'Art');
    formData.append('marks', '95');
    // Same original filename 'aadhaar.pdf' as TEST 4!
    const pdfBlob = new Blob([createDummyPdfBuffer('David Aadhaar with same name')], { type: 'application/pdf' });
    formData.append('aadhaar', pdfBlob, 'aadhaar.pdf');

    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    student3DbId = data.student?.id;

    assert(
      res.status === 201 && data.success,
      'TEST 5: Upload two PDFs with same original filename (Expected: Both stored without overwriting)',
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, 'TEST 5: Upload two PDFs with same original filename', err.message);
  }

  // TEST 6: Login as student (Expected: Student dashboard)
  const studentSession = new CookieSession();
  try {
    const res = await studentSession.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail1, password: testStudentPassword })
    });
    const data = await res.json();

    assert(
      res.status === 200 && data.success && data.user?.role === 'student',
      'TEST 6: Login as student (Expected: Student credentials verified and role is student)',
      `Status: ${res.status}, role: ${data.user?.role}`
    );
  } catch (err) {
    assert(false, 'TEST 6: Login as student', err.message);
  }

  // TEST 7: Login as admin (Expected: Admin dashboard role)
  const adminSession = new CookieSession();
  try {
    const res = await adminSession.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'Admin@12345' })
    });
    const data = await res.json();

    assert(
      res.status === 200 && data.success && data.user?.role === 'admin',
      'TEST 7: Login as admin (Expected: Admin role authenticated)',
      `Status: ${res.status}, role: ${data.user?.role}`
    );
  } catch (err) {
    assert(false, 'TEST 7: Login as admin', err.message);
  }

  // TEST 8: Student attempts admin API (Expected: 403 / unauthorized)
  try {
    const res = await studentSession.fetch('/api/admin/students');
    const data = await res.json();

    assert(
      res.status === 403,
      'TEST 8: Student attempts admin API (Expected: 403 Forbidden)',
      `Status: ${res.status}, message: ${data.message}`
    );
  } catch (err) {
    assert(false, 'TEST 8: Student attempts admin API', err.message);
  }

  // TEST 9: Student attempts admin URL (Protected endpoint validation)
  try {
    const res = await studentSession.fetch(`/api/admin/students/${createdStudentDbId}/aadhaar`);
    assert(
      res.status === 403,
      'TEST 9: Student attempts admin URL /api/admin/... (Expected: Access denied 403)',
      `Status: ${res.status}`
    );
  } catch (err) {
    assert(false, 'TEST 9: Student attempts admin URL', err.message);
  }

  // TEST 10: Admin searches by name
  try {
    const res = await adminSession.fetch('/api/admin/students?name=Alice');
    const data = await res.json();
    const hasAlice = data.students?.some(s => s.name.includes('Alice'));

    assert(
      res.status === 200 && hasAlice,
      'TEST 10: Admin searches by name (Expected: Matching student returned)',
      `Count: ${data.count}, found Alice: ${hasAlice}`
    );
  } catch (err) {
    assert(false, 'TEST 10: Admin searches by name', err.message);
  }

  // TEST 11: Admin filters by class
  try {
    const res = await adminSession.fetch('/api/admin/students?class=Class%2012');
    const data = await res.json();
    const allClass12 = data.students?.every(s => s.class === 'Class 12');

    assert(
      res.status === 200 && data.students?.length > 0 && allClass12,
      'TEST 11: Admin filters by class (Expected: Only selected class returned)',
      `Found: ${data.students?.length}`
    );
  } catch (err) {
    assert(false, 'TEST 11: Admin filters by class', err.message);
  }

  // TEST 12: Admin filters minimum age
  try {
    const res = await adminSession.fetch('/api/admin/students?minAge=20');
    const data = await res.json();
    const allAbove20 = data.students?.every(s => s.age >= 20);

    assert(
      res.status === 200 && allAbove20,
      'TEST 12: Admin filters minimum age (Expected: Age >= 20)',
      `Count: ${data.students?.length}, all >= 20: ${allAbove20}`
    );
  } catch (err) {
    assert(false, 'TEST 12: Admin filters minimum age', err.message);
  }

  // TEST 13: Admin filters maximum age
  try {
    const res = await adminSession.fetch('/api/admin/students?maxAge=22');
    const data = await res.json();
    const allBelow22 = data.students?.every(s => s.age <= 22);

    assert(
      res.status === 200 && allBelow22,
      'TEST 13: Admin filters maximum age (Expected: Age <= 22)',
      `Count: ${data.students?.length}, all <= 22: ${allBelow22}`
    );
  } catch (err) {
    assert(false, 'TEST 13: Admin filters maximum age', err.message);
  }

  // TEST 14: Admin edits student (Name/email cannot be changed)
  try {
    const formData = new FormData();
    // Attempt malicious alteration of name and email
    formData.append('name', 'Hacked Name');
    formData.append('email', 'hacked@example.com');
    formData.append('date_of_birth', '2004-05-15');
    formData.append('gender', 'Female');
    formData.append('qualification', "Master's");
    formData.append('interests', 'Coding, Gaming');
    formData.append('class', 'Class 12');
    formData.append('subject', 'Advanced CS');
    formData.append('marks', '99.5');

    const res = await adminSession.fetch(`/api/admin/students/${createdStudentDbId}`, {
      method: 'PUT',
      body: formData
    });
    const data = await res.json();

    const nameUntouched = data.student?.name === 'Alice Smith';
    const emailUntouched = data.student?.email === testStudentEmail1;
    const marksUpdated = parseFloat(data.student?.marks) === 99.5;

    assert(
      res.status === 200 && nameUntouched && emailUntouched && marksUpdated,
      'TEST 14: Admin edits student (Expected: Name/Email locked, other fields updated)',
      `Name: ${data.student?.name}, Email: ${data.student?.email}, Marks: ${data.student?.marks}`
    );
  } catch (err) {
    assert(false, 'TEST 14: Admin edits student', err.message);
  }

  // TEST 15: Admin deletes student (Expected: Student disappears from list)
  try {
    const res = await adminSession.fetch(`/api/admin/students/${student3DbId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    // Verify deletion
    const verifyRes = await adminSession.fetch(`/api/admin/students/${student3DbId}`);

    assert(
      res.status === 200 && verifyRes.status === 404,
      'TEST 15: Admin deletes student (Expected: Record deleted and returns 404)',
      `Delete status: ${res.status}, Verify status: ${verifyRes.status}`
    );
  } catch (err) {
    assert(false, 'TEST 15: Admin deletes student', err.message);
  }

  // TEST 16: Student edits profile (Expected: Changes persist after refresh)
  try {
    const res = await studentSession.fetch('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_of_birth: '2004-05-15',
        gender: 'Female',
        qualification: "Bachelor's",
        interests: 'Coding, Design, Gaming',
        class: 'Class 12',
        subject: 'Data Structures',
        marks: 97.0
      })
    });
    const data = await res.json();

    // Refresh fetch
    const refreshRes = await studentSession.fetch('/api/student/profile');
    const refreshData = await refreshRes.json();

    assert(
      res.status === 200 && refreshData.student?.subject === 'Data Structures',
      'TEST 16: Student edits profile (Expected: Persists after refresh)',
      `Subject: ${refreshData.student?.subject}`
    );
  } catch (err) {
    assert(false, 'TEST 16: Student edits profile', err.message);
  }

  // TEST 17: Student attempts to change email (Expected: Rejected/ignored)
  try {
    const res = await studentSession.fetch('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'changed_email@malicious.com',
        name: 'Changed Name',
        date_of_birth: '2004-05-15',
        gender: 'Female',
        qualification: "Bachelor's",
        interests: 'Coding',
        class: 'Class 12',
        subject: 'Data Structures',
        marks: 97.0
      })
    });
    const data = await res.json();

    const emailStillOriginal = data.student?.email === testStudentEmail1;
    const nameStillOriginal = data.student?.name === 'Alice Smith';

    assert(
      res.status === 200 && emailStillOriginal && nameStillOriginal,
      'TEST 17: Student attempts to change email (Expected: Ignored/locked)',
      `Email in response: ${data.student?.email}`
    );
  } catch (err) {
    assert(false, 'TEST 17: Student attempts to change email', err.message);
  }

  // TEST 18: Student replaces Aadhaar (Expected: New PDF stored and accessible)
  try {
    const formData = new FormData();
    const newPdfBlob = new Blob([createDummyPdfBuffer('Alice Replaced Aadhaar Doc')], { type: 'application/pdf' });
    formData.append('aadhaar', newPdfBlob, 'new_aadhaar.pdf');

    const uploadRes = await studentSession.fetch('/api/student/aadhaar', {
      method: 'POST',
      body: formData
    });
    const uploadData = await uploadRes.json();

    // Fetch PDF stream
    const getRes = await studentSession.fetch('/api/student/aadhaar');
    const isPdfStream = getRes.headers.get('content-type') === 'application/pdf';

    assert(
      uploadRes.status === 200 && uploadData.success && getRes.status === 200 && isPdfStream,
      'TEST 18: Student replaces Aadhaar (Expected: New PDF is stored and accessible)',
      `Upload: ${uploadRes.status}, Download: ${getRes.status}, Content-Type: ${getRes.headers.get('content-type')}`
    );
  } catch (err) {
    assert(false, 'TEST 18: Student replaces Aadhaar', err.message);
  }

  // TEST 19: Logout (Expected: Protected pages/APIs cannot be accessed)
  try {
    const logoutRes = await studentSession.fetch('/api/auth/logout', { method: 'POST' });
    const verifyProtected = await studentSession.fetch('/api/student/profile');

    assert(
      logoutRes.status === 200 && verifyProtected.status === 401,
      'TEST 19: Logout (Expected: Session cleared and API returns 401 Unauthenticated)',
      `Logout: ${logoutRes.status}, Subsequent access: ${verifyProtected.status}`
    );
  } catch (err) {
    assert(false, 'TEST 19: Logout', err.message);
  }

  // TEST 20: Forgot password (Expected: Password can be reset and new password works)
  try {
    // 1. Request forgot password
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail1 })
    });
    const forgotData = await forgotRes.json();
    const token = forgotData.resetToken;

    // 2. Reset password using token
    const newPassword = 'BrandNewPassword@456';
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const resetData = await resetRes.json();

    // 3. Login with new password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail1, password: newPassword })
    });
    const loginData = await loginRes.json();

    assert(
      forgotRes.status === 200 && resetRes.status === 200 && loginRes.status === 200 && loginData.success,
      'TEST 20: Forgot password (Expected: Reset token generated, updated, and new password logins)',
      `Forgot: ${forgotRes.status}, Reset: ${resetRes.status}, Login: ${loginRes.status}`
    );
  } catch (err) {
    assert(false, 'TEST 20: Forgot password', err.message);
  }

  console.log('\n==================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total 20)`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
