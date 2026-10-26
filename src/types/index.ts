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
  countId: string;
  boxesCount: number;
  weightKg: number;
  ratePerKg: number;

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
