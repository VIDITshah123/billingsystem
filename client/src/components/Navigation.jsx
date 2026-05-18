import { NavLink } from 'react-router-dom';

export function Navigation({ onLogout }) {
  return (
    <>
      <header className="top-navbar">
        <div className="navbar-brand">
          <h1>VIDHIM ENTERPRISES</h1>
          <span>Mobile Billing Portal</span>
        </div>
        <div className="navbar-right">
          <NavLink to="/products" className={({ isActive }) => `logout-btn${isActive ? ' active' : ''}`} style={{ marginRight: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            📦 Products
          </NavLink>
          <button className="logout-btn" onClick={onLogout}>🚪 Logout</button>
        </div>
      </header>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bnav-icon">📊</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bnav-icon">👤</span>
          <span>Clients</span>
        </NavLink>
        <NavLink to="/invoices/new" className="bottom-nav-item fab-btn">
          <div className="fab">＋</div>
        </NavLink>
        <NavLink to="/invoices" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bnav-icon">🧾</span>
          <span>Bills</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bnav-icon">📈</span>
          <span>Reports</span>
        </NavLink>
      </nav>
    </>
  );
}
