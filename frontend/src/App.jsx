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
  );
}
