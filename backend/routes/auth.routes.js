const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { handleAadhaarUpload } = require('../middleware/upload.middleware');

router.post('/register', handleAadhaarUpload('aadhaar', true), authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getMe);

module.exports = router;
