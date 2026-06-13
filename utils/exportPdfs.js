const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function collectPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function pdfHeader(doc, title, subtitle) {
  doc.fontSize(20).fillColor('#ea580c').text('Gurukul Classes', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor('#64748b').text(title, { align: 'center' });
  if (subtitle) {
    doc.fontSize(10).fillColor('#94a3b8').text(subtitle, { align: 'center' });
  }
  doc.moveDown(1);
}

function buildClassFeesPdf({ classLabel, fees, summary }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const done = collectPdf(doc);

  pdfHeader(doc, 'Class Fees Report', classLabel);
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`Total: ${fmtMoney(summary.total)}  |  Collected: ${fmtMoney(summary.collected)}  |  Pending: ${fmtMoney(summary.pending)}`);
  doc.moveDown(0.8);

  const cols = [120, 70, 80, 70, 70, 60];
  const headers = ['Student', 'Roll', 'Term', 'Total', 'Paid', 'Status'];
  let y = doc.y;
  const x0 = 40;
  doc.fontSize(9).fillColor('#64748b');
  headers.forEach((h, i) => {
    const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, y, { width: cols[i] - 4 });
  });
  y += 16;
  doc.moveTo(x0, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
  y += 6;

  doc.fillColor('#0f172a').fontSize(9);
  for (const f of fees) {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    const row = [
      f.studentName || '-',
      f.rollNumber || '-',
      f.term || '-',
      fmtMoney(f.totalAmount),
      fmtMoney(f.paidAmount),
      f.status || '-',
    ];
    row.forEach((cell, i) => {
      const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(String(cell), x, y, { width: cols[i] - 4, ellipsis: true });
    });
    y += 14;
  }

  if (!fees.length) {
    doc.text('No fee records for this class.', x0, y);
  }

  doc.end();
  return done;
}

function buildClassStudentsPdf({ classLabel, students }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const done = collectPdf(doc);

  pdfHeader(doc, 'Student List', classLabel);
  doc.fontSize(10).fillColor('#64748b').text(`Total students: ${students.length}`);
  doc.moveDown(0.6);

  const cols = [110, 55, 75, 45, 90, 85];
  const headers = ['Name', 'Roll', 'Class', 'Board', 'Parent', 'Phone'];
  let y = doc.y;
  const x0 = 40;
  doc.fontSize(9).fillColor('#64748b');
  headers.forEach((h, i) => {
    const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, y, { width: cols[i] - 4 });
  });
  y += 16;
  doc.moveTo(x0, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
  y += 6;

  doc.fillColor('#0f172a').fontSize(9);
  for (const s of students) {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    const row = [
      s.name || '-',
      s.rollNumber || '-',
      s.classLabel || '-',
      s.board || '-',
      s.parentName || '-',
      s.parentPhone || '-',
    ];
    row.forEach((cell, i) => {
      const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(String(cell), x, y, { width: cols[i] - 4, ellipsis: true });
    });
    y += 14;
  }

  if (!students.length) {
    doc.text('No students in this class.', x0, y);
  }

  doc.end();
  return done;
}

function buildMonthlyAttendancePdf({ classLabel, monthLabel, students, days, grid }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const done = collectPdf(doc);

  pdfHeader(doc, 'Monthly Attendance Report', `${classLabel} · ${monthLabel}`);

  const x0 = 30;
  const nameW = 100;
  const rollW = 42;
  const dayW = 14;
  const maxDays = days.length;
  const pageW = doc.page.width - 60;

  let y = doc.y;
  doc.fontSize(7).fillColor('#64748b');
  doc.text('Name', x0, y, { width: nameW });
  doc.text('Roll', x0 + nameW, y, { width: rollW });
  days.forEach((d, i) => {
    doc.text(String(d.day), x0 + nameW + rollW + i * dayW, y, { width: dayW, align: 'center' });
  });
  y += 12;
  doc.moveTo(x0, y).lineTo(x0 + nameW + rollW + maxDays * dayW, y).strokeColor('#e2e8f0').stroke();
  y += 4;

  doc.fontSize(7).fillColor('#0f172a');
  for (const s of students) {
    if (y > doc.page.height - 40) {
      doc.addPage();
      y = 40;
    }
    doc.text(s.name || '-', x0, y, { width: nameW, ellipsis: true });
    doc.text(s.rollNumber || '-', x0 + nameW, y, { width: rollW });
    const row = grid[s.id] || {};
    days.forEach((d, i) => {
      const st = row[d.key];
      const sym = st === 'present' ? 'P' : st === 'absent' ? 'A' : st === 'late' ? 'L' : '-';
      const color =
        st === 'present' ? '#16a34a' : st === 'absent' ? '#dc2626' : st === 'late' ? '#ca8a04' : '#94a3b8';
      doc.fillColor(color).text(sym, x0 + nameW + rollW + i * dayW, y, { width: dayW, align: 'center' });
    });
    doc.fillColor('#0f172a');
    y += 11;
  }

  if (!students.length) {
    doc.text('No students in this class.', x0, y);
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#64748b').text('P = Present, A = Absent, L = Late, - = Not marked', x0);

  doc.end();
  return done;
}

module.exports = {
  buildClassFeesPdf,
  buildClassStudentsPdf,
  buildMonthlyAttendancePdf,
};
