const express = require('express');
const router = express.Router();
const { studentLogin, staffLogin, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/student-login', studentLogin);   // Roll + DOB
router.post('/staff-login', staffLogin);       // Email + Password
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
