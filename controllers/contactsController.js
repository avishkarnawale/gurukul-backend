const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');

const OWNER_NAME = process.env.INSTITUTE_OWNER_NAME || 'Pruthviraj Navale';
const OWNER_PHONE = process.env.INSTITUTE_OWNER_PHONE || '9307181827';

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91')) return digits;
  return digits;
}

// @desc    Teachers & owner for student to contact
// @route   GET /api/contacts/teachers
// @access  Student
exports.getTeachersForStudent = asyncHandler(async (req, res) => {
  const staff = await User.find({
    role: { $in: ['staff', 'admin'] },
    isActive: true,
  })
    .select('name role department subjects phone email')
    .sort({ role: -1, name: 1 });

  let contacts = staff.map((u) => {
    const isOwner = u.role === 'admin';
    const phone = isOwner ? (u.phone || OWNER_PHONE) : u.phone;
    const wa = normalizePhone(phone);
    return {
      id: String(u._id),
      name: u.name,
      role: u.role,
      roleLabel: isOwner ? 'Owner & Teacher' : 'Teacher',
      department: u.department || (isOwner ? 'Gurukul Classes' : 'Faculty'),
      subjects: u.subjects || [],
      phone: phone || null,
      phoneDisplay: phone ? `+91 ${String(phone).replace(/\D/g, '').slice(-10)}` : null,
      whatsapp: wa,
      isOwner,
    };
  });

  const hasOwner = contacts.some((c) => c.isOwner);
  if (!hasOwner) {
    const wa = normalizePhone(OWNER_PHONE);
    contacts.unshift({
      id: 'owner',
      name: OWNER_NAME,
      role: 'admin',
      roleLabel: 'Owner & Teacher',
      department: 'Gurukul Classes',
      subjects: [],
      phone: OWNER_PHONE,
      phoneDisplay: `+91 ${OWNER_PHONE}`,
      whatsapp: wa,
      isOwner: true,
    });
  }

  res.json({ success: true, count: contacts.length, data: contacts });
});
