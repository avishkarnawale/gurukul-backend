const User = require('../models/User');
const Notification = require('../models/Notification');

function studentMatchesNotice(student, notice) {
  if (notice.targetAudience === 'staff') return false;
  if (notice.targetAudience === 'all') return true;
  if (notice.targetAudience === 'students') {
    if (!notice.targetClass) return true;
    return student.class === notice.targetClass;
  }
  if (notice.targetClass && student.class === notice.targetClass) return true;
  return false;
}

/** Create in-app notifications for students when a notice is posted. */
async function notifyStudentsOfNotice(notice) {
  const isAcademic = !notice.category || notice.category === 'academic';
  if (!isAcademic) return { created: 0 };

  const students = await User.find({ role: 'student', isActive: true }).select('_id class');
  const targets = students.filter((s) => studentMatchesNotice(s, notice));
  if (!targets.length) return { created: 0 };

  const docs = targets.map((s) => ({
    user: s._id,
    type: 'notice',
    title: notice.isPinned ? `📌 ${notice.title}` : notice.title,
    body: notice.content.slice(0, 200),
    link: '/student/notices',
    refId: notice._id,
    read: false,
  }));

  await Notification.insertMany(docs);
  return { created: docs.length };
}

module.exports = { notifyStudentsOfNotice, studentMatchesNotice };
