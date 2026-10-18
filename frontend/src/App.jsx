import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Base modules
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

// Workforce modules
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { Attendance } from './pages/Attendance';
import { DailyWages } from './pages/DailyWages';
import { Payroll } from './pages/Payroll';
import { Advances } from './pages/Advances';
import { Payments } from './pages/Payments';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { StockLedger } from './pages/StockLedger';
import { Purchases } from './pages/Purchases';

const adminOnly = (page) => <ProtectedRoute roles={['admin']}>{page}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />

        {/* Workforce */}
        <Route path="employees" element={adminOnly(<Employees />)} />
        <Route path="employees/:id" element={adminOnly(<EmployeeDetail />)} />
        <Route path="attendance" element={adminOnly(<Attendance />)} />
        <Route path="daily-wages" element={adminOnly(<DailyWages />)} />
        <Route path="payroll" element={adminOnly(<Payroll />)} />
        <Route path="advances" element={adminOnly(<Advances />)} />
        <Route path="payments" element={adminOnly(<Payments />)} />
        <Route path="expenses" element={adminOnly(<Expenses />)} />
        <Route path="reports" element={adminOnly(<Reports />)} />

        {/* Inventory */}
        <Route path="stock" element={adminOnly(<Stock />)} />
        <Route path="ledger" element={adminOnly(<Ledger />)} />
        <Route path="stock-ledger" element={adminOnly(<StockLedger />)} />
        <Route path="purchases" element={adminOnly(<Lots />)} />
        <Route path="purchases/new" element={adminOnly(<LotForm />)} />
        <Route path="purchases/:id" element={adminOnly(<LotDetail />)} />
        <Route path="lots" element={adminOnly(<Lots />)} />
        <Route path="lots/new" element={adminOnly(<LotForm />)} />
        <Route path="lots/:id" element={adminOnly(<LotDetail />)} />
        <Route path="item-types" element={adminOnly(<ItemTypes />)} />
        <Route path="item-requests" element={<ItemRequests />} />

        {/* Operations */}
        <Route path="vendors" element={<Vendors />} />
        <Route path="vehicles" element={adminOnly(<Vehicles />)} />
        <Route path="fuel" element={<Fuel />} />
        <Route path="reimbursements" element={<Reimbursements />} />

        {/* Administration */}
        <Route path="exports" element={adminOnly(<Exports />)} />
        <Route path="users" element={adminOnly(<Users />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
