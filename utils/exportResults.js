const PDFDocument = require('pdfkit');

const EXAM_LABELS = {
  internal: 'Internal test',
  midterm: 'Midterm',
  final: 'Final exam',
  practical: 'Practical',
  assignment: 'Assignment',
};

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function examLabel(type) {
  return EXAM_LABELS[type] || String(type || '-');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  doc.moveDown(0.8);
}

function buildClassResultsPdf({ classLabel, rows }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const done = collectPdf(doc);

  pdfHeader(doc, 'Class Results Report', classLabel);
  doc.fontSize(10).fillColor('#64748b').text(`Total records: ${rows.length}`);
  doc.moveDown(0.6);

  const cols = [85, 38, 72, 58, 42, 38, 32, 58];
  const headers = ['Student', 'Roll', 'Subject', 'Exam', 'Marks', 'Max', 'Grade', 'Date'];
  let y = doc.y;
  const x0 = 40;
  doc.fontSize(8).fillColor('#64748b');
  headers.forEach((h, i) => {
    const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, y, { width: cols[i] - 3 });
  });
  y += 14;
  doc.moveTo(x0, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
  y += 5;

  doc.fillColor('#0f172a').fontSize(8);
  for (const r of rows) {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    const row = [
      r.studentName || '-',
      r.rollNumber || '-',
      r.subject || '-',
      examLabel(r.examType),
      String(r.marksObtained ?? '-'),
      String(r.totalMarks ?? '-'),
      r.grade || '-',
      fmtDate(r.date),
    ];
    row.forEach((cell, i) => {
      const x = x0 + cols.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(String(cell), x, y, { width: cols[i] - 3, ellipsis: true });
    });
    y += 13;
  }

  if (!rows.length) {
    doc.text('No results recorded for this class yet.', x0, y);
  }

  doc.end();
  return done;
}

function buildClassResultsDoc({ classLabel, rows }) {
  const headerCells = ['Student', 'Roll', 'Subject', 'Exam', 'Marks', 'Max', 'Grade', 'Date']
    .map((h) => `<th style="background:#f1f5f9;padding:6px 8px;text-align:left;font-size:11px;">${h}</th>`)
    .join('');

  const bodyRows = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;">${escapeHtml(r.studentName)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;">${escapeHtml(r.rollNumber)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;">${escapeHtml(r.subject)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;">${escapeHtml(examLabel(r.examType))}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(r.marksObtained)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(r.totalMarks)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(r.grade)}</td>
      <td style="padding:5px 8px;border:1px solid #e2e8f0;">${escapeHtml(fmtDate(r.date))}</td>
    </tr>`,
        )
        .join('')
    : `<tr><td colspan="8" style="padding:12px;border:1px solid #e2e8f0;text-align:center;color:#64748b;">No results recorded for this class yet.</td></tr>`;

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>Gurukul Results - ${escapeHtml(classLabel)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #0f172a; }
    h1 { color: #ea580c; font-size: 22px; margin-bottom: 4px; }
    h2 { color: #64748b; font-size: 14px; font-weight: normal; margin-top: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Gurukul Classes</h1>
  <h2>Class Results Report — ${escapeHtml(classLabel)}</h2>
  <p style="color:#64748b;font-size:12px;">Total records: ${rows.length}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

module.exports = {
  buildClassResultsPdf,
  buildClassResultsDoc,
  examLabel,
};
