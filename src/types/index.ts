// Seafood Purchase Management System — Core Types

export type UserRole = 'admin' | 'master_accountant' | 'junior_accountant' | 'viewer';

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  district: string;
  state: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  financialYear: string;
  currencySymbol: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation: string;
  createdAt: string;
  lastLogin?: string;
}

export type SupplierType = 'boat_owner' | 'auctioneer_agent' | 'trader' | 'farm' | 'other';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: SupplierType;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  state: string;
  gstin?: string;
  pan?: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  paymentTerms: string;
  creditDays: number;
  openingBalance: number;
  active: boolean;
  createdAt: string;
}

export interface Species {
  id: string;
  code: string;
  name: string;
  scientificName: string;
  category: string;
  productForm?: string; // e.g. "Whole", "HLSO", "PUD", "PD", "Steaks", "Fillets"
  processingType?: string; // e.g. "Block Frozen", "IQF", "Blast Frozen", "Plate Frozen", "Fresh/Chilled"
  hsCode?: string; // Harmonized System Code, e.g. "03061790" for Shrimps, "03038990" for Marine Fish
  rawSpeciesName?: string; // Origin purchase raw species name e.g. "Vannamei Shrimp", "Yellowfin Tuna"
  rawSpeciesId?: string; // Foreign key linking to purchase raw material species
  inventoryQuantityBasis?: InventoryQuantityBasis; // Optional basis: 'purchase_weight' | 'yield'
  inventoryItemId?: string; // Linked Inventory Item
  active: boolean;
}

export interface SlabType {
  id: string;
  code: string; // e.g. "SLB-001"
  name: string; // e.g. "2.0 Kg Standard Block"
  standardWeightKg: number; // e.g. 2.0
  unit: string; // e.g. "Kg"
  productApplicability: string; // e.g. "All Products", "Shrimp / Prawns"
  active: boolean;
}

export interface Grade {
  id: string;
  code: string;
  name: string;
  description: string;
  appliesToSpeciesId?: string; // Optional species restriction
  active: boolean;
}

export interface Size {
  id: string;
  code: string;
  name: string; // e.g. "Small", "Medium", "Large", "1-2 Kg"
  description: string;
  active: boolean;
}

export interface Count {
  id: string;
  code: string;
  name: string; // e.g. "16/20", "21/25", "31/40"
  description: string;
  active: boolean;
}

export interface PurchaseLocation {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  harbourCentre: string;
  active: boolean;
}

export interface BankAccount {
  id: string;
  code: string;
  name: string;
  bank: string;
  accountType: 'Current' | 'Savings' | 'Cash Float';
  openingBalance: number;
  active: boolean;
}

export interface ExpenseType {
  id: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
}

export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Fully Paid';

export interface Purchase {
  id: string;
  purchaseId: string; // Sequential: PUR-00001
  purchaseDate: string; // YYYY-MM-DD
  financialYear: string; // FY 2026-27
  supplierId: string;
  locationId: string;
  invoiceNo: string;
  batchNo?: string;

  // Product specification
  speciesId: string;
  gradeId: string;
  sizeId: string;
  secondarySizeId?: string; // Optional second size for combined/dual size lot (single total weight)
  isDualSize?: boolean; // Flag indicating combined lot with two sizes without weight distinction
  countId: string;
  boxesCount: number;
  weightKg: number;
  ratePerKg: number;

  // Yield & Processing Outcome
  yieldWeightKg?: number; // Finished/processed output weight in Kg (e.g. 2400 kg from 5000 kg raw purchase)
  yieldPct?: number; // Yield percentage: (yieldWeightKg / weightKg) * 100 (e.g. 48.00%)
  batchYieldWeightKg?: number; // Total finished yield weight recorded for the entire batch pool
  batchYieldPct?: number; // Overall yield percentage for the entire batch pool
  isBatchYieldAllocated?: boolean; // Flag indicating yield was proportionally allocated from the whole batch pool

