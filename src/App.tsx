import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Nav } from './components/Nav';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Budgets } from './pages/Budgets';
import { BudgetView } from './pages/BudgetView';
import { RecurringExpenses } from './pages/RecurringExpenses';
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
                <Budgets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets/:id"
            element={
              <ProtectedRoute>
                <BudgetView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring-expenses"
            element={
              <ProtectedRoute>
                <RecurringExpenses />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};
