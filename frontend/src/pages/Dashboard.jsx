import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Alert from '../components/Alert';
import { formatDate, formatMoney, formatQty } from '../utils/format';

const Stat = ({ label, value, note, attention }) => (
  <div className={`stat${attention ? ' attention' : ''}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {note && <div className="note">{note}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/dashboard/summary');

  if (loading && !data) return <div className="page-loading">Loading...</div>;
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!data) return null;

  if (data.role === 'staff') {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={user.name} />
        <div className="stats">
          <Stat label="Open item requests" value={data.openItemRequests} />
          <Stat label="Reimbursements in progress" value={data.openReimbursements} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="stats">
        <Stat label="Stock items tracked" value={data.stockItemCount} />
        <Stat label="Low stock items" value={data.lowStockCount} attention={data.lowStockCount > 0} />
        <Stat label="Item requests pending" value={data.pendingItemRequests} />
        <Stat label="Reimbursements pending" value={data.pendingReimbursements} />
        <Stat label="Owed to vendors" value={formatMoney(data.outstandingToVendors)} />
        <Stat label="Fuel this month" value={formatMoney(data.fuelThisMonth.amount)} note={`${formatQty(data.fuelThisMonth.litres)} litres`} />
      </div>

      <div className="grid-2">
        <section>
          <h2 style={{ marginBottom: 8 }}>Low stock</h2>
          <DataTable
            rows={data.lowStock}
            loading={false}
            emptyMessage="No items are below their reorder level."
            columns={[
              { key: 'name', header: 'Item' },
              { key: 'balance', header: 'In stock', align: 'num', render: (r) => `${formatQty(r.balance)} ${r.unit || ''}` },
              { key: 'reorderLevel', header: 'Reorder level', align: 'num', render: (r) => formatQty(r.reorderLevel) },
            ]}
          />
        </section>
        <section>
          <h2 style={{ marginBottom: 8 }}>Recent stock movements</h2>
          <DataTable
            rows={data.recentMovements}
            loading={false}
            emptyMessage="No stock movements recorded yet."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'item', header: 'Item', render: (r) => r.itemType?.name || '-' },
              { key: 'type', header: 'Type', render: (r) => (r.type === 'in' ? 'Stock in' : 'Stock out') },
              { key: 'quantity', header: 'Quantity', align: 'num', render: (r) => formatQty(r.quantity) },
            ]}
          />
        </section>
      </div>
    </>
  );
}
