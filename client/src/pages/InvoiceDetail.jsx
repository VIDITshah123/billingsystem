import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { generateInvoicePDF } from '../utils/generatePDF';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    API.get(`/invoices/${id}`).then(r => setInvoice(r.data));
  }, [id]);

  if (!invoice) return <div className="spinner" />;

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Invoice #{invoice.invoice_number}</div>
          <div className="page-subtitle">{invoice.invoice_date} · {invoice.customer_name}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>← Back</button>
          <button className="btn btn-primary" onClick={() => generateInvoicePDF(invoice)}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Customer info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div className="form-label">Customer</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.customer_name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{invoice.customer_address}</div>
            <div style={{ marginTop: 6 }}><span className="badge badge-purple">{invoice.customer_gst}</span></div>
          </div>
          <div>
            <div className="form-label">Invoice Info</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Number:</span> <strong>{invoice.invoice_number}</strong><br />
              <span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{invoice.invoice_date}</strong><br />
              <span style={{ color: 'var(--text-muted)' }}>Tax Type:</span>{' '}
              <span className={`badge ${invoice.tax_type === 'cgst_sgst' ? 'badge-purple' : 'badge-orange'}`}>
                {invoice.tax_type === 'cgst_sgst' ? 'CGST + SGST' : 'IGST'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>Product</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={it.id}>
                <td className="td-muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{it.product_name}</td>
                <td><span className="badge badge-orange">{it.hsn_code}</span></td>
                <td>{parseFloat(it.quantity).toFixed(2)} {it.unit}</td>
                <td>₹{parseFloat(it.rate).toFixed(2)}</td>
                <td style={{ fontWeight: 700 }}>₹{parseFloat(it.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card">
        <div className="totals-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div className="totals-row"><span>Taxable Value</span><span>₹{parseFloat(invoice.taxable_value).toFixed(2)}</span></div>
          {invoice.tax_type === 'cgst_sgst' ? (
            <>
              <div className="totals-row"><span>CGST @ 2.5%</span><span>₹{parseFloat(invoice.cgst).toFixed(2)}</span></div>
              <div className="totals-row"><span>SGST @ 2.5%</span><span>₹{parseFloat(invoice.sgst).toFixed(2)}</span></div>
            </>
          ) : (
            <div className="totals-row"><span>IGST @ 5%</span><span>₹{parseFloat(invoice.igst).toFixed(2)}</span></div>
          )}
          <div className="totals-row"><span>Round Off</span><span>{parseFloat(invoice.roundoff) >= 0 ? '+' : ''}₹{parseFloat(invoice.roundoff).toFixed(2)}</span></div>
          <div className="totals-row total-final"><span>TOTAL</span><span>₹{parseFloat(invoice.total).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}
