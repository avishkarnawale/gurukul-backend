const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { getCanonicalClasses, sortClasses } = require('../utils/classes');

// @desc    Class list for dropdowns (Class 1–10 × CBSE/SSC)
// @route   GET /api/meta/classes
// @access  Staff/Admin
exports.getClasses = asyncHandler(async (req, res) => {
  const counts = await User.aggregate([
    { $match: { role: 'student', class: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$class', count: { $sum: 1 } } },
  ]);
  const countByClass = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  const data = getCanonicalClasses()
    .map((c) => ({ ...c, studentCount: countByClass[c.id] || 0 }))
    .sort(sortClasses);

  res.json({ success: true, data });
});
