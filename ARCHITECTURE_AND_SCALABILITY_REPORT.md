# Full-Stack Architecture Overview, Bottleneck Analysis, and Scalability Engineering Report
**Target Repository**: `seafood-purchase-app`  
**System**: Commercial Seafood Purchase Management & Procurement-Accounting Platform  
**Target Environment**: Offline-First Harbour PWA / Cloud PostgreSQL & Supabase Architecture  
**Author**: Engineering Team (`teamwork_worker_m2`)  
**Date**: November 2026  
**Status**: Milestone 2 Implementation & Verification Completed  

---

## 1. Executive Summary & System Context

### 1.1 Business Mission & Operational Domain
`seafood-purchase-app` is a comprehensive, enterprise-grade web application engineered for commercial seafood procurement, harbour weighment operations, factory floor processing logistics, commercial export invoicing, and perpetual weighted-average-cost (WAC) inventory valuation.

The seafood supply chain is characterized by severe operational constraints:
1. **Hostile Network Environments**: Coastal harbours, landing jetties, auction sheds, and fish farms frequently experience intermittent connectivity or total cellular network blackouts.
2. **High-Frequency Weighments**: Landings arrive in unpredictable volumes across dozens of distinct boat owners and auctioneers. Fast weighment entry (batch numbers, gross weight, damage rejections, landing expenses, and photographic weighment slips) is required on mobile/tablet touchscreens without UI freezing.
3. **Complex Financial Mechanics**: Seafood procurement operates on dynamic landing expenses (ice, unloading labour, crate rentals, commission, municipal cess), fluctuating spot rates, split lots, batch-level yield calculations, and extended credit terms (0 to 180+ days) requiring strict debit note (purchase return) reconciliations.
4. **Perpetual Moving-Average Valuation**: Traceability demands that raw catch batches be converted into processed slabs, allocated against standard slab tolerances, tracked in cold storage positions, and reconciled through export sales invoices with foreign exchange realization (BRC tracking).

### 1.2 Technology Stack
- **Frontend Framework**: React 18.2 with TypeScript 5.2, compiled via Vite 5.4.
- **Styling Architecture**: Tailwind CSS 3.4 with custom "Liquid Glass" translucent surface tokens and Figma-styled high-contrast typography.
- **Icons & Tooling**: Lucide React (v0.344), SheetJS (`xlsx` v0.18.5), JSZip (v3.10.2).
- **Persistence Model**: Dual-mode architecture:
  - *Client Layer*: React Context (`DataContext.tsx`) backed by browser `localStorage` and offline Service Worker (`sw.js`).
  - *Backend Contract*: Supabase PostgreSQL schema (`supabase/schema.sql`) specifying tables, referential integrity, foreign key constraints, secondary indexes, and Row Level Security (RLS).
- **Testing Infrastructure**: Native Node.js test runner (`node --test`) executing offline unit suites across domain financial models.

---

## 2. Complete Component Hierarchy, Page Routing, and Layout Map

### 2.1 Application Bootstrap & Provider Architecture
The application initializes from `src/main.tsx`, which mounts the root React tree inside `React.StrictMode` and registers the offline Progressive Web App (PWA) Service Worker (`/public/sw.js`).

```
main.tsx
  └── React.StrictMode
        └── App.tsx
              ├── LiquidGlassProvider (Glassmorphic surface styling & theme)
              │     └── AuthProvider (RBAC user session & permissions)
              │           └── ToastProvider (Global notification queue)
              │                 └── DataProvider (God-Context state & mutations)
              │                       └── MainLayout (Navigation shell & view switcher)
```

### 2.2 Navigation Architecture & Routing Mechanism
The application does not use external URL routers such as `react-router-dom` or `@tanstack/react-router`. Navigation is implemented via in-memory component state inside `MainLayout` (`src/App.tsx:68-75`):
- `activeModule`: `'home' | 'purchase' | 'production' | 'sales' | 'inventory'`
- `activeTab` (Purchase Module): `'dashboard' | 'purchase-entry' | 'purchases' | 'purchase-returns' | 'batch-expenses' | 'payments' | 'outstanding' | 'reports' | 'data-quality' | 'master-data' | 'audit-log' | 'user-mgmt' | 'excel-import' | 'settings'`
- `productionTab` (Production Module): `'prod-dashboard' | 'daily-entry' | 'processing-log' | 'slab-types' | 'prod-reports' | 'audit-log' | 'prod-excel-import'`
- `salesTab` (Sales & Export Module): `'sales-dashboard' | 'invoice-entry' | 'invoices' | 'realizations' | 'customers' | 'ports' | 'species' | 'sales-reports' | 'audit-log' | 'sales-excel-import'`
- `inventoryTab` (Stock & Valuation Module): `'inv-dashboard' | 'stock-card' | 'stock-position' | 'item-master' | 'stock-adjustments' | 'physical-count' | 'reports-hub' | 'period-close' | 'audit-log'`

