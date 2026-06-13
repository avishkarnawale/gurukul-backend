const { parseDayRange, startOfDay, toDateString } = require('./date');

const DAILY_SUBJECT = 'daily';

/** Calendar day key (UTC) for deduplication. */
function dayKey(date) {
  return toDateString(date);
}

/** Prefer daily mark, then latest update. */
function preferRecord(a, b) {
  if (a.subject === DAILY_SUBJECT && b.subject !== DAILY_SUBJECT) return a;
  if (b.subject === DAILY_SUBJECT && a.subject !== DAILY_SUBJECT) return b;
  const au = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bu = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bu >= au ? b : a;
}

/** One row per calendar day (single-student lists). */
function dedupeByDay(records) {
  const byDay = new Map();
  for (const r of records) {
    const key = dayKey(r.date);
    const prev = byDay.get(key);
    byDay.set(key, prev ? preferRecord(prev, r) : r);
  }
  return Array.from(byDay.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function studentIdOf(record) {
  return String(record.student?._id ?? record.student);
}

/** Grid for class/month PDF: one status per student per calendar day. */
function buildStudentDayGrid(records) {
  const byStudentDay = new Map();
  for (const r of records) {
    const sid = studentIdOf(r);
    const dk = dayKey(r.date);
    const key = `${sid}|${dk}`;
    const prev = byStudentDay.get(key);
    byStudentDay.set(key, prev ? preferRecord(prev, r) : r);
  }

  const grid = {};
  for (const r of byStudentDay.values()) {
    const sid = studentIdOf(r);
    const dk = dayKey(r.date);
    if (!grid[sid]) grid[sid] = {};
    grid[sid][dk] = r.status;
  }
  return grid;
}

module.exports = {
  DAILY_SUBJECT,
  dayKey,
  preferRecord,
  dedupeByDay,
  buildStudentDayGrid,
  startOfDay,
  parseDayRange,
};
