<<<<<<< HEAD
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorMessage } from "../components/Feedback";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials or network issue.");
    } finally {
      setSubmitting(false);
=======
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
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
    }
  };

  return (
<<<<<<< HEAD
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Smart Inventory</h2>
        <p className="login-subtitle">Internal Business Management Portal</p>

        <ErrorMessage message={error} onDismiss={() => setError("")} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px" }}
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-color)", fontSize: "12px", color: "var(--text-muted)" }}>
          <p><strong>Default credentials:</strong></p>
          <p>Admin: admin@company.com / Admin@123</p>
          <p>Staff: staff@company.com / Staff@123</p>
=======
    <div className="login-wrap">
      <div className="login-box">
        <div className="app-name">Smart Inventory &amp; Workforce Management System</div>
        <div className="panel">
          <div className="panel-body">
            <h1 style={{ marginBottom: 14 }}>Sign in</h1>
            <Alert tone="danger">{error}</Alert>
            <form onSubmit={submit}>
              <Field label="Email">
                <input className="input" type="email" autoComplete="username" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Password">
                <input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
            </form>
            <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Forgot your password? Ask an administrator to reset it.</p>
          </div>
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
};
=======
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
