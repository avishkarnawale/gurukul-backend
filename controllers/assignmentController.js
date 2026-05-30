const Assignment = require('../models/Assignment');
const { asyncHandler } = require('../middleware/error');

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Staff only
exports.createAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.create({ ...req.body, postedBy: req.user._id });
  res.status(201).json({ success: true, data: assignment });
});

// @desc    Get all assignments (filtered)
// @route   GET /api/assignments
// @access  Private
exports.getAssignments = asyncHandler(async (req, res) => {
  const { subject, class: cls } = req.query;
  const filter = {};

  // Students only see their class assignments
  if (req.user.role === 'student') filter.class = req.user.class;
  else { if (cls) filter.class = cls; }
  if (subject) filter.subject = subject;

  const assignments = await Assignment.find(filter)
    .populate('postedBy', 'name')
    .select('-submissions')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: assignments.length, data: assignments });
});

// @desc    Get single assignment (with submissions for staff)
// @route   GET /api/assignments/:id
// @access  Private
exports.getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id).populate('postedBy', 'name').populate('submissions.student', 'name rollNumber');
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  // Students only see their own submission
  if (req.user.role === 'student') {
    assignment.submissions = assignment.submissions.filter(s => s.student._id.equals(req.user._id));
  }

  res.json({ success: true, data: assignment });
});

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Student only
exports.submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const alreadySubmitted = assignment.submissions.find(s => s.student.equals(req.user._id));
  if (alreadySubmitted) return res.status(400).json({ success: false, message: 'Already submitted' });

  const isLate = new Date() > new Date(assignment.dueDate);
  assignment.submissions.push({ student: req.user._id, fileUrl: req.body.fileUrl, status: isLate ? 'late' : 'submitted' });
  await assignment.save();

  res.status(201).json({ success: true, message: 'Assignment submitted successfully' });
});

// @desc    Grade a submission
// @route   PUT /api/assignments/:id/grade/:studentId
// @access  Staff only
exports.gradeSubmission = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const submission = assignment.submissions.find(s => s.student.equals(req.params.studentId));
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  submission.grade = req.body.grade;
  submission.feedback = req.body.feedback;
  submission.status = 'graded';
  await assignment.save();

  res.json({ success: true, message: 'Submission graded', data: submission });
});

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Staff only
exports.updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
  res.json({ success: true, data: assignment });
});

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Staff only
exports.deleteAssignment = asyncHandler(async (req, res) => {
  await Assignment.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Assignment deleted' });
});
