import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Nav } from './components/Nav';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BudgetsLayout } from './pages/BudgetsLayout';
import { Budgets } from './pages/Budgets';
import { BudgetView } from './pages/BudgetView';
import { RecurringExpenses } from './pages/RecurringExpenses';
import { Admin } from './pages/Admin';
import { AdminProfile } from './pages/AdminProfile';
import { AdminBilling } from './pages/AdminBilling';
import { AdminUsage } from './pages/AdminUsage';
import { SuperAdmin } from './pages/SuperAdmin';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SuperAdminClients } from './pages/SuperAdminClients';
import { Billing } from './pages/Billing';
import { Invoices } from './pages/Invoices';
import { Clients } from './pages/Clients';
import { InvoiceEditor } from './pages/InvoiceEditor';
import { BillingSettings } from './pages/BillingSettings';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { NotFound } from './pages/NotFound';

export const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen text-white">
        <Nav />
        <Routes>
          <Route path="/" element={<Navigate to="/budgets" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <BudgetsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Budgets />} />
            <Route path="recurring" element={<RecurringExpenses />} />
            <Route path=":id" element={<BudgetView />} />
          </Route>
          <Route path="/recurring-expenses" element={<Navigate to="/budgets/recurring" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<AdminProfile />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="usage" element={<AdminUsage />} />
          </Route>
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <SuperAdmin />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="clients" element={<SuperAdminClients />} />
          </Route>
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/billing/invoices" replace />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceEditor />} />
            <Route path="invoices/:id/edit" element={<InvoiceEditor />} />
            <Route path="clients" element={<Clients />} />
            <Route path="settings" element={<BillingSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};
