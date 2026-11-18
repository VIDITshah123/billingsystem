const express = require('express');
const router = express.Router();
const { client, initDB } = require('../db/schema');

// GET all products (with optional search)
router.get('/', async (req, res) => {
  try {
    await initDB();
    const { search } = req.query;
    let result;
    if (search) {
      result = await client.execute({
        sql: `SELECT * FROM products WHERE name LIKE ? OR hsn_code LIKE ? ORDER BY name ASC`,
        args: [`%${search}%`, `%${search}%`]
      });
    } else {
      result = await client.execute(`SELECT * FROM products ORDER BY name ASC`);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    await initDB();
    const result = await client.execute({
      sql: `SELECT * FROM products WHERE id = ?`,
      args: [req.params.id]
    });
    const product = result.rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    await initDB();
    const { name, hsn_code, unit } = req.body;
    if (!name || !hsn_code || !unit) {
      return res.status(400).json({ error: 'name, hsn_code, and unit are required' });
    }
    if (!['kgs', 'units'].includes(unit)) {
      return res.status(400).json({ error: 'unit must be kgs or units' });
    }
    const result = await client.execute({
      sql: `INSERT INTO products (name, hsn_code, unit) VALUES (?, ?, ?)`,
      args: [name.trim(), hsn_code.trim(), unit]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), name, hsn_code, unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    await initDB();
    const { name, hsn_code, unit } = req.body;
    if (!name || !hsn_code || !unit) {
      return res.status(400).json({ error: 'name, hsn_code, and unit are required' });
    }
    if (!['kgs', 'units'].includes(unit)) {
      return res.status(400).json({ error: 'unit must be kgs or units' });
    }
    const result = await client.execute({
      sql: `UPDATE products SET name = ?, hsn_code = ?, unit = ? WHERE id = ?`,
      args: [name.trim(), hsn_code.trim(), unit, req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: parseInt(req.params.id), name, hsn_code, unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    await initDB();
    const result = await client.execute({
      sql: `DELETE FROM products WHERE id = ?`,
      args: [req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
