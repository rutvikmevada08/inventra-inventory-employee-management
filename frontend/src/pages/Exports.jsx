import { useState } from 'react';
import { errorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';
import Field from '../components/Field';
import { downloadFile } from '../utils/download';
import { today } from '../utils/constants';

const monthStart = () => `${today().slice(0, 8)}01`;

function ExportPanel({ title, description, url, filename }) {
  const [range, setRange] = useState({ from: monthStart(), to: today() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    if (!range.from || !range.to) return setError('Choose both dates');
    if (range.from > range.to) return setError('The from date must be on or before the to date');
    setBusy(true);
    setError('');
    try {
      await downloadFile(url, range, filename);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header"><h2>{title}</h2></div>
      <div className="panel-body">
        <p className="muted" style={{ marginBottom: 14 }}>{description}</p>
        <Alert tone="danger">{error}</Alert>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <Field label="From"><input className="input" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
          <Field label="To"><input className="input" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
        </div>
        <button type="button" className="btn btn-primary" onClick={download} disabled={busy}>{busy ? 'Preparing file...' : 'Download Excel file'}</button>
      </div>
    </section>
  );
}

export default function Exports() {
  return (
    <>
      <PageHeader title="Excel exports" subtitle="Download records for a date range" />
      <div className="grid-2">
        <ExportPanel
          title="Investor sheet" url="/exports/investor-sheet" filename="Investor_sheet.xlsx"
          description="Purchases, fuel receipts and approved reimbursements in the investor reporting layout."
        />
        <ExportPanel
          title="Inventory sheet" url="/exports/inventory-sheet" filename="Inventory_sheet.xlsx"
          description="Purchase invoices with their items, quantities and amounts."
        />
      </div>
    </>
  );
}
