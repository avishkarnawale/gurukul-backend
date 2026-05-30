const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount:      { type: Number, required: true },
  date:        { type: Date, default: Date.now },
  method:      { type: String, enum: ['cash', 'online', 'cheque', 'upi'], default: 'cash' },
  receiptNo:   { type: String },
  note:        { type: String },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const feeSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  term:         { type: String, required: true },        // e.g. "Term 1 2024-25"
  totalAmount:  { type: Number, required: true },
  dueDate:      { type: Date },
  description:  { type: String },                        // e.g. "Tuition Fee - April"
  payments:     [paymentSchema],
  status:       { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  paidAmount:   { type: Number, default: 0 },
}, { timestamps: true });

// Auto-update paidAmount, status, and receipt numbers before save
feeSchema.pre('save', function (next) {
  this.payments.forEach((p, i) => {
    if (p.amount > 0 && !p.receiptNo) {
      p.receiptNo = `RCP${Date.now().toString().slice(-6)}${i}`;
    }
  });
  this.paidAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (this.paidAmount <= 0) this.status = 'pending';
  else if (this.paidAmount >= this.totalAmount) this.status = 'paid';
  else this.status = 'partial';
  next();
});

// Virtual: pending balance
feeSchema.virtual('pendingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

feeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Fee', feeSchema);
