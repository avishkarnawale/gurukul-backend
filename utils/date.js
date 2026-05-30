/** Normalize YYYY-MM-DD to UTC day bounds (consistent storage & API). */
function parseDayRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end };
}

function startOfDay(dateStr) {
  return parseDayRange(dateStr).start;
}

/** YYYY-MM-DD from a Date (UTC calendar day). */
function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

module.exports = { parseDayRange, startOfDay, toDateString };
