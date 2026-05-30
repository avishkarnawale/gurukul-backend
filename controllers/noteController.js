const Note = require('../models/Note');
const { asyncHandler } = require('../middleware/error');

// @desc    Upload note/PYQ
// @route   POST /api/notes
// @access  Staff only
exports.uploadNote = asyncHandler(async (req, res) => {
  const note = await Note.create({ ...req.body, uploadedBy: req.user._id });
  res.status(201).json({ success: true, data: note });
});

// @desc    Get notes/PYQs
// @route   GET /api/notes
// @access  Private
exports.getNotes = asyncHandler(async (req, res) => {
  const { type, subject, semester, year, search } = req.query;
  const filter = { isApproved: true };

  if (type) filter.type = type;
  if (subject) filter.subject = new RegExp(subject, 'i');
  if (semester) filter.semester = Number(semester);
  if (year) filter.year = Number(year);
  if (search) filter.$or = [
    { title: new RegExp(search, 'i') },
    { description: new RegExp(search, 'i') },
    { tags: { $in: [new RegExp(search, 'i')] } }
  ];

  // Students see notes for their class or global notes
  if (req.user.role === 'student' && req.user.class) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { targetClass: req.user.class },
          { targetClass: null },
          { targetClass: '' },
          { targetClass: { $exists: false } },
        ],
      },
    ];
  }

  const notes = await Note.find(filter).populate('uploadedBy', 'name').sort({ createdAt: -1 });
  res.json({ success: true, count: notes.length, data: notes });
});

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private
exports.getNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id).populate('uploadedBy', 'name');
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, data: note });
});

// @desc    Increment download count
// @route   PUT /api/notes/:id/download
// @access  Private
exports.incrementDownload = asyncHandler(async (req, res) => {
  const note = await Note.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }, { new: true });
  res.json({ success: true, downloadCount: note.downloadCount, fileUrl: note.fileUrl });
});

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Staff only
exports.updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, data: note });
});

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Staff only
exports.deleteNote = asyncHandler(async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Note deleted' });
});

// @desc    Get all subjects (distinct)
// @route   GET /api/notes/subjects
// @access  Private
exports.getSubjects = asyncHandler(async (req, res) => {
  const subjects = await Note.distinct('subject');
  res.json({ success: true, data: subjects });
});
