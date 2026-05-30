// One-time cleanup: remove records that point to a student/user who no longer
// exists (orphans left behind by deletes that didn't cascade).
// Run with:  node utils/cleanupOrphans.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Homework = require('../models/Homework');
const Notification = require('../models/Notification');

(async () => {
  await connectDB();

  const userIds = (await User.find({}, '_id')).map((u) => String(u._id));
  const idSet = new Set(userIds);
  console.log(`Existing users: ${userIds.length}`);

  const purge = async (label, Model, field) => {
    const docs = await Model.find({}, field);
    const deadIds = docs.filter((d) => !idSet.has(String(d[field]))).map((d) => d._id);
    if (deadIds.length) {
      await Model.deleteMany({ _id: { $in: deadIds } });
    }
    console.log(`${label}: removed ${deadIds.length} orphaned (kept ${docs.length - deadIds.length})`);
  };

  await purge('Fees', Fee, 'student');
  await purge('Attendance', Attendance, 'student');
  await purge('Grades', Grade, 'student');
  await purge('Homework', Homework, 'student');
  await purge('Notifications', Notification, 'user');

  console.log('Cleanup done.');
  await mongoose.connection.close();
  process.exit(0);
})().catch((e) => {
  console.error('Cleanup failed:', e.message);
  process.exit(1);
});
