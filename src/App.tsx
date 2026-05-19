import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Onboarding from './pages/Onboarding';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Operations
import ServiceOrders from './pages/operations/ServiceOrders';
import CreateOS from './pages/operations/CreateOS';
import ServiceOrderDetails from './pages/operations/ServiceOrderDetails';
import TimeTracking from './pages/operations/TimeTracking';
// import Machinery from './pages/operations/Machinery'; // Not yet created?

// Inventory
import Inventory from './pages/inventory/Inventory';
import Purchases from './pages/inventory/Purchases';
import CreatePurchase from './pages/inventory/CreatePurchase';
import PurchaseDetails from './pages/inventory/PurchaseDetails';

// Finance
import Billing from './pages/finance/Billing';
import CreateInvoice from './pages/finance/CreateInvoice';
import AccountsReceivable from './pages/finance/AccountsReceivable';
import QuickSale from './pages/finance/QuickSale';
import Cashflow from './pages/analytics/Cashflow';
import Payroll from './pages/finance/Payroll';

// Master Data
import Roles from './pages/master-data/Roles';
import Clients from './pages/master-data/Clients';
import Providers from './pages/master-data/Providers';
import Employees from './pages/hr/Employees';

// Admin
import Plans from './pages/admin/Plans';
import BankAccountsManager from './pages/admin/BankAccountsManager';
import AdminDashboard from './pages/admin/AdminDashboard';
import Invoices from './pages/admin/Invoices';
import InvoiceDetails from './pages/admin/InvoiceDetails';

// Analytics
import Reports from './pages/analytics/Reports';

// Portal
import ClientPortal from './pages/portal/ClientPortal';

// Settings
import Profile from './pages/settings/Profile';
import Subscription from './pages/settings/Subscription';
import Settings from './pages/admin/Settings';
import CategoriesSettings from './pages/settings/CategoriesSettings';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Client Portal - Standalone Layout */}
        <Route path="/portal" element={<ClientPortal />} />

        {/* Protected Routes */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          {/* Operations */}
          <Route path="operations/dashboard" element={<ServiceOrders />} /> {/* Using ServiceOrders list as dashboard for now */}
          <Route path="operations/new-os" element={<CreateOS />} />
          <Route path="operations/os/:id" element={<ServiceOrderDetails />} />
          <Route path="operations/time-tracking" element={<TimeTracking />} />

          {/* Inventory */}
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/purchases" element={<Purchases />} />
          <Route path="inventory/purchases/new" element={<CreatePurchase />} />
          <Route path="inventory/purchases/:id" element={<PurchaseDetails />} />
          <Route path="inventory/purchases/:id/edit" element={<CreatePurchase />} />

          {/* Finance */}
          <Route path="finance/billing" element={<Billing />} />
          <Route path="finance/billing/new" element={<CreateInvoice />} />
          <Route path="finance/billing/:id" element={<InvoiceDetails />} />
          <Route path="finance/quick-sale" element={<QuickSale />} />
          <Route path="finance/receivable" element={<AccountsReceivable />} />
          <Route path="finance/cashflow" element={<Cashflow />} />
          <Route path="finance/payroll" element={<Payroll />} />

          {/* Master Data */}
          <Route path="master-data/roles" element={<Roles />} />
          <Route path="master-data/clients" element={<Clients />} />
          <Route path="master-data/providers" element={<Providers />} />

          {/* HR */}
          <Route path="hr/employees" element={<Employees />} />

          {/* SaaS Admin Routes */}
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/plans" element={<Plans />} />
          <Route path="admin/bank-accounts" element={<BankAccountsManager />} />
          <Route path="admin/invoices" element={<Invoices />} />
          <Route path="admin/invoices/:id" element={<InvoiceDetails />} />

          {/* Analytics */}
          <Route path="analytics/reports" element={<Reports />} />
          <Route path="analytics/profitability" element={<Reports />} /> {/* Reusing Reports for now */}

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          <Route path="settings/profile" element={<Profile />} />
          <Route path="settings/categories" element={<CategoriesSettings />} />
          <Route path="settings/subscription" element={<Subscription />} />

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
