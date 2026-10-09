import useFetch from '../hooks/useFetch';
import Modal from './Modal';
import Alert from './Alert';
import DataTable from './DataTable';
import Badge from './Badge';
import { formatDate, formatMoney } from '../utils/format';

export default function VendorSummary({ vendor, onClose }) {
  const { data, loading, error } = useFetch(`/vendors/${vendor._id}/summary`);
  return (
    <Modal title={vendor.name} onClose={onClose} wide footer={<button type="button" className="btn" onClick={onClose}>Close</button>}>
      <Alert tone="danger">{error}</Alert>
      <dl className="detail-list" style={{ marginBottom: 18 }}>
        <dt>Contact person</dt><dd>{vendor.contactPerson || '-'}</dd>
        <dt>Phone</dt><dd>{vendor.phone || '-'}</dd>
        <dt>Email</dt><dd>{vendor.email || '-'}</dd>
        <dt>GSTIN</dt><dd>{vendor.gstin || '-'}</dd>
        <dt>Address</dt><dd>{vendor.address || '-'}</dd>
        {data && (
          <>
            <dt>Total purchased</dt><dd>{formatMoney(data.totalPurchased)} across {data.lotCount} purchase(s)</dd>
            <dt>Paid</dt><dd>{formatMoney(data.totalPaid)}</dd>
            <dt>Outstanding</dt><dd><strong>{formatMoney(data.outstanding)}</strong></dd>
            <dt>Fuel supplied</dt><dd>{formatMoney(data.fuelTotal)}</dd>
          </>
        )}
      </dl>
      <h2 style={{ marginBottom: 8 }}>Recent purchases</h2>
      <DataTable
        rows={data?.recentLots}
        loading={loading}
        emptyMessage="No purchases recorded for this vendor."
        columns={[
          { key: 'invoiceNumber', header: 'Invoice' },
          { key: 'purchaseDate', header: 'Date', render: (l) => formatDate(l.purchaseDate) },
          { key: 'totalPayable', header: 'Amount', align: 'num', render: (l) => formatMoney(l.totalPayable) },
          { key: 'paymentStatus', header: 'Payment', render: (l) => <Badge status={l.paymentStatus}>{l.paymentStatus === 'paid' ? 'Paid' : l.paymentStatus === 'partial' ? 'Part paid' : 'Unpaid'}</Badge> },
        ]}
      />
    </Modal>
  );
}