  // Server-computed pricing & damage
  purchaseValue: number; // weightKg * ratePerKg
  damageWeightKg: number;
  damageRatePerKg: number;
  damageAmount: number; // damageWeightKg * damageRatePerKg
  grossPurchaseValue: number; // purchaseValue - damageAmount

  // Dynamic Expenses (one per active expense type)
  expenseBreakdown: Record<string, number>; // expenseTypeId -> amount
  totalExpenses: number;
  isBatchAllocated?: boolean;

  // Final Cost
  totalCost: number; // grossPurchaseValue + totalExpenses
  effectiveRatePerKg: number; // totalCost / weightKg

  // Payment Tracking
  directAmountPaid?: number; // Initial payment made at harbour entry
  amountPaid: number;
  paymentDate?: string;
  paidFromAccountId?: string;
  balancePayable: number; // totalCost - amountPaid
  dueDate: string; // purchaseDate + supplier's creditDays
  paymentStatus: PaymentStatus;

  // Metadata
  rejectionWeightKg: number;
  remarks: string;
  photoUrl?: string; // photo attachment of weighment slip / boat id

  // Soft-delete / Void
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;

  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentNo: string; // PAY-00001
  paymentDate: string;
  financialYear: string;
  supplierId: string;
  purchaseId?: string; // Optional: settled against a specific purchase
  paidFromAccountId: string;
  amount: number;
  paymentMode: 'Bank Transfer' | 'Cheque' | 'Cash' | 'RTGS/NEFT' | 'UPI';
  referenceNo?: string;
  notes?: string;
  isVoided: boolean;
  voidReason?: string;
  createdBy: string;
  createdAt: string;
}

export type PurchaseReturnReason =
  | 'Quality / Spoilage Rejection'
  | 'Excessive Soft / Black Shell'
  | 'Size / Count Mismatch'
  | 'Foreign Contamination / Odor'
  | 'Temperature Abuse During Transit'
  | 'Weighment / Scale Discrepancy'
  | 'Damaged Packaging / Crates'
  | 'Pricing Discrepancy'
  | 'Other';

export interface PurchaseReturn {
  id: string;
  returnNo: string; // Sequential: PR-00001
  returnDate: string; // YYYY-MM-DD
  financialYear: string;
  supplierId?: string; // Optional
  purchaseId?: string; // Optional: linked to a specific purchase transaction
  purchaseRefNo?: string; // e.g. PUR-00001
  invoiceNo?: string;
  speciesId?: string; // Optional
  gradeId?: string;
  sizeId?: string;
  secondarySizeId?: string;
  isDualSize?: boolean;
  countId?: string;
  returnedWeightKg: number;
  ratePerKg: number;
  returnedValue: number; // returnedWeightKg * ratePerKg (Debit Note Amount)
  boxesCount?: number;
  reason?: PurchaseReturnReason | string;
  detailedReason?: string;
  adjustSupplierPayable: boolean; // default true: reduces supplier ledger payable
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type AuditAction = 'LOGIN' | 'CREATE' | 'EDIT' | 'VOID' | 'DELETE';

export interface AuditLog {
  id: string;
  userEmail: string;
  userRole: UserRole;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changeReason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Production Management Module Types
// ---------------------------------------------------------------------------

export type ProductionShift =
  | 'Morning Shift (06:00 - 14:00)'
  | 'Evening Shift (14:00 - 22:00)'
  | 'Night Shift (22:00 - 06:00)'
  | 'General Day Shift (08:00 - 17:00)';

export interface DailyProcessingEntry {
  id: string;
  entryNo: string; // Sequential: PROD-00001
  processingDate: string; // YYYY-MM-DD
  shift: string;
  supplierId: string;
  speciesId: string;
  gradeId: string;
  sizeId: string;
  countId?: string;
  supplierBoxId: string; // Supplier Box Identification
  slabTypeId: string; // Foreign key to SlabType
  standardSlabWeightKg: number; // Snapshot of standard slab weight (Kg)
  slabsCount: number; // Number of Slabs
  processedWeightKg: number; // Processed Quantity (Kg)
  rejectionWeightKg: number; // Rejection Quantity (Kg)
  
