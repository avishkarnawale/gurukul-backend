const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildStudentReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { student, attendance, tests, fees } = report;
    const pageWidth = doc.page.width - 100;

    // Header
    doc.fontSize(22).fillColor('#ea580c').text('Gurukul Classes', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor('#64748b').text('Student Progress Report', { align: 'center' });
    doc.moveDown(1);

    const sectionTitle = (title) => {
      doc.moveDown(0.6);
      doc.fontSize(12).fillColor('#0f172a').text(title);
      doc.moveTo(50, doc.y + 2).lineTo(50 + pageWidth, doc.y + 2).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
    };

    const row = (label, value) => {
      doc.fontSize(10).fillColor('#64748b').text(label, 50, doc.y, { continued: true, width: 220 });
      doc.fillColor('#0f172a').text(String(value ?? '-'), { align: 'right' });
      doc.moveDown(0.3);
    };

    // Profile
    sectionTitle('Student Details');
    row('Name', student.name);
    row('Roll Number', student.rollNumber || '-');
    row('Class', student.classLabel || student.class || '-');
    if (student.board) row('Board', student.board);
    if (student.parentName) row('Parent / Guardian', student.parentName);
    if (student.parentPhone) row('Parent Phone', student.parentPhone);
    if (student.address) row('Address', student.address);

    // Attendance
    sectionTitle('Attendance (from start of class)');
    row('Total Days Marked', attendance.summary.totalDays);
    row('Present', attendance.summary.presentDays);
    row('Absent', attendance.summary.absentDays);
    row('Attendance %', `${attendance.summary.percentage}%`);

    // Tests
    sectionTitle('Recent Test Results (last 3)');
    if (!tests.length) {
      doc.fontSize(10).fillColor('#94a3b8').text('No test results recorded yet.');
    } else {
      tests.forEach((t) => {
        const pct = t.percentage != null ? `${t.percentage}%` : '-';
        row(`${t.subject} — ${t.examType}`, `${t.marksObtained}/${t.totalMarks}  (${pct})`);
      });
    }

    // Fees
    sectionTitle('Fees');
    row('Total Pending', fmtMoney(fees.totalPending));
    fees.items.forEach((f) => {
      row(
        `${f.term} (${f.status})`,
        `Paid ${fmtMoney(f.paidAmount)} / ${fmtMoney(f.totalAmount)} · Due ${fmtDate(f.dueDate)}`,
      );
    });

    doc.moveDown(3);
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated on ${new Date().toLocaleString('en-IN')} · Gurukul Classes`,
      { align: 'center' },
    );

    doc.end();
  });
}

module.exports = { buildStudentReportPdf };
