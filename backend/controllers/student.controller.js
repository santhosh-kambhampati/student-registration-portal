const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { UPLOADS_DIR, safeDeleteFile } = require('../utils/file.utils');

/**
 * Get current authenticated student profile
 */
async function getProfile(req, res) {
  try {
    const studentId = req.user.id;
    const [rows] = await pool.query(
      `SELECT
        id, user_id, name, email, date_of_birth, gender,
        qualification, interests, class, subject, marks,
        aadhaar_file, role, created_at, updated_at
      FROM students
      WHERE id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.'
      });
    }

    return res.json({
      success: true,
      student: rows[0]
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile.'
    });
  }
}

/**
 * Update current authenticated student profile
 * (Name, Email, and User ID are strictly protected and locked)
 */
async function updateProfile(req, res) {
  try {
    const studentId = req.user.id;
    const {
      date_of_birth,
      gender,
      qualification,
      interests,
      class: studentClass,
      subject,
      marks
    } = req.body;

    // Validation
    if (!date_of_birth) {
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      return res.status(400).json({ success: false, message: 'Date of birth must be a valid past date.' });
    }

    const validGenders = ['Male', 'Female', 'Other'];
    if (!gender || !validGenders.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender is required and must be valid.' });
    }

    const validQualifications = ["High School", "Bachelor's", "Master's"];
    if (!qualification || !validQualifications.includes(qualification)) {
      return res.status(400).json({ success: false, message: 'Qualification is required.' });
    }

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
      return res.status(400).json({ success: false, message: 'At least one interest is required.' });
    }

    if (!studentClass || !studentClass.trim()) {
      return res.status(400).json({ success: false, message: 'Class is required.' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }

    const parsedMarks = parseFloat(marks);
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100) {
      return res.status(400).json({
        success: false,
        message: 'Marks must be a numeric value between 0 and 100.'
      });
    }

    // Notice: Name, Email, and user_id are intentionally excluded from the SQL update
    // even if passed by the client.
    await pool.query(
      `UPDATE students SET
        date_of_birth = ?,
        gender = ?,
        qualification = ?,
        interests = ?,
        class = ?,
        subject = ?,
        marks = ?
      WHERE id = ?`,
      [
        date_of_birth,
        gender,
        qualification,
        parsedInterests,
        studentClass.trim(),
        subject.trim(),
        parsedMarks,
        studentId
      ]
    );

    // Fetch updated record
    const [rows] = await pool.query(
      `SELECT
        id, user_id, name, email, date_of_birth, gender,
        qualification, interests, class, subject, marks,
        aadhaar_file, role, created_at, updated_at
      FROM students
      WHERE id = ?`,
      [studentId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      student: rows[0]
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student profile.'
    });
  }
}

/**
 * Replace student's Aadhaar document
 */
async function uploadAadhaar(req, res) {
  try {
    const studentId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar PDF document is mandatory.'
      });
    }

    // Get old file to delete after update
    const [rows] = await pool.query('SELECT aadhaar_file FROM students WHERE id = ?', [studentId]);
    const oldFileName = rows.length > 0 ? rows[0].aadhaar_file : null;

    const newFileName = req.file.filename;

    await pool.query('UPDATE students SET aadhaar_file = ? WHERE id = ?', [newFileName, studentId]);

    // Safely remove old file if it exists and is different
    if (oldFileName && oldFileName !== newFileName) {
      safeDeleteFile(oldFileName);
    }

    return res.json({
      success: true,
      message: 'Aadhaar document uploaded successfully.',
      aadhaar_file: newFileName
    });
  } catch (error) {
    if (req.file) {
      safeDeleteFile(req.file.path);
    }
    console.error('Error uploading Aadhaar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload Aadhaar document.'
    });
  }
}

/**
 * Download/view student's Aadhaar document
 */
async function getAadhaar(req, res) {
  try {
    const studentId = req.user.id;
    const [rows] = await pool.query(
      'SELECT user_id, aadhaar_file FROM students WHERE id = ?',
      [studentId]
    );

    if (rows.length === 0 || !rows[0].aadhaar_file) {
      return res.status(404).json({
        success: false,
        message: 'No Aadhaar document found for this account.'
      });
    }

    const fileName = rows[0].aadhaar_file;
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Aadhaar document file not found on server.'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="aadhaar-${rows[0].user_id}.pdf"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error fetching Aadhaar file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving Aadhaar document.'
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAadhaar,
  getAadhaar
};
