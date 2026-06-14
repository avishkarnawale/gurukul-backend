const User = require('../models/User');
const Fee = require('../models/Fee');
const { asyncHandler } = require('../middleware/error');
const { formatClassLabel } = require('../utils/classes');

const DEFAULT_FEE_TERM = 'Term 1 2025-26';
const DEFAULT_FEE_AMOUNT = 7500;

// @desc    Create fee record for a student
// @route   POST /api/fees
// @access  Staff/Admin
exports.createFee = asyncHandler(async (req, res) => {
  const fee = await Fee.create(req.body);
  res.status(201).json({ success: true, data: fee });
});

// @desc    Bulk create fees (e.g., same term for all class students)
// @route   POST /api/fees/bulk
// @access  Staff/Admin
exports.createBulkFees = asyncHandler(async (req, res) => {
  // req.body.fees = [{ student, term, totalAmount, dueDate, description }]
  const fees = await Fee.insertMany(req.body.fees);
  res.status(201).json({ success: true, count: fees.length, data: fees });
});

// @desc    Record a payment on a fee
// @route   POST /api/fees/:id/pay
// @access  Staff/Admin
exports.recordPayment = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

  fee.payments.push({ ...req.body, recordedBy: req.user._id });
  await fee.save(); // pre-save auto-updates paidAmount & status

  res.json({ success: true, message: 'Payment recorded', data: fee });
});

// @desc    Get all fee records (admin)
// @route   GET /api/fees?class=Class 10|SSC
// @access  Staff/Admin
exports.getAllFees = asyncHandler(async (req, res) => {
  const { class: cls } = req.query;
  const filter = {};
  if (cls) {
    const studentIds = await User.find({ role: 'student', class: cls }).distinct('_id');
    filter.student = { $in: studentIds };
  }
  const fees = await Fee.find(filter)
    .populate('student', 'name rollNumber class')
    .sort({ dueDate: 1 });
  res.json({ success: true, count: fees.length, data: fees });
});

// @desc    Get fees for logged-in student
// @route   GET /api/fees/me
// @access  Student
exports.getMyFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ student: req.user._id }).sort({ createdAt: -1 });

  const totalDue = fees.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paidAmount, 0);
  const totalPending = fees.reduce((s, f) => s + f.pendingAmount, 0);

  res.json({
    success: true,
    student: {
      name: req.user.name,
      rollNumber: req.user.rollNumber,
      class: formatClassLabel(req.user.class) || req.user.class || '',
    },
    summary: { totalDue, totalPaid, totalPending },
    data: fees,
  });
});

function resolvePayment(fee, paymentId) {
  if (paymentId === 'summary') {
    if (fee.paidAmount <= 0) return null;
    if (fee.payments.length > 0) return fee.payments[fee.payments.length - 1];
    return {
      amount: fee.paidAmount,
      receiptNo: `RCP-${String(fee._id).slice(-6).toUpperCase()}`,
      method: 'cash',
      date: new Date(),
    };
  }
  const p = fee.payments.id(paymentId);
  return p && p.amount > 0 ? p : null;
}