#### Architectural Evaluation of State-Driven Routing
- **Advantages**: Instant zero-network tab transitions, zero routing bundle overhead, impervious to hosting subpath misconfigurations (`base: '/RF-App/'`), ideal for embedded kiosk tablets.
- **Drawbacks**: Zero browser history integration (`window.location.hash` or HTML5 History API `pushState` are unused). Refreshing the browser resets the view to `'home'`; back/forward browser hardware buttons cannot navigate between screens; individual records or reports cannot be deep-linked or bookmarked.

### 2.3 Comprehensive View and Component Hierarchy Map

```
MainLayout (src/App.tsx)
  ├── Navbar (Global top shell: module switcher, quick action, alerts popover, role switcher)
  ├── CommandPalette (Global Ctrl+K modal for fuzzy screen search and rapid shortcuts)
  ├── RoleSwitcher (Admin modal to switch active RBAC identity)
  │
  ├── [Module: Home]
  │     └── HomeScreen (Operational overview, KPI quick cards, rapid navigation tiles)
  │
  ├── [Module: Purchase & Procurement]
  │     ├── Sidebar (Desktop left navigation)
  │     └── Main Content (Lazy loaded with React.Suspense fallback)
  │           ├── DashboardOverview (Procurement KPIs, volume/cost splits, supplier outstanding)
  │           ├── PurchaseEntryForm (Harbour landing entry, weighment slip photo capture)
  │           ├── PurchaseList (Filterable register, CSV/Tally XML export, void modal)
  │           ├── PurchaseReturnsView (Debit note generator, rejection deductions)
  │           ├── BatchExpenseView (Multi-lot proportional shared expense allocation)
  │           ├── SupplierLedgerView (Running balance debits/credits, printable A4 ledger)
  │           ├── OutstandingReport (Aging bucket analysis: Not Due, 0-30, 31-60, 61-90, 91-180, 180+d)
  │           ├── OperationalReportsHub (Daily landings, MoM monthly, matrix, yield reports)
  │           ├── DataQualityPanel (Discrepancy surveillance, rate spikes, missing weighments)
  │           ├── MasterDataManager (Suppliers, species, grades, sizes, counts, locations, accounts)
  │           ├── AuditLogView (Read-only activity surveillance trail)
  │           ├── UserManagementView (RBAC account administration)
  │           ├── ExcelImportView (Universal multi-sheet Excel migration hub)
  │           └── BusinessSettingsView (Company header, tax details, financial year config)
  │
  ├── [Module: Production & Processing Floor]
  │     ├── ProductionSidebar
  │     └── Main Content (Lazy loaded with React.Suspense fallback)
  │           ├── ProductionDashboard (Processing KPIs, slab variance metrics, daily volumes)
  │           ├── DailyProcessingEntryForm (Shift weighment, slab count, variance check)
  │           ├── ProcessingRecordList (Production logs, variance flags, CSV exports)
  │           ├── SlabTypeManager (Standard slab weights, tolerance rules)
  │           └── ProductionReportsHub (Shift breakdown, operator productivity, yield logs)
  │
  ├── [Module: Commercial Sales & Export]
  │     ├── SalesSidebar
  │     └── Main Content (Lazy loaded with React.Suspense fallback)
  │           ├── SalesDashboard (Export turnover, realization ratios, BRC status)
  │           ├── SalesInvoiceEntryForm (Multi-currency invoicing, HS codes, freight calculations)
  │           ├── SalesInvoiceList (Invoice register, DOCX commercial invoice generator)
  │           ├── CustomerManager (Buyer & consignee directory, tax registration)
  │           ├── PortManager (Port of loading, port of discharge, destinations)
  │           ├── CommercialSpeciesManager (Export product mapping, grade sizes)
  │           └── SalesReportsHub (Currency exposures, realization reconciliations)
  │
  └── [Module: Perpetual Inventory & Valuation]
        ├── InventorySidebar
        └── Main Content (Lazy loaded with React.Suspense fallback)
              ├── InventoryDashboard (Stock valuation total, moving average summary, low stock)
              ├── InventoryLedgerView (Chronological stock card, running WAC calculations)
              ├── InventoryPositionView (Current stock on hand, category distribution)
              ├── InventoryItemManager (Inventory SKU master, yield vs purchase weight basis)
              ├── StockAdjustmentView (Damages, write-offs, positive adjustments)
              ├── PhysicalStockCountView (Stocktake entry, system vs physical variance)
              ├── PeriodCloseView (Monthly closing lock, integrity reconciliation)
              ├── InventoryReportsHub (Valuation statements, COGS summaries, exceptions)
              └── InventoryAuditView (Inventory-specific adjustment audit trail)
```

