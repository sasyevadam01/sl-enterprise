import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomeRedirect from './components/HomeRedirect';
import MainLayout from './components/layout/MainLayout';
import { UIProvider } from './components/ui/CustomUI';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import EmployeeDetailPage from './pages/hr/EmployeeDetailPage';
import NewEmployeePage from './pages/hr/NewEmployeePage';
import LeaveCalendarPage from './pages/hr/LeaveCalendarPage';
import NewEventPage from './pages/hr/NewEventPage';
import ApprovalCenterPage from './pages/hr/ApprovalCenterPage';
import HRManagementPage from './pages/hr/HRManagementPage';
import SecurityPage from './pages/hr/SecurityPage';
import TasksPage from './pages/hr/TasksPage';
import PlannerPage from './pages/hr/PlannerPage';
import AnnouncementsPage from './pages/hr/AnnouncementsPage';
import ReturnsPage from './pages/ops/ReturnsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import KPIConfigPage from './pages/factory/KPIConfigPage';
import KPISetupPage from './pages/factory/KPISetupPage';
import FactoryCostPage from './pages/factory/FactoryCostPage';
import FactoryDashboardPage from './pages/factory/FactoryDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SystemConfigPage from './pages/admin/SystemConfigPage';
import MaintenancePage from './pages/factory/MaintenancePage';
import OperatorDashboard from './pages/mobile/OperatorDashboard';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Standalone Protected Routes (No Lateral Menu) */}
            <Route path="/mobile/dashboard" element={
              <ProtectedRoute>
                <OperatorDashboard />
              </ProtectedRoute>
            } />

            {/* Protected routes wrapped in MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomeRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* HR Routes */}
              <Route path="hr/employees" element={<EmployeesPage />} />
              <Route path="hr/employees/new" element={<NewEmployeePage />} />
              <Route path="hr/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="hr/leaves" element={<Navigate to="/hr/approvals" replace />} />
              <Route path="hr/approvals" element={<ApprovalCenterPage />} />
              <Route path="hr/management" element={<HRManagementPage />} />
              <Route path="hr/calendar" element={<LeaveCalendarPage />} />
              <Route path="hr/security" element={<SecurityPage />} />
              <Route path="hr/expiries" element={<Navigate to="/hr/security" replace />} />
              <Route path="hr/events/new" element={<NewEventPage />} />
              <Route path="hr/events/pending" element={<Navigate to="/hr/approvals" replace />} />
              <Route path="hr/tasks" element={<TasksPage />} />
              <Route path="hr/planner" element={<PlannerPage />} />
              <Route path="hr/announcements" element={<AnnouncementsPage />} />

              {/* Chat */}
              <Route path="chat" element={<ChatPage />} />

              {/* Logistics Routes */}
              <Route path="ops/returns" element={<ReturnsPage />} />



              {/* Factory Routes */}
              <Route path="factory" element={<FactoryDashboardPage />} />
              <Route path="factory/dashboard" element={<FactoryDashboardPage />} />
              <Route path="factory/costs" element={<FactoryCostPage />} />
              <Route path="factory/kpi" element={<KPIConfigPage />} />
              <Route path="factory/kpi/setup" element={<KPISetupPage />} />
              <Route path="factory/maintenance" element={<MaintenancePage />} />

              {/* Admin Routes */}
              <Route path="admin/audit" element={<AuditLogPage />} />
              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/config" element={<SystemConfigPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
