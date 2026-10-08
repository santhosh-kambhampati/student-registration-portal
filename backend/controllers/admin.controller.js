const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { UPLOADS_DIR, safeDeleteFile } = require('../utils/file.utils');
const { saveAadhaarDocument, streamAadhaarDocument, deleteAadhaarDocument } = require('../utils/storage.utils');

/**
 * Get all students with dynamic filtering and calculated age
 */
async function getAllStudents(req, res) {
  try {
    const { name, class: studentClass, minAge, maxAge } = req.query;

    let query = `
      SELECT
        id,
        user_id,
        name,
        email,
        date_of_birth,
        TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age,
        gender,
        qualification,
        interests,
        class,
        subject,
        marks,
        aadhaar_file,
        role,
        created_at,
        updated_at
      FROM students
      WHERE role = 'student'
    `;
    const params = [];

    if (name && name.trim()) {
      query += ` AND name LIKE ?`;
      params.push(`%${name.trim()}%`);
    }

    if (studentClass && studentClass.trim() && studentClass !== 'All') {
      query += ` AND class = ?`;
      params.push(studentClass.trim());
    }

    if (minAge !== undefined && minAge !== '') {
      const minAgeNum = parseInt(minAge, 10);
      if (!isNaN(minAgeNum)) {
        query += ` AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= ?`;
        params.push(minAgeNum);
      }
    }

    if (maxAge !== undefined && maxAge !== '') {
      const maxAgeNum = parseInt(maxAge, 10);
      if (!isNaN(maxAgeNum)) {
        query += ` AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= ?`;
        params.push(maxAgeNum);
      }
    }

    query += ` ORDER BY id DESC`;

    const [rows] = await pool.query(query, params);

    return res.json({
      success: true,
      count: rows.length,
      students: rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students list.'
    });
  }
}

/**
 * Get student by ID
 */
async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
        id,
        user_id,
        name,
        email,
        date_of_birth,
        TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age,
        gender,
        qualification,
        interests,
        class,
        subject,
        marks,
        aadhaar_file,
        role,
        created_at,
        updated_at
      FROM students
      WHERE id = ? AND role = 'student'`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    return res.json({
      success: true,
      student: rows[0]
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student details.'
    });
  }
}

/**
 * Update student by admin
 * (Name, Email, and user_id are strictly locked on backend)
 */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;

    // Check student existence
    const [existingRows] = await pool.query(
      'SELECT id, aadhaar_file FROM students WHERE id = ? AND role = "student"',
      [id]
    );

    if (existingRows.length === 0) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    const currentStudent = existingRows[0];
    const {
      date_of_birth,
      gender,
      qualification,
      interests,
      class: studentClass,
      subject,
      marks
    } = req.body;

    // Validate fields
    if (!date_of_birth) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Date of birth must be a valid past date.' });
    }

    const validGenders = ['Male', 'Female', 'Other'];
    if (!gender || !validGenders.includes(gender)) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Gender is required and must be valid.' });
    }

    const validQualifications = ["High School", "Bachelor's", "Master's"];
    if (!qualification || !validQualifications.includes(qualification)) {
      if (req.file) safeDeleteFile(req.file.path);
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
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'At least one interest is required.' });
    }

    if (!studentClass || !studentClass.trim()) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Class is required.' });
    }

    if (!subject || !subject.trim()) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }

    const parsedMarks = parseFloat(marks);
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Marks must be a numeric value between 0 and 100.'
      });
    }

    let updatedAadhaarFile = currentStudent.aadhaar_file;
    if (req.file) {
      const { filename: newAadhaar } = await saveAadhaarDocument(req.file.buffer, req.file.originalname);
      updatedAadhaarFile = newAadhaar;
    }

    // Name, Email, and user_id are strictly excluded from update
    await pool.query(
      `UPDATE students SET
        date_of_birth = ?,
        gender = ?,
        qualification = ?,
        interests = ?,
        class = ?,
        subject = ?,
        marks = ?,
        aadhaar_file = ?
      WHERE id = ? AND role = 'student'`,
      [
        date_of_birth,
        gender,
        qualification,
        parsedInterests,
        studentClass.trim(),
        subject.trim(),
        parsedMarks,
        updatedAadhaarFile,
        id
      ]
    );

    // If new file was uploaded, remove old file
    if (req.file && currentStudent.aadhaar_file && currentStudent.aadhaar_file !== updatedAadhaarFile) {
      await deleteAadhaarDocument(currentStudent.aadhaar_file);
    }

    const [updatedRows] = await pool.query(
      `SELECT
        id, user_id, name, email, date_of_birth,
        TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age,
        gender, qualification, interests, class, subject, marks,
        aadhaar_file, role, created_at, updated_at
      FROM students
      WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'Student details updated successfully.',
      student: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating student by admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student.'
    });
  }
}

/**
 * Delete student by admin
 */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name, aadhaar_file FROM students WHERE id = ? AND role = "student"',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or cannot be deleted.'
      });
    }

    const student = rows[0];

    // Delete record from DB
    await pool.query('DELETE FROM students WHERE id = ? AND role = "student"', [id]);

    // Safely delete associated Aadhaar document
    if (student.aadhaar_file) {
      await deleteAadhaarDocument(student.aadhaar_file);
    }

    return res.json({
      success: true,
      message: `Student ${student.name} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student.'
    });
  }
}

/**
 * View/download student's Aadhaar PDF document by admin
 */
async function getStudentAadhaar(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT user_id, name, aadhaar_file FROM students WHERE id = ? AND role = "student"',
      [id]
    );

    if (rows.length === 0 || !rows[0].aadhaar_file) {
      return res.status(404).json({
        success: false,
        message: 'No Aadhaar document found for this student.'
      });
    }

    const student = rows[0];
    return streamAadhaarDocument(student.aadhaar_file, res, `aadhaar-${student.user_id}.pdf`);
  } catch (error) {
    console.error('Error streaming student Aadhaar file to admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student Aadhaar file.'
    });
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentAadhaar
};
