require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Homework = require('../models/Homework');
const Fee = require('../models/Fee');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Note = require('../models/Note');
const connectDB = require('../config/db');
const { startOfDay } = require('./attendance');

const run = async () => {
  await connectDB();
  await User.deleteMany({});
  await Homework.deleteMany({});
  await Fee.deleteMany({});
  await Announcement.deleteMany({});
  await Attendance.deleteMany({});
  await Grade.deleteMany({});
  await Note.deleteMany({});
  console.log('🗑️  Cleared all data');

  // ── Users ──
  const admin = await User.create({
    name: 'Pruthviraj Navale',
    email: 'admin@gurukul.com',
    password: 'Admin@123',
    role: 'admin',
    employeeId: 'ADM001',
    department: 'Gurukul Classes',
    phone: '9307181827',
  });
  const teacher1 = await User.create({ name: 'Mrs. Sharma', email: 'sharma@gurukul.com', password: 'Staff@123', role: 'staff', employeeId: 'EMP001', department: 'Mathematics', subjects: ['Mathematics', 'Science'], phone: '9876543210' });
  const teacher2 = await User.create({ name: 'Mr. Verma', email: 'verma@gurukul.com', password: 'Staff@123', role: 'staff', employeeId: 'EMP002', department: 'English', subjects: ['English', 'Social Studies'], phone: '9876543211' });

  const student1 = await User.create({ name: 'Aarav Patel', email: '', password: '2010-03-15', role: 'student', rollNumber: 'GK001', dateOfBirth: '2010-03-15', class: 'Class 10|CBSE', board: 'CBSE', parentName: 'Ramesh Patel', parentPhone: '9012345678' });
  const student2 = await User.create({ name: 'Priya Sharma', email: '', password: '2010-07-22', role: 'student', rollNumber: 'GK002', dateOfBirth: '2010-07-22', class: 'Class 10|CBSE', board: 'CBSE', parentName: 'Suresh Sharma', parentPhone: '9012345679' });
  const student3 = await User.create({ name: 'Rohan Desai', email: '', password: '2011-01-10', role: 'student', rollNumber: 'GK003', dateOfBirth: '2011-01-10', class: 'Class 9|SSC', board: 'SSC', parentName: 'Vijay Desai', parentPhone: '9012345680' });

  console.log('✅ Created 3 staff + 3 students');

  // ── Homework ──
  const today = new Date();
  await Homework.create([
    { title: 'Essay: My Hero (300 words)', description: 'Write a 300-word essay about your hero.', subject: 'English', class: 'Class 10|CBSE', postedBy: teacher2._id, dueDate: new Date(today.getTime() - 2 * 86400000) },
    { title: 'Algebra Worksheet — Quadratics', description: 'Complete problems 1–20 from chapter 5.', subject: 'Mathematics', class: 'Class 10|CBSE', postedBy: teacher1._id, dueDate: new Date(today.getTime() + 1 * 86400000) },
    { title: 'Read Chapter 4: Carbon', description: 'Read and summarize chapter 4.', subject: 'Science', class: 'Class 10|CBSE', postedBy: teacher1._id, dueDate: new Date(today.getTime() + 3 * 86400000) },
  ]);
  console.log('✅ Created homework');

  // ── Fees ──
  await Fee.create([
    { student: student1._id, term: 'Term 1 2025-26', totalAmount: 7500, dueDate: new Date('2025-06-30'), description: 'Tuition Fee - Term 1', payments: [] },
    { student: student2._id, term: 'Term 1 2025-26', totalAmount: 7500, dueDate: new Date('2025-06-30'), description: 'Tuition Fee - Term 1', payments: [{ amount: 3000, method: 'cash', receiptNo: 'RCP001' }] },
    { student: student3._id, term: 'Term 1 2025-26', totalAmount: 7500, dueDate: new Date('2025-06-30'), description: 'Tuition Fee - Term 1', payments: [{ amount: 7500, method: 'online', receiptNo: 'RCP002' }] },
  ]);
  console.log('✅ Created fees');

  // ── Notices ──
  await Announcement.create([
    { title: 'Mid-term exam timetable', content: 'Check the timetable section for your schedule. Exams begin June 10.', postedBy: admin._id, isPinned: true, targetAudience: 'all', category: 'academic' },
    { title: 'Parent-Teacher Meeting', content: 'Saturday 10:00 AM in main hall. Attendance mandatory.', postedBy: admin._id, targetAudience: 'all' },
    { title: 'Welcome to the new term!', content: 'Classes resume on Monday. Stay punctual.', postedBy: admin._id, targetAudience: 'students' },
  ]);
  console.log('✅ Created notices');

  // ── Attendance (last 14 days) ──
  const students = [student1, student2, student3];
  for (let d = 0; d < 14; d++) {
    const dayStr = new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
    const date = startOfDay(dayStr);
    for (const stu of students) {
      await Attendance.create({
        student: stu._id,
        class: stu.class,
        date,
        subject: 'daily',
        status: Math.random() > 0.15 ? 'present' : 'absent',
        markedBy: teacher1._id,
      });
    }
  }
  console.log('✅ Created attendance');

  // ── Grades ──
  await Grade.create([
    { student: student1._id, subject: 'Mathematics', examType: 'midterm', marksObtained: 42, totalMarks: 50, addedBy: teacher1._id },
    { student: student1._id, subject: 'English', examType: 'midterm', marksObtained: 38, totalMarks: 50, addedBy: teacher2._id },
    { student: student2._id, subject: 'Mathematics', examType: 'midterm', marksObtained: 45, totalMarks: 50, addedBy: teacher1._id },
  ]);
  console.log('✅ Created grades');

  // ── Notes & PYQs ──
  await Note.create([
    { title: 'Quadratic Equations Summary', description: 'Quick revision sheet', subject: 'Mathematics', type: 'note', fileUrl: 'https://example.com/notes/quadratics.pdf', targetClass: 'Class 10|CBSE', uploadedBy: teacher1._id },
    { title: 'Science Chapter 4 PYQ', description: '2023 board paper', subject: 'Science', type: 'pyq', fileUrl: 'https://example.com/pyq/science-2023.pdf', targetClass: 'Class 10|CBSE', year: 2023, uploadedBy: teacher1._id },
  ]);
  console.log('✅ Created notes & PYQs');

  console.log('\n🌱 Seed complete!');
  console.log('─────────────────────────────────────────────────────');
  console.log('ADMIN   → admin@gurukul.com      password: Admin@123');
  console.log('STAFF   → sharma@gurukul.com     password: Staff@123');
  console.log('STUDENT → Roll: GK001            DOB: 2010-03-15');
  console.log('STUDENT → Roll: GK002            DOB: 2010-07-22');
  console.log('─────────────────────────────────────────────────────');

  mongoose.connection.close();
};

run().catch(err => { console.error(err); process.exit(1); });