  // System / server-calculated derived fields
  expectedWeightKg: number; // slabsCount * standardSlabWeightKg
  varianceWeightKg: number; // processedWeightKg - expectedWeightKg
  variancePct: number; // ((processedWeightKg - expectedWeightKg) / expectedWeightKg) * 100
  hasSlabVariance: boolean; // Flagged when outside tolerance band
  
  remarks: string;
  operator: string; // Auto populated from logged-in account
  dataEntryDate: string; // Auto timestamp (ISO string)
  monthYear: string; // Derived from processingDate (YYYY-MM)
  financialYear: string;

  // Soft-delete / Void
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;

  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Sales & Export Management Module Types
// ---------------------------------------------------------------------------

export type SalesCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'INR' | 'AED' | 'SGD';

export interface Customer {
  id: string;
  code: string; // e.g. "CUST-001"
  name: string; // Consignee / Buyer trade name
  address: string;
  country: string; // Destination country, e.g. "USA", "Japan", "Netherlands"
  contactPerson: string;
  phone: string;
  email: string;
  taxId: string; // Buyer's GSTIN / Tax ID / US FEIN / VAT
  bankDetails: string; // Bank details for inward remittance realization (SWIFT / IBAN / Account)
  active: boolean;
  createdAt: string;
}

export interface PortMaster {
  id: string;
  code: string; // e.g. "INCOK", "USNYC", "JPTYO"
  name: string; // Port Name, e.g. "Cochin Port", "Port of New York", "Tokyo Port"
  country: string; // Country of the port
  active: boolean;
}

export interface SalesInvoiceLine {
  id: string;
  speciesId: string; // Product / Goods (foreign key to Species)
  hsCode: string; // Auto-filled from Species, read-only
  sizeId: string; // Physical Size (foreign key to Size)
  countId?: string; // Optional Piece Count (foreign key to Count)
  cartonsCount: number; // No. of Cartons
  weightKg: number; // Net Weight (Kg) > 0
  ratePerKg: number; // Rate per Kg (in invoice currency, e.g. USD/Kg)
  amountCurrency: number; // weightKg * ratePerKg (server-calculated, read-only)
  fobValueCurrency: number; // FOB Value in invoice currency
  fobValueINR?: number; // FOB Value in Indian Rupees
  purchaseValueCurrency?: number; // Purchase value in USD
  purchaseValueINR?: number; // Purchase value in INR

  // Export Invoice Format Particulars
  productDescription?: string; // e.g. "FROZEN INDIAN MACKEREL – A GRADE"
  gradeSize?: string; // e.g. "6/8", "8/10"
}

export interface RealizationRecord {
  id: string;
  settlementDate: string; // Realization / Settlement Date (YYYY-MM-DD)
  realizedAmountCurrency: number; // Realized Amount in foreign currency (e.g. USD)
  exchangeRateRealized: number; // Exchange Rate Realized (INR per unit foreign currency)
  amountINR: number; // realizedAmountCurrency * exchangeRateRealized
  bankRefNo: string; // FIRC / BRC / Wire Ref / Bank Advice No.
  bankAccountId?: string; // Foreign key to BankAccount where funds were realized
  bankChargesCurrency?: number; // Deductions / Foreign bank charges in foreign currency
  notes?: string;
  paymentType?: 'Advance' | 'Balance' | 'Full' | 'Other';
  contractTermsAmountUSD?: number; // Advance as per contract terms / Balance as per price (in USD)
  shortfallUSD?: number; // Shortfall / deduction in foreign currency (in USD)
  createdAt: string;
  createdBy: string;
}

export type RealizationStatus = 'Not Realized' | 'Partially Realized' | 'Fully Realized';

export interface SalesInvoice {
  id: string;
  invoiceNo: string; // Commercial Invoice No (e.g. "EXP-2026-001")
  invoiceDate: string; // YYYY-MM-DD
  financialYear: string; // FY 2026-27
  consigneeId: string; // Foreign key to Customer (Consignee)
  buyerId?: string; // Foreign key to Customer (Buyer, if other than Consignee)
  orderNo?: string;
  orderDate?: string;
  portOfLoadingId: string; // Foreign key to PortMaster
  portOfDischargeId: string; // Foreign key to PortMaster
  finalDestinationId: string; // Foreign key to PortMaster
  currency: SalesCurrency; // Default: 'USD'
  exchangeRate: number; // Estimated / Booking exchange rate (INR per currency unit)
  remarks?: string;

