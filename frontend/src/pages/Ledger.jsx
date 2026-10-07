import { useSearchParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import useFilters from '../hooks/useFilters';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import { SOURCE_LABELS } from '../utils/constants';
import { formatDate, formatQty } from '../utils/format';

export default function Ledger() {
  const [search] = useSearchParams();
  const { filters, set, setPage, page, params } = useFilters({ itemType: search.get('itemType') || '', type: '', source: '', from: '', to: '' });
  const types = useFetch('/item-types', { limit: 200, status: 'all' });
  const { data, meta, loading, error } = useFetch('/inventory/transactions', { ...params, limit: 25 });

  const columns = [
    { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
    { key: 'item', header: 'Item', render: (t) => t.itemType?.name || '-' },
    { key: 'type', header: 'Movement', render: (t) => (t.type === 'in' ? 'Stock in' : 'Stock out') },
    { key: 'quantity', header: 'Quantity', align: 'num', render: (t) => `${t.type === 'in' ? '+' : '-'}${formatQty(t.quantity)} ${t.itemType?.unit || ''}` },
    { key: 'source', header: 'Source', render: (t) => SOURCE_LABELS[t.source] || t.source },
    { key: 'note', header: 'Note' },
    { key: 'by', header: 'Recorded by', render: (t) => t.createdBy?.name || '-' },
  ];

  return (
    <>
      <PageHeader title="Stock ledger" subtitle="Every stock movement. Entries are never edited or deleted; mistakes are corrected with a new entry." />
      <Alert tone="danger">{error}</Alert>
      <div className="toolbar">
        <select className="select" aria-label="Item" value={filters.itemType} onChange={set('itemType')}>
          <option value="">All items</option>
          {(types.data || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select className="select" aria-label="Movement" value={filters.type} onChange={set('type')}>
          <option value="">Stock in and out</option>
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
        </select>
        <select className="select" aria-label="Source" value={filters.source} onChange={set('source')}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={set('from')} style={{ maxWidth: 150 }} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={set('to')} style={{ maxWidth: 150 }} />
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No stock movements match these filters." />
      <Pagination meta={meta} onPage={setPage} />
    </>
  );
}
