const express = require('express');
const router = express.Router();
const db = require('../db/schema');

// GET all products (with optional search)
router.get('/', (req, res) => {
  const { search } = req.query;
  let products;
  if (search) {
    products = db.prepare(
      `SELECT * FROM products WHERE name LIKE ? OR hsn_code LIKE ? ORDER BY name ASC`
    ).all(`%${search}%`, `%${search}%`);
  } else {
    products = db.prepare(`SELECT * FROM products ORDER BY name ASC`).all();
  }
  res.json(products);
});

// GET single product
router.get('/:id', (req, res) => {
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST create product
router.post('/', (req, res) => {
  const { name, hsn_code, unit } = req.body;
  if (!name || !hsn_code || !unit) {
    return res.status(400).json({ error: 'name, hsn_code, and unit are required' });
  }
  if (!['kgs', 'units'].includes(unit)) {
    return res.status(400).json({ error: 'unit must be kgs or units' });
  }
  const result = db.prepare(
    `INSERT INTO products (name, hsn_code, unit) VALUES (?, ?, ?)`
  ).run(name.trim(), hsn_code.trim(), unit);
  res.status(201).json({ id: result.lastInsertRowid, name, hsn_code, unit });
});

// PUT update product
router.put('/:id', (req, res) => {
  const { name, hsn_code, unit } = req.body;
  if (!name || !hsn_code || !unit) {
    return res.status(400).json({ error: 'name, hsn_code, and unit are required' });
  }
  if (!['kgs', 'units'].includes(unit)) {
    return res.status(400).json({ error: 'unit must be kgs or units' });
  }
  const result = db.prepare(
    `UPDATE products SET name = ?, hsn_code = ?, unit = ? WHERE id = ?`
  ).run(name.trim(), hsn_code.trim(), unit, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ id: parseInt(req.params.id), name, hsn_code, unit });
});

// DELETE product
router.delete('/:id', (req, res) => {
  const result = db.prepare(`DELETE FROM products WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted successfully' });
});

module.exports = router;
