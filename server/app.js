const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { client, initDB } = require('./db/schema');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Main API Router
const apiRouter = express.Router();

apiRouter.use('/customers', require('./routes/customers'));
apiRouter.use('/products', require('./routes/products'));
apiRouter.use('/invoices', require('./routes/invoices'));
apiRouter.use('/auth', require('./routes/auth'));

// Detailed report endpoint
apiRouter.get('/reports/items', async (req, res) => {
  try {
    await initDB();
    const { from, to } = req.query;
    let where = '';
    const params = [];
    if (from && to) {
      where = 'WHERE i.invoice_date BETWEEN ? AND ?';
      params.push(from, to);
    } else if (from) {
      where = 'WHERE i.invoice_date >= ?';
      params.push(from);
    } else if (to) {
      where = 'WHERE i.invoice_date <= ?';
      params.push(to);
    }

    const result = await client.execute({
      sql: `
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
      `,
      args: params
    });

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount on both '/api' and '/' to handle all Netlify redirect / direct URL structures
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve React static files in production when running on standalone Node.js server
if (process.env.NODE_ENV === 'production' && !process.env.NETLIFY) {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

module.exports = app;
