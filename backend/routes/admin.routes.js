const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const { handleAadhaarUpload } = require('../middleware/upload.middleware');

// All admin routes strictly require authentication and admin role
router.use(isAuthenticated);
router.use(isAdmin);

router.get('/students', adminController.getAllStudents);
router.get('/students/:id', adminController.getStudentById);
router.put('/students/:id', handleAadhaarUpload('aadhaar', false), adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);
router.get('/students/:id/aadhaar', adminController.getStudentAadhaar);

module.exports = router;