async function buildAndSendFeeReceipt(res, fee, payment, student) {
  const { buildReceiptPdf } = require('../utils/feeReceiptPdf');
  const pdf = await buildReceiptPdf({
    receiptNo: payment.receiptNo,
    studentName: student.name,
    rollNumber: student.rollNumber,
    studentClass: formatClassLabel(student.class) || student.class || '',
    term: fee.term,
    description: fee.description,
    amount: payment.amount,
    method: payment.method,
    date: payment.date,
    totalAmount: fee.totalAmount,
    paidAmount: fee.paidAmount,
    status: fee.status,
  });

  const filename = `Gurukul-Receipt-${payment.receiptNo || 'fee'}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
}

// @desc    Download PDF receipt (student's own fee only)
// @route   GET /api/fees/me/:feeId/receipt/:paymentId
// @access  Student
exports.getMyFeeReceipt = asyncHandler(async (req, res) => {
  const fee = await Fee.findOne({ _id: req.params.feeId, student: req.user._id });
  if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

  const payment = resolvePayment(fee, req.params.paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment receipt not found' });
  }

  await buildAndSendFeeReceipt(res, fee, payment, req.user);
});

// @desc    Download PDF receipt for any student (admin)
// @route   GET /api/fees/:feeId/receipt/:paymentId
// @access  Admin
exports.getAdminFeeReceipt = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.feeId).populate('student', 'name rollNumber class');
  if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

  const payment = resolvePayment(fee, req.params.paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment receipt not found' });
  }

  const student = fee.student;
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found for this fee' });
  }

  await buildAndSendFeeReceipt(res, fee, payment, student);
});

// @desc    Create fees for students who have none for this term
// @route   POST /api/fees/assign-missing
// @access  Staff/Admin
exports.assignMissingFees = asyncHandler(async (req, res) => {
  const term = req.body.term || DEFAULT_FEE_TERM;
  const totalAmount = Number(req.body.totalAmount ?? DEFAULT_FEE_AMOUNT);
  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(new Date().setMonth(new Date().getMonth() + 3));
  const cls = req.body.class || req.query.class;

  const studentFilter = { role: 'student' };
  if (cls) studentFilter.class = cls;

  const students = await User.find(studentFilter).select('_id');
  const existing = await Fee.find({ term }).distinct('student');
  const existingSet = new Set(existing.map(String));

  const toCreate = students
    .filter((s) => !existingSet.has(String(s._id)))
    .map((s) => ({
      student: s._id,
      term,
      totalAmount,
      dueDate,
      description: req.body.description || 'Tuition Fee',
      payments: [],
    }));

  if (!toCreate.length) {
    const scope = cls ? ` in ${cls}` : '';
    return res.json({ success: true, message: `All students${scope} already have fee records for this term`, count: 0 });
  }

  const fees = await Fee.insertMany(toCreate);
  const scope = cls ? ` for ${cls}` : '';
  res.status(201).json({ success: true, count: fees.length, message: `Created ${fees.length} fee records${scope}` });
});

// @desc    Get fees for a specific student
// @route   GET /api/fees/student/:studentId
// @access  Staff/Admin
exports.getStudentFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ student: req.params.studentId }).populate('student', 'name rollNumber class');
  const totalPending = fees.reduce((s, f) => s + f.pendingAmount, 0);
  res.json({ success: true, totalPending, data: fees });
});

// @desc    Get all pending fees (admin dashboard)
// @route   GET /api/fees/pending
// @access  Staff/Admin
exports.getAllPendingFees = asyncHandler(async (req, res) => {
  const { class: cls } = req.query;
  const match = { status: { $in: ['pending', 'partial'] } };

  const fees = await Fee.find(match).populate('student', 'name rollNumber class');

  // Filter by class if provided
  const filtered = cls ? fees.filter(f => f.student?.class === cls) : fees;
  const totalPending = filtered.reduce((s, f) => s + f.pendingAmount, 0);

  res.json({ success: true, totalPending, count: filtered.length, data: filtered });
});

// @desc    Update fee record
// @route   PUT /api/fees/:id
// @access  Staff/Admin
exports.updateFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

  if (req.body.paidAmount !== undefined || req.body.paid_amount !== undefined) {
    const paid = Number(req.body.paidAmount ?? req.body.paid_amount);
    fee.payments = paid > 0
      ? [{
          amount: paid,
          method: 'cash',
          date: new Date(),
          receiptNo: `RCP${Date.now().toString().slice(-8)}`,
          recordedBy: req.user._id,
        }]
      : [];
    await fee.save();
    return res.json({ success: true, data: fee });
  }

  Object.assign(fee, req.body);
  await fee.save();
  res.json({ success: true, data: fee });
});

// @desc    Delete fee record
// @route   DELETE /api/fees/:id
// @access  Admin
exports.deleteFee = asyncHandler(async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Fee record deleted' });
});
