# 🎓 Class Portal Backend — API Reference

Base URL: `http://localhost:5000/api`

All protected routes require:
```
Authorization: Bearer <token>
```

---

## 🔐 Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register staff or student |
| POST | `/login` | Public | Login (returns JWT) |
| GET | `/me` | Private | Get own profile |
| PUT | `/me` | Private | Update own profile |
| PUT | `/change-password` | Private | Change password |

### Login Request
```json
POST /api/auth/login
{ "email": "rahul@portal.com", "password": "Student@123" }
```

### Login Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "_id": "...", "name": "Rahul Verma", "role": "student", "class": "SE-A" }
}
```

### Register Request
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@portal.com",
  "password": "Pass@123",
  "role": "student",          // "student" | "staff" | "admin"
  "rollNumber": "CS2021010",  // students only
  "class": "SE-A",            // students only
  "semester": 3,              // students only
  "branch": "Computer Science",
  "employeeId": "EMP010",     // staff only
  "department": "CS",         // staff only
  "subjects": ["DBMS"]        // staff only
}
```

---

## 📅 Attendance — `/api/attendance`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Mark bulk attendance |
| GET | `/me` | Student | Own attendance |
| GET | `/student/:studentId` | Staff | Student attendance |
| GET | `/class?class=SE-A&subject=DBMS&date=2024-01-15` | Staff | Class attendance |
| GET | `/summary?class=SE-A&subject=DBMS` | Staff | Attendance summary |

### Mark Attendance
```json
POST /api/attendance
{
  "class": "SE-A",
  "subject": "Data Structures",
  "date": "2024-01-15",
  "records": [
    { "studentId": "64a...", "status": "present" },
    { "studentId": "64b...", "status": "absent", "remarks": "sick" }
  ]
}
```

---

## 📝 Assignments — `/api/assignments`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Create assignment |
| GET | `/` | Private | List assignments |
| GET | `/:id` | Private | Get single (with submissions for staff) |
| POST | `/:id/submit` | Student | Submit assignment |
| PUT | `/:id/grade/:studentId` | Staff | Grade a submission |
| PUT | `/:id` | Staff | Update assignment |
| DELETE | `/:id` | Staff | Delete assignment |

### Create Assignment
```json
POST /api/assignments
{
  "title": "Binary Search Tree Implementation",
  "description": "Implement BST with insert, delete, search",
  "subject": "Data Structures",
  "class": "SE-A",
  "dueDate": "2024-02-01",
  "totalMarks": 20,
  "fileUrl": "https://..."  // optional attachment
}
```

### Submit Assignment
```json
POST /api/assignments/:id/submit
{ "fileUrl": "https://your-storage.com/submission.pdf" }
```

---

## 📊 Grades — `/api/grades`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Add single grade |
| POST | `/bulk` | Staff | Add grades in bulk |
| GET | `/me` | Student | Own grades + summary |
| GET | `/student/:studentId` | Staff | Student grades |
| GET | `/class?subject=DBMS&examType=internal` | Staff | Class grades |
| PUT | `/:id` | Staff | Update grade |
| DELETE | `/:id` | Staff | Delete grade |

### Add Grade
```json
POST /api/grades
{
  "student": "64a...",
  "subject": "Data Structures",
  "examType": "internal",   // internal|midterm|final|practical|assignment
  "marksObtained": 42,
  "totalMarks": 50,
  "semester": 3,
  "academicYear": "2023-24"
}
```

---

## 📢 Announcements — `/api/announcements`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Create announcement |
| GET | `/` | Private | Get relevant announcements |
| GET | `/:id` | Private | Single announcement |
| PUT | `/:id` | Staff | Update |
| DELETE | `/:id` | Staff | Delete |

### Create Announcement
```json
POST /api/announcements
{
  "title": "Mid Semester Exam Schedule",
  "content": "Mid sem exams start from Feb 10...",
  "targetAudience": "students",  // all|students|staff
  "targetClass": "SE-A",         // optional
  "isPinned": true,
  "expiresAt": "2024-02-15"      // optional
}
```

---

