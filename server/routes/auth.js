const express = require('express');
const router = express.Router();

// Change these credentials as needed
const CREDENTIALS = { username: 'admin', password: 'vidhim@123' };
const TOKEN = 'vidhim_billing_auth_token_2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    res.json({ success: true, token: TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token === TOKEN) res.json({ valid: true });
  else res.status(401).json({ valid: false });
});

module.exports = router;
