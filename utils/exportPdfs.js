const PDFDocument = require('pdfkit');

const TABLE_BORDER = '#94a3b8';
const TABLE_HEADER_BG = '#f1f5f9';
const CELL_PAD = 5;

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

function tableWidth(cols) {
  return cols.reduce((a, b) => a + b, 0);
}

function colOffsets(cols) {
  const offsets = [0];
  for (let i = 0; i < cols.length; i += 1) offsets.push(offsets[i] + cols[i]);
  return offsets;
}

function cellTextHeight(doc, text, colWidth) {
  const inner = Math.max(colWidth - CELL_PAD * 2, 8);
  return doc.heightOfString(String(text ?? '-'), { width: inner });
}

function drawRowBox(doc, x, y, cols, rowH) {
  const w = tableWidth(cols);
  const offs = colOffsets(cols);
  doc.save();
  doc.lineWidth(0.5).strokeColor(TABLE_BORDER);
  doc.rect(x, y, w, rowH).stroke();
  for (let i = 1; i < cols.length; i += 1) {
    doc.moveTo(x + offs[i], y).lineTo(x + offs[i], y + rowH).stroke();
  }
  doc.restore();
}

function drawTableRow(doc, x, y, cols, rowH, cells, { header = false, fontSize = 9 } = {}) {
  const offs = colOffsets(cols);
  const w = tableWidth(cols);

  if (header) {
    doc.save();
    doc.rect(x, y, w, rowH).fill(TABLE_HEADER_BG);
    doc.restore();
  }

  drawRowBox(doc, x, y, cols, rowH);

  doc.fontSize(fontSize).fillColor(header ? '#334155' : '#0f172a');
  doc.font(header ? 'Helvetica-Bold' : 'Helvetica');

  cells.forEach((cell, i) => {
    doc.text(String(cell ?? '-'), x + offs[i] + CELL_PAD, y + CELL_PAD, {
      width: cols[i] - CELL_PAD * 2,
      lineBreak: true,
    });
  });

  doc.font('Helvetica');
  doc.y = y + rowH;
}

function renderBorderedTable(doc, { x0, cols, headers, rows, startY, pageTop = 50, pageBottom = 780 }) {
  let y = startY;

  const headerHeights = headers.map((h, i) => cellTextHeight(doc, h, cols[i]));
  const headerH = Math.max(...headerHeights, 12) + CELL_PAD * 2;

  const drawHeader = () => {
    drawTableRow(doc, x0, y, cols, headerH, headers, { header: true });
    y += headerH;
  };

  drawHeader();

  for (const cells of rows) {
    const heights = cells.map((c, i) => cellTextHeight(doc, c, cols[i]));
    const rowH = Math.max(...heights, 12) + CELL_PAD * 2;

    if (y + rowH > pageBottom) {
      doc.addPage();
      y = pageTop;
      drawHeader();
    }

    drawTableRow(doc, x0, y, cols, rowH, cells);
    y += rowH;
  }

  return y;
}

function buildClassFeesPdf({ classLabel, fees, summary }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const done = collectPdf(doc);
  const x0 = 40;

  pdfHeader(doc, 'Class Fees Report', classLabel);
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`Total: ${fmtMoney(summary.total)}  |  Collected: ${fmtMoney(summary.collected)}  |  Pending: ${fmtMoney(summary.pending)}`);
  doc.moveDown(0.8);

  const cols = [28, 125, 58, 72, 68, 68, 96];
  const headers = ['#', 'Student', 'Roll', 'Term', 'Total', 'Paid', 'Status'];
  const rows = fees.map((f, idx) => [
    idx + 1,
    f.studentName || '-',
    f.rollNumber || '-',
    f.term || '-',
    fmtMoney(f.totalAmount),
    fmtMoney(f.paidAmount),
    f.status || '-',
  ]);

  if (!fees.length) {
    doc.text('No fee records for this class.', x0, doc.y);
  } else {
    renderBorderedTable(doc, { x0, cols, headers, rows, startY: doc.y });
  }

  doc.end();
  return done;
}

function buildClassStudentsPdf({ classLabel, students }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const done = collectPdf(doc);
  const x0 = 40;

  pdfHeader(doc, 'Student List', classLabel);
  doc.fontSize(10).fillColor('#64748b').text(`Total students: ${students.length}`);
  doc.moveDown(0.6);

  const cols = [28, 130, 58, 72, 55, 98, 74];
  const headers = ['#', 'Name', 'Roll', 'Class', 'Board', 'Parent', 'Phone'];
  const rows = students.map((s, idx) => [
    idx + 1,
    s.name || '-',
    s.rollNumber || '-',
    s.classLabel || '-',
    s.board || '-',
    s.parentName || '-',
    s.parentPhone || '-',
  ]);

  if (!students.length) {
    doc.text('No students in this class.', x0, doc.y);
  } else {
    renderBorderedTable(doc, { x0, cols, headers, rows, startY: doc.y });
  }

  doc.end();
  return done;
}

function buildMonthlyAttendancePdf({ classLabel, monthLabel, students, days, grid, operationalDays, statsByStudent }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const done = collectPdf(doc);

  pdfHeader(doc, 'Monthly Attendance Report', `${classLabel} · ${monthLabel}`);
  doc.fontSize(9).fillColor('#64748b').text(`Class operational days this month: ${operationalDays ?? 0}`);
  doc.moveDown(0.4);

  const x0 = 30;
  const nameW = 88;
  const rollW = 36;
  const dayW = days.length > 28 ? 11 : 13;
  const sumW = 26;
  const maxDays = days.length;

  let y = doc.y;
  doc.fontSize(7).fillColor('#64748b');
  doc.text('Name', x0, y, { width: nameW });
  doc.text('Roll', x0 + nameW, y, { width: rollW });
  days.forEach((d, i) => {
    doc.text(String(d.day), x0 + nameW + rollW + i * dayW, y, { width: dayW, align: 'center' });
  });
  const sumX = x0 + nameW + rollW + maxDays * dayW;
  doc.text('Op.', sumX, y, { width: sumW, align: 'center' });
  doc.text('Pres.', sumX + sumW, y, { width: sumW, align: 'center' });
  doc.text('Abs.', sumX + sumW * 2, y, { width: sumW, align: 'center' });
  y += 12;
  doc.moveTo(x0, y).lineTo(sumX + sumW * 3, y).strokeColor('#e2e8f0').stroke();
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
    const stats = statsByStudent?.[s.id] || { operationalDays: operationalDays ?? 0, present: 0, absent: 0 };
    doc.fillColor('#0f172a');
    doc.text(String(stats.operationalDays), sumX, y, { width: sumW, align: 'center' });
    doc.fillColor('#16a34a').text(String(stats.present), sumX + sumW, y, { width: sumW, align: 'center' });
    doc.fillColor('#dc2626').text(String(stats.absent), sumX + sumW * 2, y, { width: sumW, align: 'center' });
    doc.fillColor('#0f172a');
    y += 11;
  }

  if (!students.length) {
    doc.text('No students in this class.', x0, y);
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#64748b').text(
    'P = Present, A = Absent, L = Late, - = Not marked · Op. = operational days · Pres./Abs. = totals on operational days',
    x0,
  );

  doc.end();
  return done;
}

module.exports = {
  buildClassFeesPdf,
  buildClassStudentsPdf,
  buildMonthlyAttendancePdf,
};