## 🗓️ Timetable — `/api/timetable`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Create/update a day's timetable |
| GET | `/today` | Private | Today's timetable for student |
| GET | `/staff` | Staff | Staff's own classes |
| GET | `/:class?academicYear=2023-24` | Private | Full week timetable |
| DELETE | `/:id` | Staff | Delete entry |

### Create Timetable
```json
POST /api/timetable
{
  "class": "SE-A",
  "day": "Monday",
  "semester": 3,
  "academicYear": "2023-24",
  "periods": [
    { "subject": "Data Structures", "teacher": "64a...", "startTime": "09:00", "endTime": "10:00", "room": "Lab 1", "type": "lecture" },
    { "subject": "Break", "startTime": "10:00", "endTime": "10:15", "type": "break" },
    { "subject": "DBMS", "teacher": "64b...", "startTime": "10:15", "endTime": "11:15", "room": "Room 201", "type": "lecture" }
  ]
}
```

---

## 📚 Notes & PYQs — `/api/notes`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Staff | Upload note/PYQ |
| GET | `/` | Private | List with filters |
| GET | `/subjects` | Private | All distinct subjects |
| GET | `/:id` | Private | Single note |
| PUT | `/:id/download` | Private | Increment download count |
| PUT | `/:id` | Staff | Update |
| DELETE | `/:id` | Staff | Delete |

### Upload Note
```json
POST /api/notes
{
  "title": "Unit 3 - Trees and Graphs",
  "description": "Complete notes for Unit 3",
  "subject": "Data Structures",
  "type": "note",             // note|pyq|syllabus|reference
  "fileUrl": "https://...",
  "fileType": "pdf",
  "targetClass": "SE-A",
  "semester": 3,
  "tags": ["trees", "BST", "graphs"]
}
```

### Upload PYQ
```json
POST /api/notes
{
  "title": "Data Structures Final Exam 2022",
  "subject": "Data Structures",
  "type": "pyq",
  "fileUrl": "https://...",
  "year": 2022,
  "examType": "final",
  "semester": 3
}
```

### Query Notes
```
GET /api/notes?type=pyq&subject=Data Structures&semester=3
GET /api/notes?type=note&search=trees
GET /api/notes?type=pyq&year=2022
```

---

## 👥 Users — `/api/users`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/?role=student&class=SE-A` | Staff | List users |
| GET | `/:id` | Staff | Single user |
| PUT | `/:id` | Admin | Update user |
| PUT | `/:id/toggle-status` | Admin | Activate/deactivate |
| DELETE | `/:id` | Admin | Delete user |

---

## 🔑 Roles & Permissions

| Feature | Student | Staff | Admin |
|---------|---------|-------|-------|
| Login / Profile | ✅ | ✅ | ✅ |
| View Announcements | ✅ | ✅ | ✅ |
| View Timetable | ✅ | ✅ | ✅ |
| View Notes/PYQs | ✅ | ✅ | ✅ |
| Submit Assignment | ✅ | ❌ | ❌ |
| View Own Attendance | ✅ | ❌ | ❌ |
| View Own Grades | ✅ | ❌ | ❌ |
| Mark Attendance | ❌ | ✅ | ✅ |
| Create Assignments | ❌ | ✅ | ✅ |
| Grade Submissions | ❌ | ✅ | ✅ |
| Add Grades | ❌ | ✅ | ✅ |
| Create Announcements | ❌ | ✅ | ✅ |
| Upload Notes/PYQs | ❌ | ✅ | ✅ |
| Manage Timetable | ❌ | ✅ | ✅ |
| Manage Users | ❌ | View only | ✅ |

---

## 🚀 Setup Instructions

```bash
# 1. Clone / download the backend folder
cd class-portal-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Seed demo data
npm run seed

# 5. Start development server
npm run dev
```

### Demo Accounts (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@portal.com | Admin@123 |
| Staff | sharma@portal.com | Staff@123 |
| Student | rahul@portal.com | Student@123 |

---

## 🔗 Connecting to Lovable Frontend

In your Lovable project, set the API base URL:
```js
const API_BASE = 'http://localhost:5000/api';

// Example login call
const res = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem('token', token);

// Example authenticated call
const data = await fetch(`${API_BASE}/announcements`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
```
