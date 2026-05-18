import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../api';

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', hsn_code: '', unit: 'kgs' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) setForm({ name: product.name, hsn_code: product.hsn_code, unit: product.unit });
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.hsn_code.trim()) {
      toast.error('All fields are required');
      return;
    }
    setLoading(true);
    try {
      if (product) {
        await API.put(`/products/${product.id}`, form);
        toast.success('Product updated!');
      } else {
        await API.post('/products', form);
        toast.success('Product added!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{product ? 'Edit Product' : 'Add Product'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="input" placeholder="Product name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">HSN Code *</label>
              <input className="input" placeholder="e.g. 7208" value={form.hsn_code}
                onChange={e => setForm(f => ({ ...f, hsn_code: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit *</label>
              <select className="input" value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="kgs">KGS</option>
                <option value="units">UNITS</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = async (q = '') => {
    const res = await API.get('/products', { params: q ? { search: q } : {} });
    setProducts(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    load(q);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"?`)) return;
    try {
      await API.delete(`/products/${id}`);
      toast.success('Product deleted');
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete product');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">{products.length} products found</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Product</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input className="input with-icon" placeholder="Search by name or HSN code…"
            value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>HSN Code</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <p>No products yet. Add your first product.</p>
                </div>
              </td></tr>
            ) : products.map((p, i) => (
              <tr key={p.id}>
                <td className="td-muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><span className="badge badge-orange">{p.hsn_code}</span></td>
                <td><span className="badge badge-green">{p.unit.toUpperCase()}</span></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => load(search)}
        />
      )}
    </div>
  );
}
