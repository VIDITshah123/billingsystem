const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Add report-items endpoint to invoices
const db = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/auth', require('./routes/auth'));

// Detailed report endpoint: one row per invoice item
app.get('/api/reports/items', (req, res) => {
  const { from, to } = req.query;
  let where = '';
  const params = [];
  if (from && to) { where = 'WHERE i.invoice_date BETWEEN ? AND ?'; params.push(from, to); }
  else if (from) { where = 'WHERE i.invoice_date >= ?'; params.push(from); }
  else if (to) { where = 'WHERE i.invoice_date <= ?'; params.push(to); }

  const rows = db.prepare(`
    SELECT
      i.invoice_number, i.invoice_date, i.tax_type,
      c.name AS customer_name, c.gst_number AS customer_gst,
      p.name AS product_name, p.hsn_code, p.unit,
      ii.quantity, ii.rate, ii.amount,
      i.taxable_value, i.cgst, i.sgst, i.igst, i.roundoff, i.total
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON ii.product_id = p.id
    ${where}
    ORDER BY i.invoice_date DESC, i.id DESC
  `).all(...params);
  res.json(rows);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`✅ Billing API running on http://localhost:${PORT}`));
