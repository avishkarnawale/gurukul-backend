require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const connectDB = require('../config/db');
const { DAILY_SUBJECT, dayKey, preferRecord, startOfDay } = require('./attendance');

async function run() {
  await connectDB();
  const all = await Attendance.find({}).sort({ updatedAt: -1 });
  const groups = new Map();

  for (const doc of all) {
    const key = `${doc.student}|${dayKey(doc.date)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  let removed = 0;
  let normalized = 0;

  for (const [, docs] of groups) {
    const keeper = docs.reduce((best, d) => preferRecord(best, d));
    const dayStart = startOfDay(dayKey(keeper.date));

    for (const doc of docs) {
      if (doc._id.equals(keeper._id)) {
        if (doc.date.getTime() !== dayStart.getTime() || doc.subject !== DAILY_SUBJECT) {
          doc.date = dayStart;
          doc.subject = DAILY_SUBJECT;
          await doc.save();
          normalized++;
        }
        continue;
      }
      await Attendance.deleteOne({ _id: doc._id });
      removed++;
    }
  }

  console.log(`Deduped attendance: removed ${removed} duplicates, normalized ${normalized} records`);
  mongoose.connection.close();
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
