# Coastal Marine Traders — Seafood Purchase Management App

A purchase management and procurement-accounting web & mobile application built according to the **Seafood Purchase Management App — Build Prompt** (17 Oct 2026).

---

## 🌟 Key Features Implemented

### 1. Visual Theme (Section 2)
- **Palette**: Soft blush accent (`#F6DADA`), deep rose primary (`#B23A48`, hover `#9C2F3C`), near-black body text (`#1E1E24`), clean white backgrounds for data-dense tables.
- **Typography & Layout**: Generous whitespace, clean sans-serif type, subtle rounded corners (`rounded-2xl`, `rounded-xl`), soft shadows.

### 2. Strict Role-Based Access Control (RBAC) (Section 3)
1. **Owner / Admin**: Full access. **Only** role with permanent deletion authority. Dedicated Activity/Audit surveillance view. Adds users and assigns roles.
2. **Master Accountant**: Full access except permanent deletion; can void/deactivate records with mandatory reason. No surveillance view.
3. **Junior Accountant**: Day-to-day harbour purchase entry and edits. No access to master data, payments, user management, or voiding/deletion.
4. **Management / Viewer**: Read-only: dashboard, price analysis, and reports only.
- **Role Simulator**: Built-in header switcher allowing instant testing across all four role perspectives.
- **Invite-by-Email**: Admin-only provisioning; non-admins see only a fixed read-only designation label.

### 3. Master Data Repository (Section 4)
- Relational entities with foreign keys:
  - **Suppliers**: Code, name, type (boat owner, auctioneer-agent, trader, farm, other), contact, phone, GSTIN, PAN, bank details, credit days (drives due dates), opening balance, active flag.
  - **Species / Product**: Vannamei White Shrimp, Black Tiger, Squid, Cuttlefish, Yellowfin Tuna.
  - **Grades**: Grade A, Grade B, Live/Chilled, Processing, Reject.
  - **Sizes / Counts**: 16/20, 21/25, 26/30, 31/40, 41/50, 51/60, 61/70, 71/90, 100+, Jumbo U/10.
  - **Locations**: Kochi, Munambam, Mangalore Old Port, Veraval, Visakhapatnam.
  - **Bank / Cash Accounts**: HDFC Current, SBI Fisheries, Harbour Petty Cash.
  - **Dynamic Expense Heads**: User-extensible! Adding a new expense head (e.g. Ice, Transport, Dalali, Labour) dynamically creates an input field in the purchase form.
  - **Active / Inactive Flags**: Blocks hard deletion of master records with past transactions to protect historical integrity.

### 4. Harbour Purchase Entry Workflow (Section 5)
- Mobile-first, field-ready single form.
- Sequential auto IDs (`PUR-00001`...).
- Server-accurate calculations:
  - $\text{Purchase Value} = \text{Weight} \times \text{Rate}$
  - $\text{Damage Amount} = \text{Damage Weight} \times \text{Damage Rate}$
  - $\text{Gross Purchase Value} = \text{Purchase Value} - \text{Damage Amount}$
  - $\text{Total Expenses} = \sum \text{Dynamic Expense Inputs}$
  - $\text{Total Landed Cost} = \text{Gross Purchase Value} + \text{Total Expenses}$
  - $\text{Effective Rate/Kg} = \text{Total Cost} \div \text{Weight}$
  - $\text{Due Date} = \text{Purchase Date} + \text{Credit Days}$
  - $\text{Payment Status} = \text{Derived (Unpaid / Partially Paid / Fully Paid)}$
- Photo attachment for weighment slips and boat IDs.
- Validations and warnings for duplicate invoices.

### 5. Shared / Batch Expense Allocation (Section 6)
- Products sharing a `Batch No.` form a cost pool.
- Staff enters shared costs (e.g. ₹3,936 ice) once on any row; the system automatically allocates the cost across the batch in proportion to each product's weight.
- Recalculates landed costs and effective rates automatically.
- Detects and flags warnings if duplicate expense entries exist in the same batch.

### 6. Payments & Supplier Ledger (Section 7)
- Dual payment modes: Against a specific purchase OR standalone lump-sum payment on account.
- **Supplier Ledger**: Opening balance, dated debits (purchases) and credits (payments), running balances, printable **A4 statement** with letterhead.
- **Payment & Outstanding Report**: Ageing buckets (`Not Due`, `0-30`, `31-60`, `61-90`, `91-180`, `180+` days) with conditional color-coded risk alerts.

### 7. Operational Reports & Executive Dashboard (Section 8)
- 7 live analytical reports:
  1. Daily Purchase Report
  2. Monthly Consolidated Report (with MoM comparison)
  3. Species-wise Analysis
  4. Grade × Size Matrix Analysis (with weighted-average rates)
  5. Landing Location Analysis
  6. Supplier Numeric Ranking
  7. Purchase Price Variance & Daily Trend Analysis
- Executive Dashboard with 8 KPI cards and interactive SVG distribution charts.
- **Data Quality Panel**: Real-time status cards (duplicates, missing fields, negative weights, unpaid, overdue).
- **Automated Reconciliation**: Checks that entry sums match report sums for weight and valuation.

### 8. Field Use, Mobile PWA & Offline Support (Section 9)
- Fully responsive layout with mobile bottom navigation bar for landing centres.
- Offline transaction queue: Purchases entered with weak/no signal queue locally and sync with a single click once reconnected.

### 9. Integrations & Accounting Exports (Section 11)
- Indian Financial Year tagging (`FY 2026-27`).
- **Tally XML Voucher Export**: Generates XML vouchers ready for direct import into Tally ERP / Prime.
- **Standard Journal CSV Export**: Compatible with any accounting software.

### 10. Database Schema (Section 12)
- Production PostgreSQL / Supabase schema provided in `supabase/schema.sql`.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation & Run

```bash
# 1. Navigate to project directory
cd "c:\Users\Arjun T S\Desktop\seafood-purchase-app"

# 2. Install dependencies
npm install

# 3. Launch local development server
npm run dev
```

Open your browser at `http://localhost:3000` (or the port indicated in your terminal).

---

## 🔒 Default Test Accounts (Role Simulator)

You can toggle between roles anytime using the **Role Simulator** bar at the top of the app:

| Role | Name | Capabilities |
| :--- | :--- | :--- |
| **1. Owner / Admin** | Capt. Rajesh Nair | Full control, permanent deletes, exclusive surveillance audit log, user invites |
| **2. Master Accountant** | Suresh Menon | Purchases, payments, master data, all reports, soft-delete/void with reason |
| **3. Junior Accountant** | Arun Kumar | Field purchase entry & edits only. No payments, master data, or voids |
| **4. Management / Viewer** | Priya Sharma | Read-only dashboards, price trends, and reports |
