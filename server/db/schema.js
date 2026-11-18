const { createClient } = require('@libsql/client/web');

let client = null;
let initPromise = null;

function getClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set in Environment Variables. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

async function initDB() {
  if (initPromise) return initPromise;

  const dbClient = getClient();

  initPromise = (async () => {
    // Create tables in Turso
    await dbClient.executeMultiple(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        gst_number TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hsn_code TEXT NOT NULL,
        unit TEXT NOT NULL CHECK(unit IN ('kgs', 'units')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        invoice_date TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        tax_type TEXT NOT NULL CHECK(tax_type IN ('cgst_sgst', 'igst')),
        taxable_value REAL NOT NULL DEFAULT 0,
        cgst REAL NOT NULL DEFAULT 0,
        sgst REAL NOT NULL DEFAULT 0,
        igst REAL NOT NULL DEFAULT 0,
        roundoff REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        eway_bill_no TEXT DEFAULT '',
        vehicle_no TEXT DEFAULT '',
        supply_datetime TEXT DEFAULT '',
        shipped_to_name TEXT DEFAULT '',
        shipped_to_address TEXT DEFAULT '',
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // Migrate new columns (if not already present)
    const newCols = [
      `ALTER TABLE invoices ADD COLUMN eway_bill_no TEXT DEFAULT ''`,
      `ALTER TABLE invoices ADD COLUMN vehicle_no TEXT DEFAULT ''`,
      `ALTER TABLE invoices ADD COLUMN supply_datetime TEXT DEFAULT ''`,
      `ALTER TABLE invoices ADD COLUMN shipped_to_name TEXT DEFAULT ''`,
      `ALTER TABLE invoices ADD COLUMN shipped_to_address TEXT DEFAULT ''`,
    ];
    for (const col of newCols) {
      try {
        await dbClient.execute(col);
      } catch (_) {
        // column already exists
      }
    }
    return dbClient;
  })();

  return initPromise;
}

module.exports = { getClient, initDB };
