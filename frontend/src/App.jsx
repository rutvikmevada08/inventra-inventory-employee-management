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
  );
}
