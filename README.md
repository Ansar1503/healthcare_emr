# 🏥 MedEMR — Healthcare Appointment Management System

A production-ready MERN stack application for managing hospital appointments with role-based access control, secure JWT authentication, and concurrency-safe slot booking.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [RBAC Design](#rbac-design)
- [Slot Generation Algorithm](#slot-generation-algorithm)
- [Concurrency Control](#concurrency-control)
- [API Reference](#api-reference)
- [Frontend Architecture](#frontend-architecture)
- [Getting Started](#getting-started)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   React (Vite) Frontend                   │
│  LoginPage │ AdminDashboard │ SchedulerPage │ BookingPage  │
│     AuthContext │ Axios Interceptors │ Protected Routes    │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTPS/JSON + HTTP-only cookie
┌─────────────────────▼────────────────────────────────────┐
│               Express.js API Server (Node.js)             │
│  Rate Limiter │ Helmet │ CORS │ Cookie Parser │ Morgan     │
│  ─────────────────────────────────────────────────────── │
│  Routes → Middleware → Controllers → Services → Models    │
│  authenticate() │ requireRole([...]) │ validateRequest()  │
└─────────────────────┬────────────────────────────────────┘
                      │ Mongoose ODM
┌─────────────────────▼────────────────────────────────────┐
│                       MongoDB Atlas                        │
│   Users │ Doctors │ Patients │ Appointments │ AuditLogs   │
│   Unique index: { doctor, date, slotStart } (CONCURRENCY)  │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Tech | Purpose |
|------|---------|
| Node.js + Express | HTTP server and routing |
| MongoDB + Mongoose | NoSQL database with ODM |
| bcryptjs | Password hashing (12 rounds) |
| jsonwebtoken | Access + Refresh token generation |
| cookie-parser | HTTP-only cookie handling |
| helmet | Security headers |
| express-rate-limit | Brute-force protection |
| morgan | HTTP request logging |

### Frontend
| Tech | Purpose |
|------|---------|
| React 18 + Vite | UI framework with fast HMR |
| React Router v6 | Client-side routing |
| Axios | HTTP client with interceptors |
| Context API + useReducer | Global auth state management |

---

## Project Structure

```
healthcare-emr/
├── backend/
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js      # Login, refresh, logout
│   │   ├── doctor.controller.js    # Doctor CRUD
│   │   ├── patient.controller.js   # Patient search & CRUD
│   │   ├── appointment.controller.js # Appointment management
│   │   ├── slot.controller.js      # Slot generation
│   │   └── user.controller.js      # User management
│   ├── services/
│   │   ├── auth.service.js         # Auth business logic
│   │   └── appointment.service.js  # Booking business logic
│   ├── models/
│   │   ├── User.model.js           # User schema + bcrypt hooks
│   │   ├── Doctor.model.js         # Doctor profile schema
│   │   ├── Patient.model.js        # Patient record schema
│   │   ├── Appointment.model.js    # Appointment + unique index
│   │   └── AuditLog.model.js       # Audit trail schema
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── doctor.routes.js
│   │   ├── patient.routes.js
│   │   ├── appointment.routes.js
│   │   ├── slot.routes.js
│   │   └── user.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js      # JWT verify + RBAC
│   │   └── error.middleware.js     # Global error handler
│   ├── utils/
│   │   ├── jwt.utils.js            # Token generation/verification
│   │   ├── slot.utils.js           # Slot generation algorithm
│   │   ├── audit.utils.js          # Audit log helper
│   │   └── seed.js                 # Database seeder
│   ├── server.js                   # Application entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   └── ProtectedRoute.jsx  # Auth guard
    │   │   └── layout/
    │   │       └── AppLayout.jsx       # Sidebar + navigation
    │   ├── context/
    │   │   └── AuthContext.jsx         # Auth state + actions
    │   ├── hooks/
    │   │   └── index.js               # useApi, useDebounce, useLocalStorage
    │   ├── pages/
    │   │   ├── LoginPage.jsx           # Authentication
    │   │   ├── AdminDashboard.jsx      # Doctor/receptionist management
    │   │   ├── SchedulerPage.jsx       # Slot grid view + selection
    │   │   ├── BookingPage.jsx         # Patient selection + booking
    │   │   ├── AppointmentsPage.jsx    # Appointment list + actions
    │   │   └── DoctorDashboard.jsx     # Doctor's schedule view
    │   ├── services/
    │   │   ├── api.js                  # Axios instance + interceptors
    │   │   └── index.js               # Service modules per resource
    │   ├── App.jsx                     # Router configuration
    │   └── main.jsx                    # React entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Database Schema

### Users Collection
```js
{
  name: String,
  email: String (unique),
  password: String (bcrypt hashed, select: false),
  role: "super_admin" | "doctor" | "receptionist",
  doctorId: ObjectId (ref: Doctor),  // only for doctor role
  isActive: Boolean,
  refreshToken: String (hashed, select: false),
  lastLogin: Date
}
```

### Doctors Collection
```js
{
  name: String,
  department: String (enum),
  specialization: String,
  slotDuration: Number (minutes),
  workingHours: { startTime: "HH:MM", endTime: "HH:MM" },
  breaks: [{ startTime: "HH:MM", endTime: "HH:MM" }],
  workingDays: [Number],  // 0=Sun, 1=Mon... 6=Sat
  isActive: Boolean,
  userId: ObjectId (ref: User)
}
```

### Patients Collection
```js
{
  name: String,
  mobile: String (indexed),
  age: Number,
  gender: "male" | "female" | "other",
  bloodGroup: String,
  address: String,
  medicalHistory: String,
  createdBy: ObjectId (ref: User)
}
// Text index on name + mobile for full-text search
```

### Appointments Collection
```js
{
  doctor: ObjectId (ref: Doctor),
  patient: ObjectId (ref: Patient),
  date: String "YYYY-MM-DD",
  slotStart: "HH:MM",
  slotEnd: "HH:MM",
  status: "booked" | "arrived" | "completed" | "cancelled" | "no_show",
  purpose: String,
  notes: String,
  arrivedAt: Date,
  completedAt: Date,
  createdBy: ObjectId (ref: User),
  updatedBy: ObjectId (ref: User)
}
// UNIQUE INDEX: { doctor, date, slotStart } where status != "cancelled"
```

### AuditLogs Collection
```js
{
  userId: ObjectId,
  userRole: String,
  action: String (enum: LOGIN, CREATE_APPOINTMENT, etc.),
  entity: String,
  entityId: ObjectId,
  details: Mixed,
  ipAddress: String,
  userAgent: String,
  createdAt: Date  // auto-indexed
}
```

---

## Authentication Flow

```
1. Client  POST /api/auth/login  { email, password }
           ─────────────────────────────────────────▶
2. Server  verifies password with bcrypt
           generates accessToken (15m) + refreshToken (7d)
           stores refreshToken in DB (for rotation validation)
           sets refreshToken as HTTP-only cookie
           returns { accessToken, user }
           ◀─────────────────────────────────────────
3. Client  stores accessToken in localStorage
           attaches to every request: Authorization: Bearer <token>

4. Token Expiry (401 received):
   Client  POST /api/auth/refresh  (cookie sent automatically)
           ─────────────────────────────────────────▶
   Server  verifies refreshToken from cookie
           compares with DB-stored token (prevents reuse)
           generates new accessToken + rotates refreshToken
           ◀─────────────────────────────────────────
   Client  updates localStorage, retries original request

5. Logout:
   Client  POST /api/auth/logout
   Server  clears refreshToken from DB, clears cookie
```

---

## RBAC Design

```js
// Middleware factory
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Route examples:
router.post('/doctors', authenticate, requireRole(['super_admin']), createDoctor);
router.post('/appointments', authenticate, requireRole(['super_admin', 'receptionist']), createAppointment);
router.get('/appointments', authenticate, getAppointments);  // filtered by role in service
```

| Route | super_admin | receptionist | doctor |
|-------|-------------|--------------|--------|
| GET /doctors | ✅ | ✅ | ✅ |
| POST /doctors | ✅ | ❌ | ❌ |
| GET /slots | ✅ | ✅ | ❌ |
| POST /appointments | ✅ | ✅ | ❌ |
| GET /appointments | ✅ (all) | ✅ (all) | ✅ (own only) |
| POST /appointments/:id/arrive | ✅ | ✅ | ❌ |
| GET /users | ✅ | ❌ | ❌ |

---

## Slot Generation Algorithm

```js
// Input: doctor schedule, date, booked slots array
// Output: array of slot objects with availability status

function generateSlots(doctor, date, bookedSlots) {
  const { workingHours, breaks, slotDuration } = doctor;
  const workStart = timeToMinutes(workingHours.startTime); // e.g. 540 (9:00)
  const workEnd   = timeToMinutes(workingHours.endTime);   // e.g. 1020 (17:00)

  const slots = [];
  let current = workStart;

  while (current + slotDuration <= workEnd) {
    const slotEnd = current + slotDuration;
    const startStr = minutesToTime(current);  // "HH:MM"
    const endStr   = minutesToTime(slotEnd);

    slots.push({
      slotStart: startStr,
      slotEnd: endStr,
      isAvailable: !isDuringBreak && !isPast && !isBooked,
      status: isDuringBreak ? 'break' : isPast ? 'past' : isBooked ? 'booked' : 'available'
    });

    current += slotDuration;
  }
  return slots;
}
```

**Example** (09:00–10:00, 15min slots, break 13:00–14:00):
```
09:00–09:15  ✅ available
09:15–09:30  🔴 booked
09:30–09:45  ✅ available
09:45–10:00  ✅ available
13:00–13:15  ⏸ break
```

---

## Concurrency Control

Two receptionists booking the same slot simultaneously is prevented at the database level:

```js
// Appointment model
appointmentSchema.index(
  { doctor: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ['cancelled'] } }
  }
);
```

**Race condition scenario:**
1. Receptionist A and B both see slot 10:00 as available
2. Both submit booking simultaneously
3. MongoDB accepts only one write (atomic index check)
4. The second request gets error code 11000 (duplicate key)
5. Error middleware converts this to: "This slot is already booked. Please select another slot."

---

## API Reference

### Authentication
```
POST   /api/auth/login      { email, password } → { accessToken, user }
POST   /api/auth/refresh    (cookie) → { accessToken, user }
POST   /api/auth/logout     (auth) → 200
GET    /api/auth/me         (auth) → { user }
```

### Doctors
```
GET    /api/doctors              → [doctors]
GET    /api/doctors/:id          → doctor
POST   /api/doctors              { name, department, email, password, ... } → doctor+user
PUT    /api/doctors/:id          { ...updates } → doctor
```

### Slots
```
GET    /api/slots?doctorId=&date=  → { slots, stats, doctorInfo }
```

### Appointments
```
GET    /api/appointments?date=&doctorId=&status=&page=&limit=  → { appointments, pagination }
POST   /api/appointments     { doctorId, patientId, date, slotStart, purpose }  → appointment
PUT    /api/appointments/:id { status, purpose, notes }  → appointment
DELETE /api/appointments/:id  → { message }
POST   /api/appointments/:id/arrive  → appointment
```

### Patients
```
GET    /api/patients/search?q=&page=  → { patients, pagination }
GET    /api/patients/:id              → patient
POST   /api/patients     { name, mobile, age, gender }  → patient
PUT    /api/patients/:id  { ...updates }  → patient
```

### Users (Admin only)
```
GET    /api/users?role=&isActive=      → [users]
POST   /api/users/receptionist  { name, email, password }  → user
PATCH  /api/users/:id/toggle-active    → { isActive }
```

---

## Frontend Architecture

### Auth State Machine (useReducer)
```
IDLE → SET_LOADING → LOGIN_SUCCESS → (authenticated)
                   → SET_ERROR     → (show error)
(authenticated) → LOGOUT → (unauthenticated)
```

### Axios Request/Retry Flow
```
Request → attach Bearer token → server
  if 401 and !retry:
    → isRefreshing? queue request : attempt refresh
    → refresh success: update token, retry original
    → refresh fail: dispatch auth:logout event
      → AuthContext clears state → redirect to /login
```

### Route Guard
```jsx
<ProtectedRoute allowedRoles={['super_admin']}>
  → if !authenticated → <Navigate to="/login" />
  → if wrong role    → <Navigate to="/unauthorized" />
  → else             → <Outlet />
</ProtectedRoute>
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI and JWT secrets
npm run seed   # Creates default users
npm run dev    # Starts on port 5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev    # Starts on port 5173
```

### Default Credentials (after seed)
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@hospital.com | Admin@123456 |
| Doctor | sarah.johnson@hospital.com | Doctor@123456 |
| Receptionist | jane.smith@hospital.com | Recept@123456 |

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt with 12 salt rounds |
| Access tokens | JWT, 15min expiry, stored in memory/localStorage |
| Refresh tokens | JWT, 7 days, HTTP-only cookie, server-side rotation |
| Token reuse detection | Stored refresh token comparison on each refresh |
| RBAC | Middleware enforced on every protected route |
| Rate limiting | 100 req/15min global, 10 req/15min on login |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| Input sanitization | express-validator + Mongoose schema validation |
| Audit logging | Every auth event and data mutation logged with IP |
| CORS | Restricted to known frontend origin |

---

## Performance Optimizations

### Backend
- **Lean queries**: `.lean()` on read-only operations (returns plain JS objects, ~40% faster)
- **Selective field projection**: Only fetch required fields
- **Compound indexes**: `{ doctor, date }`, `{ doctor, date, slotStart }` for O(log n) lookups
- **Text indexes**: On patient `name` + `mobile` for fast search
- **Pagination**: All list endpoints support `page` + `limit`
- **Promise.all**: Parallel DB calls where queries are independent

### Frontend
- **useApi hook**: Prevents duplicate requests, handles loading/error states
- **useDebounce**: Patient search debounced 300ms to reduce API calls
- **useCallback/useMemo**: Memoized event handlers and computed values
- **Lazy route loading**: Easy to add React.lazy() for code splitting
- **Axios interceptor queue**: Prevents multiple simultaneous refresh calls

---

## Audit Log Events

| Event | Triggered When |
|-------|---------------|
| LOGIN | User successfully authenticates |
| LOGOUT | User logs out |
| CREATE_DOCTOR | Admin creates a new doctor |
| CREATE_RECEPTIONIST | Admin creates a new receptionist |
| CREATE_PATIENT | Receptionist registers new patient |
| CREATE_APPOINTMENT | Appointment booked |
| UPDATE_APPOINTMENT | Appointment details modified |
| DELETE_APPOINTMENT | Appointment cancelled |
| MARK_ARRIVED | Patient marked as arrived |
