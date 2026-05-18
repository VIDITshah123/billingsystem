import { useState, useEffect } from 'react';
import API from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Reports() {
  const [period, setPeriod] = useState('custom'); // 'custom' | 'monthly' | 'quarterly' | 'yearly'
  
  // Custom Date Range
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  
  // Financial Year Filter States
  const [fyYear, setFyYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('04'); // April default
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); // Q1 (Apr-Jun) default

  // All Detailed Invoice line items (one row per line item, or summarized by invoice)
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Dynamic Column Selector State
  const [columns, setColumns] = useState({
    date: true,
    invoice_number: true,
    customer_name: true,
    customer_gst: true,
    product_name: true,
    hsn_code: true,
    quantity: true,
    rate: true,
    taxable_value: true,
    cgst: true,
    sgst: true,
    igst: true,
    roundoff: false,
    total: true
  });

  const availableColumns = [
    { key: 'date', label: 'Date' },
    { key: 'invoice_number', label: 'Bill No' },
    { key: 'customer_name', label: 'Client Name' },
    { key: 'customer_gst', label: 'Client GST' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'hsn_code', label: 'HSN' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'rate', label: 'Rate' },
    { key: 'taxable_value', label: 'Taxable' },
    { key: 'cgst', label: 'CGST' },
    { key: 'sgst', label: 'SGST' },
    { key: 'igst', label: 'IGST' },
    { key: 'roundoff', label: 'Roundoff' },
    { key: 'total', label: 'Total' }
  ];

  // Helper: Get Financial Year start and end dates based on year input (e.g. FY 2024 -> 1st Apr 2024 to 31st Mar 2025)
  const getFYDates = () => {
    const yr = parseInt(fyYear);
    if (period === 'yearly') {
      return {
        startDate: `${yr}-04-01`,
        endDate: `${yr + 1}-03-31`
      };
    }
    if (period === 'monthly') {
      const monthInt = parseInt(selectedMonth);
      const targetYear = monthInt >= 4 ? yr : yr + 1;
      const daysInMonth = new Date(targetYear, monthInt, 0).getDate();
      return {
        startDate: `${targetYear}-${selectedMonth.padStart(2, '0')}-01`,
        endDate: `${targetYear}-${selectedMonth.padStart(2, '0')}-${daysInMonth}`
      };
    }
    if (period === 'quarterly') {
      if (selectedQuarter === 'Q1') {
        return { startDate: `${yr}-04-01`, endDate: `${yr}-06-30` };
      } else if (selectedQuarter === 'Q2') {
        return { startDate: `${yr}-07-01`, endDate: `${yr}-09-30` };
      } else if (selectedQuarter === 'Q3') {
        return { startDate: `${yr}-10-01`, endDate: `${yr}-12-31` };
      } else {
        return { startDate: `${yr + 1}-01-01`, endDate: `${yr + 1}-03-31` };
      }
    }
    return { startDate: from, endDate: to };
  };

  const fetchReport = async () => {
    setLoading(true);
    const { startDate, endDate } = getFYDates();
    try {
      const params = {};
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;
      // Get granular list item report
      const res = await API.get('/reports/items', { params });
      setItemsData(res.data);
      setFetched(true);
    } catch {
      toast.error('Failed to load reports');
      setItemsData([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (key) => {
    setColumns(c => ({ ...c, [key]: !c[key] }));
  };

  const exportPDF = () => {
    const activeHeaders = availableColumns.filter(col => columns[col.key]);
    if (activeHeaders.length === 0) {
      toast.error('Please select at least one column to include in report');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Elegant professional report header
    doc.setFillColor(15, 23, 42); // Elegant slate gray dark header
    doc.rect(0, 0, W, 22, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VIDHIM ENTERPRISES — GST Report', 14, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 200);
    const { startDate, endDate } = getFYDates();
    const periodStr = startDate || endDate ? `Duration: ${startDate || 'start'} to ${endDate || 'end'}` : 'Full Duration';
    doc.text(periodStr, W - 14, 14, { align: 'right' });

    // Table rows
    const tableHeaders = activeHeaders.map(col => col.label);
    const tableRows = itemsData.map((it) => {
      return activeHeaders.map(col => {
        const val = it[col.key];
        if (col.key === 'date') return it.invoice_date;
        if (['taxable_value', 'cgst', 'sgst', 'igst', 'roundoff', 'total', 'rate', 'amount'].includes(col.key)) {
          return `INR ${parseFloat(val || 0).toFixed(2)}`;
        }
        if (col.key === 'quantity') return `${parseFloat(val || 0).toFixed(2)} ${it.unit}`;
        return val ?? '';
      });
    });

    autoTable(doc, {
      startY: 26,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
      styles: { lineColor: [220, 220, 225], lineWidth: 0.15 },
      margin: { left: 10, right: 10 }
    });

    doc.save(`GST_Report_${startDate || 'all'}_to_${endDate || 'today'}.pdf`);
  };

  const yearsList = [];
  const currYear = new Date().getFullYear();
  for (let y = currYear - 3; y <= currYear + 1; y++) {
    yearsList.push(y.toString());
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Financial GST Reports</div>
          <div className="page-subtitle">Generate custom statements & dynamic columns</div>
        </div>
      </div>

      {/* Date & Period filter criteria card */}
      <div className="card">
        <div className="form-label" style={{ marginBottom: '8px' }}>Select Statement Period</div>
        <div className="period-tabs">
          <button className={`period-tab${period === 'custom' ? ' active' : ''}`} onClick={() => setPeriod('custom')}>Custom Range</button>
          <button className={`period-tab${period === 'monthly' ? ' active' : ''}`} onClick={() => setPeriod('monthly')}>Monthly FY</button>
          <button className={`period-tab${period === 'quarterly' ? ' active' : ''}`} onClick={() => setPeriod('quarterly')}>Quarterly FY</button>
          <button className={`period-tab${period === 'yearly' ? ' active' : ''}`} onClick={() => setPeriod('yearly')}>Yearly FY</button>
        </div>

        <div className="form-row" style={{ marginTop: '14px' }}>
          {(period === 'monthly' || period === 'quarterly' || period === 'yearly') && (
            <div className="form-group">
              <label className="form-label">Financial Year Starting April</label>
              <select className="input" value={fyYear} onChange={e => setFyYear(e.target.value)}>
                {yearsList.map(y => (
                  <option key={y} value={y}>FY {y} - {parseInt(y) + 1}</option>
                ))}
              </select>
            </div>
          )}

          {period === 'monthly' && (
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
              </select>
            </div>
          )}

          {period === 'quarterly' && (
            <div className="form-group">
              <label className="form-label">Quarter</label>
              <select className="input" value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)}>
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
              </select>
            </div>
          )}

          {period === 'custom' && (
            <>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Dynamic Column Picker Selector Checkboxes */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div className="form-label">Choose details to add in report:</div>
          <div className="col-grid">
            {availableColumns.map(col => (
              <label key={col.key} className={`col-check${columns[col.key] ? ' checked' : ''}`}>
                <input type="checkbox" checked={columns[col.key]} onChange={() => toggleColumn(col.key)} />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={fetchReport} disabled={loading} style={{ marginTop: '18px' }}>
          {loading ? 'Processing…' : '🔍 Generate Statement'}
        </button>
      </div>

      {fetched && (
        <div style={{ marginTop: '20px' }}>
          <div className="page-header">
            <div>
              <div className="page-title" style={{ fontSize: '16px' }}>Statement Summary</div>
              <div className="page-subtitle">{itemsData.length} records generated</div>
            </div>
            {itemsData.length > 0 && (
              <button className="btn btn-success" onClick={exportPDF}>📄 Download Custom PDF</button>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {availableColumns.filter(col => columns[col.key]).map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemsData.length === 0 ? (
                  <tr>
                    <td colSpan={availableColumns.filter(col => columns[col.key]).length} style={{ textAlign: 'center', padding: '24px' }}>
                      No transactions recorded in selected period.
                    </td>
                  </tr>
                ) : (
                  itemsData.map((it, idx) => (
                    <tr key={idx}>
                      {availableColumns.filter(col => columns[col.key]).map(col => {
                        const val = it[col.key];
                        if (col.key === 'date') return <td key={col.key}>{it.invoice_date}</td>;
                        if (['taxable_value', 'cgst', 'sgst', 'igst', 'roundoff', 'total', 'rate'].includes(col.key)) {
                          return <td key={col.key} style={{ fontWeight: col.key === 'total' ? '700' : 'normal' }}>₹{parseFloat(val || 0).toFixed(2)}</td>;
                        }
                        if (col.key === 'quantity') return <td key={col.key}>{parseFloat(val || 0).toFixed(2)} {it.unit}</td>;
                        return <td key={col.key}>{val}</td>;
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
