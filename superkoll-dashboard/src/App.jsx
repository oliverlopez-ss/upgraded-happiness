import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Receipts from './pages/Receipts';
import Employees from './pages/Employees';
import Articles from './pages/Articles';
import Accounts from './pages/Accounts';
import Vouchers from './pages/Vouchers';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Salary from './pages/Salary';
import Dimensions from './pages/Dimensions';
import TimeReports from './pages/TimeReports';
import Support from './pages/Support';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Laddar...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="app-loading">Laddar...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/dimensions" element={<Dimensions />} />
        <Route path="/time-reports" element={<TimeReports />} />
        <Route path="/support" element={<Support />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
