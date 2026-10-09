<<<<<<< HEAD
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Employees } from "./pages/Employees";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { Attendance } from "./pages/Attendance";
import { DailyWages } from "./pages/DailyWages";
import { Payroll } from "./pages/Payroll";
import { Advances } from "./pages/Advances";
import { Payments } from "./pages/Payments";
import { Stock } from "./pages/Stock";
import { StockLedger } from "./pages/StockLedger";
import { Purchases } from "./pages/Purchases";
import { ItemTypes } from "./pages/ItemTypes";
import { ItemRequests } from "./pages/ItemRequests";
import { Vendors } from "./pages/Vendors";
import { Vehicles } from "./pages/Vehicles";
import { Fuel } from "./pages/Fuel";
import { Reimbursements } from "./pages/Reimbursements";
import { Expenses } from "./pages/Expenses";
import { Reports } from "./pages/Reports";
import { Users } from "./pages/Users";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Authenticated Application Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Workforce (Admin Protected) */}
            <Route
              path="employees"
              element={
                <ProtectedRoute adminOnly>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedRoute>
                  <EmployeeDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute adminOnly>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="daily-wages"
              element={
                <ProtectedRoute adminOnly>
                  <DailyWages />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll"
              element={
                <ProtectedRoute adminOnly>
                  <Payroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="advances"
              element={
                <ProtectedRoute adminOnly>
                  <Advances />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute adminOnly>
                  <Payments />
                </ProtectedRoute>
              }
            />

            {/* Inventory */}
            <Route path="stock" element={<Stock />} />
            <Route
              path="stock-ledger"
              element={
                <ProtectedRoute adminOnly>
                  <StockLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="purchases"
              element={
                <ProtectedRoute adminOnly>
                  <Purchases />
                </ProtectedRoute>
              }
            />
            <Route
              path="item-types"
              element={
                <ProtectedRoute adminOnly>
                  <ItemTypes />
                </ProtectedRoute>
              }
            />
            <Route path="item-requests" element={<ItemRequests />} />

            {/* Operations */}
            <Route path="vendors" element={<Vendors />} />
            <Route
              path="vehicles"
              element={
                <ProtectedRoute adminOnly>
                  <Vehicles />
                </ProtectedRoute>
              }
            />
            <Route path="fuel" element={<Fuel />} />
            <Route path="reimbursements" element={<Reimbursements />} />
            <Route
              path="expenses"
              element={
                <ProtectedRoute adminOnly>
                  <Expenses />
                </ProtectedRoute>
              }
            />

            {/* Analytics & System */}
            <Route path="reports" element={<Reports />} />
            <Route
              path="users"
              element={
                <ProtectedRoute adminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
=======
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import ItemTypes from './pages/ItemTypes';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import Stock from './pages/Stock';
import Ledger from './pages/Ledger';
import Lots from './pages/Lots';
import LotForm from './pages/LotForm';
import LotDetail from './pages/LotDetail';
import ItemRequests from './pages/ItemRequests';
import Reimbursements from './pages/Reimbursements';
import Fuel from './pages/Fuel';
import Exports from './pages/Exports';
import NotFound from './pages/NotFound';

const adminOnly = (page) => <ProtectedRoute roles={['admin']}>{page}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="stock" element={adminOnly(<Stock />)} />
        <Route path="ledger" element={adminOnly(<Ledger />)} />
        <Route path="purchases" element={adminOnly(<Lots />)} />
        <Route path="purchases/new" element={adminOnly(<LotForm />)} />
        <Route path="purchases/:id" element={adminOnly(<LotDetail />)} />
        <Route path="item-requests" element={<ItemRequests />} />
        <Route path="item-types" element={adminOnly(<ItemTypes />)} />
        <Route path="reimbursements" element={<Reimbursements />} />
        <Route path="fuel" element={<Fuel />} />
        <Route path="vehicles" element={adminOnly(<Vehicles />)} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="exports" element={adminOnly(<Exports />)} />
        <Route path="users" element={adminOnly(<Users />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
  );
}