  // Repeatable Product Lines
  lineItems: SalesInvoiceLine[];

  // Server-calculated invoice totals (read-only)
  totalCartons: number;
  totalWeightKg: number;
  totalAmountCurrency: number; // Total Amount in USD
  totalFobValueCurrency: number; // Total FOB Value in USD
  totalFobValueINR?: number; // Total FOB Value in Indian Rupees
  totalPurchaseValueCurrency?: number; // Total Raw Purchase Value in USD
  totalPurchaseValueINR?: number; // Total Raw Purchase Value in INR
  grossProfitCurrency?: number; // Gross export profit (FOB USD - Purchase USD)
  grossProfitINR?: number; // Gross export profit (FOB INR - Purchase INR)
  profitMarginPct?: number; // Gross profit margin %
  estimatedAmountINR: number; // totalAmountCurrency * exchangeRate

  // Export Invoice Specific Particulars (Matching Official Export Sample)
  exporterName?: string;
  exporterAddress?: string;
  exporterRef?: string;
  otherReferences?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  buyerName?: string;
  buyerAddress?: string;
  countryOfOrigin?: string;
  countryOfDestination?: string;
  preCarriageBy?: string;
  placeOfReceipt?: string;
  termsOfPayment?: string;
  priceTerms?: string;
  vesselFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  commodityDescription?: string;
  packingDescription?: string;
  scientificName?: string;
  shippingMarks?: string;
  containerNo?: string;
  sealNo?: string;
  netWeightKg?: number;
  grossWeightKg?: number;
  amountInWords?: string;
  factoryNameAndAddress?: string;
  factoryApprovalNumber?: string;
  billOfLadingNo?: string;
  declarationText?: string;
  signatoryCompany?: string;
  signatoryDesignation?: string;
  signatureDate?: string;

  // Realization / Settlement Tracking
  realizations: RealizationRecord[];
  totalRealizedCurrency: number; // Total realized in USD
  balanceRealizationCurrency: number; // totalAmountCurrency - totalRealizedCurrency
  totalRealizedINR: number; // Total realized in INR
  realizationStatus: RealizationStatus; // Derived: Not Realized / Partially Realized / Fully Realized
  lastRealizationDate?: string;
  averageRealizedExchangeRate?: number; // totalRealizedINR / totalRealizedCurrency

  // Realization & Settlement Schedule Fields (Invoice Settlement)
  advanceTermsUSD?: number; // Advance as per terms of contract in USD
  advanceReceivedCurrency?: number; // Actual advance received in invoice foreign currency (USD)
  advanceShortfallUSD?: number; // Shortfall in advance payment in USD (advanceTermsUSD - advanceReceivedCurrency)
  advanceReceivedDate?: string; // Date of receiving the advance (YYYY-MM-DD)
  advanceReceivedINR?: number; // Actual advance received in INR (advanceReceivedCurrency * advanceExchangeRate)
  advanceBankRef?: string; // Advance Bank Reference / FIRC / Wire Advice
  advanceExchangeRate?: number; // Forward exchange rate for advance payment (pre-determined with bank)
  balanceActualPriceUSD?: number; // Balance as per actual price / contract in USD
  balancePaymentAmountCurrency?: number; // Actual balance payment amount in foreign currency (USD)
  balanceShortfallUSD?: number; // Shortfall in balance payment in USD (balanceActualPriceUSD - balancePaymentAmountCurrency)
  balancePaymentDate?: string; // Date of receiving balance payment (YYYY-MM-DD)
  balancePaymentINR?: number; // Actual balance payment in INR (balancePaymentAmountCurrency * balanceExchangeRate)
  balanceBankRef?: string; // Balance Bank Reference / FIRC / Wire Advice
  balanceExchangeRate?: number; // Forward exchange rate for balance payment (pre-determined with bank)
  totalShortfallUSD?: number; // Total shortfall in realization in USD (advanceShortfallUSD + balanceShortfallUSD)
  bankPreDeterminedExchangeRate?: number; // Primary/legacy exchange rate of that invoice (pre determined with bank)

