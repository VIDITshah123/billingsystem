const express = require('express');
const router = express.Router();
const { client, initDB } = require('../db/schema');

// GET all customers (with optional search)
router.get('/', async (req, res) => {
  try {
    await initDB();
    const { search } = req.query;
    let result;
    if (search) {
      result = await client.execute({
        sql: `SELECT * FROM customers WHERE name LIKE ? OR gst_number LIKE ? OR address LIKE ? ORDER BY name ASC`,
        args: [`%${search}%`, `%${search}%`, `%${search}%`]
      });
    } else {
      result = await client.execute(`SELECT * FROM customers ORDER BY name ASC`);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    await initDB();
    const result = await client.execute({
      sql: `SELECT * FROM customers WHERE id = ?`,
      args: [req.params.id]
    });
    const customer = result.rows[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    await initDB();
    const { name, address, gst_number = '' } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    const result = await client.execute({
      sql: `INSERT INTO customers (name, address, gst_number) VALUES (?, ?, ?)`,
      args: [name.trim(), address.trim(), gst_number.trim().toUpperCase()]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), name, address, gst_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    await initDB();
    const { name, address, gst_number = '' } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    const result = await client.execute({
      sql: `UPDATE customers SET name = ?, address = ?, gst_number = ? WHERE id = ?`,
      args: [name.trim(), address.trim(), gst_number.trim().toUpperCase(), req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ id: parseInt(req.params.id), name, address, gst_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    await initDB();
    const result = await client.execute({
      sql: `DELETE FROM customers WHERE id = ?`,
      args: [req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
