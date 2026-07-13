import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api';

const SORT_FIELDS = ['invoice_number', 'invoice_date', 'customer_name', 'tax_type'];

// Natural sort for invoice numbers like "01", "02", "INV-003", etc.
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [sortField, setSortField] = useState('invoice_number');
  const [sortDir, setSortDir] = useState('asc');
  const navigate = useNavigate();

  const load = async () => {
    const res = await API.get('/invoices');
    setInvoices(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleSort = (field) => {
    if (!SORT_FIELDS.includes(field)) return;
    setSortDir(prev => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortField(field);
  };

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const va = String(a[sortField] ?? '');
      const vb = String(b[sortField] ?? '');
      const cmp = sortField === 'invoice_number' || sortField === 'invoice_date'
        ? naturalCompare(va, vb)
        : va.localeCompare(vb, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invoices, sortField, sortDir]);

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete invoice #${num}?`)) return;
    try {
      await API.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      load();
    } catch {
      toast.error('Cannot delete invoice');
    }
  };

  const SortHeader = ({ field, label }) => {
    const active = sortField === field;
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <span style={{ opacity: active ? 1 : 0.35, fontSize: 11, marginLeft: 2 }}>{arrow}</span>
      </th>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Invoices</div>
          <div className="page-subtitle">{invoices.length} invoices total</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>+ New Invoice</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortHeader field="invoice_number" label="Invoice No" />
              <SortHeader field="invoice_date"   label="Date" />
              <SortHeader field="customer_name"  label="Customer" />
              <SortHeader field="tax_type"       label="Tax Type" />
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <p>No invoices yet. Create your first invoice.</p>
                </div>
              </td></tr>
            ) : sorted.map((inv) => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{inv.invoice_number}</td>
                <td className="td-muted">{inv.invoice_date}</td>
                <td style={{ fontWeight: 500 }}>{inv.customer_name}</td>
                <td>
                  <span className={`badge ${inv.tax_type === 'cgst_sgst' ? 'badge-purple' : 'badge-orange'}`}>
                    {inv.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>₹{parseFloat(inv.total).toFixed(2)}</td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/invoices/${inv.id}`)}>👁 View</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/invoices/edit/${inv.id}`)}>✏ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv.id, inv.invoice_number)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