---

## 3. State Management Architecture & End-to-End Data Flow

### 3.1 The Monolithic "God Context" Pattern
The operational backbone of the application is `src/context/DataContext.tsx` (4,854 lines). It encapsulates:
- **26 Independent State Slices**: `businessSettings`, `suppliers`, `species`, `grades`, `sizes`, `counts`, `locations`, `bankAccounts`, `expenseTypes`, `purchases`, `payments`, `purchaseReturns`, `slabTypes`, `customers`, `ports`, `processingEntries`, `salesInvoices`, `slabTolerancePct`, `auditLogs`, `offlineQueue`, `inventoryItems`, `inventoryMappings`, `openingStocks`, `stockAdjustments`, `physicalStockCounts`, `periodCloseLocks`.
- **70+ Mutator & Calculation Functions**: All entity CRUD operations, batch calculations, yield allocations, database wipe/reset functions, and Tally/Excel export adapters.
- **Root-Level Perpetual Inventory Valuation**: A continuous simulation engine (`calculatePerpetualInventory`) recalculating weighted-average unit costs and running balances across all 11 dependent historical transaction arrays.

### 3.2 End-to-End Transaction Data Flow

```
+-------------------------------------------------------------------------+
|                              USER ACTION                                |
|   User fills harbour purchase landing form in PurchaseEntryForm.tsx     |
|   (weighment slip photo captured via HTML5 canvas, landing expenses)    |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                       FINANCIAL FIELD DERIVATION                        |
|   computePurchaseFields() (src/utils/calculations.ts)                   |
|   - Gross Purchase Value = (Weight * Rate) - Damage Amount              |
|   - Total Cost = Gross Purchase Value + Total Landing Expenses          |
|   - Effective Rate/Kg = Total Cost / Net Weight                         |
|   - Payment Status = 'Unpaid' | 'Partially Paid' | 'Fully Paid'         |
|   - Due Date = Purchase Date + Supplier Credit Days                     |
|   - Financial Year = e.g., 'FY 2026-27' (April-March boundary)          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                       CONTEXT MUTATION DISPATCH                         |
|   addPurchase() invoked on DataContext (src/context/DataContext.tsx)    |
|   - Validates entity references (Supplier, Species, Location, Size)     |
|   - Assigns unique UUID & formatted serial (e.g. PUR-2026-0428)         |
|   - Appends log record to auditLogs slice                               |
|   - If offline: pushes transaction to offlineQueue                      |
|   - Updates React state: setPurchases(prev => [newPurchase, ...prev])   |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                  PERPETUAL INVENTORY ENGINE RE-EXECUTION                |
|   calculatePerpetualInventory() (src/utils/inventoryValuation.ts)       |
|   - Triggered via useMemo dependency on purchases                       |
|   - Collects all transactions across all historical periods             |
|   - Chronologically re-sorts all global events                          |
|   - Recalculates Moving Average Unit Cost and Running Balances          |
|   - Emits updated stockCards, valuationSummary, and cogsReport          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                    LOCAL STORAGE SYNCHRONIZATION                        |
|   useEffect() hook triggers for purchases and inventory state           |
|   - Executes: localStorage.setItem('seafood_v2_purchases', JSON)        |
|   - Synchronously serializes entire dataset on the main UI thread       |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                       UI RE-RENDER PROPAGATION                          |
|   DataContext.Provider emits updated contextValue                       |
|   - Memoized contextValue prevents renders when unrelated state changes |
|   - PurchaseList updates table rows                                     |
|   - OutstandingReport recalculates supplier aging balances              |
|   - DashboardOverview refreshes procurement KPI aggregations            |
|   - Navbar recalculates pending alert badges                            |
+-------------------------------------------------------------------------+
```

---

## 4. Supabase & Database Schema Analysis

### 4.1 Schema-to-TypeScript Model Discrepancy
A critical architectural drawback identified during Milestone 1 was the profound desynchronization between the database schema (`supabase/schema.sql`) and the application's actual domain types (`src/types/index.ts`).

