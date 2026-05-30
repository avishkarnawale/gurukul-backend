const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return `Rs. ${Number(n).toLocaleString('en-IN')}`;
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const methodLabel = { cash: 'Cash', online: 'Online', cheque: 'Cheque', upi: 'UPI' }[data.method] || data.method;

    doc.fontSize(22).fillColor('#ea580c').text('Gurukul Classes', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#64748b').text('Official Fee Payment Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#0f172a').text(`Receipt No: ${data.receiptNo || '—'}`, { align: 'center' });
    doc.moveDown(1.5);

    const row = (label, value) => {
      doc.fontSize(10).fillColor('#64748b').text(label, { continued: true, width: 200 });
      doc.fillColor('#0f172a').text(String(value), { align: 'right' });
      doc.moveDown(0.4);
    };

    row('Student', data.studentName);
    row('Roll Number', data.rollNumber || '—');
    row('Class', data.studentClass || '—');
    row('Term / Fee', data.description ? `${data.term} — ${data.description}` : data.term);
    row('Payment Date', fmtDate(data.date));
    row('Payment Mode', methodLabel);
    row('Fee Status', data.status);
    row('Term Total', fmtMoney(data.totalAmount));
    row('Total Paid (Term)', fmtMoney(data.paidAmount));

    doc.moveDown(1);
    doc.rect(50, doc.y, doc.page.width - 100, 70).fill('#fff7ed');
    const boxY = doc.y + 15;
    doc.fillColor('#c2410c').fontSize(9).text('AMOUNT RECEIVED (THIS RECEIPT)', 50, boxY, {
      width: doc.page.width - 100,
      align: 'center',
    });
    doc.fillColor('#ea580c').fontSize(20).text(fmtMoney(data.amount), 50, boxY + 18, {
      width: doc.page.width - 100,
      align: 'center',
    });

    doc.moveDown(4);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Computer-generated receipt · Gurukul Classes · ${new Date().toLocaleString('en-IN')}`,
      { align: 'center' },
    );

    doc.end();
  });
}

module.exports = { buildReceiptPdf };
