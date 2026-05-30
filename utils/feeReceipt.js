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
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const methodLabel = { cash: 'Cash', online: 'Online', cheque: 'Cheque', upi: 'UPI' }[data.method] || data.method;

    doc.fillColor('#ea580c').fontSize(22).font('Helvetica-Bold').text('Gurukul Classes', { align: 'center' });
    doc.fillColor('#64748b').fontSize(11).font('Helvetica').text('Official Fee Payment Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#ea580c').fontSize(10).font('Helvetica-Bold')
      .text(`Receipt No: ${data.receiptNo || 'RECEIPT'}`, { align: 'center' });
    doc.moveDown(1.5);

    const row = (label, value) => {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(label, { continued: true });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`  ${value}`, { align: 'right' });
      doc.moveDown(0.4);
    };

    doc.fillColor('#0f172a');
    row('Student', data.studentName);
    row('Roll number', data.rollNumber || '-');
    row('Class', data.studentClass || '-');
    row('Term / fee', data.description ? `${data.term} - ${data.description}` : data.term);
    row('Payment date', fmtDate(data.date));
    row('Payment mode', methodLabel);
    row('Fee status', data.status);
    row('Term total', fmtMoney(data.totalAmount));
    row('Total paid (term)', fmtMoney(data.paidAmount));

    doc.moveDown(1);
    doc.roundedRect(48, doc.y, doc.page.width - 96, 56, 8).fillAndStroke('#fff7ed', '#fed7aa');
    const boxY = doc.y + 14;
    doc.fillColor('#c2410c').fontSize(9).font('Helvetica-Bold').text('AMOUNT RECEIVED', 60, boxY, { width: doc.page.width - 120, align: 'center' });
    doc.fillColor('#ea580c').fontSize(20).font('Helvetica-Bold')
      .text(fmtMoney(data.amount), 60, boxY + 16, { width: doc.page.width - 120, align: 'center' });

    doc.y = boxY + 70;
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text(`Computer-generated receipt | Generated ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    doc.end();
  });
}

function buildReceiptHtml(data) {
  const methodLabel = { cash: 'Cash', online: 'Online', cheque: 'Cheque', upi: 'UPI' }[data.method] || data.method;
  return `<!DOCTYPE html><html><body><h1>Gurukul Classes</h1><p>Receipt ${data.receiptNo}</p><p>${data.studentName} - ${fmtMoney(data.amount)}</p></body></html>`;
}

module.exports = { buildReceiptPdf, buildReceiptHtml, fmtMoney, fmtDate };
