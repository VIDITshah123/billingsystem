const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Billing API running on http://localhost:${PORT}`);
});
