import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/customers', icon: '👤', label: 'Customers' },
  { to: '/products', icon: '📦', label: 'Products' },
  { to: '/invoices', icon: '🧾', label: 'Invoices' },
  { to: '/invoices/new', icon: '➕', label: 'New Invoice' },
  { to: '/reports', icon: '📈', label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>VIDHIM ENTERPRISES</h1>
        <p>Billing System</p>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-label">Menu</span>
        {nav.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
