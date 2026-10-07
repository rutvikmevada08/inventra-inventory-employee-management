import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Field from '../components/Field';
import Alert from '../components/Alert';
import { formatMoney } from '../utils/format';
import { today } from '../utils/constants';

const blankLine = () => ({ itemType: '', quantity: '', costPerUnit: '' });
const lineTotal = (l) => Math.round((Number(l.quantity) || 0) * (Number(l.costPerUnit) || 0) * 100) / 100;

export default function LotForm() {
  const navigate = useNavigate();
  const vendors = useFetch('/vendors', { limit: 200 });
  const types = useFetch('/item-types', { limit: 200 });
  const [form, setForm] = useState({ vendor: '', purchaseDate: today(), invoiceNumber: '', lotType: '', paidBy: '', description: '', totalPayable: '', totalPaid: '', received: false });
  const [lines, setLines] = useState([blankLine()]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setLine = (i, key) => (e) => setLines(lines.map((l, n) => (n === i ? { ...l, [key]: e.target.value } : l)));
  const itemsTotal = Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;
  const typeById = Object.fromEntries((types.data || []).map((t) => [t._id, t]));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const used = lines.filter((l) => l.itemType || l.quantity || l.costPerUnit);
    if (!form.vendor) return setError('Choose a vendor');
    if (!form.invoiceNumber.trim()) return setError('Enter the invoice number');
    if (!used.length) return setError('Add at least one item');
    if (used.some((l) => !l.itemType || !(Number(l.quantity) > 0) || !(Number(l.costPerUnit) >= 0) || l.costPerUnit === '')) {
      return setError('Every item needs an item type, a quantity above zero and a cost per unit');
    }

    const body = new FormData();
    ['vendor', 'purchaseDate', 'invoiceNumber', 'lotType', 'paidBy', 'description'].forEach((k) => form[k] && body.append(k, form[k]));
    if (form.totalPayable !== '') body.append('totalPayable', form.totalPayable);
    body.append('totalPaid', form.totalPaid || 0);
    body.append('received', form.received);
    body.append('items', JSON.stringify(used.map((l) => ({ itemType: l.itemType, quantity: Number(l.quantity), costPerUnit: Number(l.costPerUnit) }))));
    if (file) body.append('invoice', file);

    setBusy(true);
    try {
      const res = await api.post('/lots', body);
      navigate(`/purchases/${res.data.data._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Add purchase" subtitle="Record a purchase invoice and the items on it" />
      <Alert tone="danger">{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-body form-grid">
            <Field label="Vendor" required>
              <select className="select" value={form.vendor} onChange={set('vendor')}>
                <option value="">Select a vendor</option>
                {(vendors.data || []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Invoice number" required><input className="input" value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
            <Field label="Purchase date" required><input className="input" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></Field>
            <Field label="Category" hint="For example Mechanical Hardware or Office Supplies">
              <input className="input" list="lot-categories" value={form.lotType} onChange={set('lotType')} />
              <datalist id="lot-categories">{(types.data || []).map((t) => <option key={t._id} value={t.name} />)}</datalist>
            </Field>
            <Field label="Paid by" hint="Who paid for this purchase"><input className="input" value={form.paidBy} onChange={set('paidBy')} /></Field>
            <Field label="Invoice copy" hint="JPG, PNG, WEBP or PDF"><input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} /></Field>
            <Field label="Description" className="full"><input className="input" value={form.description} onChange={set('description')} /></Field>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header"><h2>Items</h2></div>
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Item type</th><th className="num">Quantity</th><th className="num">Cost per unit</th><th className="num">Amount</th><th /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td style={{ minWidth: 220 }}>
                      <select className="select" aria-label={`Item type, line ${i + 1}`} value={l.itemType} onChange={setLine(i, 'itemType')}>
                        <option value="">Select item type</option>
                        {(types.data || []).map((t) => <option key={t._id} value={t._id}>{t.name}{t.isStockable === false ? ' (service)' : ''}</option>)}
                      </select>
                    </td>
                    <td style={{ width: 130 }}><input className="input" type="number" min="0" step="any" aria-label={`Quantity, line ${i + 1}`} value={l.quantity} onChange={setLine(i, 'quantity')} />{typeById[l.itemType]?.unit && <span className="field-hint">{typeById[l.itemType].unit}</span>}</td>
                    <td style={{ width: 150 }}><input className="input" type="number" min="0" step="any" aria-label={`Cost per unit, line ${i + 1}`} value={l.costPerUnit} onChange={setLine(i, 'costPerUnit')} /></td>
                    <td className="num" style={{ width: 130 }}>{formatMoney(lineTotal(l))}</td>
                    <td className="actions">{lines.length > 1 && <button type="button" className="btn btn-link" onClick={() => setLines(lines.filter((_, n) => n !== i))}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => setLines([...lines, blankLine()])}>Add another item</button>
            <strong>Items total: {formatMoney(itemsTotal)}</strong>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-body form-grid">
            <Field label="Invoice total" hint={`Leave blank to use the items total (${formatMoney(itemsTotal)}). Enter the invoice total if it includes taxes or other charges.`}>
              <input className="input" type="number" min="0" step="any" value={form.totalPayable} onChange={set('totalPayable')} />
            </Field>
            <Field label="Amount paid so far" hint="Further payments can be recorded on the purchase">
              <input className="input" type="number" min="0" step="any" value={form.totalPaid} onChange={set('totalPaid')} />
            </Field>
            <label className="check full">
              <input type="checkbox" checked={form.received} onChange={set('received')} />
              <span>Goods have been received<span className="field-hint"> Stockable items are added to stock now. Otherwise, mark the purchase as received later.</span></span>
            </label>
          </div>
        </div>

        <div className="page-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>Save purchase</button>
          <Link to="/purchases" className="btn">Cancel</Link>
        </div>
      </form>
    </>
  );
}
