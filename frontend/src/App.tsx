import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import SchedulerPage from './pages/SchedulerPage';
import BookingPage from './pages/BookingPage';
import AppointmentsPage from './pages/AppointmentsPage';

const Unauthorized = () => (
  <div style={{ padding:40, textAlign:'center' }}>
    <h2>403 – Access Denied</h2>
    <p>You don&apos;t have permission to access this page.</p>
    <a href="/">Go Home</a>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<AdminDashboard />} />
            <Route path="/admin/receptionists" element={<AdminDashboard />} />
            <Route path="/admin/appointments" element={<AppointmentsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['receptionist', 'super_admin']} />}>
            <Route path="/reception" element={<Navigate to="/reception/appointments" replace />} />
            <Route path="/reception/scheduler" element={<SchedulerPage />} />
            <Route path="/reception/book" element={<BookingPage />} />
            <Route path="/reception/appointments" element={<AppointmentsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/today" element={<DoctorDashboard />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
