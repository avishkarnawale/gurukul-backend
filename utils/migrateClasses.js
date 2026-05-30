require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const Note = require('../models/Note');
const connectDB = require('../config/db');
const { migrateLegacyClassId, parseClassId, isLegacyClassId } = require('./classes');

async function migrateCollection(Model, field) {
  const docs = await Model.find({ [field]: { $exists: true, $nin: [null, ''] } });
  let updated = 0;
  for (const doc of docs) {
    const oldVal = doc[field];
    if (!isLegacyClassId(oldVal)) continue;
    const next = migrateLegacyClassId(oldVal);
    if (!next || next === oldVal) continue;
    doc[field] = next;
    await doc.save();
    updated++;
  }
  return updated;
}

async function migrateStudents() {
  const students = await User.find({ role: 'student', class: { $exists: true, $nin: [null, ''] } });
  let updated = 0;
  for (const stu of students) {
    if (!isLegacyClassId(stu.class)) continue;
    const next = migrateLegacyClassId(stu.class);
    if (!next || next === stu.class) continue;
    stu.class = next;
    const parsed = parseClassId(next);
    if (parsed) {
      stu.board = parsed.board;
      stu.batch = undefined;
    }
    await stu.save();
    updated++;
  }
  return updated;
}

const run = async () => {
  await connectDB();
  const students = await migrateStudents();
  const attendance = await migrateCollection(Attendance, 'class');
  const homework = await migrateCollection(Homework, 'class');
  const notes = await migrateCollection(Note, 'targetClass');
  console.log(`Migrated students: ${students}, attendance: ${attendance}, homework: ${homework}, notes: ${notes}`);
  mongoose.connection.close();
};

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
