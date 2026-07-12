import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ customers: 0, products: 0, invoices: 0, revenue: 0 });

  useEffect(() => {
    Promise.all([
      API.get('/customers'),
      API.get('/products'),
      API.get('/invoices'),
    ]).then(([c, p, i]) => {
      const revenue = i.data.reduce((sum, inv) => sum + inv.total, 0);
      setStats({ customers: c.data.length, products: p.data.length, invoices: i.data.length, revenue });
    });
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">VIDHIM ENTERPRISES — Overview</div>
        </div>
      </div>

      <div className="stat-grid">
        <Link to="/customers" style={{ textDecoration: 'none', color: 'inherit' }} className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{stats.customers}</div>
          <div className="stat-label">Total Customers (Manage)</div>
        </Link>
        <Link to="/products" style={{ textDecoration: 'none', color: 'inherit' }} className="stat-card green">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{stats.products}</div>
          <div className="stat-label">Total Products (Manage)</div>
        </Link>
        <Link to="/invoices" style={{ textDecoration: 'none', color: 'inherit' }} className="stat-card orange">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{stats.invoices}</div>
          <div className="stat-label">Total Invoices</div>
        </Link>
        <div className="stat-card pink">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{stats.revenue.toFixed(2)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
          <div style={{ fontSize: 40 }}>🏢</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>VIDHIM ENTERPRISES</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
              First Floor, 105, Bhaurao Udyog Nagar, Kharigaon, Above S K Steel, Bhayander (E)-401105<br />
              📞 +91 9892352600 &nbsp;|&nbsp; ✉ vidhimenterprises@gmail.com<br />
              GST No: 27AXVPS9856J1Z4777
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
