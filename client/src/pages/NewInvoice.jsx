import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api';

const r2 = (n) => Math.round(n * 100) / 100;

const EMPTY_ITEM = () => ({ product_id: '', quantity: '', rate: '', amount: 0 });

export default function NewInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    tax_type: 'cgst_sgst',
  });
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/customers').then(r => setCustomers(r.data));
    API.get('/products').then(r => setProducts(r.data));
  }, []);

  // Calculate totals
  const taxableValue = r2(items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rate) || 0;
    return sum + r2(qty * rate);
  }, 0));

  const cgst = form.tax_type === 'cgst_sgst' ? r2(taxableValue * 0.025) : 0;
  const sgst = form.tax_type === 'cgst_sgst' ? r2(taxableValue * 0.025) : 0;
  const igst = form.tax_type === 'igst' ? r2(taxableValue * 0.05) : 0;
  const subtotal = r2(taxableValue + cgst + sgst + igst);
  const decimal = subtotal - Math.floor(subtotal);
  const roundoff = decimal >= 0.5 ? r2(1 - decimal) : r2(-decimal);
  const total = r2(subtotal + roundoff);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      const qty = parseFloat(updated.quantity) || 0;
      const rate = parseFloat(updated.rate) || 0;
      updated.amount = r2(qty * rate);
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, EMPTY_ITEM()]);
  const removeItem = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.invoice_number || !form.invoice_date || !form.customer_id) {
      toast.error('Fill invoice number, date and customer');
      return;
    }
    const validItems = items.filter(it => it.product_id && it.quantity && it.rate);
    if (validItems.length === 0) {
      toast.error('Add at least one valid product line');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/invoices', { ...form, items: validItems });
      toast.success(`Invoice #${form.invoice_number} created!`);
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">New Invoice</div>
          <div className="page-subtitle">Create a new billing invoice</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Invoice Header */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input className="input" placeholder="e.g. INV-001" value={form.invoice_number}
                onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date *</label>
              <input className="input" type="date" value={form.invoice_date}
                onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Customer *</label>
            <select className="input" value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">— Select Customer —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.gst_number})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tax Type */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Tax Type *</div>
          <div className="tax-toggle">
            <button type="button" className={`tax-btn${form.tax_type === 'cgst_sgst' ? ' active' : ''}`}
              onClick={() => setForm(f => ({ ...f, tax_type: 'cgst_sgst' }))}>
              CGST (2.5%) + SGST (2.5%)
            </button>
            <button type="button" className={`tax-btn${form.tax_type === 'igst' ? ' active' : ''}`}
              onClick={() => setForm(f => ({ ...f, tax_type: 'igst' }))}>
              IGST (5%)
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 0 }}>Products</div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Row</button>
          </div>

          <div className="items-table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Product</th>
                  <th style={{ width: '20%' }}>Qty</th>
                  <th style={{ width: '20%' }}>Rate (₹)</th>
                  <th style={{ width: '18%' }}>Amount (₹)</th>
                  <th style={{ width: '7%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prod = products.find(p => p.id === parseInt(it.product_id));
                  return (
                    <tr key={idx}>
                      <td>
                        <select className="input" value={it.product_id}
                          onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                          <option value="">— Select —</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="input" type="number" min="0" step="0.01"
                          placeholder={prod ? `in ${prod.unit}` : '0.00'}
                          value={it.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <input className="input" type="number" min="0" step="0.01"
                          placeholder="0.00" value={it.rate}
                          onChange={e => updateItem(idx, 'rate', e.target.value)} />
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        ₹{it.amount.toFixed(2)}
                      </td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm"
                          onClick={() => removeItem(idx)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="totals-box">
            <div className="totals-row"><span>Taxable Value</span><span>₹{taxableValue.toFixed(2)}</span></div>
            {form.tax_type === 'cgst_sgst' ? (
              <>
                <div className="totals-row"><span>CGST @ 2.5%</span><span>₹{cgst.toFixed(2)}</span></div>
                <div className="totals-row"><span>SGST @ 2.5%</span><span>₹{sgst.toFixed(2)}</span></div>
              </>
            ) : (
              <div className="totals-row"><span>IGST @ 5%</span><span>₹{igst.toFixed(2)}</span></div>
            )}
            <div className="totals-row"><span>Round Off</span><span>{roundoff >= 0 ? '+' : ''}₹{roundoff.toFixed(2)}</span></div>
            <div className="totals-row total-final"><span>TOTAL</span><span>₹{total.toFixed(2)}</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/invoices')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : '✔ Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
