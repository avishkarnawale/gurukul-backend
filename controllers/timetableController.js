const Timetable = require('../models/Timetable');
const { asyncHandler } = require('../middleware/error');

// @desc    Create/update timetable for a class-day
// @route   POST /api/timetable
// @access  Staff only
exports.upsertTimetable = asyncHandler(async (req, res) => {
  const { class: cls, day, semester, academicYear, periods } = req.body;

  const timetable = await Timetable.findOneAndUpdate(
    { class: cls, day, academicYear },
    { class: cls, day, semester, academicYear, periods, createdBy: req.user._id },
    { upsert: true, new: true, runValidators: true }
  ).populate('periods.teacher', 'name');

  res.status(201).json({ success: true, data: timetable });
});

// @desc    Get full weekly timetable for a class
// @route   GET /api/timetable/:class
// @access  Private
exports.getClassTimetable = asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  const filter = { class: req.params.class };
  if (academicYear) filter.academicYear = academicYear;

  const timetable = await Timetable.find(filter)
    .populate('periods.teacher', 'name')
    .sort({ day: 1 });

  // Organize by day
  const organized = {};
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  dayOrder.forEach(d => { organized[d] = []; });
  timetable.forEach(t => { organized[t.day] = t.periods; });

  res.json({ success: true, data: organized });
});

// @desc    Get today's timetable for logged-in student
// @route   GET /api/timetable/today
// @access  Private
exports.getTodayTimetable = asyncHandler(async (req, res) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const cls = req.user.class;

  const timetable = await Timetable.findOne({ class: cls, day: today }).populate('periods.teacher', 'name');
  res.json({ success: true, day: today, data: timetable ? timetable.periods : [] });
});

// @desc    Get staff timetable (all classes they teach)
// @route   GET /api/timetable/staff
// @access  Staff only
exports.getStaffTimetable = asyncHandler(async (req, res) => {
  const timetable = await Timetable.find({ 'periods.teacher': req.user._id });
  res.json({ success: true, data: timetable });
});

// @desc    Delete timetable entry
// @route   DELETE /api/timetable/:id
// @access  Staff only
exports.deleteTimetable = asyncHandler(async (req, res) => {
  await Timetable.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Timetable deleted' });
});