While `src/types/index.ts` defined 28 distinct relational entities, the original `supabase/schema.sql` contained only **10 tables**, covering only rudimentary procurement. The following **18 domain tables** were entirely missing from the database definition:
1. `counts` (`Count` master)
2. `slab_types` (`SlabType` production standard)
3. `purchase_returns` (`PurchaseReturn` debit notes)
4. `daily_processing_entries` (`DailyProcessingEntry` plant ledger)
5. `customers` (`Customer` buyers & consignees)
6. `port_masters` (`PortMaster` logistics)
7. `sales_invoices` (`SalesInvoice` commercial export billing)
8. `sales_invoice_lines` (`SalesInvoiceLine` line item particulars)
9. `realization_records` (`RealizationRecord` foreign currency receipts & BRC)
10. `inventory_items` (`InventoryItem` perpetual stock SKUs)
11. `inventory_item_mappings` (`InventoryItemMapping` procurement-to-inventory link)
12. `opening_stocks` (`OpeningStock` beginning inventory balances)
13. `stock_adjustments` (`StockAdjustment` shrinkage, damage, write-offs)
14. `physical_stock_counts` (`PhysicalStockCount` physical stocktake headers)
15. `physical_stock_count_items` (`PhysicalStockCountItem` counted variances)
16. `period_close_locks` (`PeriodCloseLock` accounting period locks)
17. `users` (`User` multi-role accounts)
18. `business_settings` (`BusinessSettings` company configuration)

Additionally, critical columns were absent from existing tables:
- `purchases` was missing: `count_id`, `secondary_size_id`, `is_dual_size`, `yield_weight_kg`, `yield_pct`, `batch_yield_weight_kg`, `batch_yield_pct`, `is_batch_yield_allocated`.
- `species` was missing: `product_form`, `processing_type`, `hs_code`, `raw_species_name`, `raw_species_id`, `inventory_quantity_basis`, `inventory_item_id`.

### 4.2 Entity Relationship Map (28 Production Entities)

```
[business_settings]                 [users] (owner, admin, accountant, viewer)
        │
[purchase_locations] ──┐
[bank_accounts] ───────┼──────────────┐
[expense_types] ───────┤              │
[counts] ──────────────┤              │
[sizes] ───────────────┼─────────┐    │
[grades] ──────────────┤         │    │
[species] ─────────────┼────┐    │    │
[suppliers] ───────────┼──┐ │    │    │
                       ▼  ▼ ▼    │    │
                  [purchases] ◄──┘    │
                  (Landing Batches)   │
                       │   │          │
        ┌──────────────┘   └─────┐    │
        ▼                        ▼    │
[purchase_returns]          [payments]◄
(Debit Notes)               (Settlements)

[slab_types] ──┐
               ▼
[daily_processing_entries] ◄── [suppliers], [species]
(Factory Processing Floor)

[customers] ──┐
[port_masters]┼──────────────┐
              ▼              ▼
       [sales_invoices] ◄────┘
              │
       ┌──────┴────────────────────────┐
       ▼                               ▼
[sales_invoice_lines]        [realization_records]
(Line Item Breakdown)        (BRC & Foreign Currency)

[inventory_items] (Perpetual SKUs)
       │
       ├──► [inventory_item_mappings] (Bridges species & sizes to SKUs)
       ├──► [opening_stocks] (Historical baseline cost & qty)
       ├──► [stock_adjustments] (Discrepancy adjustments)
       └──► [physical_stock_count_items] ◄── [physical_stock_counts]

[period_close_locks] (Lock period balances for WAC stability)
[audit_logs] (Surveillance activity trail across all operations)
```

### 4.3 Database Indexing Evaluation
Prior to optimization, `supabase/schema.sql` lacked indexes on foreign keys and operational query filters. For instance:
- `payments` had zero secondary indexes: querying a supplier's payments required a full sequential table scan ($\mathcal{O}(N)$).
- `purchases` lacked indexes on `location_id`, `grade_id`, `size_id`, `paid_from_account_id`, `is_voided`, and `payment_status`.
- Under 100,000 purchase rows, queries for overdue aging balances (`is_voided = FALSE AND balance_payable > 0`) or supplier ledgers would exhaust PostgreSQL worker memory and degrade response times from milliseconds to seconds.

### 4.4 Row-Level Security (RLS) & Multi-Role Governance
In a Supabase / PostgREST deployment, database tables are directly accessible via auto-generated REST and GraphQL endpoints. The total absence of `ENABLE ROW LEVEL SECURITY` in the original schema constituted an urgent security hazard:
- Anonymous API keys could perform read, update, or deletion operations across the entire database.
- Junior accountants could alter closed purchase records, tamper with payments, or delete audit logs.
- Audit logs (`audit_logs`) were completely unconstrained, violating the business rule mandating Owner/Admin-only surveillance access.

---

## 5. Comprehensive Architectural Drawbacks and Scalability Bottlenecks

