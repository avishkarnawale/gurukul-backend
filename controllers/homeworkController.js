const Homework = require('../models/Homework');
const { asyncHandler } = require('../middleware/error');

// @desc    Create homework
// @route   POST /api/homework
// @access  Staff/Admin
exports.createHomework = asyncHandler(async (req, res) => {
  const hw = await Homework.create({ ...req.body, postedBy: req.user._id });
  res.status(201).json({ success: true, data: hw });
});

// @desc    Get homework list
// @route   GET /api/homework
// @access  Private
exports.getHomework = asyncHandler(async (req, res) => {
  const { class: cls, subject, pending } = req.query;
  const filter = {};

  if (req.user.role === 'student') {
    filter.class = req.user.class;
  } else {
    if (cls) filter.class = cls;
  }
  if (subject) filter.subject = subject;
  // "pending" filter: due date in future
  if (pending === 'true') filter.dueDate = { $gte: new Date() };

  const homework = await Homework.find(filter)
    .populate('postedBy', 'name')
    .select('-submissions')
    .sort({ dueDate: 1 });

  // For students, flag which ones they haven't submitted
  let data = homework;
  if (req.user.role === 'student') {
    const withStatus = await Homework.find(filter).populate('postedBy', 'name');
    data = withStatus.map(hw => {
      const submission = hw.submissions.find(s => s.student.equals(req.user._id));
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        subject: hw.subject,
        class: hw.class,
        dueDate: hw.dueDate,
        fileUrl: hw.fileUrl,
        postedBy: hw.postedBy,
        createdAt: hw.createdAt,
        submitted: !!submission,
        submission: submission || null,
      };
    });
  }

  res.json({ success: true, count: data.length, data });
});

// @desc    Get single homework (with all submissions for staff)
// @route   GET /api/homework/:id
// @access  Private
exports.getSingleHomework = asyncHandler(async (req, res) => {
  const hw = await Homework.findById(req.params.id)
    .populate('postedBy', 'name')
    .populate('submissions.student', 'name rollNumber');

  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });

  if (req.user.role === 'student') {
    // Return only own submission
    const result = hw.toObject();
    result.submissions = hw.submissions.filter(s => s.student._id.equals(req.user._id));
    return res.json({ success: true, data: result });
  }

  res.json({ success: true, data: hw });
});

// @desc    Submit homework
// @route   POST /api/homework/:id/submit
// @access  Student
exports.submitHomework = asyncHandler(async (req, res) => {
  const hw = await Homework.findById(req.params.id);
  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });

  const already = hw.submissions.find(s => s.student.equals(req.user._id));
  if (already) return res.status(400).json({ success: false, message: 'Already submitted' });

  const isLate = new Date() > new Date(hw.dueDate);
  hw.submissions.push({ student: req.user._id, fileUrl: req.body.fileUrl, note: req.body.note, status: isLate ? 'late' : 'submitted' });
  await hw.save();

  res.status(201).json({ success: true, message: isLate ? 'Submitted (late)' : 'Homework submitted!' });
});

// @desc    Grade a submission
// @route   PUT /api/homework/:id/grade/:studentId
// @access  Staff/Admin
exports.gradeSubmission = asyncHandler(async (req, res) => {
  const hw = await Homework.findById(req.params.id);
  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });

  const sub = hw.submissions.find(s => s.student.equals(req.params.studentId));
  if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

  sub.grade = req.body.grade;
  sub.feedback = req.body.feedback;
  sub.status = 'graded';
  await hw.save();

  res.json({ success: true, message: 'Graded successfully', data: sub });
});

// @desc    Get pending homework count (for dashboard)
// @route   GET /api/homework/pending-count
// @access  Student
exports.getPendingCount = asyncHandler(async (req, res) => {
  const upcoming = await Homework.find({ class: req.user.class, dueDate: { $gte: new Date() } });
  const pending = upcoming.filter(hw => !hw.submissions.find(s => s.student.equals(req.user._id)));
  res.json({ success: true, pendingCount: pending.length, data: pending.map(hw => ({ _id: hw._id, title: hw.title, subject: hw.subject, dueDate: hw.dueDate })) });
});

// @desc    Update homework
// @route   PUT /api/homework/:id
// @access  Staff/Admin
exports.updateHomework = asyncHandler(async (req, res) => {
  const hw = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found' });
  res.json({ success: true, data: hw });
});

// @desc    Delete homework
// @route   DELETE /api/homework/:id
// @access  Staff/Admin
exports.deleteHomework = asyncHandler(async (req, res) => {
  await Homework.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Homework deleted' });
});
