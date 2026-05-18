# Billing System — Implementation Task List

## Stack: React + Node.js + SQLite

---

## 🏗️ Phase 1: Project Setup
- [x] 1.1 Initialize Node.js backend (`/server`) with Express
- [x] 1.2 Initialize React frontend (`/client`) with Vite
- [x] 1.3 Set up SQLite database with `better-sqlite3`
- [x] 1.4 Set up `cors`, `body-parser`, and basic Express middleware
- [x] 1.5 Create database schema and migration file (customers, products, invoices, invoice_items)
- [x] 1.6 Set up folder structure: `server/routes`, `server/db`, `client/src/pages`, `client/src/components`

---

## 👤 Phase 2: Customer & Validation Updates
- [x] 2.1 Create `customers` table (id, name, address, gst_number)
- [x] 2.2 Build API endpoints: GET, POST, PUT, DELETE `/api/customers`
- [x] 2.3 Build Customers page (list with search, add, edit, delete)
- [x] 2.4 Customer form validation (name, address, GST number format validator check)
- [x] 2.5 Dynamic GST validator (Exactly 15 alphanumeric matching Indian standard format)

---

## 📦 Phase 3: Product Management
- [x] 3.1 Create `products` table (id, name, hsn_code, unit)
- [x] 3.2 Build API endpoints: GET, POST, PUT, DELETE `/api/products`
- [x] 3.3 Build Products page (list with search, add, edit, delete)
- [x] 3.4 Product form with validation (name, HSN code, unit — kgs or units)

---

## 🧾 Phase 4: Invoice Creation
- [x] 4.1 Create `invoices` table (id, invoice_number, invoice_date, customer_id, tax_type, taxable_value, cgst, sgst, igst, roundoff, total)
- [x] 4.2 Create `invoice_items` table (id, invoice_id, product_id, quantity, rate, amount)
- [x] 4.3 Build API endpoint: POST `/api/invoices` (create invoice with items)
- [x] 4.4 Build API endpoint: GET `/api/invoices` (list all invoices)
- [x] 4.5 Build API endpoint: GET `/api/invoices/:id` (single invoice detail)
- [x] 4.6 Build Invoice creation form — select customer from dropdown
- [x] 4.7 Add multiple product line items (select product, enter qty & rate)
- [x] 4.8 Implement tax logic: CGST (2.5%) + SGST (2.5%) OR IGST (5%) toggle
- [x] 4.9 Auto-calculate taxable value, taxes, round-off, and total (2 decimal precision)

---

## 🔒 Phase 5: Authentication & Mobile-First Light Theme
- [x] 5.1 Create authentication endpoints (`/api/auth/login` and `/api/auth/verify`)
- [x] 5.2 Build custom login page protecting all dashboard views
- [x] 5.3 Implement secure Bearer token headers inside axios
- [x] 5.4 Redesign app into clean light theme
- [x] 5.5 Mobile-first responsive layout (collapsing sidebar into top & bottom app navigation bars)

---

## 📄 Phase 6: High Quality PDF Invoice Template
- [x] 6.1 Design slate/light professional invoice PDF with perfect grid structure
- [x] 6.2 Fix overlapping lines and text alignment issues
- [x] 6.3 Clean signature, payment terms, and Union Bank bank detail positioning
- [x] 6.4 Single page constraint fitting

---

## 📈 Phase 7: Dynamic Reports & Financial Statements
- [x] 7.1 Financial year period logic filter (Monthly, Quarterly, Yearly start Apr 1 to Mar 31)
- [x] 7.2 Dynamic column selectors (Check/uncheck Date, Qty, Rates, SGST, CGST, etc.)
- [x] 7.3 Dynamically customized table report rendering
- [x] 7.4 Landscape PDF dynamic column print statement export

---

## ✅ All Iterative Tasks Complete!
- Frontend: http://localhost:5173
- Default Login Credentials:
  - **Username:** `admin`
  - **Password:** `vidhim@123`
