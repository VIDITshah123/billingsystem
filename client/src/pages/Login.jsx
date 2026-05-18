import { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../api';

export default function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      localStorage.setItem('vidhim_billing_token', res.data.token);
      toast.success('Welcome back!');
      onLoginSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <h1>VIDHIM ENTERPRISES</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secure Billing portal login</p>
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="input" placeholder="admin" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input" type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
