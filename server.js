require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const {
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
} = require('./routes/index');

connectDB();

const app = express();

app.use(helmet());

// CORS: allow comma-separated origins from CLIENT_URL. Use "*" (or leave unset)
// to allow every origin. localhost is always allowed so local dev never breaks.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes('*');
const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header), wildcard config, configured
    // origins, and any localhost port (dev) — otherwise reject.
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin) || isLocalhost(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: '🎓 Gurukul Classes API running', timestamp: new Date() }));

// Routes
app.use('/api/public',       publicRoutes);
app.use('/api/auth',         authRoutes);
app.use('/api/dashboard',    dashboardRouter);
app.use('/api/attendance',   attendanceRouter);
app.use('/api/homework',     homeworkRouter);
app.use('/api/results',      gradeRouter);
app.use('/api/notices',      noticeRouter);
app.use('/api/fees',         feesRouter);
app.use('/api/notes',        noteRouter);
app.use('/api/users',        userRouter);
app.use('/api/meta',         metaRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/contacts',      contactsRouter);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Gurukul Classes API on port ${PORT}`));

module.exports = app;