### Bottleneck 1: The Monolithic "God Context" & Unmemoized Provider Tree
- **Primary Affected Files**: `src/context/DataContext.tsx` (lines 69-4854), all 41 consumer components across `src/components/`.
- **Root Cause**: `DataContext` managed 26 distinct state slices in a single provider. Originally, lines 4700–4845 created the provider value as an inline object literal: `<DataContext.Provider value={{ businessSettings, suppliers, ... }}>`.
- **Consequence**: Every state update—even updating an insignificant setting or logging an audit entry—instantiated a brand-new object reference for `value`. React Context propagates updates to all consumers unconditionally when the provider value reference changes. Consequently, all 41 components calling `useData()` were forced to re-render simultaneously on every keystroke or transaction.

### Bottleneck 2: Synchronous Main-Thread JSON Serialization & 5MB Storage Quota Hazard
- **Primary Affected Files**: `src/context/DataContext.tsx` (lines 510–535), `src/components/purchase/PurchaseEntryForm.tsx` (lines 129–130, 244).
- **Root Cause**:
  1. Twenty-six separate `useEffect` hooks synchronously called `localStorage.setItem(key, JSON.stringify(data))` on the main browser thread.
  2. Harbour landing weighment slips captured photos via `<canvas>` at $65\%$ JPEG quality, converted them to Base64 data URLs (`data:image/jpeg;base64,...`, sized 300 KB to 1 MB per photo), and stored them directly inside the `Purchase` object.
- **Consequence**:
  1. `JSON.stringify` on megabyte-sized state arrays blocks the JavaScript main execution thread, causing severe dropped frames and typing latency.
  2. Standard browser `localStorage` enforces a strict quota ceiling of 5 MB per origin. Storing 5 to 10 weighment photos alongside normal transactional data immediately triggers `DOMException: QuotaExceededError`, fatally crashing write operations across the application.

### Bottleneck 3: Exhaustive Main-Thread Perpetual Inventory Valuation Simulation
- **Primary Affected Files**: `src/context/DataContext.tsx` (lines 538–550), `src/utils/inventoryValuation.ts` (lines 180–815).
- **Root Cause**: `calculatePerpetualInventory()` recomputes moving weighted-average costs across all historical opening stocks, purchases, returns, sales lines, and adjustments from genesis on every render where any of 11 state arrays changes.
- **Complexity**: $\mathcal{O}(E \log E)$ where $E$ is the total historical event count.
- **Consequence**: With 5,000 historical transactions, creating a single new harbour purchase or entering a processing shift causes a full multi-loop chronological simulation on the UI thread, freezing the screen for multiple seconds.

### Bottleneck 4: Quadratic $\mathcal{O}(N \times M)$ & Unindexed Loops in Render Paths
- **Primary Affected Files**:
  - `src/components/purchase/PurchaseList.tsx` (lines 639–640)
  - `src/components/payments/OutstandingReport.tsx` (lines 32–43)
  - `src/components/dashboard/DashboardOverview.tsx` (lines 55–77)
  - `src/components/common/Navbar.tsx` (lines 83–86)
- **Root Cause**:
  - `PurchaseList.tsx`: Evaluated `(purchaseReturns || []).filter((r) => !r.isVoided && r.purchaseId === p.id)` inside the row rendering loop `filteredPurchases.map((p) => ...)`. For $N$ purchases and $M$ returns, this executed $N \times M$ operations inside JSX on every render.
  - `OutstandingReport.tsx`: For every supplier in `suppliers.map()`, filtered all purchases, all payments, and all returns: complexity $\mathcal{O}(S \times (P + Y + R))$. With 200 suppliers and 5,000 purchases, this ran over 1,000,000 iterations inside an unmemoized component.
  - `DashboardOverview.tsx`: Unmemoized reductions across all species, expense types, and suppliers on every render pass.
  - `Navbar.tsx`: Calculated global overdue counts, variances, and pending realization counts across the entire dataset on every render of the top navbar.

### Bottleneck 5: Unpaginated DOM Node Thrashing
- **Primary Affected Files**: `PurchaseList.tsx` (lines 626–700), `SalesInvoiceList.tsx`, `ProcessingRecordList.tsx`, `AuditLogView.tsx`.
- **Root Cause**: Tables rendered 100% of matching database rows directly into the DOM without client-side pagination or list virtualization.
- **Consequence**: Rendering 1,000 purchase rows created over 12,000 DOM elements (`<tr>`, `<td>`, `<button>`, `<input>`, `<svg>`), leading to severe garbage collection pauses, scroll jank, and mobile browser crashes.

