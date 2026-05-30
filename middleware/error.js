// Catch async errors without try/catch in every controller
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler (mount last in app.js)
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    statusCode = 400;
  }
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }
  // Invalid ObjectId
  if (err.name === 'CastError') {
    message = `Invalid ID: ${err.value}`;
    statusCode = 400;
  }

  res.status(statusCode).json({ success: false, error: message, message });
};

module.exports = { asyncHandler, errorHandler };
