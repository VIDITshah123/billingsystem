const express = require('express');
const router = express.Router();
const db = require('../db/schema');

// Helper: round to 2 decimal places
const r2 = (n) => Math.round(n * 100) / 100;

// GET all invoices with customer info
router.get('/', (req, res) => {
  const { from, to } = req.query;
  let query = `
    SELECT i.*, c.name as customer_name, c.address as customer_address, c.gst_number as customer_gst
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
  `;
  const params = [];
  if (from && to) {
    query += ` WHERE i.invoice_date BETWEEN ? AND ?`;
    params.push(from, to);
  } else if (from) {
    query += ` WHERE i.invoice_date >= ?`;
    params.push(from);
  } else if (to) {
    query += ` WHERE i.invoice_date <= ?`;
    params.push(to);
  }
  query += ` ORDER BY i.invoice_date DESC, i.id DESC`;
  const invoices = db.prepare(query).all(...params);
  res.json(invoices);
});

// GET single invoice with items
router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.address as customer_address, c.gst_number as customer_gst
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare(`
    SELECT ii.*, p.name as product_name, p.hsn_code, p.unit
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ?
  `).all(req.params.id);

  res.json({ ...invoice, items });
});

// POST create invoice
router.post('/', (req, res) => {
  const { invoice_number, invoice_date, customer_id, tax_type, items } = req.body;

  if (!invoice_number || !invoice_date || !customer_id || !tax_type || !items || items.length === 0) {
    return res.status(400).json({ error: 'All fields and at least one item are required' });
  }
  if (!['cgst_sgst', 'igst'].includes(tax_type)) {
    return res.status(400).json({ error: 'tax_type must be cgst_sgst or igst' });
  }

  // Validate items
  for (const item of items) {
    if (!item.product_id || !item.quantity || !item.rate) {
      return res.status(400).json({ error: 'Each item needs product_id, quantity, and rate' });
    }
  }

  // Calculate values
  let taxable_value = 0;
  const processedItems = items.map(item => {
    const qty = r2(parseFloat(item.quantity));
    const rate = r2(parseFloat(item.rate));
    const amount = r2(qty * rate);
    taxable_value += amount;
    return { product_id: item.product_id, quantity: qty, rate, amount };
  });
  taxable_value = r2(taxable_value);

  let cgst = 0, sgst = 0, igst = 0;
  if (tax_type === 'cgst_sgst') {
    cgst = r2(taxable_value * 0.025);
    sgst = r2(taxable_value * 0.025);
  } else {
    igst = r2(taxable_value * 0.05);
  }

  const subtotal = r2(taxable_value + cgst + sgst + igst);
  const decimal = subtotal - Math.floor(subtotal);
  const roundoff = decimal >= 0.5 ? r2(1 - decimal) : r2(-decimal);
  const total = r2(subtotal + roundoff);

  // Insert in a transaction
  const insertInvoice = db.transaction(() => {
    const inv = db.prepare(`
      INSERT INTO invoices (invoice_number, invoice_date, customer_id, tax_type, taxable_value, cgst, sgst, igst, roundoff, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice_number, invoice_date, customer_id, tax_type, taxable_value, cgst, sgst, igst, roundoff, total);

    const invoiceId = inv.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of processedItems) {
      insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.amount);
    }
    return invoiceId;
  });

  try {
    const invoiceId = insertInvoice();
    res.status(201).json({ id: invoiceId, invoice_number, total });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update invoice
router.put('/:id', (req, res) => {
  const { invoice_number, invoice_date, customer_id, tax_type, items } = req.body;
  const invoiceId = req.params.id;

  if (!invoice_number || !invoice_date || !customer_id || !tax_type || !items || items.length === 0) {
    return res.status(400).json({ error: 'All fields and at least one item are required' });
  }
  if (!['cgst_sgst', 'igst'].includes(tax_type)) {
    return res.status(400).json({ error: 'tax_type must be cgst_sgst or igst' });
  }

  // Validate items
  for (const item of items) {
    if (!item.product_id || !item.quantity || !item.rate) {
      return res.status(400).json({ error: 'Each item needs product_id, quantity, and rate' });
    }
  }

  // Calculate values
  let taxable_value = 0;
  const processedItems = items.map(item => {
    const qty = r2(parseFloat(item.quantity));
    const rate = r2(parseFloat(item.rate));
    const amount = r2(qty * rate);
    taxable_value += amount;
    return { product_id: item.product_id, quantity: qty, rate, amount };
  });
  taxable_value = r2(taxable_value);

  let cgst = 0, sgst = 0, igst = 0;
  if (tax_type === 'cgst_sgst') {
    cgst = r2(taxable_value * 0.025);
    sgst = r2(taxable_value * 0.025);
  } else {
    igst = r2(taxable_value * 0.05);
  }

  const subtotal = r2(taxable_value + cgst + sgst + igst);
  const decimal = subtotal - Math.floor(subtotal);
  const roundoff = decimal >= 0.5 ? r2(1 - decimal) : r2(-decimal);
  const total = r2(subtotal + roundoff);

  // Update in a transaction
  const updateInvoiceTransaction = db.transaction(() => {
    // Delete old items
    db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).run(invoiceId);

    // Update main invoice
    const result = db.prepare(`
      UPDATE invoices
      SET invoice_number = ?, invoice_date = ?, customer_id = ?, tax_type = ?, taxable_value = ?, cgst = ?, sgst = ?, igst = ?, roundoff = ?, total = ?
      WHERE id = ?
    `).run(invoice_number, invoice_date, customer_id, tax_type, taxable_value, cgst, sgst, igst, roundoff, total, invoiceId);

    if (result.changes === 0) {
      throw new Error('Invoice not found');
    }

    // Insert new items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of processedItems) {
      insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.amount);
    }
  });

  try {
    updateInvoiceTransaction();
    res.json({ id: invoiceId, invoice_number, total });
  } catch (err) {
    if (err.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE invoice
router.delete('/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM invoices WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice deleted' });
});

module.exports = router;
