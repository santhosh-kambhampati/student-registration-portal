const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { safeDeleteFile } = require('../utils/file.utils');

/**
 * Generate next formatted student user ID (e.g. STU001, STU002)
 */
async function generateNextStudentId(connection) {
  const [rows] = await connection.query(
    "SELECT user_id FROM students WHERE user_id LIKE 'STU%' ORDER BY id DESC LIMIT 1"
  );

  if (rows.length === 0) {
    return 'STU001';
  }

  const lastId = rows[0].user_id; // e.g. STU007
  const numPart = parseInt(lastId.replace(/^STU/i, ''), 10);
  const nextNum = isNaN(numPart) ? 1 : numPart + 1;
  return `STU${String(nextNum).padStart(3, '0')}`;
}

/**
 * Register a new student
 */
async function register(req, res) {
  const uploadedFilePath = req.file ? req.file.path : null;

  try {
    const {
      name,
      email,
      password,
      date_of_birth,
      gender,
      qualification,
      interests,
      class: studentClass,
      subject,
      marks
    } = req.body;

    // 1. Validation checks
    if (!name || !name.trim()) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    if (!email || !email.trim()) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Email cannot be empty.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 6) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (!date_of_birth) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }

    const dobDate = new Date(date_of_birth);
    if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Date of birth must be a valid past date.' });
    }

    const validGenders = ['Male', 'Female', 'Other'];
    if (!gender || !validGenders.includes(gender)) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Gender is required and must be valid.' });
    }

    const validQualifications = ["High School", "Bachelor's", "Master's"];
    if (!qualification || !validQualifications.includes(qualification)) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Qualification is required.' });
    }

    // Process interests
    let parsedInterests = '';
    if (Array.isArray(interests)) {
      parsedInterests = interests.filter(Boolean).join(', ');
    } else if (typeof interests === 'string') {
      try {
        const parsed = JSON.parse(interests);
        if (Array.isArray(parsed)) {
          parsedInterests = parsed.filter(Boolean).join(', ');
        } else {
          parsedInterests = interests.trim();
        }
      } catch {
        parsedInterests = interests.trim();
      }
    }

    if (!parsedInterests) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'At least one interest is required.' });
    }

    if (!studentClass || !studentClass.trim()) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Class is required.' });
    }

    if (!subject || !subject.trim()) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }

    const parsedMarks = parseFloat(marks);
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: 'Marks must be a numeric value between 0 and 100.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar PDF document is mandatory.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
      // Requirement: "If the email already exists, display EXACTLY: 'This email is already registered.'"
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const studentUserId = await generateNextStudentId(connection);
      const aadhaarFileName = req.file.filename;

      const [result] = await connection.query(
        `INSERT INTO students (
          user_id, name, email, password_hash, date_of_birth, gender,
          qualification, interests, class, subject, marks, aadhaar_file, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student')`,
        [
          studentUserId,
          name.trim(),
          normalizedEmail,
          passwordHash,
          date_of_birth,
          gender,
          qualification,
          parsedInterests,
          studentClass.trim(),
          subject.trim(),
          parsedMarks,
          aadhaarFileName
        ]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Registration successful! You can now log in.',
        student: {
          id: result.insertId,
          user_id: studentUserId,
          name: name.trim(),
          email: normalizedEmail
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (uploadedFilePath) safeDeleteFile(uploadedFilePath);
    console.error('Registration error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.'
    });
  }
}

/**
 * Unified login for both students and admins
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query(
      'SELECT id, user_id, name, email, password_hash, role FROM students WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Set authenticated session
    req.session.user = {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
}

/**
 * Log out user and destroy session
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Could not log out. Please try again.'
      });
    }

    res.clearCookie('connect.sid');
    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  });
}

/**
 * Get current authenticated user
 */
function getMe(req, res) {
  if (req.session && req.session.user) {
    return res.json({
      success: true,
      user: req.session.user
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Not authenticated.'
  });
}

/**
 * Generate password reset token
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id, name, email FROM students WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE students SET reset_token = ?, reset_token_expiry = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE id = ?',
      [resetToken, user.id]
    );

    // Development-safe response provides direct access link
    const resetUrl = `/reset-password.html?token=${resetToken}`;
    console.log(`[AUTH] Password reset requested for ${user.email}. Reset URL: ${resetUrl}`);

    return res.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetToken,
      resetUrl
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request.'
    });
  }
}

/**
 * Reset password using token
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required.'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Verify token exists and has not expired according to UTC_TIMESTAMP
    const [rows] = await pool.query(
      'SELECT id, email FROM students WHERE reset_token = ? AND reset_token_expiry > UTC_TIMESTAMP()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    const user = rows[0];
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE students SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [newPasswordHash, user.id]
    );

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.'
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
};
