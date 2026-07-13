import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api';
import { validateGST } from '../utils/gstValidator';

const r2 = (n) => Math.round(n * 100) / 100;
const EMPTY_ITEM = () => ({ product_id: '', quantity: '', rate: '', amount: 0 });

export default function NewInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    tax_type: 'cgst_sgst',
    eway_bill_no: '',
    vehicle_no: '',
    supply_datetime: '',
    shipped_to_name: '',
    shipped_to_address: '',
  });
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [loading, setLoading] = useState(false);

  // Shipped-to mode: 'customer' (copy from customer list) | 'manual'
  const [shippedToMode, setShippedToMode] = useState('manual');
  const [shippedToCustomerId, setShippedToCustomerId] = useState('');

  useEffect(() => {
    Promise.all([
      API.get('/customers'),
      API.get('/products')
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data);
      setProducts(pRes.data);

      if (isEdit) {
        API.get(`/invoices/${id}`).then(res => {
          const inv = res.data;
          setForm({
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            customer_id: String(inv.customer_id),
            tax_type: inv.tax_type,
            eway_bill_no: inv.eway_bill_no || '',
            vehicle_no: inv.vehicle_no || '',
            supply_datetime: inv.supply_datetime || '',
            shipped_to_name: inv.shipped_to_name || '',
            shipped_to_address: inv.shipped_to_address || '',
          });
          setItems(inv.items.map(it => ({
            product_id: String(it.product_id),
            quantity: String(it.quantity),
            rate: String(it.rate),
            amount: r2(parseFloat(it.quantity) * parseFloat(it.rate))
          })));
          // If shipped_to_name is already filled, default to manual mode
          if (inv.shipped_to_name) setShippedToMode('manual');
        }).catch(() => {
          toast.error('Error loading invoice details');
          navigate('/invoices');
        });
      }
    });
  }, [id, isEdit, navigate]);

  // When the user picks a customer from the "Shipped To" dropdown, copy their details
  useEffect(() => {
    if (shippedToMode === 'customer' && shippedToCustomerId) {
      const c = customers.find(c => c.id === parseInt(shippedToCustomerId));
      if (c) {
        setForm(f => ({ ...f, shipped_to_name: c.name, shipped_to_address: c.address }));
      }
    }
  }, [shippedToCustomerId, shippedToMode, customers]);

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

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.invoice_number || !form.invoice_date || !form.customer_id) {
      toast.error('Fill invoice number, date and customer');
      return;
    }
    const customer = customers.find(c => c.id === parseInt(form.customer_id));
    if (customer) {
      const gstErr = validateGST(customer.gst_number);
      if (gstErr) {
        toast.error(`Selected customer has an invalid GST format: ${gstErr}`);
        return;
      }
    }
    const validItems = items.filter(it => it.product_id && it.quantity && it.rate);
    if (validItems.length === 0) {
      toast.error('Add at least one valid product line');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, items: validItems };
      if (isEdit) {
        await API.put(`/invoices/${id}`, payload);
        toast.success(`Invoice #${form.invoice_number} updated successfully!`);
        navigate(`/invoices/${id}`);
      } else {
        const res = await API.post('/invoices', payload);
        toast.success(`Invoice #${form.invoice_number} created successfully!`);
        navigate(`/invoices/${res.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `Error ${isEdit ? 'updating' : 'creating'} invoice`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</div>
          <div className="page-subtitle">{isEdit ? `Modifying Invoice #${form.invoice_number}` : 'Create a new billing invoice'}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Invoice Header */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input className="input" placeholder="e.g. INV-001" value={form.invoice_number}
                onChange={e => setField('invoice_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date *</label>
              <input className="input" type="date" value={form.invoice_date}
                onChange={e => setField('invoice_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Customer *</label>
            <select className="input" value={form.customer_id}
              onChange={e => setField('customer_id', e.target.value)}>
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
              onClick={() => setField('tax_type', 'cgst_sgst')}>
              CGST (2.5%) + SGST (2.5%)
            </button>
            <button type="button" className={`tax-btn${form.tax_type === 'igst' ? ' active' : ''}`}
              onClick={() => setField('tax_type', 'igst')}>
              IGST (5%)
            </button>
          </div>
        </div>

        {/* E-Way Bill Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
            📦 E-Way Bill Details <span style={{ fontWeight: 400, color: '#888', fontSize: 11 }}>(optional)</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-Way Bill Ref. No.</label>
              <input className="input" placeholder="e.g. EWB-12345678"
                value={form.eway_bill_no}
                onChange={e => setField('eway_bill_no', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle No.</label>
              <input className="input" placeholder="e.g. MH04 AB 1234"
                value={form.vehicle_no}
                onChange={e => setField('vehicle_no', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date &amp; Time of Supply</label>
            <input className="input" type="datetime-local"
              value={form.supply_datetime}
              onChange={e => setField('supply_datetime', e.target.value)} />
          </div>
        </div>

        {/* Shipped To */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 0, fontSize: 13, fontWeight: 600 }}>
              🚚 Shipped To <span style={{ fontWeight: 400, color: '#888', fontSize: 11 }}>(optional)</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => { setShippedToMode('customer'); setShippedToCustomerId(''); }}
                style={{
                  padding: '4px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: '1px solid #ccc',
                  background: shippedToMode === 'customer' ? '#1a1a1a' : '#fff',
                  color: shippedToMode === 'customer' ? '#fff' : '#333',
                }}>
                Select from Customers
              </button>
              <button type="button"
                onClick={() => { setShippedToMode('manual'); setShippedToCustomerId(''); }}
                style={{
                  padding: '4px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: '1px solid #ccc',
                  background: shippedToMode === 'manual' ? '#1a1a1a' : '#fff',
                  color: shippedToMode === 'manual' ? '#fff' : '#333',
                }}>
                Enter Manually
              </button>
            </div>
          </div>

          {shippedToMode === 'customer' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Select Customer to Ship To</label>
              <select className="input" value={shippedToCustomerId}
                onChange={e => setShippedToCustomerId(e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.gst_number})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="input" placeholder="Shipped-to party name"
                value={form.shipped_to_name}
                onChange={e => setField('shipped_to_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Address</label>
            <textarea className="input" rows={2} placeholder="Shipped-to address"
              value={form.shipped_to_address}
              style={{ resize: 'vertical' }}
              onChange={e => setField('shipped_to_address', e.target.value)} />
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 0 }}>Products</div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Row</button>
          </div>

          {/* Desktop table */}
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
                      <td style={{ fontWeight: 600 }}>₹{it.amount.toFixed(2)}</td>
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

          {/* Mobile card layout */}
          <div>
            {items.map((it, idx) => {
              const prod = products.find(p => p.id === parseInt(it.product_id));
              return (
                <div key={idx} className="item-card">
                  <button type="button" className="btn btn-danger btn-sm item-card-remove"
                    onClick={() => removeItem(idx)}>✕</button>

                  <div className="form-label" style={{ marginBottom: 4, paddingRight: 32 }}>
                    Item {idx + 1}
                  </div>

                  {/* Full-width product dropdown */}
                  <select className="input" value={it.product_id}
                    style={{ marginBottom: 8 }}
                    onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                    <option value="">— Select Product —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>

                  <div className="item-card-grid">
                    <div className="item-card-field">
                      <span className="item-card-label">Qty {prod ? `(${prod.unit})` : ''}</span>
                      <input className="input" type="number" min="0" step="0.01"
                        placeholder="0.00" value={it.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="item-card-field">
                      <span className="item-card-label">Rate (₹)</span>
                      <input className="input" type="number" min="0" step="0.01"
                        placeholder="0.00" value={it.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <span className="item-card-label">Amount: </span>
                    <span className="item-card-amount">₹{it.amount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? '✔ Save Invoice' : '✔ Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
