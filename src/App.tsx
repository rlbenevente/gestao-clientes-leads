import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import ClientDetails from './pages/ClientDetails';
import FinanceDashboard from './pages/FinanceDashboard';
import FinanceTransactions from './pages/FinanceTransactions';
import FinanceInvoices from './pages/FinanceInvoices';
import FinanceCategories from './pages/FinanceCategories';
import FinanceAccounts from './pages/FinanceAccounts';
import FinanceCalendar from './pages/FinanceCalendar';
import FinanceReports from './pages/FinanceReports';

// Wrapper de proteção
const RequireAuth = () => {
  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--color-ls-accent)] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<ClientList />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetails />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="finance/transactions" element={<FinanceTransactions />} />
            <Route path="finance/invoices" element={<FinanceInvoices />} />
            <Route path="finance/categories" element={<FinanceCategories />} />
            <Route path="finance/accounts" element={<FinanceAccounts />} />
            <Route path="finance/calendar" element={<FinanceCalendar />} />
            <Route path="finance/reports" element={<FinanceReports />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
