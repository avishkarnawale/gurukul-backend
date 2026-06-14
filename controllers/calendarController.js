const CalendarEvent = require('../models/CalendarEvent');
const { asyncHandler } = require('../middleware/error');
const { startOfDay } = require('../utils/date');

function normalizeDateStr(dateStr) {
  const s = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const err = new Error('date must be YYYY-MM-DD');
    err.statusCode = 400;
    throw err;
  }
  startOfDay(s);
  return s;
}

// @route GET /api/calendar
exports.getCalendarEvents = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const filter = {};
  if (year) {
    filter.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
  }

  const events = await CalendarEvent.find(filter)
    .populate('createdBy', 'name')
    .sort({ date: 1, createdAt: 1 });

  res.json({ success: true, count: events.length, data: events });
});

// @route POST /api/calendar
exports.createCalendarEvent = asyncHandler(async (req, res) => {
  const { title, date, description } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Event name is required' });
  }

  const event = await CalendarEvent.create({
    title: title.trim(),
    date: normalizeDateStr(date),
    description: description?.trim() || '',
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: event });
});

// @route PUT /api/calendar/:id
exports.updateCalendarEvent = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
  if (req.body.date !== undefined) updates.date = normalizeDateStr(req.body.date);
  if (req.body.description !== undefined) updates.description = String(req.body.description).trim();

  const event = await CalendarEvent.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  res.json({ success: true, data: event });
});

// @route DELETE /api/calendar/:id
exports.deleteCalendarEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  res.json({ success: true, message: 'Event deleted' });
});
