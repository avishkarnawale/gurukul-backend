const express = require('express');
const router = express.Router();
const { studentLogin, staffLogin, getMe, updateProfile, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/student-login', studentLogin);   // Roll + DOB
router.post('/staff-login', staffLogin);       // Email + Password
router.post('/forgot-password', forgotPassword); // Admin OTP request (WhatsApp)
router.post('/reset-password', resetPassword);   // Verify OTP + set new password
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
