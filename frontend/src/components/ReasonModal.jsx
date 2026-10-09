import { useState } from 'react';
import { errorMessage } from '../services/api';
import Modal from './Modal';
import Field from './Field';
import Alert from './Alert';

// Asks for a short text (a rejection reason, a note) before running an action. onSubmit returns a promise.
export default function ReasonModal({ title, label = 'Reason', hint, required, confirmLabel, danger, onSubmit, onCancel }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (required && !text.trim()) return setError(`${label} is required`);
    setBusy(true);
    setError('');
    try {
      await onSubmit(text.trim());
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title} onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="reason-form" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{confirmLabel}</button></>}
    >
      <Alert tone="danger">{error}</Alert>
      <form id="reason-form" onSubmit={submit} noValidate>
        <Field label={label} required={required} hint={hint}>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </Field>
      </form>
    </Modal>
  );
}
