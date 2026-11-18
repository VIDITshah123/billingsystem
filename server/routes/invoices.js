const express = require('express');
const router = express.Router();
const { initDB } = require('../db/schema');

// Helper: round to 2 decimal places
const r2 = (n) => Math.round(n * 100) / 100;

// GET all invoices with customer info
router.get('/', async (req, res) => {
  try {
    const db = await initDB();
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

    const result = await db.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const db = await initDB();
    const invRes = await db.execute({
      sql: `
        SELECT i.*, c.name as customer_name, c.address as customer_address, c.gst_number as customer_gst
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `,
      args: [req.params.id]
    });

    const invoice = invRes.rows[0];
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const itemsRes = await db.execute({
      sql: `
        SELECT ii.*, p.name as product_name, p.hsn_code, p.unit
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `,
      args: [req.params.id]
    });

    res.json({ ...invoice, items: itemsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  try {
    const db = await initDB();
    const {
      invoice_number, invoice_date, customer_id, tax_type, items,
      eway_bill_no = '', vehicle_no = '', supply_datetime = '',
      shipped_to_name = '', shipped_to_address = ''
    } = req.body;

    if (!invoice_number || !invoice_date || !customer_id || !tax_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'All fields and at least one item are required' });
    }
    if (!['cgst_sgst', 'igst'].includes(tax_type)) {
      return res.status(400).json({ error: 'tax_type must be cgst_sgst or igst' });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.rate) {
        return res.status(400).json({ error: 'Each item needs product_id, quantity, and rate' });
      }
    }

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

    const tx = await db.transaction('write');
    try {
      const invRes = await tx.execute({
        sql: `
          INSERT INTO invoices
            (invoice_number, invoice_date, customer_id, tax_type,
             taxable_value, cgst, sgst, igst, roundoff, total,
             eway_bill_no, vehicle_no, supply_datetime, shipped_to_name, shipped_to_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          invoice_number, invoice_date, customer_id, tax_type,
          taxable_value, cgst, sgst, igst, roundoff, total,
          eway_bill_no, vehicle_no, supply_datetime, shipped_to_name, shipped_to_address
        ]
      });

      const invoiceId = Number(invRes.lastInsertRowid);

      for (const item of processedItems) {
        await tx.execute({
          sql: `
            INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [invoiceId, item.product_id, item.quantity, item.rate, item.amount]
        });
      }

      await tx.commit();
      res.status(201).json({ id: invoiceId, invoice_number, total });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const db = await initDB();
    const {
      invoice_number, invoice_date, customer_id, tax_type, items,
      eway_bill_no = '', vehicle_no = '', supply_datetime = '',
      shipped_to_name = '', shipped_to_address = ''
    } = req.body;
    const invoiceId = req.params.id;

    if (!invoice_number || !invoice_date || !customer_id || !tax_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'All fields and at least one item are required' });
    }
    if (!['cgst_sgst', 'igst'].includes(tax_type)) {
      return res.status(400).json({ error: 'tax_type must be cgst_sgst or igst' });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.rate) {
        return res.status(400).json({ error: 'Each item needs product_id, quantity, and rate' });
      }
    }

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

    const tx = await db.transaction('write');
    try {
      await tx.execute({
        sql: `DELETE FROM invoice_items WHERE invoice_id = ?`,
        args: [invoiceId]
      });

      const updateRes = await tx.execute({
        sql: `
          UPDATE invoices
          SET invoice_number = ?, invoice_date = ?, customer_id = ?, tax_type = ?,
              taxable_value = ?, cgst = ?, sgst = ?, igst = ?, roundoff = ?, total = ?,
              eway_bill_no = ?, vehicle_no = ?, supply_datetime = ?,
              shipped_to_name = ?, shipped_to_address = ?
          WHERE id = ?
        `,
        args: [
          invoice_number, invoice_date, customer_id, tax_type,
          taxable_value, cgst, sgst, igst, roundoff, total,
          eway_bill_no, vehicle_no, supply_datetime, shipped_to_name, shipped_to_address,
          invoiceId
        ]
      });

      if (updateRes.rowsAffected === 0) {
        throw new Error('Invoice not found');
      }

      for (const item of processedItems) {
        await tx.execute({
          sql: `
            INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [invoiceId, item.product_id, item.quantity, item.rate, item.amount]
        });
      }

      await tx.commit();
      res.json({ id: invoiceId, invoice_number, total });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    }
  } catch (err) {
    if (err.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const db = await initDB();
    const result = await db.execute({
      sql: `DELETE FROM invoices WHERE id = ?`,
      args: [req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
