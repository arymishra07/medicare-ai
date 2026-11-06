import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ToastViewport from './components/ToastViewport';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PatientDashboard from './pages/patient/PatientDashboard';
import FindDoctors from './pages/patient/FindDoctors';
import PatientAppointments from './pages/patient/PatientAppointments';
import MedicineReminders from './pages/patient/MedicineReminders';
import MedicalReports from './pages/patient/MedicalReports';
import HealthChat from './pages/patient/HealthChat';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorAvailability from './pages/doctor/DoctorAvailability';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDoctors from './pages/admin/ManageDoctors';
import ManageAppointments from './pages/admin/ManageAppointments';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<PublicOnlyRoute />}>
          <Route
            path="/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout wide>
                <Register />
              </AuthLayout>
            }
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/profile" element={<Profile />} />

            <Route
              path="/patient/dashboard"
              element={
                <RoleRoute roles={['patient']}>
                  <PatientDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/patient/doctors"
              element={
                <RoleRoute roles={['patient']}>
                  <FindDoctors />
                </RoleRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <RoleRoute roles={['patient']}>
                  <PatientAppointments />
                </RoleRoute>
              }
            />
            <Route
              path="/patient/medicines"
              element={
                <RoleRoute roles={['patient']}>
                  <MedicineReminders />
                </RoleRoute>
              }
            />
            <Route
              path="/patient/reports"
              element={
                <RoleRoute roles={['patient']}>
                  <MedicalReports />
                </RoleRoute>
              }
            />
            <Route
              path="/patient/chat"
              element={
                <RoleRoute roles={['patient']}>
                  <HealthChat />
                </RoleRoute>
              }
            />

            <Route
              path="/doctor/dashboard"
              element={
                <RoleRoute roles={['doctor']}>
                  <DoctorDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/doctor/appointments"
              element={
                <RoleRoute roles={['doctor']}>
                  <DoctorAppointments />
                </RoleRoute>
              }
            />
            <Route
              path="/doctor/patients"
              element={
                <RoleRoute roles={['doctor']}>
                  <DoctorPatients />
                </RoleRoute>
              }
            />
            <Route
              path="/doctor/availability"
              element={
                <RoleRoute roles={['doctor']}>
                  <DoctorAvailability />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleRoute roles={['admin']}>
                  <ManageUsers />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/doctors"
              element={
                <RoleRoute roles={['admin']}>
                  <ManageDoctors />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/appointments"
              element={
                <RoleRoute roles={['admin']}>
                  <ManageAppointments />
                </RoleRoute>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastViewport />
    </>
  );
}