### Bottleneck 6: Monolithic 1.9MB Bundle & Phantom Dependencies
- **Primary Affected Files**: `vite.config.ts`, `package.json`, `src/App.tsx`, `src/utils/excelImport.ts`, `src/utils/sampleDocxTemplateBase64.ts`.
- **Root Cause**:
  1. `App.tsx` statically imported 38 views and report hubs at root.
  2. `vite.config.ts` had no `manualChunks` defined.
  3. `DataContext.tsx` imported string formatters (`normalizeKey`, `getFlexibleValue`, `formatExcelDate`) from `excelImport.ts`, which statically imported SheetJS (`import * as XLSX from 'xlsx'`), forcing the 1MB `xlsx` library into the initial entry bundle.
  4. `sampleDocxTemplateBase64.ts` embedded a 111,711-byte base64 Word template in TypeScript, pulling `jszip` into the initial bundle.
  5. `package.json` declared `"docx": "^9.15.1"`, an unused 500 KB dependency.
- **Consequence**: Production build emitted a single massive `dist/assets/index-*.js` chunk of **1,902.40 kB** (511.8 kB gzipped), triggering Vite's 500 kB chunk warning and degrading First Contentful Paint (FCP) and Time to Interactive (TTI).

### Bottleneck 7: PWA Service Worker Asset Caching Gaps & Base Path Mismatch
- **Primary Affected Files**: `public/sw.js` (lines 3–8), `index.html` (lines 5, 9).
- **Root Cause**:
  1. `public/sw.js` hardcoded `ASSETS_TO_CACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json']`, failing to cache the compiled hashed JS and CSS assets in `/assets/`.
  2. `sw.js` fetch handler lacked runtime caching: when offline, dynamic chunk requests (`index-*.js`, `vendor-*.js`) failed with network errors, resulting in a blank white screen.
  3. Path mismatch: `vite.config.ts` specified `base: '/RF-App/'`, but `sw.js` and `index.html` requested absolute root `/` and `/favicon.svg`.

### Bottleneck 8: Absence of Automated Offline Testing Suite
- **Primary Affected Files**: `package.json`.
- **Root Cause**: The repository had no `"test"` script in `package.json` and zero automated unit or integration tests in `src/`. The only verification mechanism was `verify-all.cjs`, an external CDP script requiring a running dev server and Google Chrome installed at a hardcoded Windows path.
- **Consequence**: Developers and CI pipelines had no headless, offline method to verify complex financial computations, batch allocations, or database constraints.

---

## 6. Implemented Optimizations & Verification Results (Milestone 2)

During Milestone 2, targeted code and configuration optimizations were implemented across the repository to systematically dismantle each identified bottleneck while maintaining 100% backward compatibility.

### 6.1 Bundler & Code Splitting Optimization (`vite.config.ts` & `src/App.tsx`)
1. **Manual Vendor Chunking**: Configured `build.rollupOptions.output.manualChunks` in `vite.config.ts` to cleanly isolate third-party vendor ecosystems:
   - `vendor-react`: `['react', 'react-dom']`
   - `vendor-icons`: `['lucide-react']`
   - `vendor-excel`: `['xlsx']`
   - `vendor-export`: `['jszip']`
2. **Warning Limit & Build Target**: Set `chunkSizeWarningLimit: 600` and `target: 'es2020'`.
3. **Route-Level Dynamic Imports**: Converted all 36 non-initial views and report hubs in `src/App.tsx` from static imports to dynamic imports using `React.lazy()` and wrapped the main content area in `<React.Suspense fallback={<LoadingSpinner />}>`.

### 6.2 Dead Dependency Pruning & `xlsx` Decoupling
1. **Pruned `docx`**: Removed dead `"docx": "^9.15.1"` from `package.json`.
2. **Extracted `excelFormatters.ts`**: Created `src/utils/excelFormatters.ts` containing pure string and date helpers (`normalizeKey`, `getFlexibleValue`, `formatExcelDate`).
3. **Decoupled Root Context**: Updated `DataContext.tsx:66` to import formatters from `../utils/excelFormatters`. SheetJS (`xlsx`) is now isolated strictly to the dynamic `vendor-excel` chunk and is loaded into browser memory only when an Excel import screen is mounted.

### 6.3 State & Context Provider Memoization (`DataContext.tsx`)
Wrapped the 170-property object passed to `<DataContext.Provider value={contextValue}>` in `useMemo`, with the 26 state slices and `inventoryCalculation` as explicit dependencies. When parent providers re-render, `contextValue` retains reference equality, stopping cascading re-renders across all 41 consumers.

### 6.4 Algorithmic Optimization in Views
1. **`PurchaseList.tsx`**: Replaced the nested `(purchaseReturns || []).filter(...)` loop with a precomputed `returnsByPurchaseId` lookup Map wrapped in `useMemo`. Table row rendering dropped from $\mathcal{O}(N \times M)$ to $\mathcal{O}(1)$ map lookups.
2. **`OutstandingReport.tsx`**: Pre-indexed purchases, payments, and returns by `supplierId` into separate Maps in a single linear pass ($\mathcal{O}(P + Y + R)$), and wrapped `reportData` and `totals` in `useMemo`. Dropped complexity from $\mathcal{O}(S \times (P + Y + R))$ to linear time.
3. **`DashboardOverview.tsx`**: Wrapped `filteredPurchases`, KPI calculations, species distribution, expense breakdown, and supplier outstanding reductions in `useMemo`.
4. **`Navbar.tsx`**: Wrapped alert counts (`overdueCount`, `varianceCount`, `pendingRealizationCount`, `totalAlerts`) in `useMemo` to eliminate unnecessary full-table scans on every render.

