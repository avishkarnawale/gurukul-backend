const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getClasses } = require('../controllers/metaController');

// ── Dashboard ────────────────────────────────────────────────────────────────
const dashboardRouter = express.Router();
const { adminDashboard, studentDashboard } = require('../controllers/dashboardController');
dashboardRouter.get('/admin', protect, authorize('staff', 'admin'), adminDashboard);
dashboardRouter.get('/student', protect, authorize('student'), studentDashboard);

// ── Attendance ───────────────────────────────────────────────────────────────
const attendanceRouter = express.Router();
const { markAttendance, getMyAttendance, getStudentAttendance, getClassAttendance, get7DaySummary } = require('../controllers/attendanceController');
attendanceRouter.post('/', protect, authorize('staff', 'admin'), markAttendance);
attendanceRouter.get('/me', protect, authorize('student'), getMyAttendance);
attendanceRouter.get('/7day', protect, authorize('staff', 'admin'), get7DaySummary);
attendanceRouter.get('/class', protect, authorize('staff', 'admin'), getClassAttendance);
attendanceRouter.get('/student/:studentId', protect, authorize('staff', 'admin'), getStudentAttendance);

// ── Homework ─────────────────────────────────────────────────────────────────
const homeworkRouter = express.Router();
const { createHomework, getHomework, getSingleHomework, submitHomework, gradeSubmission, getPendingCount, updateHomework, deleteHomework } = require('../controllers/homeworkController');
homeworkRouter.post('/', protect, authorize('staff', 'admin'), createHomework);
homeworkRouter.get('/', protect, getHomework);
homeworkRouter.get('/pending', protect, authorize('student'), getPendingCount);
homeworkRouter.get('/:id', protect, getSingleHomework);
homeworkRouter.post('/:id/submit', protect, authorize('student'), submitHomework);
homeworkRouter.put('/:id/grade/:studentId', protect, authorize('staff', 'admin'), gradeSubmission);
homeworkRouter.put('/:id', protect, authorize('staff', 'admin'), updateHomework);
homeworkRouter.delete('/:id', protect, authorize('staff', 'admin'), deleteHomework);

// ── Grades / Results ─────────────────────────────────────────────────────────
const gradeRouter = express.Router();
const { addGrade, bulkAddGrades, getStudentGrades, getClassGrades, updateGrade, deleteGrade } = require('../controllers/gradeController');
gradeRouter.post('/', protect, authorize('staff', 'admin'), addGrade);
gradeRouter.post('/bulk', protect, authorize('staff', 'admin'), bulkAddGrades);
gradeRouter.get('/me', protect, authorize('student'), getStudentGrades);
gradeRouter.get('/student/:studentId', protect, authorize('staff', 'admin'), getStudentGrades);
gradeRouter.get('/class', protect, authorize('staff', 'admin'), getClassGrades);
gradeRouter.put('/:id', protect, authorize('staff', 'admin'), updateGrade);
gradeRouter.delete('/:id', protect, authorize('staff', 'admin'), deleteGrade);

// ── Notices (Announcements) ──────────────────────────────────────────────────
const noticeRouter = express.Router();
const { createAnnouncement, getAnnouncements, getAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
noticeRouter.post('/', protect, authorize('staff', 'admin'), createAnnouncement);
noticeRouter.get('/', protect, getAnnouncements);
noticeRouter.get('/:id', protect, getAnnouncement);
noticeRouter.put('/:id', protect, authorize('staff', 'admin'), updateAnnouncement);
noticeRouter.delete('/:id', protect, authorize('staff', 'admin'), deleteAnnouncement);

// ── Notifications ────────────────────────────────────────────────────────────
const notificationRouter = express.Router();
const {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
notificationRouter.get('/me', protect, authorize('student'), getMyNotifications);
notificationRouter.get('/me/unread-count', protect, authorize('student'), getUnreadCount);
notificationRouter.put('/me/read-all', protect, authorize('student'), markAllRead);
notificationRouter.put('/:id/read', protect, authorize('student'), markRead);

// ── Contacts (student → teachers) ─────────────────────────────────────────────
const contactsRouter = express.Router();
const { getTeachersForStudent } = require('../controllers/contactsController');
contactsRouter.get('/teachers', protect, authorize('student'), getTeachersForStudent);

// ── Meta ─────────────────────────────────────────────────────────────────────
const metaRouter = express.Router();
metaRouter.get('/classes', protect, authorize('staff', 'admin'), getClasses);

// ── Fees ─────────────────────────────────────────────────────────────────────
const feesRouter = express.Router();
const { createFee, createBulkFees, recordPayment, getMyFees, getMyFeeReceipt, assignMissingFees, getStudentFees, getAllPendingFees, getAllFees, updateFee, deleteFee } = require('../controllers/feesController');
// Fees management is owner/admin only — teachers (staff) have no fee access.
feesRouter.get('/', protect, authorize('admin'), getAllFees);
feesRouter.post('/', protect, authorize('admin'), createFee);
feesRouter.post('/bulk', protect, authorize('admin'), createBulkFees);
feesRouter.post('/assign-missing', protect, authorize('admin'), assignMissingFees);
feesRouter.get('/me', protect, authorize('student'), getMyFees);
feesRouter.get('/me/:feeId/receipt/:paymentId', protect, authorize('student'), getMyFeeReceipt);
feesRouter.get('/pending', protect, authorize('admin'), getAllPendingFees);
feesRouter.get('/student/:studentId', protect, authorize('admin'), getStudentFees);
feesRouter.post('/:id/pay', protect, authorize('admin'), recordPayment);
feesRouter.put('/:id', protect, authorize('admin'), updateFee);
feesRouter.delete('/:id', protect, authorize('admin'), deleteFee);

// ── Notes & PYQs ─────────────────────────────────────────────────────────────
const noteRouter = express.Router();
const { uploadNote, getNotes, getNote, incrementDownload, updateNote, deleteNote, getSubjects } = require('../controllers/noteController');
noteRouter.post('/', protect, authorize('staff', 'admin'), uploadNote);
noteRouter.get('/', protect, getNotes);
noteRouter.get('/subjects', protect, getSubjects);
noteRouter.get('/:id', protect, getNote);
noteRouter.put('/:id/download', protect, incrementDownload);
noteRouter.put('/:id', protect, authorize('staff', 'admin'), updateNote);
noteRouter.delete('/:id', protect, authorize('staff', 'admin'), deleteNote);

// ── Users (Admin Management) ─────────────────────────────────────────────────
const userRouter = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  resetStudentPassword,
  deleteUser,
} = require('../controllers/userController');
const { getStudentSummary, getStudentSummaryPdf } = require('../controllers/studentSummaryController');
userRouter.get('/', protect, authorize('staff', 'admin'), getAllUsers);
// Creating students/teachers is owner/admin only — teachers can view, not manage.
userRouter.post('/', protect, authorize('admin'), createUser);
userRouter.get('/:id/summary/pdf', protect, authorize('staff', 'admin'), getStudentSummaryPdf);
userRouter.get('/:id/summary', protect, authorize('staff', 'admin'), getStudentSummary);
userRouter.get('/:id', protect, authorize('staff', 'admin'), getUser);
userRouter.put('/:id', protect, authorize('admin'), updateUser);
userRouter.put('/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);
userRouter.put('/:id/reset-password', protect, authorize('admin'), resetStudentPassword);
userRouter.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = {
  dashboardRouter,
  attendanceRouter,
  homeworkRouter,
  gradeRouter,
  noticeRouter,
  feesRouter,
  noteRouter,
  userRouter,
  metaRouter,
  notificationRouter,
  contactsRouter,
};
