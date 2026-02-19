import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import HomeRedirect from './components/HomeRedirect';
import MainLayout from './components/layout/MainLayout';
import { UIProvider } from './components/ui/CustomUI';
import LoginPage from './pages/auth/LoginPage';
import PinSetupPage from './pages/auth/PinSetupPage';
import PinVerifyPage from './pages/auth/PinVerifyPage';
import SplashPage from './pages/auth/SplashPage';
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
import ProductionConfigPage from './pages/admin/ProductionConfigPage';
import ProductionReportsPage from './pages/admin/ProductionReportsPage';
import OperatorDashboard from './pages/mobile/OperatorDashboard';
import OrderDashboardPage from './pages/production/OrderDashboardPage';
import NewOrderPage from './pages/production/NewOrderPage';
import SupplyDashboardPage from './pages/production/SupplyDashboardPage';
import CalcoloBlocchiPage from './pages/production/CalcoloBlocchiPage';
import ChatPage from './pages/ChatPage';
import ComingSoonPage from './pages/ComingSoonPage';
import MaterialRequestPage from './pages/logistics/MaterialRequestPage';
import LogisticsPoolPage from './pages/logistics/LogisticsPoolPage';
import LogisticsDashboardPage from './pages/logistics/LogisticsDashboardPage';
import LogisticsConfigPage from './pages/admin/LogisticsConfigPage';
import VehicleChecklistPage from './pages/fleet/VehicleChecklistPage';
import ChecklistHistoryPage from './pages/fleet/ChecklistHistoryPage';
import OvenPage from './pages/production/OvenPage';
import ControlRoomPage from './pages/logistics/ControlRoomPage';

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pin-setup" element={<PinSetupPage />} />
            <Route path="/pin-verify" element={<PinVerifyPage />} />
            <Route path="/splash" element={
              <ProtectedRoute>
                <SplashPage />
              </ProtectedRoute>
            } />

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

              {/* Dashboard - Solo per chi ha view_dashboard */}
              <Route path="dashboard" element={
                <PermissionRoute permission="view_dashboard">
                  <DashboardPage />
                </PermissionRoute>
              } />

              {/* HR Routes */}
              <Route path="hr/employees" element={
                <PermissionRoute permission="manage_employees">
                  <EmployeesPage />
                </PermissionRoute>
              } />
              <Route path="hr/employees/new" element={
                <PermissionRoute permission="manage_employees">
                  <NewEmployeePage />
                </PermissionRoute>
              } />
              <Route path="hr/employees/:id" element={
                <PermissionRoute permission="manage_employees">
                  <EmployeeDetailPage />
                </PermissionRoute>
              } />
              <Route path="hr/leaves" element={<Navigate to="/hr/approvals" replace />} />
              <Route path="hr/approvals" element={
                <PermissionRoute permission="manage_attendance">
                  <ApprovalCenterPage />
                </PermissionRoute>
              } />
              <Route path="hr/management" element={
                <PermissionRoute permission="manage_employees">
                  <HRManagementPage />
                </PermissionRoute>
              } />
              <Route path="hr/calendar" element={
                <PermissionRoute permission="view_hr_calendar">
                  <LeaveCalendarPage />
                </PermissionRoute>
              } />
              <Route path="hr/security" element={
                <PermissionRoute permission="manage_employees">
                  <SecurityPage />
                </PermissionRoute>
              } />
              <Route path="hr/expiries" element={<Navigate to="/hr/security" replace />} />
              <Route path="hr/events/new" element={
                <PermissionRoute permission="request_events">
                  <NewEventPage />
                </PermissionRoute>
              } />
              <Route path="hr/events/pending" element={<Navigate to="/hr/approvals" replace />} />
              <Route path="hr/tasks" element={
                <PermissionRoute permission="manage_tasks">
                  <TasksPage />
                </PermissionRoute>
              } />
              <Route path="hr/planner" element={
                <PermissionRoute permission="manage_shifts">
                  <PlannerPage />
                </PermissionRoute>
              } />
              <Route path="hr/announcements" element={
                <PermissionRoute permission="view_announcements">
                  <AnnouncementsPage />
                </PermissionRoute>
              } />

              {/* Chat - Accessibile a tutti gli utenti loggati */}
              <Route path="chat" element={<ChatPage />} />

              {/* Logistics Routes */}
              <Route path="ops/returns" element={
                <PermissionRoute permission="access_logistics">
                  <ReturnsPage />
                </PermissionRoute>
              } />

              {/* Factory Routes */}
              <Route path="factory" element={
                <PermissionRoute permission="access_factory">
                  <FactoryDashboardPage />
                </PermissionRoute>
              } />
              <Route path="factory/dashboard" element={
                <PermissionRoute permission="access_factory">
                  <FactoryDashboardPage />
                </PermissionRoute>
              } />
              <Route path="factory/costs" element={
                <PermissionRoute permission="manage_kpi">
                  <FactoryCostPage />
                </PermissionRoute>
              } />
              <Route path="factory/kpi" element={
                <PermissionRoute permission="access_factory">
                  <KPIConfigPage />
                </PermissionRoute>
              } />
              <Route path="factory/kpi/setup" element={
                <PermissionRoute permission="manage_kpi">
                  <KPISetupPage />
                </PermissionRoute>
              } />
              <Route path="factory/maintenance" element={
                <PermissionRoute permission="access_factory">
                  <MaintenancePage />
                </PermissionRoute>
              } />

              {/* Live Production Routes */}
              <Route path="production/orders" element={
                <PermissionRoute permission={['create_production_orders', 'manage_production_supply']}>
                  <OrderDashboardPage />
                </PermissionRoute>
              } />
              <Route path="production/orders/new" element={
                <PermissionRoute permission="create_production_orders">
                  <NewOrderPage />
                </PermissionRoute>
              } />
              <Route path="production/blocks" element={
                <PermissionRoute permission="manage_production_supply">
                  <SupplyDashboardPage />
                </PermissionRoute>
              } />
              <Route path="production/calcolo" element={
                <PermissionRoute permission="access_block_calculator">
                  <CalcoloBlocchiPage />
                </PermissionRoute>
              } />
              <Route path="production/checklist" element={
                <PermissionRoute permission="perform_checklists">
                  <VehicleChecklistPage />
                </PermissionRoute>
              } />
              <Route path="production/checklist/history" element={
                <PermissionRoute permission="view_checklist_history">
                  <ChecklistHistoryPage />
                </PermissionRoute>
              } />
              <Route path="production/oven" element={
                <PermissionRoute permission="use_oven">
                  <OvenPage />
                </PermissionRoute>
              } />

              {/* Logistics - Richiesta Materiale */}
              <Route path="logistics/request" element={
                <PermissionRoute permission="request_logistics">
                  <MaterialRequestPage />
                </PermissionRoute>
              } />
              <Route path="logistics/pool" element={
                <PermissionRoute permission="manage_logistics_pool">
                  <LogisticsPoolPage />
                </PermissionRoute>
              } />
              <Route path="logistics/dashboard" element={
                <PermissionRoute permission="supervise_logistics">
                  <LogisticsDashboardPage />
                </PermissionRoute>
              } />
              <Route path="logistics/control-room" element={
                <PermissionRoute permission="admin_users">
                  <ControlRoomPage />
                </PermissionRoute>
              } />

              <Route path="coming-soon" element={<ComingSoonPage />} />

              {/* Admin Routes */}
              <Route path="admin/audit" element={
                <PermissionRoute permission="admin_audit">
                  <AuditLogPage />
                </PermissionRoute>
              } />
              <Route path="admin/users" element={
                <PermissionRoute permission="admin_users">
                  <UserManagementPage />
                </PermissionRoute>
              } />
              <Route path="admin/config" element={
                <PermissionRoute permission="admin_users">
                  <SystemConfigPage />
                </PermissionRoute>
              } />
              <Route path="admin/production/config" element={
                <PermissionRoute permission="admin_users">
                  <ProductionConfigPage />
                </PermissionRoute>
              } />
              <Route path="admin/production/reports" element={
                <PermissionRoute permission="admin_users">
                  <ProductionReportsPage />
                </PermissionRoute>
              } />
              <Route path="admin/logistics" element={
                <PermissionRoute permission="admin_users">
                  <LogisticsConfigPage />
                </PermissionRoute>
              } />
            </Route>

            {/* Catch all - Redirect to home which will then redirect based on permissions */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