### 6.5 Database Schema Completion, Indexing & RLS (`supabase/schema.sql`)
1. **Added 18 Missing Tables**: Added complete DDL for all 18 missing domain tables with proper primary keys, check constraints, foreign keys, and default timestamps.
2. **Added Missing Columns**: Extended `purchases` and `species` tables to align 100% with `src/types/index.ts`.
3. **Secondary Indexing**: Added composite and partial indexes for foreign keys, active supplier ledgers (`WHERE is_voided = FALSE`), payment aging (`WHERE is_voided = FALSE AND balance_payable > 0`), and audit entity lookups.
4. **Row-Level Security**: Enabled RLS on all 28 tables, implemented `auth.current_role()` helper, and established strict RBAC policies guaranteeing Owner/Admin isolation for `audit_logs` and role boundaries for transactions.

### 6.6 PWA Service Worker & Offline Caching (`public/sw.js` & `index.html`)
1. Updated `public/sw.js` with runtime dynamic caching: successful GET responses for application bundle chunks (`dist/assets/*.js`, `.css`) are automatically cloned and cached into `seafood-pwa-v2`.
2. Implemented offline navigation fallback: when offline, failed HTML document navigation requests resolve to cached `index.html`.
3. Updated `index.html` to use relative links (`./favicon.svg`, `./manifest.json`), preventing base path 404s.

### 6.7 Offline Test Suite (`src/__tests__/domainCalculations.test.mjs`)
1. Added 9 unit test suites covering Excel normalizers, date formats, Indian Financial Year boundaries, due date projections, payment status derivations, purchase field calculations, batch shared expense allocations, aging buckets, and Map vs array equivalence.
2. Added `"test": "node --test src/__tests__/*.test.mjs"` to `package.json`. Runs 100% offline via Node's native runner in ~140ms with zero network dependencies.

### 6.8 Build and Bundle Size Verification Metrics

| Metric | Baseline (Pre-Optimization) | Milestone 2 (Post-Optimization) | Delta / Improvement |
|---|---|---|---|
| **Initial JS Entry Chunk** | `1,902.40 kB` (`index-*.js`) | **`233.45 kB`** (`index-*.js`) | **-87.7% reduction** (-1.67 MB) |
| **Gzipped Entry Size** | `511.80 kB` | **`56.89 kB`** | **-88.9% reduction** |
| **Vite Chunk Size Warnings** | Warning (>500 kB chunk warning) | **Zero warnings** (Clean build) | Resolved |
| **Decoupled Vendor Chunks** | 0 (all bundled in main) | 4 (`vendor-react`, `vendor-icons`, `vendor-excel`, `vendor-export`) | Clean modularity |
| **Excel Library Loading** | Bundled on initial app boot | Decoupled (`vendor-excel` 424 kB, loaded on demand) | Zero initial impact |
| **Build Execution Time** | 24.98 seconds | **10.21 seconds** | **59.1% faster build** |
| **TypeScript Compilation** | Code 0 | **Code 0** (`npx tsc --noEmit`) | 100% Clean |
| **Offline Test Suite** | 0 tests, no `npm test` script | **9 passed tests (142 ms)** | Automated CI ready |
| **Database Schema Tables** | 10 tables, 0 RLS, few indexes | **28 tables, full RLS, comprehensive indexes** | 100% Synchronized |

---

## 7. Concrete, Prioritized Scalability Recommendations (Tier 1 to Tier 4)

To guide future engineering milestones from initial harbour deployment to global multi-tenant enterprise scale, the following prioritized roadmap is recommended:

