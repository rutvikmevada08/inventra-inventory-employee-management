import { useState } from 'react';
import api, { errorMessage } from '../services/api';
import SimpleCrudPage from '../components/SimpleCrudPage';
import Modal from '../components/Modal';
import Field from '../components/Field';
import Alert from '../components/Alert';
import Badge from '../components/Badge';

function ResetPassword({ user, onDone }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setPassword(''); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/users/${user._id}/reset-password`, { password });
      close();
      onDone({ tone: 'success', text: `Password reset for ${user.name}.` });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-link" onClick={() => setOpen(true)}>Reset password</button>
      {open && (
        <Modal
          title={`Reset password for ${user.name}`} onClose={close}
          footer={<><button type="button" className="btn" onClick={close}>Cancel</button><button type="submit" form="reset-form" className="btn btn-primary" disabled={busy}>Reset password</button></>}
        >
          <Alert tone="danger">{error}</Alert>
          <form id="reset-form" onSubmit={submit}>
            <Field label="New password" hint="At least 8 characters. Give it to the user in person; they can change it after signing in.">
              <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}

const config = {
  title: 'Users',
  subtitle: 'People who can sign in to the application',
  noun: 'User',
  endpoint: '/users',
  searchPlaceholder: 'Search by name or email',
  fields: [
    { key: 'name', label: 'Name', required: true, full: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role', type: 'select', default: 'staff', options: [{ value: 'staff', label: 'Staff' }, { value: 'admin', label: 'Administrator' }] },
    { key: 'password', label: 'Password', type: 'password', createOnly: true, hint: 'At least 8 characters. Leave blank to create a record that cannot sign in.' },
  ],
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'role', header: 'Role', render: (u) => (u.role === 'admin' ? 'Administrator' : 'Staff') },
    { key: 'loginEnabled', header: 'Sign-in', render: (u) => <Badge tone={u.loginEnabled ? 'success' : undefined}>{u.loginEnabled ? 'Enabled' : 'No password'}</Badge> },
  ],
  extraActions: (user, { setNotice }) => <ResetPassword user={user} onDone={setNotice} />,
};

export default function Users() {
  return <SimpleCrudPage config={config} />;
}
