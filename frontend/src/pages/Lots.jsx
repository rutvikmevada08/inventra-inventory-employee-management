import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import useFilters from '../hooks/useFilters';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import { formatDate, formatMoney } from '../utils/format';

const PAYMENT_LABEL = { paid: 'Paid', partial: 'Part paid', unpaid: 'Unpaid' };

export default function Lots() {
  const navigate = useNavigate();
  const { filters, set, setPage, params } = useFilters({ q: '', vendor: '', paymentStatus: '', received: '', from: '', to: '', sort: '' });
  const vendors = useFetch('/vendors', { limit: 200, status: 'all' });
  const { data, meta, loading, error } = useFetch('/lots', { ...params, limit: 20 });

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice', render: (l) => <Link to={`/purchases/${l._id}`}>{l.invoiceNumber}</Link> },
    { key: 'purchaseDate', header: 'Date', render: (l) => formatDate(l.purchaseDate) },
    { key: 'vendor', header: 'Vendor', render: (l) => l.vendor?.name || '-' },
    { key: 'lotType', header: 'Type' },
    { key: 'totalPayable', header: 'Amount', align: 'num', render: (l) => formatMoney(l.totalPayable) },
    { key: 'totalPaid', header: 'Paid', align: 'num', render: (l) => formatMoney(l.totalPaid) },
    { key: 'balance', header: 'Balance', align: 'num', render: (l) => formatMoney(l.balance) },
    { key: 'paymentStatus', header: 'Payment', render: (l) => <Badge status={l.paymentStatus}>{PAYMENT_LABEL[l.paymentStatus]}</Badge> },
    { key: 'received', header: 'Goods', render: (l) => <Badge tone={l.received ? 'success' : 'warning'}>{l.received ? 'Received' : 'Not received'}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Purchases" subtitle="Purchase invoices (lots) with their items and payments">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/purchases/new')}>Add purchase</button>
      </PageHeader>
      <Alert tone="danger">{error}</Alert>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search invoice number" aria-label="Search invoice number" value={filters.q} onChange={set('q')} />
        <select className="select" aria-label="Vendor" value={filters.vendor} onChange={set('vendor')}>
          <option value="">All vendors</option>
          {(vendors.data || []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <select className="select" aria-label="Payment status" value={filters.paymentStatus} onChange={set('paymentStatus')}>
          <option value="">Any payment status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Part paid</option>
          <option value="paid">Paid</option>
        </select>
        <select className="select" aria-label="Goods received" value={filters.received} onChange={set('received')}>
          <option value="">Received or not</option>
          <option value="true">Received</option>
          <option value="false">Not received</option>
        </select>
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={set('from')} style={{ maxWidth: 150 }} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={set('to')} style={{ maxWidth: 150 }} />
        <select className="select" aria-label="Sort" value={filters.sort} onChange={set('sort')}>
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount">Largest amount</option>
        </select>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No purchases match these filters." />
      <Pagination meta={meta} onPage={setPage} />
    </>
  );
}
