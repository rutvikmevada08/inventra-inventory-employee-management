import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import Field from '../components/Field';
import Alert from '../components/Alert';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="app-name">Smart Inventory</div>
        <p className="muted" style={{ marginBottom: 12, textAlign: 'center', fontSize: 13 }}>
          Workforce Management System
        </p>
        <div className="panel">
          <div className="panel-body">
            <h1 style={{ marginBottom: 14 }}>Sign in</h1>
            <Alert tone="danger">{error}</Alert>
            <form onSubmit={submit}>
              <Field label="Email">
                <input
                  className="input"
                  type="email"
                  placeholder="e.g. admin@company.com"
                  autoComplete="username"
                  required
                  autoFocus
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              Forgot your password? Ask an administrator to reset it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Login };
