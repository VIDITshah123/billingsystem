const express = require('express');
const router = express.Router();
const db = require('../db/schema');

// GET all customers (with optional search)
router.get('/', (req, res) => {
  const { search } = req.query;
  let customers;
  if (search) {
    customers = db.prepare(
      `SELECT * FROM customers WHERE name LIKE ? OR gst_number LIKE ? OR address LIKE ? ORDER BY name ASC`
    ).all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    customers = db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all();
  }
  res.json(customers);
});

// GET single customer
router.get('/:id', (req, res) => {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

// POST create customer
router.post('/', (req, res) => {
  const { name, address, gst_number } = req.body;
  if (!name || !address || !gst_number) {
    return res.status(400).json({ error: 'name, address, and gst_number are required' });
  }
  const result = db.prepare(
    `INSERT INTO customers (name, address, gst_number) VALUES (?, ?, ?)`
  ).run(name.trim(), address.trim(), gst_number.trim().toUpperCase());
  res.status(201).json({ id: result.lastInsertRowid, name, address, gst_number });
});

// PUT update customer
router.put('/:id', (req, res) => {
  const { name, address, gst_number } = req.body;
  if (!name || !address || !gst_number) {
    return res.status(400).json({ error: 'name, address, and gst_number are required' });
  }
  const result = db.prepare(
    `UPDATE customers SET name = ?, address = ?, gst_number = ? WHERE id = ?`
  ).run(name.trim(), address.trim(), gst_number.trim().toUpperCase(), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json({ id: parseInt(req.params.id), name, address, gst_number });
});

// DELETE customer
router.delete('/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM customers WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json({ message: 'Customer deleted successfully' });
});

module.exports = router;