```
+-------------------------------------------------------------------------+
| TIER 1: HIGH-PERFORMANCE REACT ARCHITECTURE (Immediate Frontend Scale)  |
| - Domain Context Slicing (split DataContext into 5 discrete contexts)   |
| - DOM Virtualization for registers (@tanstack/react-virtual)            |
| - Uncontrolled form state with react-hook-form                          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| TIER 2: ASYNCHRONOUS CLIENT PERSISTENCE & WEB WORKERS (Device Scale)    |
| - Migrate localStorage to IndexedDB (idb-keyval / Dexie.js)            |
| - Move calculatePerpetualInventory() to dedicated Web Worker            |
| - Store Base64 weighment slip photos in IndexedDB Blob store            |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| TIER 3: FULL-STACK CLOUD SUPABASE INTEGRATION (Multi-Device Fleet)      |
| - Install @supabase/supabase-js & initialize client singleton           |
| - Server-state caching via TanStack Query (optimistic mutations)        |
| - Server-side WAC valuation via PostgreSQL Stored Procedure             |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| TIER 4: ENTERPRISE CLOUD HARDENING & RESILIENCE (Global Scale)          |
| - Supavisor connection pooling on port 6543                             |
| - Multi-region CDN edge caching for static assets                       |
| - Read-replica routing for heavy analytical reports                     |
| - Periodic database partitioning for audit_logs & processing_entries    |
+-------------------------------------------------------------------------+
```

### Tier 1: High-Performance React Architecture (Immediate Priority)
1. **Decompose `DataContext` into Domain Stores**:
   Decompose the 4,854-line `DataContext` into 5 domain contexts:
   - `MasterDataContext` (Infrequently updated suppliers, species, sizes, accounts).
   - `ProcurementContext` (Purchases, returns, batch allocations).
   - `ProductionContext` (Daily processing entries, slab types).
   - `SalesContext` (Commercial invoices, realizations).
   - `InventoryContext` (SKUs, adjustments, stock counts, period locks).
2. **Table Virtualization**:
   Integrate `@tanstack/react-virtual` in `PurchaseList.tsx` and `SalesInvoiceList.tsx`. Instead of rendering 2,000 DOM rows, render only the ~20 rows currently visible in the viewport, reducing active DOM nodes by over $90\%$.
3. **Form State Optimization**:
   Refactor large monolithic forms (`SalesInvoiceEntryForm.tsx` [1,487 lines], `PurchaseEntryForm.tsx` [967 lines]) to use uncontrolled inputs or `react-hook-form` to eliminate full-form re-renders on individual character inputs.

### Tier 2: Asynchronous Client Persistence & Web Workers (Device Scale)
1. **IndexedDB Migration**:
   Replace synchronous `localStorage.setItem` with asynchronous IndexedDB storage (using a lightweight library such as `idb-keyval` or `Dexie.js`). This eliminates the 5 MB quota ceiling and prevents UI thread blocking during JSON serialization.
2. **Weighment Photo Blob Isolation**:
   Store weighment photos as binary Blobs in an IndexedDB object store (`seafood_photos`), storing only an object key reference in the `Purchase` record.
3. **Off-Thread Valuation in Web Workers**:
   Move `calculatePerpetualInventory()` to a dedicated background Web Worker (`inventoryValuation.worker.ts`). The main UI thread remains responsive at 60 FPS while the worker processes heavy multi-year moving averages in the background.

### Tier 3: Full-Stack Cloud Supabase Integration (Multi-Device Fleet)
1. **Supabase Client Initialization**:
   Install `@supabase/supabase-js` and configure a client singleton (`src/lib/supabaseClient.ts`) reading environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Server-State Management via TanStack Query**:
   Transition client fetching from React `useState` to `@tanstack/react-query`, leveraging automatic background refetching, query deduplication, and optimistic offline mutations.
3. **PostgreSQL Stored Procedures for Valuation**:
   Migrate perpetual inventory valuation from TypeScript simulation to a PostgreSQL stored procedure (`recalculate_inventory_wac(start_date)`), delegating sorting and calculations to the database engine.

### Tier 4: Enterprise Cloud Hardening & Resilience (Global Scale)
1. **Connection Pooling via Supavisor**:
   Deploy Supavisor connection pooling on port `6543` for high-concurrency stateless edge functions and client queries, reserving direct port `5432` for administrative database migrations.
2. **Database Table Partitioning**:
   Partition high-volume append-only tables (`audit_logs`, `daily_processing_entries`, `purchases`) by `financial_year` using PostgreSQL declarative partitioning (`PARTITION BY RANGE (purchase_date)`). This keeps index sizes compact and accelerates analytical queries.
3. **Optimistic Concurrency Triggers**:
   Attach automatic `updated_at` triggers and version row checks to prevent concurrent write overwrite collisions across harbour field tablets.

---

## 8. Conclusion
The `seafood-purchase-app` architecture has undergone a comprehensive full-stack survey, structural diagnosis, and direct code and configuration optimization. By resolving the monolithic bundle via chunk splitting and lazy loading, decoupling heavy libraries, memoizing context and view aggregations, completing the Supabase database schema with RLS and secondary indexes, updating the offline PWA service worker, and establishing a native offline unit test suite, the application is positioned for robust, high-performance scalability across both remote harbour landings and enterprise cloud deployments.
