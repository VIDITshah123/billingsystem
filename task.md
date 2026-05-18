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

## 👤 Phase 2: Customer Management

- [x] 2.1 Create `customers` table (id, name, address, gst_number)
- [x] 2.2 Build API endpoints: GET, POST, PUT, DELETE `/api/customers`
- [x] 2.3 Build Customers page (list with search, add, edit, delete)
- [x] 2.4 Customer form with validation (name, address, GST number required)

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
- [x] 4.10 Round-off logic: if decimal ≥ 0.50 → round up (+1), else round down (0)

---

## 📄 Phase 5: PDF Generation

- [x] 5.1 Install `jspdf` + `jspdf-autotable` on frontend
- [x] 5.2 Design PDF template: company header (VIDHIM ENTERPRISES), invoice details, items table, tax breakdown, total
- [x] 5.3 Include Payment Terms section in PDF footer
- [x] 5.4 Include Bank Details: UNION BANK OF INDIA, Bhayandar East, A/C: 510101006809654, IFSC: UBIN0904554
- [x] 5.5 Ensure PDF fits on a single page
- [x] 5.6 Add "Generate PDF" button on invoice detail view

---

## 📊 Phase 6: Reports Page

- [x] 6.1 Build API endpoint: GET `/api/reports` with date range filter (uses `/api/invoices?from=&to=`)
- [x] 6.2 Build Reports page with date-from/date-to filter inputs
- [x] 6.3 Display filtered invoices in a table
- [x] 6.4 Export filtered results to PDF using jsPDF

---

## 🎨 Phase 7: UI / UX Polish

- [x] 7.1 Build sidebar navigation (Dashboard, Customers, Products, Invoices, Reports)
- [x] 7.2 Apply consistent dark-mode premium design with Inter font
- [x] 7.3 Add toast notifications for success/error actions
- [x] 7.4 Make all tables searchable and responsive
- [x] 7.5 Dashboard overview cards: total invoices, total revenue, total customers, total products

---

## ✅ All Tasks Completed!

| Phase | Status |
|-------|--------|
| 1. Project Setup | ✅ Done |
| 2. Customer Management | ✅ Done |
| 3. Product Management | ✅ Done |
| 4. Invoice Creation | ✅ Done |
| 5. PDF Generation | ✅ Done |
| 6. Reports Page | ✅ Done |
| 7. UI/UX Polish | ✅ Done |

**Frontend:** http://localhost:5173  
**Backend API:** http://localhost:5000/api
