import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const res = await API.get('/invoices');
    setInvoices(res.data);
  };

  useEffect(() => { load(); }, []);

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
              <th>#</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Tax Type</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <p>No invoices yet. Create your first invoice.</p>
                </div>
              </td></tr>
            ) : invoices.map((inv, i) => (
              <tr key={inv.id}>
                <td className="td-muted">{i + 1}</td>
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