  // Soft-delete / Void
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;

  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}


// ==========================================
// INVENTORY MODULE DATA TYPES & MODELS
// ==========================================

export type InventoryQuantityBasis = 'purchase_weight' | 'yield';

export interface InventoryItem {
  id: string;
  code: string; // e.g. "INV-VAN-001"
  name: string; // e.g. "Frozen Vannamei Shrimp (Yield Stock)"
  unit: 'Kg';
  quantityBasis: InventoryQuantityBasis; // 'purchase_weight' | 'yield'
  minimumStockQuantity: number; // Low stock threshold (e.g. 500 Kg)
  description?: string;
  category: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletionReason?: string;
}

export interface InventoryItemMapping {
  id: string;
  inventoryItemId: string; // foreign key to InventoryItem
  module: 'purchase' | 'sales';
  // Purchase matching
  speciesId?: string;
  gradeId?: string;
  sizeId?: string;
  // Sales matching
  salesProductId?: string; // speciesId / product in sales invoice
  salesSizeId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface OpeningStock {
  id: string;
  inventoryItemId: string;
  effectiveDate: string; // YYYY-MM-DD
  quantityKg: number;
  unitCost: number; // rate in INR/Kg
  ratePerKg?: number; // alias for unitCost
  totalValue: number; // quantityKg * unitCost
  remarks?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export type StockAdjustmentReason =
  | 'wastage'
  | 'shrinkage'
  | 'spoilage'
  | 'count_difference'
  | 'processing_loss'
  | 'glazing_variance'
  | 'damage_writeoff'
  | 'other';

export interface StockAdjustment {
  id: string;
  adjustmentNo?: string; // Sequential: ADJ-2026-0001
  inventoryItemId: string;
  date: string; // YYYY-MM-DD
  quantityKg: number; // positive (+) or negative (-)
  unitCost: number; // Valued at current weighted average cost at that moment
  ratePerKg?: number; // alias for unitCost
  totalValue: number; // quantityKg * unitCost
  reason: StockAdjustmentReason;
  status?: 'Draft' | 'Posted';
  remarks?: string;
  createdAt: string;
  createdBy: string;
  isDeleted?: boolean;
  deletionReason?: string;
}

export interface PhysicalStockCountItem {
  inventoryItemId: string;
  bookQuantityKg: number;
  countedQuantityKg: number;
  varianceQuantityKg: number; // counted - book
  varianceKg?: number; // alias for varianceQuantityKg
  unitCost: number;
  varianceValue: number; // variance * unitCost
  remarks?: string;
}

export interface PhysicalStockCount {
  id: string;
  countNo?: string; // alias for referenceNo
  countDate: string; // YYYY-MM-DD
  referenceNo: string; // e.g. "CNT-2026-11-01"
  items: PhysicalStockCountItem[];
  totalVarianceQtyKg: number;
  totalVarianceValue: number;
  status: 'draft' | 'posted';
  postedAt?: string;
  postedBy?: string;
  remarks?: string;
  createdAt: string;
  createdBy: string;
}

export interface PeriodCloseLock {
  id: string;
  period: string; // YYYY-MM (e.g. "2026-10")
  closedAt: string;
  closingDate?: string;
  closedBy: string;
  closingQty?: number;
  closingValue?: number;
  status?: 'locked' | 'unlocked';
  reconciliationPassed: boolean;
  reconciliationVarianceValue: number;
  reconciledAt?: string;
  remarks?: string;
  notes?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
}

export type InventoryMovementType =
  | 'opening_stock'
  | 'purchase_receipt'
  | 'sales_issue'
  | 'purchase_return'
  | 'sales_return'
  | 'stock_adjustment'
  | 'physical_count_variance';

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  date: string; // YYYY-MM-DD
  timestamp: number; // sequence tie breaker
  movementType: InventoryMovementType;
  referenceId: string; // Purchase ID, Invoice No, Return ID, Adjustment ID, Count Ref
  referenceDescription: string;
  
  // Movement details
  quantityIn: number; // >= 0
  quantityOut: number; // >= 0
  rate: number; // movement unit rate (4 decimals)
  movementValue: number; // total movement value (2 decimals)
  
  // Running Balance after this movement (perpetual moving weighted average)
  balanceQuantity: number; // 3 decimals
  balanceValue: number; // 2 decimals
  averageCost: number; // 4 decimals
  
  // Warnings / Metadata
  isNegativeStock?: boolean;
  isBackdatedRecalculation?: boolean;
  notes?: string;
}

export interface StockPositionItem {
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  quantityBasis: InventoryQuantityBasis;
  quantityOnHand: number;
  averageCostPerKg: number;
  totalStockValue: number;
  minimumStockQuantity: number;
  stockStatus: 'Normal' | 'Low Stock' | 'Out of Stock' | 'Negative Stock';
  averageDailySalesKg: number;
  daysOfCover: number;
  lastMovementDate?: string;
}

export interface MovementSummaryItem {
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  receiptsQty: number;
  receiptsValue: number;
  issuesQty: number;
  issuesValue: number;
  adjustmentsQty: number;
  adjustmentsValue: number;
  closingQty: number;
  closingValue: number;
  closingAverageCost: number;
}

export interface CogsReportItem {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  inventoryItemId: string;
  inventoryItemName: string;
  quantityKg: number;
  inventoryUnitCost: number; // moving average cost at time of issue
  totalCogsINR: number; // quantityKg * inventoryUnitCost
  saleValueCurrency: number; // In foreign currency (e.g. USD)
  saleValueINR: number; // In INR (realized INR if settled, else Amount USD * exchange rate)
  grossProfitINR: number; // saleValueINR - totalCogsINR
  grossMarginPct: number; // (grossProfitINR / saleValueINR) * 100
}

export interface NrvCheckItem {
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  quantityOnHand: number;
  averageCostPerKg: number;
  latestSalePricePerKgINR: number;
  nrvImpaired: boolean; // averageCostPerKg > latestSalePricePerKgINR
  variancePerKg: number; // averageCost - latestSalePrice
  totalPotentialImpairment: number;
}

export interface InventoryReconciliation {
  period: string; // e.g. "All Time" or "FY 2026-27"
  openingValue: number;
  receiptsValue: number;
  issuesValue: number;
  adjustmentsValue: number;
  closingValue: number;
  formulaCheck: boolean; // opening + receipts - issues + adjustments === closing
  
  // Tie-outs with Purchase and Sales modules
  purchaseModuleTotalCost: number;
  purchaseModuleAgreed: boolean;
  purchaseVariance: number;
  
  salesModuleTotalWeightKg: number;
  salesModuleAgreed: boolean;
  salesVarianceKg: number;
  
  status: 'Passed' | 'Variance Detected';
}

export interface InventoryException {
  id: string;
  type: 'unmapped_purchase' | 'unmapped_sale' | 'missing_yield_vannamei' | 'negative_stock' | 'count_variance' | 'period_close_locked';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  referenceId: string;
  date: string;
  affectedItem?: string;
  suggestedAction: string;
}

export interface InventoryCalculationResult {
  movementsByItem: Record<string, InventoryMovement[]>;
  allMovements: InventoryMovement[];
  stockPositions: StockPositionItem[];
  movementSummary: MovementSummaryItem[];
  cogsReport: CogsReportItem[];
  nrvChecks: NrvCheckItem[];
  reconciliation: InventoryReconciliation;
  exceptions: InventoryException[];
  totalClosingValue: number;
  totalClosingQty: number;
  totalCogsValue: number;
  totalSalesValueINR: number;
  overallGrossMarginPct: number;
}
