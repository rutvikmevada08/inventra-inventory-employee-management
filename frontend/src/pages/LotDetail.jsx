import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FileLink from '../components/FileLink';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate, formatMoney, formatQty } from '../utils/format';
import { PAYMENT_METHODS, SOURCE_LABELS, today } from '../utils/constants';

function PaymentModal({ lot, onDone, onCancel }) {
  const [form, setForm] = useState({ amount: '', date: today(), method: 'Bank transfer', reference: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) return setError('Enter an amount greater than zero');
    setBusy(true);
    setError('');
    try {
      await api.post(`/lots/${lot._id}/payments`, { ...form, amount: Number(form.amount) });
      onDone('Payment recorded.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Record payment" onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="payment-form" className="btn btn-primary" disabled={busy}>Record payment</button></>}
    >
      <Alert tone="danger">{error}</Alert>
      <p className="muted" style={{ marginBottom: 14 }}>Outstanding balance: {formatMoney(lot.balance)}. Payments are added to the history and cannot be edited later.</p>
      <form id="payment-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Amount" required>
            <input className="input" type="number" min="0" step="any" value={form.amount} onChange={set('amount')} autoFocus />
            <button type="button" className="btn btn-link" style={{ alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, amount: String(lot.balance) })}>Use full balance</button>
          </Field>
          <Field label="Payment date"><input className="input" type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Method">
            <select className="select" value={form.method} onChange={set('method')}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          </Field>
          <Field label="Reference" hint="Transaction or cheque number"><input className="input" value={form.reference} onChange={set('reference')} /></Field>
          <Field label="Note" className="full"><input className="input" value={form.note} onChange={set('note')} /></Field>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceModal({ lot, onDone, onCancel }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Choose a file');
    const body = new FormData();
    body.append('invoice', file);
    setBusy(true);
    try {
      await api.put(`/lots/${lot._id}/invoice`, body);
      onDone('Invoice copy saved.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Modal title={lot.invoiceFile ? 'Replace invoice copy' : 'Attach invoice copy'} onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel}>Cancel</button><button type="submit" form="invoice-form" className="btn btn-primary" disabled={busy}>Upload</button></>}>
      <Alert tone="danger">{error}</Alert>
      <form id="invoice-form" onSubmit={submit}>
        <Field label="File" hint="JPG, PNG, WEBP or PDF. The previous file is kept on the server."><input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files[0])} /></Field>
      </form>
    </Modal>
  );
}

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lot, loading, error, reload } = useFetch(`/lots/${id}`);
  const { busy, notice, setNotice, run } = useAction();
  const [dialog, setDialog] = useState(null); // payment | invoice | clear | receive | cancel

  if (loading && !lot) return <div className="page-loading">Loading...</div>;
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!lot) return null;

  const active = lot.isActive !== false;
  const done = (message) => { setDialog(null); setNotice({ tone: 'success', text: message }); reload(); };
  const confirm = (fn, message) => async () => {
    const r = await run(fn, message);
    setDialog(null);
    if (r.ok) reload();
  };
  const itemName = Object.fromEntries(lot.items.map((i) => [i.itemType._id, i.itemType]));

  return (
    <>
      <PageHeader title={`Invoice ${lot.invoiceNumber}`} subtitle={`${lot.vendor?.name || 'Unknown vendor'}, ${formatDate(lot.purchaseDate)}`}>
        {active && (
          <>
            {lot.balance > 0 && <button type="button" className="btn btn-primary" onClick={() => setDialog('payment')}>Record payment</button>}
            {lot.balance > 0 && <button type="button" className="btn" onClick={() => setDialog('clear')}>Mark as cleared</button>}
            {!lot.received && <button type="button" className="btn" onClick={() => setDialog('receive')}>Mark as received</button>}
          </>
        )}
      </PageHeader>

      {!active && <Alert tone="danger">This purchase was cancelled. It is kept for the record only.</Alert>}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <dl className="detail-list">
            <dt>Vendor</dt><dd>{lot.vendor?.name || '-'}</dd>
            <dt>Category</dt><dd>{lot.lotType || '-'}</dd>
            <dt>Paid by</dt><dd>{lot.paidBy || '-'}</dd>
            <dt>Description</dt><dd>{lot.description || '-'}</dd>
            <dt>Goods</dt><dd><Badge tone={lot.received ? 'success' : 'warning'}>{lot.received ? `Received ${formatDate(lot.receivedAt)}` : 'Not received'}</Badge></dd>
            <dt>Invoice copy</dt>
            <dd>
              <FileLink file={lot.invoiceFile} />
              {active && <button type="button" className="btn btn-link" style={{ marginLeft: 14 }} onClick={() => setDialog('invoice')}>{lot.invoiceFile ? 'Replace' : 'Attach'}</button>}
            </dd>
            <dt>Invoice total</dt><dd>{formatMoney(lot.totalPayable)}</dd>
            <dt>Paid</dt><dd>{formatMoney(lot.totalPaid)} <Badge status={lot.paymentStatus}>{{ paid: 'Paid', partial: 'Part paid', unpaid: 'Unpaid' }[lot.paymentStatus]}</Badge></dd>
            <dt>Balance</dt><dd><strong>{formatMoney(lot.balance)}</strong></dd>
          </dl>
        </div>
      </div>

      <h2 style={{ margin: '18px 0 8px' }}>Items</h2>
      <DataTable
        rows={lot.items} loading={false}
        columns={[
          { key: 'item', header: 'Item', render: (i) => i.itemType.name + (i.itemType.isStockable === false ? ' (service)' : '') },
          { key: 'quantity', header: 'Quantity', align: 'num', render: (i) => `${formatQty(i.quantity)} ${i.itemType.unit || ''}` },
          { key: 'costPerUnit', header: 'Cost per unit', align: 'num', render: (i) => formatMoney(i.costPerUnit) },
          { key: 'totalPayable', header: 'Amount', align: 'num', render: (i) => formatMoney(i.totalPayable) },
        ]}
      />

      <h2 style={{ margin: '18px 0 8px' }}>Payments</h2>
      <DataTable
        rows={lot.payments} loading={false} rowKey={(p) => p._id} emptyMessage="No payments have been recorded."
        columns={[
          { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
          { key: 'amount', header: 'Amount', align: 'num', render: (p) => formatMoney(p.amount) },
          { key: 'method', header: 'Method' },
          { key: 'reference', header: 'Reference' },
          { key: 'note', header: 'Note' },
        ]}
      />

      <h2 style={{ margin: '18px 0 8px' }}>Stock movements</h2>
      <DataTable
        rows={lot.movements} loading={false} rowKey={(m) => m._id} emptyMessage="No stock has been added from this purchase."
        columns={[
          { key: 'date', header: 'Date', render: (m) => formatDate(m.date) },
          { key: 'item', header: 'Item', render: (m) => itemName[m.itemType]?.name || '-' },
          { key: 'quantity', header: 'Quantity', align: 'num', render: (m) => `${m.type === 'in' ? '+' : '-'}${formatQty(m.quantity)}` },
          { key: 'source', header: 'Source', render: (m) => SOURCE_LABELS[m.source] || m.source },
        ]}
      />

      {active && (
        <p style={{ marginTop: 22 }}>
          <button type="button" className="btn btn-link" style={{ color: 'var(--danger)' }} onClick={() => setDialog('cancel')}>Cancel this purchase</button>
          {lot.totalPaid > 0 && <span className="muted"> Purchases with recorded payments cannot be cancelled.</span>}
        </p>
      )}
      <p style={{ marginTop: 14 }}><Link to="/purchases">Back to purchases</Link></p>

      {dialog === 'payment' && <PaymentModal lot={lot} onDone={done} onCancel={() => setDialog(null)} />}
      {dialog === 'invoice' && <InvoiceModal lot={lot} onDone={done} onCancel={() => setDialog(null)} />}
      {dialog === 'clear' && (
        <ConfirmDialog title="Mark as cleared" message={`This records a payment of ${formatMoney(lot.balance)}, the full outstanding balance, against this invoice.`} confirmLabel="Mark as cleared" busy={busy}
          onConfirm={confirm(() => api.post(`/lots/${id}/mark-clear`, {}), 'Invoice cleared.')} onCancel={() => setDialog(null)} />
      )}
      {dialog === 'receive' && (
        <ConfirmDialog title="Mark as received" message="Stockable items on this invoice will be added to stock. This cannot be undone, but stock can be corrected with an adjustment." confirmLabel="Mark as received" busy={busy}
          onConfirm={confirm(() => api.post(`/lots/${id}/receive`, {}), 'Goods marked as received and stock updated.')} onCancel={() => setDialog(null)} />
      )}
      {dialog === 'cancel' && (
        <ConfirmDialog title="Cancel purchase" danger confirmLabel="Cancel purchase" busy={busy}
          message={lot.received ? 'The stock added from this purchase will be reversed. This is refused if any of it has already been issued.' : 'This purchase will be marked as cancelled and kept for the record.'}
          onConfirm={async () => { const r = await run(() => api.delete(`/lots/${id}`)); setDialog(null); if (r.ok) navigate('/purchases'); }} onCancel={() => setDialog(null)} />
      )}
    </>
  );
}
