import { useState } from 'react';
import api, { errorMessage, fieldErrors } from '../services/api';
import Modal from './Modal';
import Field from './Field';
import Alert from './Alert';

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '', notes: '' };

export default function VendorForm({ vendor, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, vendor?.[k] || ''])) });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setErrors({ name: 'Vendor name is required' });
    setErrors({});
    setBusy(true);
    try {
      if (vendor?._id) await api.put(`/vendors/${vendor._id}`, form);
      else await api.post('/vendors', form);
      onSaved(vendor?._id ? 'Vendor updated.' : 'Vendor added.');
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={vendor?._id ? 'Edit vendor' : 'Add vendor'}
      onClose={onCancel}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" form="vendor-form" className="btn btn-primary" disabled={busy}>Save vendor</button>
        </>
      }
    >
      <Alert tone="danger">{formError}</Alert>
      <form id="vendor-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Vendor name" required error={errors.name} className="full">
            <input className="input" value={form.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} autoFocus />
          </Field>
          <Field label="Contact person"><input className="input" value={form.contactPerson} onChange={set('contactPerson')} /></Field>
          <Field label="Phone" error={errors.phone}><input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
          <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} /></Field>
          <Field label="GSTIN"><input className="input" value={form.gstin} onChange={set('gstin')} maxLength={15} /></Field>
          <Field label="Address" className="full"><textarea className="textarea" value={form.address} onChange={set('address')} /></Field>
          <Field label="Notes" className="full"><textarea className="textarea" value={form.notes} onChange={set('notes')} /></Field>
        </div>
      </form>
    </Modal>
  );
}
