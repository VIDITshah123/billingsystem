import { useState } from 'react';
import API from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await API.get('/invoices', { params });
      setInvoices(res.data);
      setFetched(true);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const total = invoices.reduce((s, i) => s + parseFloat(i.total), 0);
  const taxable = invoices.reduce((s, i) => s + parseFloat(i.taxable_value), 0);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(20, 20, 40);
    doc.rect(0, 0, W, 20, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(108, 99, 255);
    doc.text('VIDHIM ENTERPRISES — Invoice Report', 14, 13);

    doc.setFontSize(8);
    doc.setTextColor(180, 180, 200);
    const range = from || to ? `Period: ${from || 'start'} to ${to || 'today'}` : 'All Invoices';
    doc.text(range, W - 14, 13, { align: 'right' });

    const rows = invoices.map((inv, i) => [
      i + 1,
      inv.invoice_number,
      inv.invoice_date,
      inv.customer_name,
      inv.customer_gst,
      inv.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST',
      `₹${parseFloat(inv.taxable_value).toFixed(2)}`,
      inv.tax_type === 'cgst_sgst'
        ? `₹${parseFloat(inv.cgst).toFixed(2)} + ₹${parseFloat(inv.sgst).toFixed(2)}`
        : `₹${parseFloat(inv.igst).toFixed(2)}`,
      `₹${parseFloat(inv.total).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 24,
      head: [['#', 'Invoice No', 'Date', 'Customer', 'GST No', 'Tax', 'Taxable Value', 'Tax Amount', 'Total']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 40], textColor: [108, 99, 255], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      foot: [['', '', '', '', '', 'TOTAL', `₹${taxable.toFixed(2)}`, '', `₹${total.toFixed(2)}`]],
      footStyles: { fillColor: [20, 20, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    });

    doc.save(`Report_${from || 'all'}_${to || 'today'}.pdf`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Filter invoices by date and export</div>
        </div>
        {fetched && invoices.length > 0 && (
          <button className="btn btn-primary" onClick={exportPDF}>📄 Export PDF</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-bar">
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading…' : '🔍 Generate Report'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setFrom(''); setTo(''); setInvoices([]); setFetched(false); }}>
            Reset
          </button>
        </div>

        {fetched && (
          <div style={{ display: 'flex', gap: 16, padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <div className="stat-card" style={{ flex: 1, padding: 16 }}>
              <div className="stat-value" style={{ fontSize: 20 }}>{invoices.length}</div>
              <div className="stat-label">Invoices</div>
            </div>
            <div className="stat-card green" style={{ flex: 1, padding: 16 }}>
              <div className="stat-value" style={{ fontSize: 20 }}>₹{taxable.toFixed(2)}</div>
              <div className="stat-label">Taxable Value</div>
            </div>
            <div className="stat-card orange" style={{ flex: 1, padding: 16 }}>
              <div className="stat-value" style={{ fontSize: 20 }}>₹{total.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
        )}
      </div>

      {fetched && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Tax Type</th>
                <th>Taxable Value</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>No invoices found for selected date range.</p>
                  </div>
                </td></tr>
              ) : invoices.map((inv, i) => {
                const tax = inv.tax_type === 'cgst_sgst'
                  ? parseFloat(inv.cgst) + parseFloat(inv.sgst)
                  : parseFloat(inv.igst);
                return (
                  <tr key={inv.id}>
                    <td className="td-muted">{i + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{inv.invoice_number}</td>
                    <td className="td-muted">{inv.invoice_date}</td>
                    <td style={{ fontWeight: 500 }}>{inv.customer_name}</td>
                    <td><span className={`badge ${inv.tax_type === 'cgst_sgst' ? 'badge-purple' : 'badge-orange'}`}>
                      {inv.tax_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'}
                    </span></td>
                    <td>₹{parseFloat(inv.taxable_value).toFixed(2)}</td>
                    <td>₹{tax.toFixed(2)}</td>
                    <td style={{ fontWeight: 700 }}>₹{parseFloat(inv.total).toFixed(2)}</td>
                  </tr>
                );
              })}
              {invoices.length > 0 && (
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>TOTAL</td>
                  <td>₹{taxable.toFixed(2)}</td>
                  <td></td>
                  <td style={{ color: 'var(--success)' }}>₹{total.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
