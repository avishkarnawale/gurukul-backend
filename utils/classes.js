const BOARDS = ['SSC', 'CBSE'];

/** Canonical: Class 1–10 × CBSE/SSC. Id: Class 10|CBSE */
function getCanonicalClasses() {
  const classes = [];
  for (let grade = 1; grade <= 10; grade++) {
    for (const board of BOARDS) {
      const id = `Class ${grade}|${board}`;
      const name = `Class ${grade} · ${board}`;
      classes.push({ id, name, board, grade });
    }
  }
  return classes;
}

function parseClassId(classId) {
  const m = String(classId || '').match(/^Class (\d+)\|(CBSE|SSC)$/);
  if (!m) return null;
  return { grade: Number(m[1]), board: m[2] };
}

function formatClassLabel(classId) {
  const parsed = parseClassId(classId);
  if (!parsed) return null;
  return `Class ${parsed.grade} · ${parsed.board}`;
}

const BOARD_ORDER = { CBSE: 0, SSC: 1 };

function sortClasses(a, b) {
  const pa = parseClassId(a.id);
  const pb = parseClassId(b.id);
  if (pa && pb) {
    if (pa.grade !== pb.grade) return pa.grade - pb.grade;
    return (BOARD_ORDER[pa.board] ?? 9) - (BOARD_ORDER[pb.board] ?? 9);
  }
  return String(a.name).localeCompare(String(b.name));
}

/** Map old DB class strings to Class N|BOARD (no batch). */
function migrateLegacyClassId(legacy) {
  if (!legacy) return null;
  if (parseClassId(legacy)) return legacy;

  const withBatch = String(legacy).match(/^Class (\d+)\|(CBSE|SSC)\|(Morning|Evening)$/i);
  if (withBatch) return `Class ${withBatch[1]}|${withBatch[2]}`;

  const oldPipe = legacy.match(/^Class (\d+)\|([A-Z])\|(CBSE|SSC)$/i);
  if (oldPipe) return `Class ${oldPipe[1]}|${oldPipe[3]}`;

  const oldSpace = legacy.match(/^Class (\d+)/i);
  if (oldSpace) {
    const board = /cbse/i.test(legacy) ? 'CBSE' : 'SSC';
    return `Class ${oldSpace[1]}|${board}`;
  }
  return null;
}

function isLegacyClassId(classId) {
  if (!classId) return false;
  return parseClassId(classId) === null;
}

module.exports = {
  BOARDS,
  getCanonicalClasses,
  parseClassId,
  formatClassLabel,
  sortClasses,
  migrateLegacyClassId,
  isLegacyClassId,
};
