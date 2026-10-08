const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { handleAadhaarUpload } = require('../middleware/upload.middleware');

// Ensure student role check middleware
const isStudentRole = (req, res, next) => {
  if (req.user && (req.user.role === 'student' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access restricted to students.'
  });
};

router.use(isAuthenticated);
router.use(isStudentRole);

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.post('/aadhaar', handleAadhaarUpload('aadhaar', true), studentController.uploadAadhaar);
router.get('/aadhaar', studentController.getAadhaar);

module.exports = router;
