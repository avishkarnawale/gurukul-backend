const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const profile = {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    class: user.class,
    rollNumber: user.rollNumber,
    employeeId: user.employeeId,
    department: user.department,
    avatar: user.avatar,
  };
  res.status(statusCode).json({
    success: true,
    token,
    access_token: token,
    role: user.role,
    user: profile,
  });
};

module.exports = { generateToken, sendTokenResponse };
