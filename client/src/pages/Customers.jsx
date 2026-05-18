import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../api';

import { validateGST } from '../utils/gstValidator';

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', address: '', gst_number: '' });
  const [gstError, setGstError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({ name: customer.name, address: customer.address, gst_number: customer.gst_number });
      setGstError(null);
    }
  }, [customer]);

  const handleGstChange = (val) => {
    const clean = val.toUpperCase().trim();
    setForm(f => ({ ...f, gst_number: clean }));
    if (clean) {
      setGstError(validateGST(clean));
    } else {
      setGstError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.gst_number.trim()) {
      toast.error('All fields are required');
      return;
    }
    const error = validateGST(form.gst_number);
    if (error) {
      setGstError(error);
      toast.error('Please correct GST number format');
      return;
    }
    setLoading(true);
    try {
      if (customer) {
        await API.put(`/customers/${customer.id}`, form);
        toast.success('Customer updated!');
      } else {
        await API.post('/customers', form);
        toast.success('Customer added!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{customer ? 'Edit Customer' : 'Add Customer'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" placeholder="Customer name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea className="input" rows={3} placeholder="Full address" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">GST Number *</label>
            <input className="input" placeholder="e.g. 27AXVPS9856J1Z4" value={form.gst_number}
              onChange={e => handleGstChange(e.target.value)} />
            {gstError && <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>⚠️ {gstError}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!gstError}>
              {loading ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | customer object

  const load = async (q = '') => {
    const res = await API.get('/customers', { params: q ? { search: q } : {} });
    setCustomers(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    load(q);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"?`)) return;
    try {
      await API.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete customer');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">{customers.length} customers found</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Customer</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input className="input with-icon" placeholder="Search by name, GST, address…"
            value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>Name</th>
              <th>Address</th>
              <th>GST Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-icon">👤</div>
                  <p>No customers yet. Add your first customer.</p>
                </div>
              </td></tr>
            ) : customers.map((c, i) => (
              <tr key={c.id}>
                <td className="td-muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="td-muted" style={{ maxWidth: 260 }}>{c.address}</td>
                <td><span className="badge badge-purple">{c.gst_number}</span></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(c)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.name)}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => load(search)}
        />
      )}
    </div>
  );
}
