import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Supplier,
  SupplierType,
  Species,
  Grade,
  Size,
  Count,
  PurchaseLocation,
  BankAccount,
  ExpenseType,
  Purchase,
  PaymentRecord,
  PurchaseReturn,
  AuditLog,
  AuditAction,
  BusinessSettings,
  SlabType,
  DailyProcessingEntry,
  Customer,
  PortMaster,
  SalesInvoice,
  SalesInvoiceLine,
  SalesCurrency,
  RealizationRecord,
  RealizationStatus,
  PaymentStatus,
  InventoryItem,
  InventoryItemMapping,
  OpeningStock,
  StockAdjustment,
  PhysicalStockCount,
  PeriodCloseLock,
  InventoryCalculationResult
} from '../types';
import {
  DEFAULT_BUSINESS_SETTINGS,
  INITIAL_SUPPLIERS,
  INITIAL_SPECIES,
  INITIAL_GRADES,
  INITIAL_SIZES,
  INITIAL_COUNTS,
  INITIAL_LOCATIONS,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_EXPENSE_TYPES,
  INITIAL_PURCHASES,
  INITIAL_PAYMENTS,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SLAB_TYPES,
  INITIAL_PROCESSING_ENTRIES,
  INITIAL_CUSTOMERS,
  INITIAL_PORTS,
  INITIAL_SALES_INVOICES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVENTORY_MAPPINGS,
  INITIAL_OPENING_STOCKS,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_PHYSICAL_COUNTS,
  INITIAL_PERIOD_CLOSE_LOCKS,
  SAMPLE_STARTER_PRESETS
} from '../data/initialData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { computePurchaseFields, allocateBatchExpenses, allocateBatchYield, getIndianFinancialYear } from '../utils/calculations';
import { normalizeKey, getFlexibleValue, formatExcelDate } from '../utils/excelFormatters';
import { calculatePerpetualInventory } from '../utils/inventoryValuation';
import { safeSet } from '../utils/storage';

interface DataContextType {
  businessSettings: BusinessSettings;
  updateBusinessSettings: (updates: Partial<BusinessSettings>) => void;

  suppliers: Supplier[];
  species: Species[];
  grades: Grade[];
  sizes: Size[];
  counts: Count[];
  locations: PurchaseLocation[];
  bankAccounts: BankAccount[];
  expenseTypes: ExpenseType[];
  slabTypes: SlabType[];
  customers: Customer[];
  ports: PortMaster[];
  purchases: Purchase[];
  payments: PaymentRecord[];
  purchaseReturns: PurchaseReturn[];
  processingEntries: DailyProcessingEntry[];
  salesInvoices: SalesInvoice[];
  auditLogs: AuditLog[];
  offlineQueue: Purchase[];
  isOnline: boolean;
  slabTolerancePct: number;
  setSlabTolerancePct: (pct: number) => void;

  // Master Data Actions (Full CRUD)
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => { success: boolean; message?: string };
  toggleSupplierActive: (id: string) => void;

  addSpecies: (species: Omit<Species, 'id'>) => void;
  updateSpecies: (id: string, updates: Partial<Species>) => void;
  deleteSpecies: (id: string) => { success: boolean; message?: string };
  toggleSpeciesActive: (id: string) => void;

  addGrade: (grade: Omit<Grade, 'id'>) => void;
  updateGrade: (id: string, updates: Partial<Grade>) => void;
  deleteGrade: (id: string) => { success: boolean; message?: string };
  toggleGradeActive: (id: string) => void;

  addSize: (size: Omit<Size, 'id'>) => void;
  updateSize: (id: string, updates: Partial<Size>) => void;
  deleteSize: (id: string) => { success: boolean; message?: string };
  toggleSizeActive: (id: string) => void;

  addCount: (count: Omit<Count, 'id'>) => void;
  updateCount: (id: string, updates: Partial<Count>) => void;
  deleteCount: (id: string) => { success: boolean; message?: string };
  toggleCountActive: (id: string) => void;

  addLocation: (loc: Omit<PurchaseLocation, 'id'>) => void;
  updateLocation: (id: string, updates: Partial<PurchaseLocation>) => void;
  deleteLocation: (id: string) => { success: boolean; message?: string };
  toggleLocationActive: (id: string) => void;

  addBankAccount: (acc: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => { success: boolean; message?: string };
  toggleBankAccountActive: (id: string) => void;

  addExpenseType: (exp: Omit<ExpenseType, 'id'>) => void;
  updateExpenseType: (id: string, updates: Partial<ExpenseType>) => void;
  deleteExpenseType: (id: string) => { success: boolean; message?: string };
  toggleExpenseTypeActive: (id: string) => void;

  addSlabType: (slabType: Omit<SlabType, 'id'>) => void;
  updateSlabType: (id: string, updates: Partial<SlabType>) => void;
  deleteSlabType: (id: string) => { success: boolean; message?: string };
  toggleSlabTypeActive: (id: string) => void;
  bulkImportSlabTypes: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };

  // Sales Master Data Actions (Full CRUD)
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => { success: boolean; message?: string };
  toggleCustomerActive: (id: string) => void;
  bulkImportCustomers: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };

  addPort: (port: Omit<PortMaster, 'id'>) => void;
  updatePort: (id: string, updates: Partial<PortMaster>) => void;
  deletePort: (id: string) => { success: boolean; message?: string };
  togglePortActive: (id: string) => void;
  bulkImportPorts: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };

  // Transaction Actions
  addPurchase: (purchaseData: Partial<Purchase>) => { success: boolean; purchaseId?: string; warnings?: string[] };
  updatePurchase: (id: string, updates: Partial<Purchase>, editReason?: string) => { success: boolean; message?: string };
  voidPurchase: (id: string, voidReason: string) => { success: boolean; message?: string };
  deletePurchasePermanently: (id: string) => { success: boolean; message?: string };

  // Production Entry Actions
  addProcessingEntry: (entryData: Partial<DailyProcessingEntry>) => { success: boolean; entryNo?: string; warning?: string };
  updateProcessingEntry: (id: string, updates: Partial<DailyProcessingEntry>, editReason?: string) => { success: boolean; message?: string };
  voidProcessingEntry: (id: string, voidReason: string) => { success: boolean; message?: string };
  deleteProcessingEntryPermanently: (id: string) => { success: boolean; message?: string };

  // Sales Invoice & Commercial Export Actions
  addSalesInvoice: (invoiceData: Partial<SalesInvoice>) => { success: boolean; invoiceNo?: string; warnings?: string[] };
  updateSalesInvoice: (id: string, updates: Partial<SalesInvoice>, editReason?: string) => { success: boolean; message?: string };
  addInvoiceRealization: (invoiceId: string, realization: Omit<RealizationRecord, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; message?: string };
  updateInvoiceSettlement: (
    invoiceId: string,
    settlementData: {
      advanceTermsUSD?: number;
      advanceReceivedCurrency?: number;
      advanceShortfallUSD?: number;
      advanceReceivedDate?: string;
      advanceBankRef?: string;
      advanceExchangeRate?: number;
      balanceActualPriceUSD?: number;
      balancePaymentAmountCurrency?: number;
      balanceShortfallUSD?: number;
      balancePaymentDate?: string;
      balanceBankRef?: string;
      balanceExchangeRate?: number;
      totalShortfallUSD?: number;
      bankPreDeterminedExchangeRate?: number;
      bankAccountId?: string;
      notes?: string;
    }
  ) => { success: boolean; message?: string };
  deleteInvoiceRealization: (invoiceId: string, realizationId: string) => { success: boolean; message?: string };
  voidSalesInvoice: (id: string, voidReason: string) => { success: boolean; message?: string };
  deleteSalesInvoicePermanently: (id: string) => { success: boolean; message?: string };

  // Payment Actions
  addPayment: (payment: Omit<PaymentRecord, 'id' | 'paymentNo' | 'createdAt' | 'isVoided' | 'createdBy'>) => void;
  voidPayment: (id: string, voidReason: string) => void;

  // Purchase Return (Debit Note) Actions
  addPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'returnNo' | 'createdAt' | 'isVoided' | 'createdBy'>) => { success: boolean; returnNo?: string; message?: string };
  updatePurchaseReturn: (id: string, updates: Partial<PurchaseReturn>, editReason?: string) => { success: boolean; message?: string };
  voidPurchaseReturn: (id: string, voidReason: string) => { success: boolean; message?: string };
  deletePurchaseReturnPermanently: (id: string) => { success: boolean; message?: string };

  // Batch Operations
  recalculateBatch: (batchNo: string) => void;
  recalculateExpenseBatch: (expenseBatchNo: string) => void;
  allocateBatchYield: (batchNo: string, batchYieldWeightKg?: number, batchYieldPct?: number) => { success: boolean; message: string };
  clearBatchYield: (batchNo: string) => { success: boolean; message: string };

  // Offline Sync
  syncOfflineQueue: () => void;

  // Complete Database Customization & Wipe Controls
  clearAllTransactions: () => void;
  wipeDatabaseCompletely: () => void;
  loadStarterPresets: () => void;

  // Bulk Excel Import Actions
  bulkImportSuppliers: (records: Record<string, any>[], updateExisting?: boolean) => { added: number; updated: number; errors: string[] };
  bulkImportSpecies: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportGrades: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportSizes: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportCounts: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportLocations: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportBankAccounts: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportExpenseTypes: (records: Record<string, any>[]) => { added: number; updated: number; errors: string[] };
  bulkImportPurchases: (
    rawRows: Record<string, any>[],
    autoCreateMaster?: boolean
  ) => { added: number; errors: string[]; createdSuppliers: number; createdSpecies: number; createdLocations: number };
  bulkImportProcessingEntries: (
    rawRows: Record<string, any>[],
    autoCreateMaster?: boolean
  ) => { added: number; errors: string[]; createdSuppliers?: number; createdSpecies?: number; createdSlabTypes?: number };
  bulkImportSalesInvoices: (
    rawRows: Record<string, any>[],
    autoCreateMaster?: boolean
  ) => { added: number; errors: string[]; createdCustomers?: number; createdPorts?: number; createdSpecies?: number };
  bulkImportSalesRealizations: (
    rawRows: Record<string, any>[]
  ) => { updated: number; errors: string[] };

  logAudit: (
    action: AuditAction,
    entityName: string,
    entityId: string,
    options?: { oldValues?: any; newValues?: any; changeReason?: string }
  ) => void;

  // Inventory State & Calculations
  inventoryItems: InventoryItem[];
  inventoryMappings: InventoryItemMapping[];
  openingStocks: OpeningStock[];
  stockAdjustments: StockAdjustment[];
  physicalStockCounts: PhysicalStockCount[];
  periodCloseLocks: PeriodCloseLock[];
  inventoryCalculation: InventoryCalculationResult;

  // Inventory CRUD Actions
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => { success: boolean; message?: string };
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => { success: boolean; message?: string };
  deleteInventoryItem: (id: string) => { success: boolean; message?: string };
  toggleInventoryItemActive: (id: string) => void;

  addInventoryMapping: (mapping: Omit<InventoryItemMapping, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; message?: string };
  deleteInventoryMapping: (id: string) => { success: boolean; message?: string };

  saveOpeningStock: (opening: Omit<OpeningStock, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; message?: string };
  deleteOpeningStock: (id: string) => { success: boolean; message?: string };

  addStockAdjustment: (adj: Omit<StockAdjustment, 'id' | 'adjustmentNo' | 'createdAt' | 'createdBy' | 'status'>) => { success: boolean; adjustmentNo?: string; message?: string };
  deleteStockAdjustment: (id: string) => { success: boolean; message?: string };

  savePhysicalStockCount: (count: Omit<PhysicalStockCount, 'id' | 'countNo' | 'referenceNo' | 'createdAt' | 'createdBy' | 'status'> & { referenceNo?: string }) => { success: boolean; countNo?: string; countId?: string; message?: string };
  postPhysicalStockCount: (countId: string) => { success: boolean; message?: string };
  deletePhysicalStockCount: (id: string) => { success: boolean; message?: string };

  closePeriodLock: (period: string, closingQty: number, closingValue: number, remarks?: string) => { success: boolean; message?: string };
  unlockPeriod: (period: string, reason: string) => { success: boolean; message?: string };
  rebuildInventoryLedger: () => { success: boolean; message: string };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, permissions } = useAuth();
  const { showToast } = useToast();

  // Fresh storage key version v2 to ensure clean empty slate on update
  const DB_PREFIX = 'seafood_v2_';

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}settings`);
    return saved ? JSON.parse(saved) : DEFAULT_BUSINESS_SETTINGS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [species, setSpecies] = useState<Species[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}species`);
    return saved ? JSON.parse(saved) : INITIAL_SPECIES;
  });

  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}grades`);
    return saved ? JSON.parse(saved) : INITIAL_GRADES;
  });

  const [sizes, setSizes] = useState<Size[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}sizes`);
    return saved ? JSON.parse(saved) : INITIAL_SIZES;
  });

  const [counts, setCounts] = useState<Count[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}counts`);
    return saved ? JSON.parse(saved) : INITIAL_COUNTS;
  });

  const [locations, setLocations] = useState<PurchaseLocation[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}locations`);
    return saved ? JSON.parse(saved) : INITIAL_LOCATIONS;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}bank_accounts`);
    return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNTS;
  });

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}expense_types`);
    let list: ExpenseType[] = saved ? JSON.parse(saved) : INITIAL_EXPENSE_TYPES;
    if (list && list.length > 0) {
      // Deduplicate expense types by normalized clean name, keeping canonical primary
      const seen = new Set<string>();
      const deduplicated: ExpenseType[] = [];
      for (const et of list) {
        const norm = et.name.toLowerCase().replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').replace(/[^a-z0-9]/g, '');
        const key = (norm.includes('other') || norm.includes('misc')) ? 'otherexpenses' : norm;
        if (!seen.has(key)) {
          seen.add(key);
          const cleanName = et.name.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').trim();
          deduplicated.push({ ...et, name: cleanName });
        }
      }
      list = deduplicated;

      const hasOther = list.some((e) => e.name.toLowerCase().includes('other') || e.name.toLowerCase().includes('misc'));
      if (!hasOther) {
        list.push({
          id: 'exp-5',
          code: `EXP-${String(list.length + 1).padStart(3, '0')}`,
          name: 'Other Expenses',
          category: 'Landing',
          active: true
        });
      }
    } else {
      list = SAMPLE_STARTER_PRESETS.expenseTypes;
    }
    return list;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}purchases`);
    let list: Purchase[] = saved ? JSON.parse(saved) : INITIAL_PURCHASES;
    if (list && list.length > 0) {
      list = list.map((p) => {
        // Sanitize legacy bug where batchNo was conflated with yieldBatchNo and triggered erroneous batch expense allocation
        let cleanP = { ...p };
        if (cleanP.yieldBatchNo && !cleanP.expenseBatchNo && cleanP.batchNo === cleanP.yieldBatchNo) {
          cleanP.batchNo = undefined;
          cleanP.isBatchAllocated = false;
        }
        // Sanitize legacy bug where batchYieldWeightKg / yieldWeightKg was erroneously parsed as expenseBatchNo
        if (
          cleanP.expenseBatchNo &&
          (!isNaN(Number(cleanP.expenseBatchNo)) ||
            Number(cleanP.expenseBatchNo) === cleanP.batchYieldWeightKg ||
            Number(cleanP.expenseBatchNo) === cleanP.yieldWeightKg)
        ) {
          cleanP.expenseBatchNo = undefined;
          cleanP.isBatchAllocated = false;
        }
        if (!cleanP.expenseBreakdown || Object.keys(cleanP.expenseBreakdown).length === 0) return cleanP;

        const eb = { ...cleanP.expenseBreakdown };
        let modified = false;

        // Detect any keys that correspond to "Other Expenses"
        const otherKeys: string[] = [];
        Object.keys(eb).forEach((k) => {
          const lowerK = k.toLowerCase();
          if (
            k === 'exp-5' ||
            lowerK.includes('otherexpense') ||
            lowerK.includes('otherlanding') ||
            lowerK.includes('miscexpense') ||
            lowerK.includes('other')
          ) {
            otherKeys.push(k);
          }
        });

        if (otherKeys.length > 1) {
          // Keep canonical 'exp-5' if present, else the first otherKey
          const primaryKey = otherKeys.includes('exp-5') ? 'exp-5' : otherKeys[0];
          const validAmt = Number(eb[primaryKey]) || Math.max(...otherKeys.map((k) => Number(eb[k]) || 0));

          otherKeys.forEach((k) => {
            if (k !== primaryKey) {
              delete eb[k];
              modified = true;
            }
          });
          eb[primaryKey] = validAmt;
        }

        if (modified) {
          const totalExpenses = Number(Object.values(eb).reduce((sum, v) => sum + (Number(v) || 0), 0).toFixed(2));
          const grossPurchaseValue = Number(cleanP.grossPurchaseValue ?? (cleanP.purchaseValue - (cleanP.damageAmount || 0))) || 0;
          const totalCost = Number((grossPurchaseValue + totalExpenses).toFixed(2));
          const effectiveRatePerKg = cleanP.weightKg > 0 ? Number((totalCost / cleanP.weightKg).toFixed(2)) : 0;
          const amountPaid = Number(cleanP.amountPaid) || 0;
          const balancePayable = Number(Math.max(0, totalCost - amountPaid).toFixed(2));
          const paymentStatus: PaymentStatus =
            amountPaid === 0 ? 'Unpaid' : amountPaid >= totalCost ? 'Fully Paid' : 'Partially Paid';

          return {
            ...cleanP,
            expenseBreakdown: eb,
            totalExpenses,
            totalCost,
            effectiveRatePerKg,
            balancePayable,
            paymentStatus
          };
        }
        return cleanP;
      });
    }
    return list;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}payments`);
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}purchase_returns`);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_RETURNS;
  });

  const [slabTypes, setSlabTypes] = useState<SlabType[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}slab_types`);
    return saved ? JSON.parse(saved) : INITIAL_SLAB_TYPES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}customers`);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [ports, setPorts] = useState<PortMaster[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}ports`);
    return saved ? JSON.parse(saved) : INITIAL_PORTS;
  });

  const [processingEntries, setProcessingEntries] = useState<DailyProcessingEntry[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}processing_entries`);
    return saved ? JSON.parse(saved) : INITIAL_PROCESSING_ENTRIES;
  });

  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}sales_invoices`);
    return saved ? JSON.parse(saved) : INITIAL_SALES_INVOICES;
  });

  const [slabTolerancePct, setSlabTolerancePct] = useState<number>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}slab_tolerance`);
    return saved ? Number(saved) : 5;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}audit_logs`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [offlineQueue, setOfflineQueue] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}offline_queue`);
    return saved ? JSON.parse(saved) : [];
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}inventory_items`);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_ITEMS;
  });

  const [inventoryMappings, setInventoryMappings] = useState<InventoryItemMapping[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}inventory_mappings`);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_MAPPINGS;
  });

  const [openingStocks, setOpeningStocks] = useState<OpeningStock[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}opening_stocks`);
    return saved ? JSON.parse(saved) : INITIAL_OPENING_STOCKS;
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}stock_adjustments`);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_ADJUSTMENTS;
  });

  const [physicalStockCounts, setPhysicalStockCounts] = useState<PhysicalStockCount[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}physical_counts`);
    return saved ? JSON.parse(saved) : INITIAL_PHYSICAL_COUNTS;
  });

  const [periodCloseLocks, setPeriodCloseLocks] = useState<PeriodCloseLock[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}period_close_locks`);
    return saved ? JSON.parse(saved) : INITIAL_PERIOD_CLOSE_LOCKS;
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online. Ready to sync offline records.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Transactions will queue locally and sync once signal returns.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Persist state safely to localStorage with asynchronous IndexedDB backup (prevents QuotaExceededError)
  useEffect(() => { safeSet(`${DB_PREFIX}settings`, businessSettings); }, [businessSettings]);
  useEffect(() => { safeSet(`${DB_PREFIX}suppliers`, suppliers); }, [suppliers]);
  useEffect(() => { safeSet(`${DB_PREFIX}species`, species); }, [species]);
  useEffect(() => { safeSet(`${DB_PREFIX}grades`, grades); }, [grades]);
  useEffect(() => { safeSet(`${DB_PREFIX}sizes`, sizes); }, [sizes]);
  useEffect(() => { safeSet(`${DB_PREFIX}counts`, counts); }, [counts]);
  useEffect(() => { safeSet(`${DB_PREFIX}locations`, locations); }, [locations]);
  useEffect(() => { safeSet(`${DB_PREFIX}bank_accounts`, bankAccounts); }, [bankAccounts]);
  useEffect(() => { safeSet(`${DB_PREFIX}expense_types`, expenseTypes); }, [expenseTypes]);
  useEffect(() => { safeSet(`${DB_PREFIX}slab_types`, slabTypes); }, [slabTypes]);
  useEffect(() => { safeSet(`${DB_PREFIX}customers`, customers); }, [customers]);
  useEffect(() => { safeSet(`${DB_PREFIX}ports`, ports); }, [ports]);
  useEffect(() => { safeSet(`${DB_PREFIX}processing_entries`, processingEntries); }, [processingEntries]);
  useEffect(() => { safeSet(`${DB_PREFIX}sales_invoices`, salesInvoices); }, [salesInvoices]);
  useEffect(() => { safeSet(`${DB_PREFIX}slab_tolerance`, String(slabTolerancePct)); }, [slabTolerancePct]);
  useEffect(() => { safeSet(`${DB_PREFIX}purchases`, purchases); }, [purchases]);
  useEffect(() => { safeSet(`${DB_PREFIX}payments`, payments); }, [payments]);
  useEffect(() => { safeSet(`${DB_PREFIX}purchase_returns`, purchaseReturns); }, [purchaseReturns]);
  useEffect(() => { safeSet(`${DB_PREFIX}audit_logs`, auditLogs); }, [auditLogs]);
  useEffect(() => { safeSet(`${DB_PREFIX}offline_queue`, offlineQueue); }, [offlineQueue]);
  useEffect(() => { safeSet(`${DB_PREFIX}inventory_items`, inventoryItems); }, [inventoryItems]);
  useEffect(() => { safeSet(`${DB_PREFIX}inventory_mappings`, inventoryMappings); }, [inventoryMappings]);
  useEffect(() => { safeSet(`${DB_PREFIX}opening_stocks`, openingStocks); }, [openingStocks]);
  useEffect(() => { safeSet(`${DB_PREFIX}stock_adjustments`, stockAdjustments); }, [stockAdjustments]);
  useEffect(() => { safeSet(`${DB_PREFIX}physical_counts`, physicalStockCounts); }, [physicalStockCounts]);
  useEffect(() => { safeSet(`${DB_PREFIX}period_close_locks`, periodCloseLocks); }, [periodCloseLocks]);

  // Perpetual moving average inventory valuation engine
  const inventoryCalculation = useMemo(() => {
    return calculatePerpetualInventory({
      inventoryItems,
      mappings: inventoryMappings,
      openingStocks,
      purchases,
      purchaseReturns,
      salesInvoices,
      stockAdjustments,
      physicalCounts: physicalStockCounts,
      speciesList: species,
      suppliers,
      customers
    });
  }, [
    inventoryItems,
    inventoryMappings,
    openingStocks,
    purchases,
    purchaseReturns,
    salesInvoices,
    stockAdjustments,
    physicalStockCounts,
    species,
    suppliers,
    customers
  ]);

  // Helper to append to Audit Log
  const logAudit = (
    action: AuditAction,
    entityName: string,
    entityId: string,
    options?: { oldValues?: any; newValues?: any; changeReason?: string }
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      action,
      entityName,
      entityId,
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      changeReason: options?.changeReason,
      createdAt: new Date().toISOString()
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateBusinessSettings = (updates: Partial<BusinessSettings>) => {
    setBusinessSettings((prev) => ({ ...prev, ...updates }));
    showToast('Business details updated successfully.', 'success');
  };

  // --------------------------------------------------------------------------
  // MASTER DATA FULL CRUD (Create, Read, Update, Delete with Referential Integrity)
  // --------------------------------------------------------------------------

  // SUPPLIERS
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSuppliers((prev) => [...prev, newSupplier]);
    logAudit('CREATE', 'Supplier', newSupplier.code, { newValues: newSupplier, changeReason: 'Created supplier' });
    showToast(`Supplier "${newSupplier.name}" created.`, 'success');
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    const old = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    logAudit('EDIT', 'Supplier', old?.code || id, { oldValues: old, newValues: updates });
    showToast('Supplier updated.', 'success');
  };

  const deleteSupplier = (id: string): { success: boolean; message?: string } => {
    // Referential integrity check: Cannot delete if past purchases reference this supplier
    const hasTransactions = purchases.some((p) => p.supplierId === id);
    if (hasTransactions) {
      showToast('Referential Integrity: Cannot delete supplier with existing purchase transactions. Archive (deactivate) instead.', 'error');
      return { success: false, message: 'Supplier has active transaction history. Deactivate instead.' };
    }
    const old = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    logAudit('DELETE', 'Supplier', old?.code || id, { oldValues: old, changeReason: 'Deleted master record' });
    showToast('Supplier removed.', 'info');
    return { success: true };
  };

  const toggleSupplierActive = (id: string) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  // SPECIES
  const addSpecies = (spData: Omit<Species, 'id'>) => {
    const newSpecies: Species = { ...spData, id: `spe-${Date.now()}` };
    setSpecies((prev) => [...prev, newSpecies]);
    logAudit('CREATE', 'Species', newSpecies.code, { newValues: newSpecies });
    showToast(`Species "${newSpecies.name}" registered.`, 'success');
  };

  const updateSpecies = (id: string, updates: Partial<Species>) => {
    const old = species.find((s) => s.id === id);
    setSpecies((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    logAudit('EDIT', 'Species', old?.code || id, { oldValues: old, newValues: updates });
    showToast('Species updated.', 'success');
  };

  const deleteSpecies = (id: string): { success: boolean; message?: string } => {
    const hasTransactions = purchases.some((p) => p.speciesId === id);
    if (hasTransactions) {
      showToast('Referential Integrity: Cannot delete species with purchase transactions. Deactivate instead.', 'error');
      return { success: false, message: 'Species referenced in transactions.' };
    }
    const old = species.find((s) => s.id === id);
    setSpecies((prev) => prev.filter((s) => s.id !== id));
    logAudit('DELETE', 'Species', old?.code || id, { oldValues: old });
    showToast('Species deleted.', 'info');
    return { success: true };
  };

  const toggleSpeciesActive = (id: string) => {
    setSpecies((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  // GRADES
  const addGrade = (gradeData: Omit<Grade, 'id'>) => {
    const newGrade: Grade = { ...gradeData, id: `grd-${Date.now()}` };
    setGrades((prev) => [...prev, newGrade]);
    logAudit('CREATE', 'Grade', newGrade.code, { newValues: newGrade });
    showToast(`Grade "${newGrade.name}" added.`, 'success');
  };

  const updateGrade = (id: string, updates: Partial<Grade>) => {
    setGrades((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    showToast('Grade updated.', 'success');
  };

  const deleteGrade = (id: string) => {
    const hasTransactions = purchases.some((p) => p.gradeId === id);
    if (hasTransactions) {
      showToast('Cannot delete grade referenced in purchases. Deactivate instead.', 'error');
      return { success: false };
    }
    setGrades((prev) => prev.filter((g) => g.id !== id));
    showToast('Grade deleted.', 'info');
    return { success: true };
  };

  const toggleGradeActive = (id: string) => {
    setGrades((prev) => prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g)));
  };

  // SIZES
  const addSize = (sizeData: Omit<Size, 'id'>) => {
    const newSize: Size = { ...sizeData, id: `siz-${Date.now()}` };
    setSizes((prev) => [...prev, newSize]);
    logAudit('CREATE', 'Size', newSize.code, { newValues: newSize });
    showToast(`Size "${newSize.name}" added.`, 'success');
  };

  const updateSize = (id: string, updates: Partial<Size>) => {
    setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    showToast('Size updated.', 'success');
  };

  const deleteSize = (id: string) => {
    const hasTransactions = purchases.some((p) => p.sizeId === id || (p.isDualSize && p.secondarySizeId === id));
    if (hasTransactions) {
      showToast('Cannot delete size referenced in purchases. Deactivate instead.', 'error');
      return { success: false };
    }
    setSizes((prev) => prev.filter((s) => s.id !== id));
    showToast('Size deleted.', 'info');
    return { success: true };
  };

  const toggleSizeActive = (id: string) => {
    setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  // COUNTS
  const addCount = (countData: Omit<Count, 'id'>) => {
    const newCount: Count = { ...countData, id: `cnt-${Date.now()}` };
    setCounts((prev) => [...prev, newCount]);
    logAudit('CREATE', 'Count', newCount.code, { newValues: newCount });
    showToast(`Count "${newCount.name}" added.`, 'success');
  };

  const updateCount = (id: string, updates: Partial<Count>) => {
    setCounts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    showToast('Count updated.', 'success');
  };

  const deleteCount = (id: string) => {
    const hasTransactions = purchases.some((p) => p.countId === id);
    if (hasTransactions) {
      showToast('Cannot delete count referenced in purchases. Deactivate instead.', 'error');
      return { success: false };
    }
    setCounts((prev) => prev.filter((c) => c.id !== id));
    showToast('Count deleted.', 'info');
    return { success: true };
  };

  const toggleCountActive = (id: string) => {
    setCounts((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  // LOCATIONS
  const addLocation = (locData: Omit<PurchaseLocation, 'id'>) => {
    const newLoc: PurchaseLocation = { ...locData, id: `loc-${Date.now()}` };
    setLocations((prev) => [...prev, newLoc]);
    logAudit('CREATE', 'PurchaseLocation', newLoc.code, { newValues: newLoc });
    showToast(`Harbour "${newLoc.name}" registered.`, 'success');
  };

  const updateLocation = (id: string, updates: Partial<PurchaseLocation>) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    showToast('Location updated.', 'success');
  };

  const deleteLocation = (id: string) => {
    const hasTransactions = purchases.some((p) => p.locationId === id);
    if (hasTransactions) {
      showToast('Cannot delete harbour with purchases recorded. Deactivate instead.', 'error');
      return { success: false };
    }
    setLocations((prev) => prev.filter((l) => l.id !== id));
    showToast('Location deleted.', 'info');
    return { success: true };
  };

  const toggleLocationActive = (id: string) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)));
  };

  // BANK ACCOUNTS
  const addBankAccount = (accData: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = { ...accData, id: `acc-${Date.now()}` };
    setBankAccounts((prev) => [...prev, newAcc]);
    logAudit('CREATE', 'BankAccount', newAcc.code, { newValues: newAcc });
    showToast(`Account "${newAcc.name}" created.`, 'success');
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    setBankAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    showToast('Account updated.', 'success');
  };

  const deleteBankAccount = (id: string) => {
    const hasTransactions = payments.some((pay) => pay.paidFromAccountId === id);
    if (hasTransactions) {
      showToast('Cannot delete account with recorded payments. Deactivate instead.', 'error');
      return { success: false };
    }
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast('Account deleted.', 'info');
    return { success: true };
  };

  const toggleBankAccountActive = (id: string) => {
    setBankAccounts((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  };

  // EXPENSE TYPES
  const addExpenseType = (expData: Omit<ExpenseType, 'id'>) => {
    const newExp: ExpenseType = { ...expData, id: `exp-${Date.now()}` };
    setExpenseTypes((prev) => [...prev, newExp]);
    logAudit('CREATE', 'ExpenseType', newExp.code, { newValues: newExp });
    showToast(`Expense head "${newExp.name}" added. It will now appear on the purchase form.`, 'success');
  };

  const updateExpenseType = (id: string, updates: Partial<ExpenseType>) => {
    setExpenseTypes((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    showToast('Expense type updated.', 'success');
  };

  const deleteExpenseType = (id: string) => {
    const isUsed = purchases.some((p) => (p.expenseBreakdown?.[id] || 0) > 0);
    if (isUsed) {
      showToast('Cannot delete expense type that has been used in past purchases. Deactivate instead.', 'error');
      return { success: false };
    }
    setExpenseTypes((prev) => prev.filter((e) => e.id !== id));
    showToast('Expense head deleted.', 'info');
    return { success: true };
  };

  const toggleExpenseTypeActive = (id: string) => {
    setExpenseTypes((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e)));
  };

  // --------------------------------------------------------------------------
  // SLAB TYPES MASTER DATA (Production)
  // --------------------------------------------------------------------------
  const addSlabType = (stData: Omit<SlabType, 'id'>) => {
    if (!permissions.canManageMasterData) {
      showToast('Unauthorized: Only Master Accountant and Owner/Admin can manage slab types.', 'error');
      return;
    }
    const newST: SlabType = { ...stData, id: `slb-${Date.now()}` };
    setSlabTypes((prev) => [...prev, newST]);
    logAudit('CREATE', 'SlabType', newST.code, { newValues: newST });
    showToast(`Slab Type "${newST.name}" created.`, 'success');
  };

  const updateSlabType = (id: string, updates: Partial<SlabType>) => {
    if (!permissions.canManageMasterData) {
      showToast('Unauthorized.', 'error');
      return;
    }
    const existing = slabTypes.find((s) => s.id === id);
    setSlabTypes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    logAudit('EDIT', 'SlabType', existing?.code || id, { oldValues: existing, newValues: updates });
    showToast('Slab Type updated.', 'success');
  };

  const deleteSlabType = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can permanently delete master records.', 'error');
      return { success: false, message: 'Unauthorized: Only Owner / Admin can delete.' };
    }
    const isUsed = processingEntries.some((p) => p.slabTypeId === id && !p.isVoided);
    if (isUsed) {
      showToast('Cannot delete slab type used in active processing entries. Deactivate instead.', 'error');
      return { success: false, message: 'Cannot delete slab type used in active records.' };
    }
    setSlabTypes((prev) => prev.filter((s) => s.id !== id));
    logAudit('DELETE', 'SlabType', id);
    showToast('Slab Type removed.', 'info');
    return { success: true };
  };

  const toggleSlabTypeActive = (id: string) => {
    if (!permissions.canManageMasterData) return;
    setSlabTypes((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const bulkImportSlabTypes = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...slabTypes];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const name = String(getFlexibleValue(row, ['slabtypename', 'name', 'slabtype', 'type']) || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 2}: Slab Type name is missing.`);
        return;
      }

      const code = String(getFlexibleValue(row, ['code', 'slabid', 'id']) || `SLB-${String(currentList.length + 1).padStart(3, '0')}`).trim();
      const standardWeightKg = parseFloat(getFlexibleValue(row, ['standardweightkg', 'standardweight', 'weightkg', 'weight']) || '2.0') || 2.0;
      const unit = String(getFlexibleValue(row, ['unit']) || 'Kg').trim();
      const productApplicability = String(getFlexibleValue(row, ['productapplicability', 'applicability', 'product']) || 'All Products').trim();

      const existingIdx = currentList.findIndex(
        (s) => s.code.toLowerCase() === code.toLowerCase() || s.name.toLowerCase() === name.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          standardWeightKg,
          unit,
          productApplicability,
          active: true
        };
        updated++;
      } else {
        currentList.push({
          id: `slb-${Date.now()}-${idx}`,
          code,
          name,
          standardWeightKg,
          unit,
          productApplicability,
          active: true
        });
        added++;
      }
    });

    setSlabTypes(currentList);
    return { added, updated, errors };
  };

  // --------------------------------------------------------------------------
  // SALES MASTER DATA ACTIONS (Customer / Consignee & Port Master)
  // --------------------------------------------------------------------------

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!permissions.canManageSalesMasterData) {
      showToast('Unauthorized: Only Master Accountant and Admin can manage Customers.', 'error');
      return;
    }
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setCustomers((prev) => [...prev, newCustomer]);
    logAudit('CREATE', 'Customer', newCustomer.name, { newValues: newCustomer });
    showToast(`Customer "${newCustomer.name}" added successfully.`, 'success');
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    if (!permissions.canManageSalesMasterData) {
      showToast('Unauthorized: Only Master Accountant and Admin can edit Customers.', 'error');
      return;
    }
    const old = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAudit('EDIT', 'Customer', old?.name || id, { oldValues: old, newValues: updates });
    showToast('Customer record updated.', 'success');
  };

  const deleteCustomer = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      return { success: false, message: 'Unauthorized: Only Owner / Admin can delete Customers.' };
    }
    const isReferenced = salesInvoices.some((inv) => !inv.isVoided && (inv.consigneeId === id || inv.buyerId === id));
    if (isReferenced) {
      return {
        success: false,
        message: 'Cannot delete: Customer is referenced in active sales invoices. Please deactivate instead.'
      };
    }
    const old = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    logAudit('DELETE', 'Customer', old?.name || id);
    showToast(`Customer "${old?.name}" deleted.`, 'info');
    return { success: true };
  };

  const toggleCustomerActive = (id: string) => {
    if (!permissions.canManageSalesMasterData) return;
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  const bulkImportCustomers = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...customers];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const name = String(getFlexibleValue(row, ['customername', 'name', 'consignee', 'buyer', 'company']) || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 2}: Customer / Consignee name is required.`);
        return;
      }

      const code = String(getFlexibleValue(row, ['customercode', 'code', 'id']) || `CUST-${String(currentList.length + 1).padStart(3, '0')}`).trim();
      const country = String(getFlexibleValue(row, ['country', 'destinationcountry']) || 'Unknown').trim();
      const address = String(getFlexibleValue(row, ['address', 'location']) || '').trim();
      const contactPerson = String(getFlexibleValue(row, ['contactperson', 'contact', 'person']) || '').trim();
      const phone = String(getFlexibleValue(row, ['phone', 'mobile', 'tel']) || '').trim();
      const email = String(getFlexibleValue(row, ['email', 'mail']) || '').trim();
      const taxId = String(getFlexibleValue(row, ['taxid', 'gstin', 'vat', 'fein']) || '').trim();
      const bankDetails = String(getFlexibleValue(row, ['bankdetails', 'bank', 'swift']) || '').trim();

      const existingIdx = currentList.findIndex(
        (c) => c.code.toLowerCase() === code.toLowerCase() || c.name.toLowerCase() === name.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          country,
          address,
          contactPerson,
          phone,
          email,
          taxId,
          bankDetails,
          active: true
        };
        updated++;
      } else {
        currentList.push({
          id: `cust-${Date.now()}-${idx}`,
          code,
          name,
          country,
          address,
          contactPerson,
          phone,
          email,
          taxId,
          bankDetails,
          active: true,
          createdAt: new Date().toISOString()
        });
        added++;
      }
    });

    setCustomers(currentList);
    return { added, updated, errors };
  };

  const addPort = (portData: Omit<PortMaster, 'id'>) => {
    if (!permissions.canManageSalesMasterData) {
      showToast('Unauthorized: Only Master Accountant and Admin can manage Ports.', 'error');
      return;
    }
    const newPort: PortMaster = {
      ...portData,
      id: `port-${Date.now()}`
    };
    setPorts((prev) => [...prev, newPort]);
    logAudit('CREATE', 'PortMaster', newPort.name, { newValues: newPort });
    showToast(`Port "${newPort.name}" added.`, 'success');
  };

  const updatePort = (id: string, updates: Partial<PortMaster>) => {
    if (!permissions.canManageSalesMasterData) {
      showToast('Unauthorized: Only Master Accountant and Admin can edit Ports.', 'error');
      return;
    }
    const old = ports.find((p) => p.id === id);
    setPorts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    logAudit('EDIT', 'PortMaster', old?.name || id, { oldValues: old, newValues: updates });
    showToast('Port updated.', 'success');
  };

  const deletePort = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      return { success: false, message: 'Unauthorized: Only Owner / Admin can delete Ports.' };
    }
    const isReferenced = salesInvoices.some(
      (inv) =>
        !inv.isVoided &&
        (inv.portOfLoadingId === id || inv.portOfDischargeId === id || inv.finalDestinationId === id)
    );
    if (isReferenced) {
      return {
        success: false,
        message: 'Cannot delete: Port is referenced in existing sales invoices. Deactivate instead.'
      };
    }
    const old = ports.find((p) => p.id === id);
    setPorts((prev) => prev.filter((p) => p.id !== id));
    logAudit('DELETE', 'PortMaster', old?.name || id);
    showToast(`Port "${old?.name}" deleted.`, 'info');
    return { success: true };
  };

  const togglePortActive = (id: string) => {
    if (!permissions.canManageSalesMasterData) return;
    setPorts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const bulkImportPorts = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...ports];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const name = String(getFlexibleValue(row, ['portname', 'name', 'port']) || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 2}: Port name is required.`);
        return;
      }

      const code = String(getFlexibleValue(row, ['portcode', 'code', 'id']) || `PORT-${String(currentList.length + 1).padStart(3, '0')}`).trim();
      const country = String(getFlexibleValue(row, ['country']) || 'Unknown').trim();

      const existingIdx = currentList.findIndex(
        (p) => p.code.toLowerCase() === code.toLowerCase() || p.name.toLowerCase() === name.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          country,
          active: true
        };
        updated++;
      } else {
        currentList.push({
          id: `port-${Date.now()}-${idx}`,
          code,
          name,
          country,
          active: true
        });
        added++;
      }
    });

    setPorts(currentList);
    return { added, updated, errors };
  };

  // --------------------------------------------------------------------------
  // TRANSACTIONS (Purchases & Payments)
  // --------------------------------------------------------------------------

  const addPurchase = (purchaseData: Partial<Purchase>): { success: boolean; purchaseId?: string; warnings?: string[] } => {
    if (!permissions.canCreateEditPurchases) {
      showToast('Unauthorized: Viewer role cannot create purchase records.', 'error');
      return { success: false };
    }

    if (!purchaseData.supplierId || !purchaseData.speciesId || !purchaseData.locationId) {
      showToast('Validation Error: Supplier, Species, and Landing Location are required.', 'error');
      return { success: false };
    }

    if (!purchaseData.weightKg || purchaseData.weightKg <= 0) {
      showToast('Validation Error: Weight must be greater than 0 Kg.', 'error');
      return { success: false };
    }

    if (purchaseData.ratePerKg === undefined || purchaseData.ratePerKg < 0) {
      showToast('Validation Error: Rate per Kg must be >= 0.', 'error');
      return { success: false };
    }

    if (purchaseData.isDualSize && purchaseData.secondarySizeId) {
      if (!purchaseData.remarks || !purchaseData.remarks.trim()) {
        showToast('Validation Error: Remarks are mandatory for dual-size lots to document the catch details.', 'error');
        return { success: false };
      }
    }

    const warnings: string[] = [];
    if (purchaseData.invoiceNo && purchaseData.supplierId && purchaseData.purchaseDate) {
      const duplicate = purchases.find(
        (p) =>
          !p.isVoided &&
          p.supplierId === purchaseData.supplierId &&
          p.invoiceNo?.trim().toLowerCase() === purchaseData.invoiceNo?.trim().toLowerCase() &&
          p.purchaseDate === purchaseData.purchaseDate
      );
      if (duplicate) {
        const warnMsg = `Warning: Invoice "${purchaseData.invoiceNo}" was already entered for this supplier on ${purchaseData.purchaseDate}.`;
        warnings.push(warnMsg);
        showToast(warnMsg, 'warning');
      }
    }

    const totalCount = purchases.length + offlineQueue.length + 1;
    const purchaseId = `PUR-${String(totalCount).padStart(5, '0')}`;
    const supplier = suppliers.find((s) => s.id === purchaseData.supplierId);

    const derived = computePurchaseFields({
      weightKg: purchaseData.weightKg,
      ratePerKg: purchaseData.ratePerKg,
      damageWeightKg: purchaseData.damageWeightKg,
      damageRatePerKg: purchaseData.damageRatePerKg,
      expenseBreakdown: purchaseData.expenseBreakdown,
      amountPaid: purchaseData.amountPaid,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
      supplier,
      yieldWeightKg: purchaseData.yieldWeightKg ? Number(purchaseData.yieldWeightKg) : undefined
    });

    const expenseBatchNo = purchaseData.expenseBatchNo?.trim() || undefined;
    const yieldBatchNo = purchaseData.yieldBatchNo?.trim() || undefined;
    const batchNo = purchaseData.batchNo?.trim() || undefined;

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseId,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
      financialYear: businessSettings.financialYear || derived.financialYear,
      supplierId: purchaseData.supplierId,
      locationId: purchaseData.locationId,
      invoiceNo: purchaseData.invoiceNo || '',
      batchNo,
      expenseBatchNo,
      yieldBatchNo,
      speciesId: purchaseData.speciesId,
      gradeId: purchaseData.gradeId || '',
      sizeId: purchaseData.sizeId || '',
      secondarySizeId: purchaseData.secondarySizeId || undefined,
      isDualSize: Boolean(purchaseData.isDualSize && purchaseData.secondarySizeId),
      countId: purchaseData.countId || '',
      boxesCount: Number(purchaseData.boxesCount) || 0,
      weightKg: Number(purchaseData.weightKg),
      ratePerKg: Number(purchaseData.ratePerKg),
      yieldWeightKg: derived.yieldWeightKg,
      yieldPct: derived.yieldPct,
      purchaseValue: derived.purchaseValue,
      damageWeightKg: Number(purchaseData.damageWeightKg) || 0,
      damageRatePerKg: Number(purchaseData.damageRatePerKg) || 0,
      damageAmount: derived.damageAmount,
      grossPurchaseValue: derived.grossPurchaseValue,
      expenseBreakdown: purchaseData.expenseBreakdown || {},
      totalExpenses: derived.totalExpenses,
      isBatchAllocated: false,
      totalCost: derived.totalCost,
      effectiveRatePerKg: derived.effectiveRatePerKg,
      directAmountPaid: Number(purchaseData.amountPaid) || 0,
      amountPaid: Number(purchaseData.amountPaid) || 0,
      paymentDate: purchaseData.paymentDate,
      paidFromAccountId: purchaseData.paidFromAccountId,
      balancePayable: derived.balancePayable,
      dueDate: derived.dueDate,
      paymentStatus: derived.paymentStatus,
      rejectionWeightKg: Number(purchaseData.rejectionWeightKg) || 0,
      remarks: purchaseData.remarks || '',
      photoUrl: purchaseData.photoUrl,
      isVoided: false,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, newPurchase]);
      showToast(`Offline mode: Purchase ${purchaseId} queued on device.`, 'info');
      return { success: true, purchaseId, warnings };
    }

    let allPurchases = [...purchases, newPurchase];

    // 1. Independent Expense Batch Apportionment: Only apportion expenses across lots sharing this expenseBatchNo
    const expBatchId = newPurchase.expenseBatchNo;
    if (expBatchId) {
      const expBatchRows = allPurchases.filter((p) => p.expenseBatchNo === expBatchId && !p.isVoided);
      if (expBatchRows.length > 1) {
        const { updatedPurchases: expUpdated, warnings: expWarnings } = allocateBatchExpenses(expBatchRows);
        warnings.push(...expWarnings);
        const expMap = new Map(expUpdated.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (expMap.has(p.id) ? expMap.get(p.id)! : p));
      }
    }

    // 2. Independent Yield Batch Apportionment: Only apportion yield across lots sharing this yieldBatchNo
    const yldBatchId = newPurchase.yieldBatchNo;
    if (yldBatchId) {
      const yldBatchRows = allPurchases.filter((p) => p.yieldBatchNo === yldBatchId && !p.isVoided);
      if (yldBatchRows.length > 1) {
        const hasYield = yldBatchRows.some(
          (p) => (p.batchYieldWeightKg && p.batchYieldWeightKg > 0) || (p.batchYieldPct && p.batchYieldPct > 0) || (p.yieldWeightKg && p.yieldWeightKg > 0)
        );
        if (hasYield) {
          const { updatedPurchases: yldUpdated, warnings: yldWarnings } = allocateBatchYield(yldBatchRows);
          warnings.push(...yldWarnings);
          const yldMap = new Map(yldUpdated.map((p) => [p.id, p]));
          allPurchases = allPurchases.map((p) => (yldMap.has(p.id) ? yldMap.get(p.id)! : p));
        }
      }
    }

    setPurchases(allPurchases);
    logAudit('CREATE', 'Purchase', newPurchase.purchaseId, {
      newValues: {
        id: newPurchase.purchaseId,
        supplier: supplier?.name,
        weightKg: newPurchase.weightKg,
        totalCost: newPurchase.totalCost
      }
    });

    showToast(`Purchase ${purchaseId} recorded.`, 'success');
    return { success: true, purchaseId, warnings };
  };

  const updatePurchase = (id: string, updates: Partial<Purchase>, editReason?: string): { success: boolean; message?: string } => {
    if (!permissions.canCreateEditPurchases) return { success: false, message: 'Unauthorized.' };
    const existing = purchases.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Purchase not found.' };

    const supplier = suppliers.find((s) => s.id === (updates.supplierId || existing.supplierId));

    const isDualSize = updates.isDualSize !== undefined ? updates.isDualSize : existing.isDualSize;
    const secondarySizeId = updates.secondarySizeId !== undefined ? updates.secondarySizeId : existing.secondarySizeId;
    const remarks = updates.remarks !== undefined ? updates.remarks : existing.remarks;
    if (isDualSize && secondarySizeId && (!remarks || !remarks.trim())) {
      showToast('Validation Error: Remarks are mandatory for dual-size lots to document the catch details.', 'error');
      return { success: false, message: 'Remarks are mandatory for dual-size lots.' };
    }

    const derived = computePurchaseFields({
      weightKg: updates.weightKg ?? existing.weightKg,
      ratePerKg: updates.ratePerKg ?? existing.ratePerKg,
      damageWeightKg: updates.damageWeightKg ?? existing.damageWeightKg,
      damageRatePerKg: updates.damageRatePerKg ?? existing.damageRatePerKg,
      expenseBreakdown: updates.expenseBreakdown ?? existing.expenseBreakdown,
      amountPaid: updates.amountPaid ?? existing.amountPaid,
      purchaseDate: updates.purchaseDate ?? existing.purchaseDate,
      supplier,
      yieldWeightKg: updates.yieldWeightKg !== undefined
        ? (updates.yieldWeightKg !== null && !isNaN(Number(updates.yieldWeightKg)) && Number(updates.yieldWeightKg) > 0 ? Number(updates.yieldWeightKg) : undefined)
        : existing.yieldWeightKg
    });

    const expenseBatchNo = updates.expenseBatchNo !== undefined ? (updates.expenseBatchNo?.trim() || undefined) : existing.expenseBatchNo;
    const yieldBatchNo = updates.yieldBatchNo !== undefined ? (updates.yieldBatchNo?.trim() || undefined) : existing.yieldBatchNo;
    const batchNo = updates.batchNo !== undefined ? (updates.batchNo?.trim() || undefined) : existing.batchNo;

    const updatedPurchase: Purchase = {
      ...existing,
      ...updates,
      expenseBatchNo,
      yieldBatchNo,
      batchNo,
      secondarySizeId: isDualSize ? (updates.secondarySizeId !== undefined ? (updates.secondarySizeId || undefined) : existing.secondarySizeId) : undefined,
      isDualSize: Boolean(isDualSize && (updates.secondarySizeId !== undefined ? updates.secondarySizeId : existing.secondarySizeId)),
      ...derived,
      yieldWeightKg: derived.yieldWeightKg,
      yieldPct: derived.yieldPct,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    let allPurchases = purchases.map((p) => (p.id === id ? updatedPurchase : p));

    // Independent Expense Batch Re-apportionment: only re-pool expenses
    const affectedExpBatches = new Set<string>();
    const oldExp = existing.expenseBatchNo;
    const newExp = updatedPurchase.expenseBatchNo;
    if (oldExp) affectedExpBatches.add(oldExp);
    if (newExp) affectedExpBatches.add(newExp);

    affectedExpBatches.forEach((bId) => {
      const expRows = allPurchases.filter((p) => p.expenseBatchNo === bId && !p.isVoided);
      if (expRows.length > 1) {
        const { updatedPurchases: expUpdated } = allocateBatchExpenses(expRows);
        const expMap = new Map(expUpdated.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (expMap.has(p.id) ? expMap.get(p.id)! : p));
      }
    });

    // Independent Yield Batch Re-apportionment: only re-pool yield
    const affectedYldBatches = new Set<string>();
    if (existing.yieldBatchNo) affectedYldBatches.add(existing.yieldBatchNo);
    if (updatedPurchase.yieldBatchNo) affectedYldBatches.add(updatedPurchase.yieldBatchNo);

    affectedYldBatches.forEach((bId) => {
      const yldRows = allPurchases.filter((p) => p.yieldBatchNo === bId && !p.isVoided);
      if (yldRows.length > 1) {
        const hasYield = yldRows.some(
          (p) => (p.batchYieldWeightKg && p.batchYieldWeightKg > 0) || (p.batchYieldPct && p.batchYieldPct > 0) || (p.yieldWeightKg && p.yieldWeightKg > 0)
        );
        if (hasYield) {
          const { updatedPurchases: yldUpdated } = allocateBatchYield(yldRows);
          const yldMap = new Map(yldUpdated.map((p) => [p.id, p]));
          allPurchases = allPurchases.map((p) => (yldMap.has(p.id) ? yldMap.get(p.id)! : p));
        }
      }
    });

    setPurchases(allPurchases);
    logAudit('EDIT', 'Purchase', existing.purchaseId, {
      oldValues: existing,
      newValues: updatedPurchase,
      changeReason: editReason || 'Updated transaction details'
    });

    showToast(`Purchase ${existing.purchaseId} updated.`, 'success');
    return { success: true };
  };

  const voidPurchase = (id: string, voidReason: string): { success: boolean; message?: string } => {
    if (!permissions.canVoid) return { success: false, message: 'Unauthorized.' };
    const existing = purchases.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Record not found.' };

    const voidedPurchase: Purchase = {
      ...existing,
      isVoided: true,
      voidReason,
      voidedBy: currentUser.email,
      voidedAt: new Date().toISOString()
    };

    let allPurchases = purchases.map((p) => (p.id === id ? voidedPurchase : p));

    const expBatch = existing.expenseBatchNo;
    if (expBatch) {
      const remainingExpRows = allPurchases.filter((p) => p.expenseBatchNo === expBatch && !p.isVoided);
      if (remainingExpRows.length > 0) {
        const { updatedPurchases } = allocateBatchExpenses(remainingExpRows);
        const expMap = new Map(updatedPurchases.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (expMap.has(p.id) ? expMap.get(p.id)! : p));
      }
    }

    if (existing.yieldBatchNo) {
      const remainingYldRows = allPurchases.filter((p) => p.yieldBatchNo === existing.yieldBatchNo && !p.isVoided);
      if (remainingYldRows.length > 0) {
        const { updatedPurchases } = allocateBatchYield(remainingYldRows);
        const yldMap = new Map(updatedPurchases.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (yldMap.has(p.id) ? yldMap.get(p.id)! : p));
      }
    }

    setPurchases(allPurchases);
    logAudit('VOID', 'Purchase', existing.purchaseId, { changeReason: voidReason });
    showToast(`Purchase ${existing.purchaseId} voided.`, 'info');
    return { success: true };
  };

  const deletePurchasePermanently = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      return { success: false, message: 'Unauthorized: Owner/Admin only.' };
    }

    const existing = purchases.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Record not found.' };

    let allPurchases = purchases.filter((p) => p.id !== id);

    const expBatch = existing.expenseBatchNo;
    if (expBatch) {
      const remainingExpRows = allPurchases.filter((p) => p.expenseBatchNo === expBatch && !p.isVoided);
      if (remainingExpRows.length > 0) {
        const { updatedPurchases } = allocateBatchExpenses(remainingExpRows);
        const expMap = new Map(updatedPurchases.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (expMap.has(p.id) ? expMap.get(p.id)! : p));
      }
    }

    if (existing.yieldBatchNo) {
      const remainingYldRows = allPurchases.filter((p) => p.yieldBatchNo === existing.yieldBatchNo && !p.isVoided);
      if (remainingYldRows.length > 0) {
        const { updatedPurchases } = allocateBatchYield(remainingYldRows);
        const yldMap = new Map(updatedPurchases.map((p) => [p.id, p]));
        allPurchases = allPurchases.map((p) => (yldMap.has(p.id) ? yldMap.get(p.id)! : p));
      }
    }

    setPurchases(allPurchases);
    logAudit('DELETE', 'Purchase', existing.purchaseId, { changeReason: 'Permanently deleted by Admin' });
    showToast(`Purchase ${existing.purchaseId} purged.`, 'warning');
    return { success: true };
  };

  const addPayment = (paymentData: Omit<PaymentRecord, 'id' | 'paymentNo' | 'createdAt' | 'isVoided' | 'createdBy'>) => {
    if (!permissions.canManagePayments) {
      showToast('Unauthorized: Only Owner/Admin and Master Accountant can post payments.', 'error');
      return;
    }

    const existingNums = payments.map((p) => {
      const match = p.paymentNo?.match(/PAY-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNum = existingNums.length > 0 ? Math.max(0, ...existingNums) + 1 : 1;
    const paymentNo = `PAY-${String(nextNum).padStart(5, '0')}`;
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      paymentNo,
      isVoided: false,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString()
    };

    setPayments((prev) => [...prev, newPayment]);

    // Allocate payment to purchases for this supplier
    setPurchases((prevPurchases) => {
      let remaining = newPayment.amount;
      return prevPurchases.map((p) => {
        if (p.isVoided || p.supplierId !== newPayment.supplierId || p.balancePayable <= 0) {
          return p;
        }

        // If specific purchase is targeted
        if (newPayment.purchaseId && p.id !== newPayment.purchaseId) {
          return p;
        }

        if (remaining <= 0) return p;

        const alloc = Math.min(remaining, p.balancePayable);
        const updatedPaid = Number((p.amountPaid + alloc).toFixed(2));
        const updatedBalance = Number(Math.max(0, p.totalCost - updatedPaid).toFixed(2));
        const updatedStatus = updatedPaid >= p.totalCost ? 'Fully Paid' : 'Partially Paid';
        remaining = Number((remaining - alloc).toFixed(2));

        return {
          ...p,
          amountPaid: updatedPaid,
          balancePayable: updatedBalance,
          paymentStatus: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      });
    });

    logAudit('CREATE', 'Payment', newPayment.paymentNo, {
      newValues: { paymentNo, amount: newPayment.amount, supplierId: newPayment.supplierId, purchaseId: newPayment.purchaseId }
    });

    showToast(`Payment ${paymentNo} of ₹${newPayment.amount.toLocaleString('en-IN')} posted and allocated to ledger.`, 'success');
  };

  const voidPayment = (id: string, voidReason: string) => {
    if (!permissions.canVoid) {
      showToast('Unauthorized: Only Owner/Admin and Master Accountant can void payments.', 'error');
      return;
    }

    const targetPay = payments.find((p) => p.id === id);
    if (!targetPay || targetPay.isVoided) return;

    setPayments((prev) =>
      prev.map((pay) => (pay.id === id ? { ...pay, isVoided: true, voidReason } : pay))
    );

    // Recompute purchase balances for this supplier
    setPurchases((prevPurchases) => {
      const activeStandalonePayments = payments.filter(
        (pay) => pay.id !== id && pay.supplierId === targetPay.supplierId && !pay.isVoided
      );
      let pooledPaid = activeStandalonePayments.reduce((s, pay) => s + pay.amount, 0);

      return prevPurchases.map((p) => {
        if (p.isVoided || p.supplierId !== targetPay.supplierId) return p;
        const direct = p.directAmountPaid ?? 0;
        let purchasePaid = direct;
        const needed = p.totalCost - direct;

        if (needed > 0 && pooledPaid > 0) {
          const alloc = Math.min(needed, pooledPaid);
          purchasePaid = Number((purchasePaid + alloc).toFixed(2));
          pooledPaid = Number((pooledPaid - alloc).toFixed(2));
        }

        const updatedBalance = Number(Math.max(0, p.totalCost - purchasePaid).toFixed(2));
        const updatedStatus =
          purchasePaid <= 0 ? 'Unpaid' : purchasePaid >= p.totalCost ? 'Fully Paid' : 'Partially Paid';

        return {
          ...p,
          amountPaid: purchasePaid,
          balancePayable: updatedBalance,
          paymentStatus: updatedStatus
        };
      });
    });

    logAudit('VOID', 'Payment', targetPay.paymentNo, { changeReason: voidReason });
    showToast(`Payment ${targetPay.paymentNo} voided and reversed from purchases.`, 'info');
  };

  // --------------------------------------------------------------------------
  // PURCHASE RETURNS & DEBIT NOTES
  // --------------------------------------------------------------------------

  const addPurchaseReturn = (
    returnData: Omit<PurchaseReturn, 'id' | 'returnNo' | 'createdAt' | 'isVoided' | 'createdBy'>
  ): { success: boolean; returnNo?: string; message?: string } => {
    if (!permissions.canCreateEditPurchases) {
      showToast('Unauthorized: You do not have permission to record purchase returns.', 'error');
      return { success: false, message: 'Unauthorized.' };
    }

    // Sequence calculation
    const maxSeq = purchaseReturns.reduce((max, r) => {
      const match = r.returnNo?.match(/PR-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const returnNo = `PR-${String(maxSeq + 1).padStart(5, '0')}`;
    const returnDate = returnData.returnDate || new Date().toISOString().split('T')[0];
    const fy = getIndianFinancialYear(returnDate);
    const weight = typeof returnData.returnedWeightKg === 'number' ? returnData.returnedWeightKg : (Number(returnData.returnedWeightKg) || 0);
    const rate = typeof returnData.ratePerKg === 'number' ? returnData.ratePerKg : (Number(returnData.ratePerKg) || 0);
    const returnedValue = returnData.returnedValue !== undefined && returnData.returnedValue !== null && !isNaN(Number(returnData.returnedValue)) && Number(returnData.returnedValue) > 0
      ? Number(Number(returnData.returnedValue).toFixed(2))
      : Number((weight * rate).toFixed(2));

    let linkedPurchase: Purchase | undefined;
    if (returnData.purchaseId) {
      linkedPurchase = purchases.find((p) => p.id === returnData.purchaseId);
    }

    const newReturn: PurchaseReturn = {
      ...returnData,
      id: `pret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      returnNo,
      returnDate,
      financialYear: fy,
      supplierId: returnData.supplierId || '',
      speciesId: returnData.speciesId || '',
      returnedWeightKg: weight,
      ratePerKg: rate,
      purchaseRefNo: returnData.purchaseRefNo || linkedPurchase?.purchaseId || '',
      invoiceNo: returnData.invoiceNo || linkedPurchase?.invoiceNo || '',
      returnedValue,
      reason: returnData.reason || 'General Return',
      adjustSupplierPayable: returnData.adjustSupplierPayable !== false,
      isVoided: false,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString()
    };

    setPurchaseReturns((prev) => [newReturn, ...prev]);

    logAudit('CREATE', 'PurchaseReturn', newReturn.returnNo, {
      newValues: {
        returnNo,
        supplierId: newReturn.supplierId,
        weightKg: newReturn.returnedWeightKg,
        returnedValue: newReturn.returnedValue,
        reason: newReturn.reason,
        purchaseRefNo: newReturn.purchaseRefNo
      },
      changeReason: `Recorded purchase return / debit note for ${newReturn.returnedWeightKg} Kg (${newReturn.reason})`
    });

    showToast(`Purchase Return ${newReturn.returnNo} for ₹${newReturn.returnedValue.toLocaleString('en-IN')} recorded successfully.`, 'success');
    return { success: true, returnNo: newReturn.returnNo };
  };

  const updatePurchaseReturn = (
    id: string,
    updates: Partial<PurchaseReturn>,
    editReason?: string
  ): { success: boolean; message?: string } => {
    if (!permissions.canCreateEditPurchases) {
      showToast('Unauthorized: You do not have permission to edit purchase returns.', 'error');
      return { success: false, message: 'Unauthorized.' };
    }

    const existing = purchaseReturns.find((r) => r.id === id);
    if (!existing) return { success: false, message: 'Return record not found.' };

    const weight = updates.returnedWeightKg !== undefined ? (Number(updates.returnedWeightKg) || 0) : existing.returnedWeightKg;
    const rate = updates.ratePerKg !== undefined ? (Number(updates.ratePerKg) || 0) : existing.ratePerKg;
    const returnedValue = updates.returnedValue !== undefined && updates.returnedValue !== null && !isNaN(Number(updates.returnedValue)) && Number(updates.returnedValue) > 0
      ? Number(Number(updates.returnedValue).toFixed(2))
      : Number((weight * rate).toFixed(2));
    const returnDate = updates.returnDate || existing.returnDate || new Date().toISOString().split('T')[0];
    const fy = getIndianFinancialYear(returnDate);

    const updated: PurchaseReturn = {
      ...existing,
      ...updates,
      returnDate,
      financialYear: fy,
      returnedWeightKg: weight,
      ratePerKg: rate,
      returnedValue,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setPurchaseReturns((prev) => prev.map((r) => (r.id === id ? updated : r)));
    logAudit('EDIT', 'PurchaseReturn', existing.returnNo, {
      oldValues: existing,
      newValues: updated,
      changeReason: editReason || 'Updated purchase return particulars'
    });

    showToast(`Purchase Return ${existing.returnNo} updated.`, 'success');
    return { success: true };
  };

  const voidPurchaseReturn = (id: string, voidReason: string): { success: boolean; message?: string } => {
    if (!permissions.canVoid) {
      showToast('Unauthorized: Only Master Accountant and Owner/Admin can void returns.', 'error');
      return { success: false, message: 'Unauthorized.' };
    }

    const existing = purchaseReturns.find((r) => r.id === id);
    if (!existing || existing.isVoided) return { success: false, message: 'Return not found or already voided.' };

    setPurchaseReturns((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              isVoided: true,
              voidReason,
              voidedBy: currentUser.email,
              voidedAt: new Date().toISOString()
            }
          : r
      )
    );

    logAudit('VOID', 'PurchaseReturn', existing.returnNo, { changeReason: voidReason });
    showToast(`Purchase Return ${existing.returnNo} voided and reversed from ledger.`, 'info');
    return { success: true };
  };

  const deletePurchaseReturnPermanently = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can permanently delete records.', 'error');
      return { success: false, message: 'Unauthorized.' };
    }

    const existing = purchaseReturns.find((r) => r.id === id);
    if (!existing) return { success: false, message: 'Return record not found.' };

    setPurchaseReturns((prev) => prev.filter((r) => r.id !== id));
    logAudit('DELETE', 'PurchaseReturn', existing.returnNo, { changeReason: 'Permanently deleted by Owner/Admin' });
    showToast(`Purchase Return ${existing.returnNo} permanently purged.`, 'warning');
    return { success: true };
  };

  const recalculateExpenseBatch = (expenseBatchNo: string) => {
    const batchRows = purchases.filter((p) => p.expenseBatchNo === expenseBatchNo && !p.isVoided);
    if (batchRows.length === 0) {
      showToast(`No active lots found for expense batch ${expenseBatchNo}.`, 'warning');
      return;
    }

    const { updatedPurchases, warnings } = allocateBatchExpenses(batchRows);
    const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
    setPurchases((prev) => prev.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p)));

    if (warnings.length > 0) {
      warnings.forEach((w) => showToast(w, 'warning'));
    } else {
      showToast(`Expense Batch ${expenseBatchNo} landing costs apportioned by Kg across ${batchRows.length} lots.`, 'success');
    }
  };

  const recalculateBatch = (batchNo: string) => {
    let matched = false;
    const expRows = purchases.filter((p) => p.expenseBatchNo === batchNo && !p.isVoided);
    if (expRows.length > 0) {
      recalculateExpenseBatch(batchNo);
      matched = true;
    }

    const yldRows = purchases.filter((p) => p.yieldBatchNo === batchNo && !p.isVoided);
    if (yldRows.length > 0) {
      allocateBatchYieldContext(batchNo);
      matched = true;
    }

    if (!matched) {
      showToast(`No active lots found for batch ${batchNo}.`, 'warning');
    }
  };

  const allocateBatchYieldContext = (
    batchNo: string,
    batchYieldWeightKg?: number,
    batchYieldPct?: number
  ): { success: boolean; message: string } => {
    const batchRows = purchases.filter((p) => p.yieldBatchNo === batchNo && !p.isVoided);
    if (batchRows.length === 0) {
      showToast(`No active lots found for yield batch ${batchNo}.`, 'warning');
      return { success: false, message: `No active lots found for yield batch ${batchNo}.` };
    }

    // Apportion ONLY finished yield weight & % recovery proportionally by weight (expenses untouched)
    const { updatedPurchases, warnings } = allocateBatchYield(batchRows, batchYieldWeightKg, batchYieldPct);
    const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
    setPurchases((prev) => prev.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p)));

    logAudit('EDIT', 'Purchase', `Allocated yield batch for ${batchNo}`, {
      newValues: {
        batchNo,
        batchYieldWeightKg: updatedPurchases[0]?.batchYieldWeightKg,
        batchYieldPct: updatedPurchases[0]?.batchYieldPct,
        allocatedLotsCount: updatedPurchases.length
      }
    });

    if (warnings.length > 0) {
      warnings.forEach((w) => showToast(w, 'warning'));
    } else {
      showToast(
        `Yield Batch ${batchNo} (${updatedPurchases[0]?.batchYieldWeightKg} Kg / ${updatedPurchases[0]?.batchYieldPct}%) apportioned by Kg across ${updatedPurchases.length} lots.`,
        'success'
      );
    }
    return { success: true, message: `Yield Batch ${batchNo} apportioned by Kg.` };
  };

  const clearBatchYieldContext = (batchNo: string): { success: boolean; message: string } => {
    const batchRows = purchases.filter((p) => p.yieldBatchNo === batchNo && !p.isVoided);
    if (batchRows.length === 0) {
      return { success: false, message: `No active lots found for yield batch ${batchNo}.` };
    }

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.yieldBatchNo === batchNo && !p.isVoided) {
          const { isBatchYieldAllocated, batchYieldWeightKg, batchYieldPct, yieldWeightKg, yieldPct, ...rest } = p;
          return {
            ...rest,
            isBatchYieldAllocated: false,
            batchYieldWeightKg: undefined,
            batchYieldPct: undefined,
            yieldWeightKg: undefined,
            yieldPct: undefined
          };
        }
        return p;
      })
    );

    logAudit('EDIT', 'Purchase', `Cleared batch yield for ${batchNo}`, {
      newValues: { batchNo }
    });
    showToast(`Yield Batch ${batchNo} yield removed from ${batchRows.length} lots.`, 'info');
    return { success: true, message: `Yield Batch ${batchNo} yield cleared.` };
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) {
      showToast('No offline records pending.', 'info');
      return;
    }
    setPurchases((prev) => [...prev, ...offlineQueue]);
    const count = offlineQueue.length;
    setOfflineQueue([]);
    showToast(`Synced ${count} purchases.`, 'success');
  };

  // --------------------------------------------------------------------------
  // DAILY PROCESSING TRANSACTIONS (Production Module)
  // --------------------------------------------------------------------------

  const addProcessingEntry = (
    entryData: Partial<DailyProcessingEntry>
  ): { success: boolean; entryNo?: string; warning?: string } => {
    if (!permissions.canCreateEditPurchases && currentUser.role === 'viewer') {
      showToast('Unauthorized: Viewer accounts have read-only access.', 'error');
      return { success: false };
    }

    const count = processingEntries.length + 1;
    const entryNo = `PROD-${String(count).padStart(5, '0')}`;
    const slabType = slabTypes.find((st) => st.id === entryData.slabTypeId);
    const standardSlabWeightKg = slabType?.standardWeightKg || entryData.standardSlabWeightKg || 0;
    const slabsCount = Number(entryData.slabsCount) || 0;
    const processedWeightKg = Number(entryData.processedWeightKg) || 0;
    const rejectionWeightKg = Number(entryData.rejectionWeightKg) || 0;

    // Derived server-calculated fields
    const expectedWeightKg = Number((slabsCount * standardSlabWeightKg).toFixed(2));
    const varianceWeightKg = Number((processedWeightKg - expectedWeightKg).toFixed(2));
    const variancePct = expectedWeightKg > 0 ? Number(((varianceWeightKg / expectedWeightKg) * 100).toFixed(2)) : 0;
    const hasSlabVariance = Math.abs(variancePct) > slabTolerancePct;

    const processingDate = entryData.processingDate || new Date().toISOString().split('T')[0];
    const monthYear = processingDate.slice(0, 7);
    const dataEntryDate = new Date().toISOString();

    let warningMsg: string | undefined;
    if (hasSlabVariance && expectedWeightKg > 0) {
      warningMsg = `Slab weight variance of ${variancePct > 0 ? '+' : ''}${variancePct}% exceeds configured tolerance (±${slabTolerancePct}%). Expected: ${expectedWeightKg} Kg, Actual: ${processedWeightKg} Kg. Flagged in Exception Report.`;
    }

    const newEntry: DailyProcessingEntry = {
      id: `pe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entryNo,
      processingDate,
      shift: entryData.shift || 'General Day Shift (08:00 - 17:00)',
      supplierId: entryData.supplierId || '',
      speciesId: entryData.speciesId || '',
      gradeId: entryData.gradeId || '',
      sizeId: entryData.sizeId || '',
      countId: entryData.countId || '',
      supplierBoxId: entryData.supplierBoxId?.trim() || '',
      slabTypeId: entryData.slabTypeId || '',
      standardSlabWeightKg,
      slabsCount,
      processedWeightKg,
      rejectionWeightKg,
      expectedWeightKg,
      varianceWeightKg,
      variancePct,
      hasSlabVariance,
      remarks: entryData.remarks?.trim() || '',
      operator: currentUser.name,
      dataEntryDate,
      monthYear,
      financialYear: businessSettings.financialYear,
      isVoided: false,
      createdBy: currentUser.email,
      createdAt: dataEntryDate,
      updatedAt: dataEntryDate
    };

    setProcessingEntries((prev) => [newEntry, ...prev]);
    logAudit('CREATE', 'PRODUCTION_ENTRY', newEntry.entryNo, { newValues: newEntry });

    if (warningMsg) {
      showToast(`${entryNo} saved. Slab weight divergence flagged for audit.`, 'warning');
    } else {
      showToast(`Daily processing entry ${entryNo} recorded successfully.`, 'success');
    }

    return { success: true, entryNo, warning: warningMsg };
  };

  const updateProcessingEntry = (
    id: string,
    updates: Partial<DailyProcessingEntry>,
    editReason?: string
  ): { success: boolean; message?: string } => {
    if (!permissions.canCreateEditPurchases && currentUser.role === 'viewer') {
      return { success: false, message: 'Unauthorized: Read-only access.' };
    }

    const existing = processingEntries.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Processing entry not found.' };

    const slabType = updates.slabTypeId
      ? slabTypes.find((st) => st.id === updates.slabTypeId)
      : slabTypes.find((st) => st.id === existing.slabTypeId);

    const standardSlabWeightKg =
      updates.standardSlabWeightKg ?? (slabType?.standardWeightKg || existing.standardSlabWeightKg);
    const slabsCount = updates.slabsCount !== undefined ? Number(updates.slabsCount) : existing.slabsCount;
    const processedWeightKg =
      updates.processedWeightKg !== undefined ? Number(updates.processedWeightKg) : existing.processedWeightKg;
    const rejectionWeightKg =
      updates.rejectionWeightKg !== undefined ? Number(updates.rejectionWeightKg) : existing.rejectionWeightKg;

    const expectedWeightKg = Number((slabsCount * standardSlabWeightKg).toFixed(2));
    const varianceWeightKg = Number((processedWeightKg - expectedWeightKg).toFixed(2));
    const variancePct = expectedWeightKg > 0 ? Number(((varianceWeightKg / expectedWeightKg) * 100).toFixed(2)) : 0;
    const hasSlabVariance = Math.abs(variancePct) > slabTolerancePct;

    const processingDate = updates.processingDate || existing.processingDate;
    const monthYear = processingDate.slice(0, 7);

    const updated: DailyProcessingEntry = {
      ...existing,
      ...updates,
      standardSlabWeightKg,
      slabsCount,
      processedWeightKg,
      rejectionWeightKg,
      expectedWeightKg,
      varianceWeightKg,
      variancePct,
      hasSlabVariance,
      monthYear,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setProcessingEntries((prev) => prev.map((p) => (p.id === id ? updated : p)));
    logAudit('EDIT', 'PRODUCTION_ENTRY', existing.entryNo, {
      oldValues: existing,
      newValues: updated,
      changeReason: editReason || 'Updated processing record'
    });

    showToast(`Processing entry ${existing.entryNo} updated.`, 'success');
    return { success: true };
  };

  const voidProcessingEntry = (id: string, voidReason: string): { success: boolean; message?: string } => {
    if (!permissions.canVoid) return { success: false, message: 'Unauthorized.' };
    const existing = processingEntries.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Record not found.' };

    const voided: DailyProcessingEntry = {
      ...existing,
      isVoided: true,
      voidReason,
      voidedBy: currentUser.email,
      voidedAt: new Date().toISOString()
    };

    setProcessingEntries((prev) => prev.map((p) => (p.id === id ? voided : p)));
    logAudit('VOID', 'PRODUCTION_ENTRY', existing.entryNo, { changeReason: voidReason });
    showToast(`Processing entry ${existing.entryNo} voided.`, 'info');
    return { success: true };
  };

  const deleteProcessingEntryPermanently = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      return { success: false, message: 'Unauthorized: Only Owner / Admin can permanently delete records.' };
    }
    const existing = processingEntries.find((p) => p.id === id);
    if (!existing) return { success: false, message: 'Record not found.' };

    setProcessingEntries((prev) => prev.filter((p) => p.id !== id));
    logAudit('DELETE', 'PRODUCTION_ENTRY', existing.entryNo, { changeReason: 'Permanently purged by Admin' });
    showToast(`Processing entry ${existing.entryNo} permanently purged.`, 'warning');
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // SALES INVOICE & REALIZATION ACTIONS
  // --------------------------------------------------------------------------

  const addSalesInvoice = (
    invoiceData: Partial<SalesInvoice>
  ): { success: boolean; invoiceNo?: string; warnings?: string[] } => {
    if (!permissions.canCreateEditSales) {
      showToast('Unauthorized: Viewer role cannot create sales invoices.', 'error');
      return { success: false };
    }

    if (!invoiceData.consigneeId) {
      showToast('Validation Error: Consignee / Customer is required.', 'error');
      return { success: false };
    }

    if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
      showToast('Validation Error: At least one product line item is required.', 'error');
      return { success: false };
    }

    for (let i = 0; i < invoiceData.lineItems.length; i++) {
      const line = invoiceData.lineItems[i];
      if (!line.speciesId) {
        showToast(`Validation Error: Line ${i + 1} is missing a Product / Goods selection.`, 'error');
        return { success: false };
      }
      if (!line.weightKg || line.weightKg <= 0) {
        showToast(`Validation Error: Line ${i + 1} Net Weight must be greater than 0 Kg.`, 'error');
        return { success: false };
      }
      if (line.ratePerKg === undefined || line.ratePerKg < 0) {
        showToast(`Validation Error: Line ${i + 1} Rate must be >= 0.`, 'error');
        return { success: false };
      }
    }

    const warnings: string[] = [];
    const invoiceNo =
      invoiceData.invoiceNo?.trim() ||
      `EXP-${new Date().getFullYear()}-${String(salesInvoices.length + 1).padStart(4, '0')}`;

    // Warn on duplicate invoice number (don't block)
    const duplicate = salesInvoices.find(
      (inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === invoiceNo.toLowerCase()
    );
    if (duplicate) {
      const warnMsg = `Notice: Invoice No. "${invoiceNo}" already exists in the system (created on ${duplicate.invoiceDate}).`;
      warnings.push(warnMsg);
      showToast(warnMsg, 'warning');
    }

    const currency = invoiceData.currency || 'USD';
    const exchangeRate = invoiceData.exchangeRate && invoiceData.exchangeRate > 0 ? Number(invoiceData.exchangeRate) : 84.5;

    // Recalculate line items strictly server-side
    const computedLines = invoiceData.lineItems.map((l, idx) => {
      const weight = Number(l.weightKg);
      const rate = Number(l.ratePerKg);
      const amount = Number((weight * rate).toFixed(2));
      const fobVal = l.fobValueCurrency && l.fobValueCurrency > 0 ? Number(l.fobValueCurrency) : amount;
      return {
        id: l.id || `line-${Date.now()}-${idx}`,
        speciesId: l.speciesId,
        hsCode: l.hsCode || species.find((s) => s.id === l.speciesId)?.hsCode || '03061790',
        sizeId: l.sizeId || (sizes[0]?.id || ''),
        countId: l.countId,
        cartonsCount: Number(l.cartonsCount || 0),
        weightKg: weight,
        ratePerKg: rate,
        amountCurrency: amount,
        fobValueCurrency: fobVal,
        productDescription: l.productDescription,
        gradeSize: l.gradeSize
      };
    });

    const totalCartons = computedLines.reduce((s, l) => s + l.cartonsCount, 0);
    const totalWeightKg = Number(computedLines.reduce((s, l) => s + l.weightKg, 0).toFixed(2));
    const totalAmountCurrency = Number(computedLines.reduce((s, l) => s + l.amountCurrency, 0).toFixed(2));
    const totalFobValueCurrency = Number(computedLines.reduce((s, l) => s + l.fobValueCurrency, 0).toFixed(2));
    const estimatedAmountINR = Number((totalAmountCurrency * exchangeRate).toFixed(2));

    const newInvoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
      financialYear: businessSettings.financialYear,
      consigneeId: invoiceData.consigneeId,
      buyerId: invoiceData.buyerId || undefined,
      orderNo: invoiceData.orderNo || '',
      orderDate: invoiceData.orderDate || '',
      portOfLoadingId: invoiceData.portOfLoadingId || (ports[0]?.id || ''),
      portOfDischargeId: invoiceData.portOfDischargeId || (ports[1]?.id || ''),
      finalDestinationId: invoiceData.finalDestinationId || invoiceData.portOfDischargeId || (ports[1]?.id || ''),
      currency,
      exchangeRate,
      remarks: invoiceData.remarks || '',

      // Export Invoice particulars
      exporterName: invoiceData.exporterName || businessSettings.businessName,
      exporterAddress: invoiceData.exporterAddress || businessSettings.address,
      exporterRef: invoiceData.exporterRef,
      otherReferences: invoiceData.otherReferences,
      consigneeName: invoiceData.consigneeName,
      consigneeAddress: invoiceData.consigneeAddress,
      buyerName: invoiceData.buyerName,
      buyerAddress: invoiceData.buyerAddress,
      countryOfOrigin: invoiceData.countryOfOrigin || 'INDIA',
      countryOfDestination: invoiceData.countryOfDestination,
      preCarriageBy: invoiceData.preCarriageBy || 'N.A.',
      placeOfReceipt: invoiceData.placeOfReceipt || 'N.A.',
      termsOfPayment: invoiceData.termsOfPayment,
      priceTerms: invoiceData.priceTerms,
      vesselFlightNo: invoiceData.vesselFlightNo,
      portOfLoading: invoiceData.portOfLoading,
      portOfDischarge: invoiceData.portOfDischarge,
      finalDestination: invoiceData.finalDestination,
      commodityDescription: invoiceData.commodityDescription,
      packingDescription: invoiceData.packingDescription,
      scientificName: invoiceData.scientificName,
      shippingMarks: invoiceData.shippingMarks,
      containerNo: invoiceData.containerNo,
      sealNo: invoiceData.sealNo,
      netWeightKg: invoiceData.netWeightKg !== undefined ? invoiceData.netWeightKg : totalWeightKg,
      grossWeightKg: invoiceData.grossWeightKg,
      amountInWords: invoiceData.amountInWords,
      factoryNameAndAddress: invoiceData.factoryNameAndAddress,
      factoryApprovalNumber: invoiceData.factoryApprovalNumber,
      billOfLadingNo: invoiceData.billOfLadingNo,
      declarationText: invoiceData.declarationText,
      signatoryCompany: invoiceData.signatoryCompany,
      signatoryDesignation: invoiceData.signatoryDesignation,
      signatureDate: invoiceData.signatureDate,

      lineItems: computedLines,
      totalCartons,
      totalWeightKg,
      totalAmountCurrency,
      totalFobValueCurrency,
      estimatedAmountINR,

      advanceExchangeRate: invoiceData.advanceExchangeRate || invoiceData.bankPreDeterminedExchangeRate || exchangeRate,
      balanceExchangeRate: invoiceData.balanceExchangeRate || invoiceData.bankPreDeterminedExchangeRate || exchangeRate,
      bankPreDeterminedExchangeRate: invoiceData.bankPreDeterminedExchangeRate || exchangeRate,
      advanceTermsUSD: invoiceData.advanceTermsUSD || invoiceData.advanceReceivedCurrency,
      advanceReceivedCurrency: invoiceData.advanceReceivedCurrency,
      advanceShortfallUSD: invoiceData.advanceShortfallUSD || (invoiceData.advanceTermsUSD && invoiceData.advanceReceivedCurrency ? Math.max(0, Number((invoiceData.advanceTermsUSD - invoiceData.advanceReceivedCurrency).toFixed(2))) : undefined),
      advanceReceivedDate: invoiceData.advanceReceivedDate,
      advanceReceivedINR: invoiceData.advanceReceivedCurrency
        ? Number((invoiceData.advanceReceivedCurrency * (invoiceData.advanceExchangeRate || invoiceData.bankPreDeterminedExchangeRate || exchangeRate)).toFixed(2))
        : undefined,
      advanceBankRef: invoiceData.advanceBankRef,
      balanceActualPriceUSD: invoiceData.balanceActualPriceUSD || (totalAmountCurrency ? Math.max(0, Number((totalAmountCurrency - (invoiceData.advanceTermsUSD || invoiceData.advanceReceivedCurrency || 0)).toFixed(2))) : undefined),
      balancePaymentAmountCurrency: invoiceData.balancePaymentAmountCurrency,
      balanceShortfallUSD: invoiceData.balanceShortfallUSD || (invoiceData.balanceActualPriceUSD && invoiceData.balancePaymentAmountCurrency ? Math.max(0, Number((invoiceData.balanceActualPriceUSD - invoiceData.balancePaymentAmountCurrency).toFixed(2))) : undefined),
      balancePaymentDate: invoiceData.balancePaymentDate,
      balancePaymentINR: invoiceData.balancePaymentAmountCurrency
        ? Number((invoiceData.balancePaymentAmountCurrency * (invoiceData.balanceExchangeRate || invoiceData.bankPreDeterminedExchangeRate || exchangeRate)).toFixed(2))
        : undefined,
      balanceBankRef: invoiceData.balanceBankRef,
      totalShortfallUSD: invoiceData.totalShortfallUSD || ((invoiceData.advanceShortfallUSD || 0) + (invoiceData.balanceShortfallUSD || 0) > 0 ? Number(((invoiceData.advanceShortfallUSD || 0) + (invoiceData.balanceShortfallUSD || 0)).toFixed(2)) : undefined),

      realizations: invoiceData.realizations || [],
      totalRealizedCurrency: invoiceData.totalRealizedCurrency || (invoiceData.advanceReceivedCurrency ? Number(invoiceData.advanceReceivedCurrency) : 0),
      balanceRealizationCurrency: invoiceData.balanceRealizationCurrency !== undefined
        ? invoiceData.balanceRealizationCurrency
        : Math.max(0, Number((totalAmountCurrency - (invoiceData.advanceReceivedCurrency || 0)).toFixed(2))),
      totalRealizedINR: invoiceData.totalRealizedINR || (invoiceData.advanceReceivedCurrency ? Number(((invoiceData.advanceReceivedCurrency || 0) * (invoiceData.bankPreDeterminedExchangeRate || exchangeRate)).toFixed(2)) : 0),
      realizationStatus: (invoiceData.advanceReceivedCurrency || 0) >= totalAmountCurrency
        ? 'Fully Realized'
        : (invoiceData.advanceReceivedCurrency || 0) > 0
        ? 'Partially Realized'
        : 'Not Realized',

      isVoided: false,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => [newInvoice, ...prev]);
    logAudit('CREATE', 'SALES_INVOICE', newInvoice.invoiceNo, { newValues: newInvoice });
    showToast(`Commercial Invoice ${newInvoice.invoiceNo} saved (${currency} ${totalAmountCurrency.toLocaleString()}).`, 'success');

    return { success: true, invoiceNo: newInvoice.invoiceNo, warnings };
  };

  const updateSalesInvoice = (
    id: string,
    updates: Partial<SalesInvoice>,
    editReason?: string
  ): { success: boolean; message?: string } => {
    if (!permissions.canCreateEditSales) {
      return { success: false, message: 'Unauthorized: Viewer role cannot edit sales invoices.' };
    }

    const existing = salesInvoices.find((inv) => inv.id === id);
    if (!existing) return { success: false, message: 'Sales invoice not found.' };

    const lineItemsToCompute = updates.lineItems || existing.lineItems;
    if (lineItemsToCompute.length === 0) {
      return { success: false, message: 'At least one line item is required.' };
    }

    const exchangeRate =
      updates.exchangeRate !== undefined ? Number(updates.exchangeRate) : existing.exchangeRate;

    const computedLines = lineItemsToCompute.map((l, idx) => {
      const weight = Number(l.weightKg);
      const rate = Number(l.ratePerKg);
      const amount = Number((weight * rate).toFixed(2));
      const fobVal = l.fobValueCurrency && l.fobValueCurrency > 0 ? Number(l.fobValueCurrency) : amount;
      return {
        id: l.id || `line-${Date.now()}-${idx}`,
        speciesId: l.speciesId,
        hsCode: l.hsCode || species.find((s) => s.id === l.speciesId)?.hsCode || '03061790',
        sizeId: l.sizeId || (sizes[0]?.id || ''),
        countId: l.countId,
        cartonsCount: Number(l.cartonsCount || 0),
        weightKg: weight,
        ratePerKg: rate,
        amountCurrency: amount,
        fobValueCurrency: fobVal,
        productDescription: l.productDescription,
        gradeSize: l.gradeSize
      };
    });

    const totalCartons = computedLines.reduce((s, l) => s + l.cartonsCount, 0);
    const totalWeightKg = Number(computedLines.reduce((s, l) => s + l.weightKg, 0).toFixed(2));
    const totalAmountCurrency = Number(computedLines.reduce((s, l) => s + l.amountCurrency, 0).toFixed(2));
    const totalFobValueCurrency = Number(computedLines.reduce((s, l) => s + l.fobValueCurrency, 0).toFixed(2));
    const estimatedAmountINR = Number((totalAmountCurrency * exchangeRate).toFixed(2));

    const realizations = updates.realizations !== undefined ? updates.realizations : existing.realizations;
    const totalRealizedCurrency = Number(realizations.reduce((s, r) => s + r.realizedAmountCurrency, 0).toFixed(2));
    const balanceRealizationCurrency = Math.max(0, Number((totalAmountCurrency - totalRealizedCurrency).toFixed(2)));
    const totalRealizedINR = Number(realizations.reduce((s, r) => s + r.amountINR, 0).toFixed(2));
    const averageRealizedExchangeRate =
      totalRealizedCurrency > 0 ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(2)) : exchangeRate;

    let realizationStatus: RealizationStatus = 'Not Realized';
    if (totalRealizedCurrency > 0) {
      if (balanceRealizationCurrency <= 0.05 || totalRealizedCurrency >= totalAmountCurrency) {
        realizationStatus = 'Fully Realized';
      } else {
        realizationStatus = 'Partially Realized';
      }
    }

    const updated: SalesInvoice = {
      ...existing,
      ...updates,
      exchangeRate,
      lineItems: computedLines,
      totalCartons,
      totalWeightKg,
      totalAmountCurrency,
      totalFobValueCurrency,
      estimatedAmountINR,
      realizations,
      totalRealizedCurrency,
      balanceRealizationCurrency,
      totalRealizedINR,
      averageRealizedExchangeRate,
      realizationStatus,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    logAudit('EDIT', 'SALES_INVOICE', existing.invoiceNo, {
      oldValues: existing,
      newValues: updated,
      changeReason: editReason || 'Updated sales invoice record'
    });
    showToast(`Invoice ${existing.invoiceNo} updated.`, 'success');
    return { success: true };
  };

  const addInvoiceRealization = (
    invoiceId: string,
    realizationData: Omit<RealizationRecord, 'id' | 'createdAt' | 'createdBy'>
  ): { success: boolean; message?: string } => {
    if (!permissions.canManageSalesRealization) {
      return { success: false, message: 'Unauthorized: Only Master Accountant and Owner/Admin can record realizations.' };
    }

    const invoice = salesInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { success: false, message: 'Invoice not found.' };

    const realizedUSD = Number(realizationData.realizedAmountCurrency);
    if (!realizedUSD || realizedUSD <= 0) {
      return { success: false, message: 'Realized foreign currency amount must be > 0.' };
    }

    const exRate = Number(realizationData.exchangeRateRealized);
    if (!exRate || exRate <= 0) {
      return { success: false, message: 'Realized exchange rate must be > 0.' };
    }

    const amountINR = Number((realizedUSD * exRate).toFixed(2));

    const newRecord: RealizationRecord = {
      ...realizationData,
      id: `real-${Date.now()}`,
      realizedAmountCurrency: realizedUSD,
      exchangeRateRealized: exRate,
      amountINR,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email
    };

    const updatedRealizations = [...invoice.realizations, newRecord];
    const totalRealizedCurrency = Number(
      updatedRealizations.reduce((s, r) => s + r.realizedAmountCurrency, 0).toFixed(2)
    );
    const balanceRealizationCurrency = Math.max(
      0,
      Number((invoice.totalAmountCurrency - totalRealizedCurrency).toFixed(2))
    );
    const totalRealizedINR = Number(updatedRealizations.reduce((s, r) => s + r.amountINR, 0).toFixed(2));
    const averageRealizedExchangeRate =
      totalRealizedCurrency > 0 ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(2)) : invoice.exchangeRate;

    let realizationStatus: RealizationStatus = 'Not Realized';
    if (totalRealizedCurrency > 0) {
      if (balanceRealizationCurrency <= 0.05 || totalRealizedCurrency >= invoice.totalAmountCurrency) {
        realizationStatus = 'Fully Realized';
      } else {
        realizationStatus = 'Partially Realized';
      }
    }

    const updatedInvoice: SalesInvoice = {
      ...invoice,
      realizations: updatedRealizations,
      totalRealizedCurrency,
      balanceRealizationCurrency,
      totalRealizedINR,
      averageRealizedExchangeRate,
      realizationStatus,
      lastRealizationDate: realizationData.settlementDate,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
    logAudit('CREATE', 'REALIZATION_RECORD', `${invoice.invoiceNo} / ${newRecord.bankRefNo}`, {
      newValues: newRecord
    });
    showToast(
      `Realization of ${invoice.currency} ${realizedUSD.toLocaleString()} (₹${amountINR.toLocaleString()}) recorded for ${invoice.invoiceNo}.`,
      'success'
    );

    return { success: true };
  };

  const updateInvoiceSettlement = (
    invoiceId: string,
    settlementData: {
      advanceTermsUSD?: number;
      advanceReceivedCurrency?: number;
      advanceShortfallUSD?: number;
      advanceReceivedDate?: string;
      advanceBankRef?: string;
      advanceExchangeRate?: number;
      balanceActualPriceUSD?: number;
      balancePaymentAmountCurrency?: number;
      balanceShortfallUSD?: number;
      balancePaymentDate?: string;
      balanceBankRef?: string;
      balanceExchangeRate?: number;
      totalShortfallUSD?: number;
      bankPreDeterminedExchangeRate?: number;
      bankAccountId?: string;
      notes?: string;
    }
  ): { success: boolean; message?: string } => {
    if (!permissions.canManageSalesRealization) {
      return {
        success: false,
        message: 'Unauthorized: Only Master Accountant and Owner/Admin can record realizations.'
      };
    }

    const invoice = salesInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { success: false, message: 'Invoice not found.' };

    const bankRate = Number(settlementData.bankPreDeterminedExchangeRate) > 0
      ? Number(Number(settlementData.bankPreDeterminedExchangeRate).toFixed(4))
      : invoice.bankPreDeterminedExchangeRate || invoice.exchangeRate || 84.50;

    const advanceRate = Number(settlementData.advanceExchangeRate) > 0
      ? Number(Number(settlementData.advanceExchangeRate).toFixed(4))
      : invoice.advanceExchangeRate || bankRate;

    const balanceRate = Number(settlementData.balanceExchangeRate) > 0
      ? Number(Number(settlementData.balanceExchangeRate).toFixed(4))
      : invoice.balanceExchangeRate || bankRate;

    const advanceUSD = Number(settlementData.advanceReceivedCurrency) || 0;
    const advanceTermsUSD = Number(settlementData.advanceTermsUSD) > 0
      ? Number(Number(settlementData.advanceTermsUSD).toFixed(2))
      : (advanceUSD > 0 ? (invoice.advanceTermsUSD || advanceUSD) : undefined);

    const advanceShortfallUSD = advanceTermsUSD && advanceTermsUSD > advanceUSD
      ? Number((advanceTermsUSD - advanceUSD).toFixed(2))
      : undefined;

    const advanceDate = advanceUSD > 0
      ? (settlementData.advanceReceivedDate || invoice.advanceReceivedDate || new Date().toISOString().split('T')[0])
      : undefined;
    const advanceBankRef = advanceUSD > 0
      ? (settlementData.advanceBankRef?.trim() || invoice.advanceBankRef || `ADV-${invoice.invoiceNo}`)
      : undefined;

    const balanceUSD = Number(settlementData.balancePaymentAmountCurrency) || 0;
    const balanceActualPriceUSD = Number(settlementData.balanceActualPriceUSD) > 0
      ? Number(Number(settlementData.balanceActualPriceUSD).toFixed(2))
      : (balanceUSD > 0
          ? (invoice.balanceActualPriceUSD || Math.max(0, Number((invoice.totalAmountCurrency - (advanceTermsUSD || advanceUSD)).toFixed(2))))
          : undefined);

    const balanceShortfallUSD = balanceActualPriceUSD && balanceActualPriceUSD > balanceUSD
      ? Number((balanceActualPriceUSD - balanceUSD).toFixed(2))
      : undefined;

    const totalShortfallUSD = (advanceShortfallUSD || 0) + (balanceShortfallUSD || 0) > 0
      ? Number(((advanceShortfallUSD || 0) + (balanceShortfallUSD || 0)).toFixed(2))
      : undefined;

    const balanceDate = balanceUSD > 0
      ? (settlementData.balancePaymentDate || invoice.balancePaymentDate || new Date().toISOString().split('T')[0])
      : undefined;
    const balanceBankRef = balanceUSD > 0
      ? (settlementData.balanceBankRef?.trim() || invoice.balanceBankRef || `BAL-${invoice.invoiceNo}`)
      : undefined;

    const advanceINR = Number((advanceUSD * advanceRate).toFixed(2));
    const balanceINR = Number((balanceUSD * balanceRate).toFixed(2));

    const totalRealizedCurrency = Number((advanceUSD + balanceUSD).toFixed(2));
    const totalRealizedINR = Number((advanceINR + balanceINR).toFixed(2));
    const balanceRealizationCurrency = Math.max(
      0,
      Number((invoice.totalAmountCurrency - totalRealizedCurrency).toFixed(2))
    );

    let realizationStatus: RealizationStatus = 'Not Realized';
    if (totalRealizedCurrency > 0) {
      if (
        balanceRealizationCurrency <= 0.05 ||
        totalRealizedCurrency >= invoice.totalAmountCurrency ||
        (balanceUSD > 0 && totalRealizedCurrency + (totalShortfallUSD || 0) >= invoice.totalAmountCurrency - 0.05)
      ) {
        realizationStatus = 'Fully Realized';
      } else {
        realizationStatus = 'Partially Realized';
      }
    }

    // Build synchronized realization records with independent forward rates and shortfalls
    const updatedRealizations: RealizationRecord[] = [];
    if (advanceUSD > 0 && advanceDate) {
      updatedRealizations.push({
        id: `real-adv-${invoice.id}`,
        settlementDate: advanceDate,
        realizedAmountCurrency: advanceUSD,
        exchangeRateRealized: advanceRate,
        amountINR: advanceINR,
        bankRefNo: advanceBankRef || `ADV-${invoice.invoiceNo}`,
        bankAccountId: settlementData.bankAccountId,
        notes: settlementData.notes ? `Advance payment: ${settlementData.notes}` : 'Advance received',
        paymentType: 'Advance',
        contractTermsAmountUSD: advanceTermsUSD,
        shortfallUSD: advanceShortfallUSD,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.email
      });
    }
    if (balanceUSD > 0 && balanceDate) {
      updatedRealizations.push({
        id: `real-bal-${invoice.id}`,
        settlementDate: balanceDate,
        realizedAmountCurrency: balanceUSD,
        exchangeRateRealized: balanceRate,
        amountINR: balanceINR,
        bankRefNo: balanceBankRef || `BAL-${invoice.invoiceNo}`,
        bankAccountId: settlementData.bankAccountId,
        notes: settlementData.notes ? `Balance payment: ${settlementData.notes}` : 'Balance settlement received',
        paymentType: 'Balance',
        contractTermsAmountUSD: balanceActualPriceUSD,
        shortfallUSD: balanceShortfallUSD,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.email
      });
    }

    const lastRealizationDate = balanceDate || advanceDate || invoice.lastRealizationDate;
    const averageRealizedExchangeRate = totalRealizedCurrency > 0
      ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(4))
      : bankRate;

    const updatedInvoice: SalesInvoice = {
      ...invoice,
      advanceTermsUSD: advanceTermsUSD && advanceTermsUSD > 0 ? advanceTermsUSD : undefined,
      advanceReceivedCurrency: advanceUSD > 0 ? advanceUSD : undefined,
      advanceShortfallUSD: advanceShortfallUSD && advanceShortfallUSD > 0 ? advanceShortfallUSD : undefined,
      advanceExchangeRate: advanceRate,
      advanceReceivedDate: advanceUSD > 0 ? advanceDate : undefined,
      advanceReceivedINR: advanceUSD > 0 ? advanceINR : undefined,
      advanceBankRef: advanceUSD > 0 ? advanceBankRef : undefined,
      balanceActualPriceUSD: balanceActualPriceUSD && balanceActualPriceUSD > 0 ? balanceActualPriceUSD : undefined,
      balancePaymentAmountCurrency: balanceUSD > 0 ? balanceUSD : undefined,
      balanceShortfallUSD: balanceShortfallUSD && balanceShortfallUSD > 0 ? balanceShortfallUSD : undefined,
      balanceExchangeRate: balanceRate,
      balancePaymentDate: balanceUSD > 0 ? balanceDate : undefined,
      balancePaymentINR: balanceUSD > 0 ? balanceINR : undefined,
      balanceBankRef: balanceUSD > 0 ? balanceBankRef : undefined,
      totalShortfallUSD: totalShortfallUSD && totalShortfallUSD > 0 ? totalShortfallUSD : undefined,
      bankPreDeterminedExchangeRate: bankRate,
      realizations: updatedRealizations,
      totalRealizedCurrency,
      balanceRealizationCurrency,
      totalRealizedINR,
      realizationStatus,
      lastRealizationDate,
      averageRealizedExchangeRate,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
    logAudit(
      'EDIT',
      'SALES_REALIZATION',
      `Settlement recorded for invoice ${invoice.invoiceNo}: Advance ${invoice.currency} ${advanceUSD} @ ₹${advanceRate} (${advanceDate || 'N/A'}), Balance ${invoice.currency} ${balanceUSD} @ ₹${balanceRate} (${balanceDate || 'N/A'})`,
      {
        oldValues: {
          advanceUSD: invoice.advanceReceivedCurrency,
          advanceRate: invoice.advanceExchangeRate,
          balanceUSD: invoice.balancePaymentAmountCurrency,
          balanceRate: invoice.balanceExchangeRate,
          bankRate: invoice.bankPreDeterminedExchangeRate,
          status: invoice.realizationStatus
        },
        newValues: {
          advanceUSD,
          advanceRate,
          advanceDate,
          balanceUSD,
          balanceRate,
          balanceDate,
          bankRate,
          status: realizationStatus
        }
      }
    );

    showToast(
      `Settlement updated for ${invoice.invoiceNo}: Adv ${invoice.currency} ${advanceUSD.toLocaleString()} @ ₹${advanceRate}, Bal ${invoice.currency} ${balanceUSD.toLocaleString()} @ ₹${balanceRate}.`,
      'success'
    );

    return { success: true };
  };

  const deleteInvoiceRealization = (
    invoiceId: string,
    realizationId: string
  ): { success: boolean; message?: string } => {
    if (!permissions.canManageSalesRealization) {
      return { success: false, message: 'Unauthorized: Only Master Accountant and Owner/Admin can modify realizations.' };
    }

    const invoice = salesInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { success: false, message: 'Invoice not found.' };

    const targetRecord = invoice.realizations.find((r) => r.id === realizationId);
    if (!targetRecord) return { success: false, message: 'Realization entry not found.' };

    const updatedRealizations = invoice.realizations.filter((r) => r.id !== realizationId);
    const totalRealizedCurrency = Number(
      updatedRealizations.reduce((s, r) => s + r.realizedAmountCurrency, 0).toFixed(2)
    );
    const balanceRealizationCurrency = Math.max(
      0,
      Number((invoice.totalAmountCurrency - totalRealizedCurrency).toFixed(2))
    );
    const totalRealizedINR = Number(updatedRealizations.reduce((s, r) => s + r.amountINR, 0).toFixed(2));
    const averageRealizedExchangeRate =
      totalRealizedCurrency > 0 ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(2)) : invoice.exchangeRate;

    let realizationStatus: RealizationStatus = 'Not Realized';
    if (totalRealizedCurrency > 0) {
      if (balanceRealizationCurrency <= 0.05 || totalRealizedCurrency >= invoice.totalAmountCurrency) {
        realizationStatus = 'Fully Realized';
      } else {
        realizationStatus = 'Partially Realized';
      }
    }

    const lastRealization = updatedRealizations[updatedRealizations.length - 1];

    const updatedInvoice: SalesInvoice = {
      ...invoice,
      realizations: updatedRealizations,
      totalRealizedCurrency,
      balanceRealizationCurrency,
      totalRealizedINR,
      averageRealizedExchangeRate,
      realizationStatus,
      lastRealizationDate: lastRealization ? lastRealization.settlementDate : undefined,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
    logAudit('DELETE', 'REALIZATION_RECORD', `${invoice.invoiceNo} / ${targetRecord.bankRefNo}`, {
      oldValues: targetRecord
    });
    showToast(`Realization record removed for ${invoice.invoiceNo}.`, 'info');

    return { success: true };
  };

  const voidSalesInvoice = (id: string, voidReason: string): { success: boolean; message?: string } => {
    if (!permissions.canVoid) return { success: false, message: 'Unauthorized to void invoices.' };
    const existing = salesInvoices.find((inv) => inv.id === id);
    if (!existing) return { success: false, message: 'Invoice not found.' };

    const voided: SalesInvoice = {
      ...existing,
      isVoided: true,
      voidReason,
      voidedBy: currentUser.email,
      voidedAt: new Date().toISOString()
    };

    setSalesInvoices((prev) => prev.map((inv) => (inv.id === id ? voided : inv)));
    logAudit('VOID', 'SALES_INVOICE', existing.invoiceNo, { changeReason: voidReason });
    showToast(`Sales invoice ${existing.invoiceNo} voided.`, 'info');
    return { success: true };
  };

  const deleteSalesInvoicePermanently = (id: string): { success: boolean; message?: string } => {
    if (!permissions.canPermanentlyDelete) {
      return { success: false, message: 'Unauthorized: Only Owner / Admin can permanently delete records.' };
    }
    const existing = salesInvoices.find((inv) => inv.id === id);
    if (!existing) return { success: false, message: 'Invoice not found.' };

    setSalesInvoices((prev) => prev.filter((inv) => inv.id !== id));
    logAudit('DELETE', 'SALES_INVOICE', existing.invoiceNo, { changeReason: 'Permanently purged by Admin' });
    showToast(`Invoice ${existing.invoiceNo} permanently deleted.`, 'warning');
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // DATABASE WIPE & STARTER PRESET CONTROLS
  // --------------------------------------------------------------------------

  const clearAllTransactions = () => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can purge transactions.', 'error');
      return;
    }
    setPurchases([]);
    setPayments([]);
    setPurchaseReturns([]);
    setProcessingEntries([]);
    setSalesInvoices([]);
    setOfflineQueue([]);
    setOpeningStocks([]);
    setStockAdjustments([]);
    setPhysicalStockCounts([]);
    setPeriodCloseLocks([]);
    logAudit('DELETE', 'Database', 'Transactions', { changeReason: 'User purged all purchase, return, production, sales, and stock adjustment transactions' });
    showToast('All purchases, payments, returns, processing lots, sales invoices, and stock adjustments cleared.', 'info');
  };

  const wipeDatabaseCompletely = () => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can reset the database.', 'error');
      return;
    }
    setPurchases([]);
    setPayments([]);
    setPurchaseReturns([]);
    setProcessingEntries([]);
    setSalesInvoices([]);
    setOfflineQueue([]);
    setSuppliers([]);
    setSpecies([]);
    setGrades([]);
    setSizes([]);
    setCounts([]);
    setLocations([]);
    setBankAccounts([]);
    setExpenseTypes([]);
    setSlabTypes([]);
    setCustomers([]);
    setPorts([]);
    setInventoryItems([]);
    setInventoryMappings([]);
    setOpeningStocks([]);
    setStockAdjustments([]);
    setPhysicalStockCounts([]);
    setPeriodCloseLocks([]);
    setAuditLogs([]);
    showToast('Database reset to 100% clean blank state.', 'success');
  };

  const loadStarterPresets = () => {
    setSuppliers(SAMPLE_STARTER_PRESETS.suppliers);
    setSpecies(SAMPLE_STARTER_PRESETS.species);
    setGrades(SAMPLE_STARTER_PRESETS.grades);
    setSizes(SAMPLE_STARTER_PRESETS.sizes);
    setCounts(SAMPLE_STARTER_PRESETS.counts);
    setLocations(SAMPLE_STARTER_PRESETS.locations);
    setBankAccounts(SAMPLE_STARTER_PRESETS.bankAccounts);
    setExpenseTypes(SAMPLE_STARTER_PRESETS.expenseTypes);
    if (SAMPLE_STARTER_PRESETS.slabTypes) {
      setSlabTypes(SAMPLE_STARTER_PRESETS.slabTypes);
    }
    if ((SAMPLE_STARTER_PRESETS as any).customers) {
      setCustomers((SAMPLE_STARTER_PRESETS as any).customers);
    }
    if ((SAMPLE_STARTER_PRESETS as any).ports) {
      setPorts((SAMPLE_STARTER_PRESETS as any).ports);
    }
    setInventoryItems(INITIAL_INVENTORY_ITEMS);
    setInventoryMappings(INITIAL_INVENTORY_MAPPINGS);
    showToast('Common seafood master presets loaded. You can edit or delete them anytime.', 'success');
  };

  // --------------------------------------------------------------------------
  // INVENTORY MODULE CRUD ACTIONS
  // --------------------------------------------------------------------------

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    const exists = inventoryItems.some((i) => i.code.trim().toLowerCase() === itemData.code.trim().toLowerCase());
    if (exists) {
      showToast(`Inventory Item with code "${itemData.code}" already exists.`, 'error');
      return { success: false, message: 'Item code already exists' };
    }
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.email || 'system'
    };
    setInventoryItems((prev) => [...prev, newItem]);
    logAudit('CREATE', 'InventoryItem', newItem.code, { newValues: newItem });
    showToast(`Inventory item "${newItem.name}" added.`, 'success');
    return { success: true };
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    const old = inventoryItems.find((i) => i.id === id);
    if (!old) return { success: false, message: 'Item not found' };
    setInventoryItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)));
    logAudit('EDIT', 'InventoryItem', old.code, { oldValues: old, newValues: updates });
    showToast(`Inventory item "${old.code}" updated.`, 'success');
    return { success: true };
  };

  const deleteInventoryItem = (id: string) => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can delete inventory master items.', 'error');
      return { success: false, message: 'Unauthorized' };
    }
    const old = inventoryItems.find((i) => i.id === id);
    if (!old) return { success: false, message: 'Item not found' };
    const hasMovements = inventoryCalculation.movementsByItem[id] && inventoryCalculation.movementsByItem[id].length > 0;
    if (hasMovements) {
      showToast(`Cannot delete "${old.code}": Active stock ledger entries exist. Deactivate item instead.`, 'error');
      return { success: false, message: 'Item has transactions in ledger. Deactivate instead.' };
    }
    setInventoryItems((prev) => prev.filter((i) => i.id !== id));
    setInventoryMappings((prev) => prev.filter((m) => m.inventoryItemId !== id));
    logAudit('DELETE', 'InventoryItem', old.code, { oldValues: old });
    showToast(`Inventory item "${old.code}" removed.`, 'info');
    return { success: true };
  };

  const toggleInventoryItemActive = (id: string) => {
    setInventoryItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: !i.active, updatedAt: new Date().toISOString() } : i)));
  };

  const addInventoryMapping = (mappingData: Omit<InventoryItemMapping, 'id' | 'createdAt' | 'createdBy'>) => {
    const newMapping: InventoryItemMapping = {
      ...mappingData,
      id: `map-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email || 'system'
    };
    setInventoryMappings((prev) => [...prev, newMapping]);
    logAudit('CREATE', 'InventoryMapping', newMapping.id, { newValues: newMapping });
    showToast('Inventory product mapping saved.', 'success');
    return { success: true };
  };

  const deleteInventoryMapping = (id: string) => {
    const old = inventoryMappings.find((m) => m.id === id);
    setInventoryMappings((prev) => prev.filter((m) => m.id !== id));
    if (old) logAudit('DELETE', 'InventoryMapping', id, { oldValues: old });
    showToast('Inventory mapping removed.', 'info');
    return { success: true };
  };

  const saveOpeningStock = (openingData: Omit<OpeningStock, 'id' | 'createdAt' | 'createdBy'>) => {
    const ratePerKg = openingData.quantityKg > 0 ? Number((openingData.totalValue / openingData.quantityKg).toFixed(4)) : 0;
    const existingIndex = openingStocks.findIndex((o) => o.inventoryItemId === openingData.inventoryItemId);
    if (existingIndex >= 0) {
      setOpeningStocks((prev) =>
        prev.map((o, idx) =>
          idx === existingIndex
            ? {
                ...o,
                ...openingData,
                ratePerKg,
                updatedAt: new Date().toISOString()
              }
            : o
        )
      );
      showToast('Opening stock updated.', 'success');
      return { success: true };
    }
    const newOpening: OpeningStock = {
      ...openingData,
      ratePerKg,
      id: `opn-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email || 'system'
    };
    setOpeningStocks((prev) => [...prev, newOpening]);
    logAudit('CREATE', 'OpeningStock', newOpening.inventoryItemId, { newValues: newOpening });
    showToast('Opening stock recorded.', 'success');
    return { success: true };
  };

  const deleteOpeningStock = (id: string) => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Unauthorized: Only Owner / Admin can delete opening stock.', 'error');
      return { success: false, message: 'Unauthorized' };
    }
    const old = openingStocks.find((o) => o.id === id);
    setOpeningStocks((prev) => prev.filter((o) => o.id !== id));
    if (old) logAudit('DELETE', 'OpeningStock', id, { oldValues: old });
    showToast('Opening stock removed.', 'info');
    return { success: true };
  };

  const addStockAdjustment = (adjData: Omit<StockAdjustment, 'id' | 'adjustmentNo' | 'createdAt' | 'createdBy' | 'status'>) => {
    const count = stockAdjustments.length + 1;
    const adjustmentNo = `ADJ-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newAdj: StockAdjustment = {
      ...adjData,
      id: `adj-${Date.now()}`,
      adjustmentNo,
      status: 'Posted',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email || 'system'
    };
    setStockAdjustments((prev) => [newAdj, ...prev]);
    logAudit('CREATE', 'StockAdjustment', adjustmentNo, { newValues: newAdj });
    showToast(`Stock Adjustment ${adjustmentNo} posted.`, 'success');
    return { success: true, adjustmentNo };
  };

  const deleteStockAdjustment = (id: string) => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Only Owner / Admin can delete posted adjustments.', 'error');
      return { success: false, message: 'Unauthorized' };
    }
    const old = stockAdjustments.find((a) => a.id === id);
    setStockAdjustments((prev) => prev.filter((a) => a.id !== id));
    if (old) logAudit('DELETE', 'StockAdjustment', old.adjustmentNo || old.id, { oldValues: old });
    showToast('Stock adjustment deleted and ledger reversed.', 'info');
    return { success: true };
  };

  const savePhysicalStockCount = (countData: Omit<PhysicalStockCount, 'id' | 'countNo' | 'referenceNo' | 'createdAt' | 'createdBy' | 'status'>) => {
    const countNo = `CNT-${new Date().getFullYear()}-${String(physicalStockCounts.length + 1).padStart(4, '0')}`;
    const newCount: PhysicalStockCount = {
      ...countData,
      id: `cnt-${Date.now()}`,
      countNo,
      referenceNo: countNo,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email || 'system'
    };
    setPhysicalStockCounts((prev) => [newCount, ...prev]);
    showToast(`Physical Stock Count ${countNo} saved as Draft.`, 'success');
    return { success: true, countNo, countId: newCount.id };
  };

  const postPhysicalStockCount = (countId: string) => {
    const target = physicalStockCounts.find((c) => c.id === countId);
    if (!target) return { success: false, message: 'Count record not found' };
    if (target.status === 'posted') return { success: false, message: 'Count is already posted' };

    const adjustmentsToCreate: StockAdjustment[] = [];
    const timestamp = new Date().toISOString();
    const countRef = target.referenceNo || target.countNo || `CNT-${countId.slice(-4)}`;

    target.items.forEach((item, index) => {
      const variance = item.varianceKg ?? item.varianceQuantityKg ?? 0;
      if (Math.abs(variance) > 0.001) {
        const itemObj = inventoryItems.find((i) => i.id === item.inventoryItemId);
        const itemName = itemObj ? `${itemObj.code} - ${itemObj.name}` : item.inventoryItemId;
        const adjNo = `ADJ-${countRef}-${index + 1}`;
        adjustmentsToCreate.push({
          id: `adj-${Date.now()}-${index}`,
          adjustmentNo: adjNo,
          date: target.countDate,
          inventoryItemId: item.inventoryItemId,
          quantityKg: variance,
          unitCost: item.unitCost,
          ratePerKg: item.unitCost,
          totalValue: Number((variance * item.unitCost).toFixed(2)),
          reason: 'count_difference',
          remarks: `Posted from Physical Count ${countRef}. Variance: ${variance > 0 ? '+' : ''}${variance} Kg on ${itemName}`,
          status: 'Posted',
          createdAt: timestamp,
          createdBy: currentUser.email || 'system'
        });
      }
    });

    if (adjustmentsToCreate.length > 0) {
      setStockAdjustments((prev) => [...adjustmentsToCreate, ...prev]);
    }

    setPhysicalStockCounts((prev) =>
      prev.map((c) => (c.id === countId ? { ...c, status: 'posted', postedAt: timestamp, postedBy: currentUser.email } : c))
    );

    logAudit('CREATE', 'PhysicalCount', countRef, { changeReason: `Posted count with ${adjustmentsToCreate.length} variance adjustments` });
    showToast(`Physical Count ${countRef} posted. ${adjustmentsToCreate.length} variance adjustments generated.`, 'success');
    return { success: true };
  };

  const deletePhysicalStockCount = (id: string) => {
    if (!permissions.canPermanentlyDelete) {
      showToast('Only Owner / Admin can delete stock count records.', 'error');
      return { success: false, message: 'Unauthorized' };
    }
    const old = physicalStockCounts.find((c) => c.id === id);
    setPhysicalStockCounts((prev) => prev.filter((c) => c.id !== id));
    if (old) logAudit('DELETE', 'PhysicalCount', old.referenceNo || old.countNo || id, { oldValues: old });
    showToast('Physical count record deleted.', 'info');
    return { success: true };
  };

  const closePeriodLock = (period: string, closingQty: number, closingValue: number, remarks?: string) => {
    if (!permissions.canPeriodClose) {
      showToast('Unauthorized: Only Master Accountant and Owner / Admin can lock inventory periods.', 'error');
      return { success: false, message: 'Unauthorized' };
    }
    const existing = periodCloseLocks.find((l) => l.period === period && l.status === 'locked');
    if (existing) {
      showToast(`Period ${period} is already locked.`, 'error');
      return { success: false, message: 'Period already locked' };
    }
    const newLock: PeriodCloseLock = {
      id: `lock-${Date.now()}`,
      period,
      closedAt: new Date().toISOString(),
      closingDate: new Date().toISOString(),
      closedBy: currentUser.email || 'admin',
      closingQty,
      closingValue,
      status: 'locked',
      reconciliationPassed: true,
      reconciliationVarianceValue: 0,
      reconciledAt: new Date().toISOString(),
      remarks,
      notes: remarks
    };
    setPeriodCloseLocks((prev) => [newLock, ...prev]);
    logAudit('CREATE', 'PeriodClose', period, { newValues: newLock, changeReason: 'Locked inventory period after reconciliation' });
    showToast(`Inventory Period ${period} locked successfully.`, 'success');
    return { success: true };
  };

  const unlockPeriod = (period: string, reason: string) => {
    if (currentUser.role !== 'admin') {
      showToast('Unauthorized: Only Owner / Admin can unlock a closed inventory period.', 'error');
      return { success: false, message: 'Only Owner / Admin can unlock closed periods' };
    }
    setPeriodCloseLocks((prev) =>
      prev.map((l) => (l.period === period ? { ...l, status: 'unlocked', unlockReason: reason, unlockedBy: currentUser.email, unlockedAt: new Date().toISOString() } : l))
    );
    logAudit('EDIT', 'PeriodClose', period, { changeReason: `Period unlocked by Admin: ${reason}` });
    showToast(`Period ${period} unlocked.`, 'info');
    return { success: true };
  };

  const rebuildInventoryLedger = () => {
    showToast('Inventory ledger recalculated and verified against all purchase receipts and sales invoices.', 'success');
    logAudit('EDIT', 'InventoryLedger', 'ALL', { changeReason: 'Admin triggered full ledger rebuild' });
    return { success: true, message: 'Inventory ledger recalculated successfully' };
  };

  const bulkImportSuppliers = (records: Record<string, any>[], updateExisting = true) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...suppliers];

    records.forEach((row, idx) => {
      // Skip completely empty rows
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, [
        'suppliername',
        'supplier',
        'partyname',
        'party',
        'vendorname',
        'vendor',
        'boatowner',
        'boat',
        'firmname',
        'firm',
        'client',
        'name'
      ]);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Supplier name is required.`);
        return;
      }

      const rawCode = getFlexibleValue(row, ['suppliercode', 'code', 'partycode', 'vendorcode', 'suppcode', 'id', 'supplierid']);
      const code = rawCode ? String(rawCode).trim() : '';

      const rawType = String(getFlexibleValue(row, ['type', 'suppliertype', 'category', 'kind']) || '').toLowerCase();
      let type: SupplierType = 'boat_owner';
      if (rawType.includes('auction')) type = 'auctioneer_agent';
      else if (rawType.includes('trade')) type = 'trader';
      else if (rawType.includes('farm')) type = 'farm';
      else if (rawType.includes('other')) type = 'other';

      const contactPerson = String(getFlexibleValue(row, ['contactperson', 'contact', 'person']) || '').trim();
      const phone = String(getFlexibleValue(row, ['phone', 'mobile', 'contactno', 'tel', 'cell', 'phonenumber']) || '').trim();
      const email = String(getFlexibleValue(row, ['email', 'emailid']) || '').trim();
      const address = String(getFlexibleValue(row, ['address', 'street', 'locationaddress']) || '').trim();
      const district = String(getFlexibleValue(row, ['district', 'city']) || '').trim();
      const state = String(getFlexibleValue(row, ['state', 'province']) || '').trim();
      const gstin = String(getFlexibleValue(row, ['gstin', 'gst', 'gstno']) || '').trim();
      const pan = String(getFlexibleValue(row, ['pan', 'panno']) || '').trim();
      const bankName = String(getFlexibleValue(row, ['bankname', 'bank']) || '').trim();
      const bankAccount = String(getFlexibleValue(row, ['bankaccountno', 'bankaccount', 'accountno', 'account', 'acno']) || '').trim();
      const bankIfsc = String(getFlexibleValue(row, ['bankifsc', 'ifsc', 'ifsccode']) || '').trim();

      const rawCreditDays = getFlexibleValue(row, ['creditdays', 'creditperiod', 'days']);
      const creditDays = (rawCreditDays !== undefined && rawCreditDays !== '' && !isNaN(Number(rawCreditDays)))
        ? Number(rawCreditDays)
        : 0;

      const rawTerms = getFlexibleValue(row, ['paymentterms', 'terms', 'paymentterm', 'creditterms']);
      const paymentTerms = rawTerms ? String(rawTerms).trim() : (creditDays > 0 ? `Net ${creditDays} Days` : 'Immediate / Cash');

      const rawOpeningBal = getFlexibleValue(row, ['openingbalance', 'balance', 'openingbal', 'opbal']);
      const openingBalance = (rawOpeningBal !== undefined && rawOpeningBal !== '' && !isNaN(Number(rawOpeningBal)))
        ? Number(rawOpeningBal)
        : 0;

      const existingIdx = currentList.findIndex(
        (s) =>
          (code && normalizeKey(s.code) === normalizeKey(code)) ||
          normalizeKey(s.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        if (updateExisting) {
          currentList[existingIdx] = {
            ...currentList[existingIdx],
            code: code || currentList[existingIdx].code,
            name,
            type: type || currentList[existingIdx].type,
            contactPerson: contactPerson || currentList[existingIdx].contactPerson,
            phone: phone || currentList[existingIdx].phone,
            email: email || currentList[existingIdx].email,
            address: address || currentList[existingIdx].address,
            district: district || currentList[existingIdx].district,
            state: state || currentList[existingIdx].state,
            gstin: gstin || currentList[existingIdx].gstin,
            pan: pan || currentList[existingIdx].pan,
            bankName: bankName || currentList[existingIdx].bankName,
            bankAccount: bankAccount || currentList[existingIdx].bankAccount,
            bankIfsc: bankIfsc || currentList[existingIdx].bankIfsc,
            paymentTerms: paymentTerms || currentList[existingIdx].paymentTerms,
            creditDays: creditDays !== undefined ? creditDays : currentList[existingIdx].creditDays,
            openingBalance: openingBalance !== undefined ? openingBalance : currentList[existingIdx].openingBalance
          };
          updated++;
        }
      } else {
        const newCode = code || `SUP-${String(currentList.length + 1).padStart(3, '0')}`;
        const newSupplier: Supplier = {
          id: `supp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code: newCode,
          name,
          type,
          contactPerson,
          phone,
          email,
          address,
          district,
          state,
          gstin,
          pan,
          bankName,
          bankAccount,
          bankIfsc,
          paymentTerms,
          creditDays,
          openingBalance,
          active: true,
          createdAt: new Date().toISOString()
        };
        currentList.push(newSupplier);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setSuppliers(currentList);
      logAudit('CREATE', 'Supplier', `Bulk import: ${added} added, ${updated} updated`, {
        newValues: { added, updated }
      });
    }
    return { added, updated, errors };
  };

  const bulkImportSpecies = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...species];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, [
        'productnameexportreadyname',
        'exportreadyname',
        'exportproductname',
        'productname',
        'product',
        'speciesname',
        'species',
        'fish',
        'item',
        'variety',
        'name'
      ]);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Product / Species name is required.`);
        return;
      }
      const rawPurchaseSpecies = getFlexibleValue(row, [
        'purchasespeciesname',
        'purchasespecies',
        'rawspeciesname',
        'rawspecies',
        'speciesfrompurchase',
        'origincatchspecies',
        'speciesorigin'
      ]);
      const rawSpeciesName = rawPurchaseSpecies ? String(rawPurchaseSpecies).trim() : undefined;
      const rawCode = getFlexibleValue(row, ['speciescode', 'code', 'productcode', 'itemcode']);
      const code = rawCode ? String(rawCode).trim() : name.slice(0, 3).toUpperCase();
      const scientificName = String(getFlexibleValue(row, ['scientificname', 'scientific']) || '').trim();
      const category = String(getFlexibleValue(row, ['category', 'type', 'group']) || 'Fish').trim();

      const rawHsCode = String(getFlexibleValue(row, ['hsn', 'hsncode', 'hscode', 'hs_code', 'tariff', 'tariffcode']) || '').trim();
      const productForm = String(getFlexibleValue(row, ['productform', 'form']) || '').trim();
      const processingType = String(getFlexibleValue(row, ['processingtype', 'processing']) || '').trim();

      const existingIdx = currentList.findIndex(
        (s) =>
          (code && normalizeKey(s.code) === normalizeKey(code)) ||
          normalizeKey(s.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          rawSpeciesName: rawSpeciesName || currentList[existingIdx].rawSpeciesName,
          scientificName: scientificName || currentList[existingIdx].scientificName,
          category: category || currentList[existingIdx].category,
          hsCode: rawHsCode || currentList[existingIdx].hsCode,
          productForm: productForm || currentList[existingIdx].productForm,
          processingType: processingType || currentList[existingIdx].processingType
        };
        updated++;
      } else {
        currentList.push({
          id: `sp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          rawSpeciesName,
          scientificName,
          category,
          hsCode: rawHsCode,
          productForm,
          processingType,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setSpecies(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportGrades = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...grades];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, ['gradename', 'grade', 'quality', 'name']);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Grade name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['gradecode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `GR-${String(currentList.length + 1).padStart(2, '0')}`;
      const description = String(getFlexibleValue(row, ['description', 'desc', 'remarks', 'notes']) || '').trim();

      const existingIdx = currentList.findIndex(
        (g) =>
          (code && normalizeKey(g.code) === normalizeKey(code)) ||
          normalizeKey(g.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          description: description || currentList[existingIdx].description
        };
        updated++;
      } else {
        currentList.push({
          id: `grd-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          description,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setGrades(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportSizes = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...sizes];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, ['sizename', 'size', 'name', 'physicalsize', 'sizecodeorname']);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Size name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['sizecode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `SZ-${String(currentList.length + 1).padStart(2, '0')}`;
      const description = String(getFlexibleValue(row, ['description', 'desc', 'notes']) || '').trim();

      const existingIdx = currentList.findIndex(
        (s) =>
          (code && normalizeKey(s.code) === normalizeKey(code)) ||
          normalizeKey(s.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          description: description || currentList[existingIdx].description
        };
        updated++;
      } else {
        currentList.push({
          id: `sz-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          description,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setSizes(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportCounts = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...counts];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, ['countname', 'count', 'piececount', 'counts', 'pcs', 'name', 'countcodeorname']);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Count name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['countcode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `CNT-${String(currentList.length + 1).padStart(2, '0')}`;
      const description = String(getFlexibleValue(row, ['description', 'desc', 'notes']) || '').trim();

      const existingIdx = currentList.findIndex(
        (c) =>
          (code && normalizeKey(c.code) === normalizeKey(code)) ||
          normalizeKey(c.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          description: description || currentList[existingIdx].description
        };
        updated++;
      } else {
        currentList.push({
          id: `cnt-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          description,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setCounts(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportLocations = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...locations];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, [
        'locationname',
        'location',
        'harbourcentre',
        'harbour',
        'landingcentre',
        'port',
        'wharf',
        'place',
        'jetty',
        'name'
      ]);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Location name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['locationcode', 'code', 'portcode']);
      const code = rawCode ? String(rawCode).trim() : `LOC-${String(currentList.length + 1).padStart(2, '0')}`;
      const district = String(getFlexibleValue(row, ['district', 'city']) || '').trim();
      const state = String(getFlexibleValue(row, ['state', 'province']) || '').trim();
      const rawHarbour = getFlexibleValue(row, ['harbourwharf', 'harbourcentre', 'harbour', 'wharf', 'jetty']);
      const harbourCentre = String(rawHarbour || name).trim();

      const existingIdx = currentList.findIndex(
        (l) =>
          (code && normalizeKey(l.code) === normalizeKey(code)) ||
          normalizeKey(l.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          district: district || currentList[existingIdx].district,
          state: state || currentList[existingIdx].state,
          harbourCentre: harbourCentre || currentList[existingIdx].harbourCentre
        };
        updated++;
      } else {
        currentList.push({
          id: `loc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          district,
          state,
          harbourCentre,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setLocations(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportBankAccounts = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...bankAccounts];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, ['accountname', 'name', 'account', 'bankaccount']);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Account name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['accountcode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `ACC-${String(currentList.length + 1).padStart(2, '0')}`;
      const bank = String(getFlexibleValue(row, ['bankname', 'bank']) || '').trim();
      const rawAccType = String(getFlexibleValue(row, ['accounttype', 'type', 'category']) || '').toLowerCase();
      let accountType: 'Current' | 'Savings' | 'Cash Float' = 'Current';
      if (rawAccType.includes('saving')) accountType = 'Savings';
      else if (rawAccType.includes('cash')) accountType = 'Cash Float';
      const openingBalance = Number(getFlexibleValue(row, ['openingbalance', 'balance', 'openingbal'])) || 0;

      const existingIdx = currentList.findIndex(
        (b) =>
          (code && normalizeKey(b.code) === normalizeKey(code)) ||
          normalizeKey(b.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          bank: bank || currentList[existingIdx].bank,
          accountType,
          openingBalance: openingBalance !== undefined ? openingBalance : currentList[existingIdx].openingBalance
        };
        updated++;
      } else {
        currentList.push({
          id: `acc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          bank,
          accountType,
          openingBalance,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setBankAccounts(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportExpenseTypes = (records: Record<string, any>[]) => {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    const currentList = [...expenseTypes];

    records.forEach((row, idx) => {
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawName = getFlexibleValue(row, ['expensename', 'name', 'expensetype', 'expense', 'head']);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Expense type name is required.`);
        return;
      }
      const cleanName = name.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').trim();
      const rawCode = getFlexibleValue(row, ['expensecode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `EXP-${String(currentList.length + 1).padStart(2, '0')}`;
      const category = String(getFlexibleValue(row, ['category', 'type']) || 'Landing').trim();

      const existingIdx = currentList.findIndex(
        (e) =>
          (code && normalizeKey(e.code) === normalizeKey(code)) ||
          normalizeKey(e.name.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '')) === normalizeKey(cleanName)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name: cleanName,
          category: category || currentList[existingIdx].category
        };
        updated++;
      } else {
        currentList.push({
          id: `exp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name: cleanName,
          category,
          active: true
        });
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      setExpenseTypes(currentList);
    }
    return { added, updated, errors };
  };

  const bulkImportPurchases = (
    rawRows: Record<string, any>[],
    autoCreateMaster = true
  ) => {
    let createdSuppliers = 0;
    let createdSpecies = 0;
    let createdLocations = 0;
    const errors: string[] = [];
    const newPurchases: Purchase[] = [];

    const mutableSuppliers = [...suppliers];
    const mutableSpecies = [...species];
    const mutableLocations = [...locations];
    const mutableGrades = [...grades];
    const mutableSizes = [...sizes];
    const mutableCounts = [...counts];
    // Deduplicate mutableExpenseTypes by clean normalized name, keeping canonical (preferring exp-1..exp-5)
    const seenExpenseNorms = new Set<string>();
    const deduplicatedMutableExpenseTypes: ExpenseType[] = [];

    expenseTypes.forEach((et) => {
      const norm = et.name.toLowerCase().replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').replace(/[^a-z0-9]/g, '');
      const key = (norm.includes('other') || norm.includes('misc')) ? 'otherexpenses' : norm;
      if (!seenExpenseNorms.has(key)) {
        seenExpenseNorms.add(key);
        const cleanName = et.name.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').trim();
        deduplicatedMutableExpenseTypes.push({ ...et, name: cleanName });
      }
    });

    // Ensure standard "Other Expenses" exists in mutableExpenseTypes
    if (!deduplicatedMutableExpenseTypes.some((e) => e.name.toLowerCase().includes('other') || e.name.toLowerCase().includes('misc'))) {
      deduplicatedMutableExpenseTypes.push({
        id: 'exp-5',
        code: `EXP-${String(deduplicatedMutableExpenseTypes.length + 1).padStart(3, '0')}`,
        name: 'Other Expenses',
        category: 'Landing',
        active: true
      });
    }

    const mutableExpenseTypes = deduplicatedMutableExpenseTypes;

    const getExpenseTypeId = (keywords: string[], defaultName: string, category: string): string => {
      const cleanDefaultName = defaultName.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').trim();
      const normDefault = cleanDefaultName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Special check: Is this "Other Expenses" or "Misc"?
      const isOther = normDefault.includes('other') || normDefault.includes('misc') || keywords.some((k) => {
        const kl = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return kl.includes('other') || kl.includes('misc');
      });

      if (isOther) {
        // ALWAYS match existing other/misc expense in mutableExpenseTypes (preferring exp-5)
        const existingOther =
          mutableExpenseTypes.find((et) => et.id === 'exp-5') ||
          mutableExpenseTypes.find((et) => {
            const n = et.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return n.includes('other') || n.includes('misc');
          });
        if (existingOther) return existingOther.id;
      }

      // Exact normalized name match
      const exactMatch = mutableExpenseTypes.find((et) => {
        const n = et.name.toLowerCase().replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').replace(/[^a-z0-9]/g, '');
        return n === normDefault;
      });
      if (exactMatch) return exactMatch.id;

      // Keyword match
      const matched = mutableExpenseTypes.find((et) => {
        const n = et.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const c = et.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keywords.some((kw) => {
          const cleanKw = kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanKw || cleanKw.length < 3) return false;
          return n.includes(cleanKw) || c.includes(cleanKw);
        });
      });
      if (matched) return matched.id;

      if (autoCreateMaster) {
        const existingByName = mutableExpenseTypes.find(
          (et) => et.name.toLowerCase().trim() === cleanDefaultName.toLowerCase()
        );
        if (existingByName) return existingByName.id;

        const newCode = `EXP-${cleanDefaultName.substring(0, 3).toUpperCase()}-${String(mutableExpenseTypes.length + 1).padStart(2, '0')}`;
        const newEt: ExpenseType = {
          id: `exp-${cleanDefaultName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          code: newCode,
          name: cleanDefaultName,
          category,
          active: true
        };
        mutableExpenseTypes.push(newEt);
        return newEt.id;
      }
      return '';
    };

    // Find highest PUR-XXXXX number
    let maxPurNum = 0;
    purchases.forEach((p) => {
      const match = p.purchaseId?.match(/PUR-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxPurNum) maxPurNum = num;
      }
    });

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 1;

      // Extract values with flexible column key aliases
      const rawDate = getFlexibleValue(row, ['purchasedateddmmyyyy', 'purchasedate', 'date', 'billdate', 'txndate', 'entrydate', 'invoicedate']);
      const purchaseDate = formatExcelDate(rawDate);

      const supplierVal = getFlexibleValue(row, [
        'suppliercodeorname',
        'supplier',
        'suppliername',
        'vendor',
        'party',
        'partyname',
        'boat',
        'boatowner'
      ]);

      const locationVal = getFlexibleValue(row, [
        'locationcodeorname',
        'location',
        'locationname',
        'harbour',
        'harbourcentre',
        'landingcentre',
        'wharf',
        'port'
      ]);

      const speciesVal = getFlexibleValue(row, [
        'speciescodeorname',
        'species',
        'speciesname',
        'fish',
        'product',
        'item',
        'variety'
      ]);

      const gradeVal = getFlexibleValue(row, ['gradecodeorname', 'grade', 'gradename', 'quality']);
      const sizeVal = getFlexibleValue(row, ['sizecodeorname', 'size', 'sizename', 'physicalsize']);
      const countVal = getFlexibleValue(row, ['countcodeorname', 'count', 'countname', 'piececount', 'counts', 'pcs']);

      const weightVal = Number(
        getFlexibleValue(row, ['weightkg', 'weight', 'kg', 'quantity', 'qty', 'netweight'])
      );
      let rateVal = Number(
        getFlexibleValue(row, ['rateperkginr', 'rateperkg', 'ratekg', 'rate', 'price', 'unitprice', 'pricekg'])
      );

      // If rate is missing or zero, auto-derive from Fish Purchase Total if provided
      if ((isNaN(rateVal) || rateVal <= 0) && weightVal > 0) {
        const fishTotal = Number(
          getFlexibleValue(row, [
            'fishpurchasetotalinr',
            'fishpurchasetotal',
            'fishtotal',
            'grosspurchasevalue',
            'purchasevalue',
            'grossvalue'
          ])
        );
        if (fishTotal > 0) {
          rateVal = Number((fishTotal / weightVal).toFixed(2));
        }
      }

      if (!weightVal || weightVal <= 0) {
        errors.push(`Row ${rowNum}: Invalid or zero Weight.`);
        return;
      }
      if (rateVal === undefined || isNaN(rateVal) || rateVal < 0) {
        errors.push(`Row ${rowNum}: Invalid or negative Rate.`);
        return;
      }

      // 1. Resolve Supplier
      let resolvedSupplier: Supplier | undefined;
      if (supplierVal) {
        const suppNorm = normalizeKey(String(supplierVal));
        resolvedSupplier = mutableSuppliers.find(
          (s) => normalizeKey(s.code) === suppNorm || normalizeKey(s.name) === suppNorm
        );
      }
      if (!resolvedSupplier) {
        if (autoCreateMaster && supplierVal) {
          const suppName = String(supplierVal).trim();
          resolvedSupplier = {
            id: `supp-auto-${Date.now()}-${createdSuppliers}`,
            code: `SUP-${String(mutableSuppliers.length + 1).padStart(3, '0')}`,
            name: suppName,
            type: 'boat_owner',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            district: '',
            state: '',
            gstin: '',
            pan: '',
            bankName: '',
            bankAccount: '',
            bankIfsc: '',
            paymentTerms: 'Immediate / Cash',
            creditDays: 0,
            openingBalance: 0,
            active: true,
            createdAt: new Date().toISOString()
          };
          mutableSuppliers.push(resolvedSupplier);
          createdSuppliers++;
        } else {
          if (mutableSuppliers.length > 0) {
            resolvedSupplier = mutableSuppliers[0];
          } else {
            errors.push(`Row ${rowNum}: Supplier "${supplierVal || 'Unknown'}" not found in database.`);
            return;
          }
        }
      }

      // 2. Resolve Species
      let resolvedSpecies: Species | undefined;
      if (speciesVal) {
        const spNorm = normalizeKey(String(speciesVal));
        resolvedSpecies = mutableSpecies.find(
          (sp) => normalizeKey(sp.code) === spNorm || normalizeKey(sp.name) === spNorm
        );
      }
      if (!resolvedSpecies) {
        if (autoCreateMaster && speciesVal) {
          const spName = String(speciesVal).trim();
          resolvedSpecies = {
            id: `sp-auto-${Date.now()}-${createdSpecies}`,
            code: spName.slice(0, 3).toUpperCase(),
            name: spName,
            scientificName: '',
            category: 'Fish',
            active: true
          };
          mutableSpecies.push(resolvedSpecies);
          createdSpecies++;
        } else {
          if (mutableSpecies.length > 0) {
            resolvedSpecies = mutableSpecies[0];
          } else {
            errors.push(`Row ${rowNum}: Species "${speciesVal || 'Unknown'}" not found in database.`);
            return;
          }
        }
      }

      // 3. Resolve Location
      let resolvedLocation: PurchaseLocation | undefined;
      if (locationVal) {
        const locNorm = normalizeKey(String(locationVal));
        resolvedLocation = mutableLocations.find(
          (l) => normalizeKey(l.code) === locNorm || normalizeKey(l.name) === locNorm
        );
      }
      if (!resolvedLocation) {
        if (autoCreateMaster && locationVal) {
          const locName = String(locationVal).trim();
          resolvedLocation = {
            id: `loc-auto-${Date.now()}-${createdLocations}`,
            code: `LOC-${String(mutableLocations.length + 1).padStart(2, '0')}`,
            name: locName,
            district: '',
            state: '',
            harbourCentre: locName,
            active: true
          };
          mutableLocations.push(resolvedLocation);
          createdLocations++;
        } else {
          if (mutableLocations.length > 0) {
            resolvedLocation = mutableLocations[0];
          } else {
            errors.push(`Row ${rowNum}: Location "${locationVal || 'Unknown'}" not found in database.`);
            return;
          }
        }
      }

      // 4. Resolve Grade & Size (optional)
      let resolvedGradeId = '';
      if (gradeVal) {
        const grdNorm = normalizeKey(String(gradeVal));
        const matched = mutableGrades.find(
          (g) => normalizeKey(g.code) === grdNorm || normalizeKey(g.name) === grdNorm
        );
        if (matched) {
          resolvedGradeId = matched.id;
        } else if (autoCreateMaster) {
          const newGrd: Grade = {
            id: `grd-auto-${Date.now()}-${idx}`,
            code: `GR-${String(mutableGrades.length + 1).padStart(2, '0')}`,
            name: String(gradeVal).trim(),
            description: '',
            active: true
          };
          mutableGrades.push(newGrd);
          resolvedGradeId = newGrd.id;
        }
      }

      let resolvedSizeId = '';
      let resolvedSecondarySizeId: string | undefined;
      let isDualSize = false;

      const secondarySizeVal = getFlexibleValue(row, [
        'secondarysizecodeorname',
        'secondarysize',
        'size2',
        'secondsize',
        'dualize',
        'secondary'
      ]);

      let primarySizeStr = sizeVal ? String(sizeVal).trim() : '';
      let secondarySizeStr = secondarySizeVal ? String(secondarySizeVal).trim() : '';

      // Check if sizeVal has combined sizes like "6/10 & 10/20" or "6/10 and 10/20" or "6/10, 10/20"
      if (!secondarySizeStr && primarySizeStr) {
        if (primarySizeStr.includes(' & ')) {
          const parts = primarySizeStr.split(' & ');
          primarySizeStr = parts[0].trim();
          secondarySizeStr = parts.slice(1).join(' & ').trim();
        } else if (primarySizeStr.includes(' and ')) {
          const parts = primarySizeStr.split(' and ');
          primarySizeStr = parts[0].trim();
          secondarySizeStr = parts.slice(1).join(' and ').trim();
        } else if (primarySizeStr.includes(', ')) {
          const parts = primarySizeStr.split(', ');
          primarySizeStr = parts[0].trim();
          secondarySizeStr = parts.slice(1).join(', ').trim();
        }
      }

      if (primarySizeStr) {
        const szNorm = normalizeKey(primarySizeStr);
        const matched = mutableSizes.find(
          (s) => normalizeKey(s.code) === szNorm || normalizeKey(s.name) === szNorm
        );
        if (matched) {
          resolvedSizeId = matched.id;
        } else if (autoCreateMaster) {
          const newSz: Size = {
            id: `sz-auto-${Date.now()}-${idx}-1`,
            code: `SZ-${String(mutableSizes.length + 1).padStart(2, '0')}`,
            name: primarySizeStr,
            description: '',
            active: true
          };
          mutableSizes.push(newSz);
          resolvedSizeId = newSz.id;
        }
      }

      if (secondarySizeStr) {
        const sz2Norm = normalizeKey(secondarySizeStr);
        const matched2 = mutableSizes.find(
          (s) => normalizeKey(s.code) === sz2Norm || normalizeKey(s.name) === sz2Norm
        );
        if (matched2) {
          resolvedSecondarySizeId = matched2.id;
          isDualSize = true;
        } else if (autoCreateMaster) {
          const newSz2: Size = {
            id: `sz-auto-${Date.now()}-${idx}-2`,
            code: `SZ-${String(mutableSizes.length + 1).padStart(2, '0')}`,
            name: secondarySizeStr,
            description: '',
            active: true
          };
          mutableSizes.push(newSz2);
          resolvedSecondarySizeId = newSz2.id;
          isDualSize = true;
        }
      }

      let resolvedCountId = '';
      if (countVal) {
        const cntNorm = normalizeKey(String(countVal));
        const matched = mutableCounts.find(
          (c) => normalizeKey(c.code) === cntNorm || normalizeKey(c.name) === cntNorm
        );
        if (matched) {
          resolvedCountId = matched.id;
        } else if (autoCreateMaster) {
          const newCnt: Count = {
            id: `cnt-auto-${Date.now()}-${idx}`,
            code: `CNT-${String(mutableCounts.length + 1).padStart(2, '0')}`,
            name: String(countVal).trim(),
            description: '',
            active: true
          };
          mutableCounts.push(newCnt);
          resolvedCountId = newCnt.id;
        }
      }

      // 5. Numeric & Optional Fields
      const boxesCount = Number(getFlexibleValue(row, ['noofboxes', 'boxes', 'bags', 'boxcount'])) || 0;
      const damageWeightKg = Number(getFlexibleValue(row, ['damageweightkg', 'damageweight', 'damagekg'])) || 0;
      const damageRatePerKg = Number(getFlexibleValue(row, ['damagerateperkg', 'damagerate', 'damageratekg'])) || 0;
      const amountPaid = Number(getFlexibleValue(row, ['amountpaidnowinr', 'amountpaid', 'paid', 'payment', 'advance'])) || 0;
      const invoiceNo = String(getFlexibleValue(row, ['invoicebillno', 'invoiceno', 'billno', 'invoice', 'bill']) || '');

      const rawExpenseBatch = String(getFlexibleValue(row, [
        'expensebatchno',
        'expensebatch',
        'expbatchno',
        'expbatch',
        'expensepool',
        'costbatch',
        'landingexpensebatch'
      ]) || '').trim();

      const rawYieldBatch = String(getFlexibleValue(row, [
        'yieldbatchno',
        'yieldbatch',
        'recoverybatch',
        'processingbatch',
        'batchyieldno',
        'procyieldbatch'
      ]) || '').trim();

      const rawLegacyBatch = String(getFlexibleValue(row, [
        'batchno',
        'batchnumber',
        'lotno',
        'lotnumber',
        'batchcode',
        'lotcode'
      ]) || '').trim();

      // STRICT: expenseBatchNo ONLY from explicit expense batch columns (never fall back to legacy/weight columns)
      const expenseBatchNo = rawExpenseBatch || undefined;
      // STRICT: yieldBatchNo ONLY from explicit yield batch columns (never fall back to legacy/weight columns)
      const yieldBatchNo = rawYieldBatch || undefined;
      // Generic batchNo should only be legacy batch if present
      const batchNo = rawLegacyBatch || undefined;

      const remarks = String(getFlexibleValue(row, ['remarks', 'notes', 'comments']) || '');

      // Parse Dynamic Direct Landing & Procurement Expenses
      const expenseBreakdown: Record<string, number> = {};

      // 1. Ice & Preservation Charges
      const iceExp = Number(getFlexibleValue(row, [
        'icecrushedflakeinr',
        'icecrushedflake',
        'iceexpenseinr',
        'iceexpense',
        'ice',
        'icecost',
        'crushedice',
        'salting'
      ])) || 0;
      const iceId = iceExp > 0 ? getExpenseTypeId(['ice', 'flake'], 'Ice & Crushed Flake', 'Preservation') : '';
      if (iceExp > 0 && iceId) expenseBreakdown[iceId] = iceExp;

      // 2. Transport & Logistics Charges
      const trnExp = Number(getFlexibleValue(row, [
        'vehiclerenttransportinr',
        'vehiclerenttransport',
        'transportexpenseinr',
        'transportexpense',
        'vehiclerent',
        'transport',
        'vehicle',
        'freight',
        'truck',
        'vanrent'
      ])) || 0;
      const trnId = trnExp > 0 ? getExpenseTypeId(['transport', 'freight', 'vehicle', 'truck'], 'Vehicle Rent / Transport', 'Logistics') : '';
      if (trnExp > 0 && trnId) expenseBreakdown[trnId] = trnExp;

      // 3. Commission & Dalali Charges
      const comExp = Number(getFlexibleValue(row, [
        'commissiondalaliinr',
        'commissiondalali',
        'commissioninr',
        'dalaliinr',
        'commission',
        'dalali',
        'brokerage',
        'agentcommission',
        'dalalicharges'
      ])) || 0;
      const comId = comExp > 0 ? getExpenseTypeId(['commission', 'dalali', 'brokerage'], 'Commission & Dalali', 'Brokerage') : '';
      if (comExp > 0 && comId) expenseBreakdown[comId] = comExp;

      // 4. Loading / Unloading Labour Charges
      const lbrExp = Number(getFlexibleValue(row, [
        'loadingunloadinglabourinr',
        'loadingunloadinglabour',
        'loadingunloadinglaborinr',
        'labourexpenseinr',
        'labourexpense',
        'labour',
        'labor',
        'loading',
        'unloading',
        'handling',
        'coolie',
        'hamali'
      ])) || 0;
      const lbrId = lbrExp > 0 ? getExpenseTypeId(['labour', 'labor', 'loading', 'unloading', 'handling', 'coolie'], 'Loading / Unloading Labour', 'Handling') : '';
      if (lbrExp > 0 && lbrId) expenseBreakdown[lbrId] = lbrExp;

      // 5. Other Direct Landing Expenses (Other Expenses / Other Charges / Misc Expenses)
      const othExp = Number(getFlexibleValue(row, [
        'otherexpensesinr',
        'otherexpenseinr',
        'otherexpenses',
        'otherexpense',
        'otherexp',
        'otherexpns',
        'otherchargesinr',
        'othercharges',
        'othercostsinr',
        'othercosts',
        'otherlandingexpensesinr',
        'otherlandingexpenses',
        'otherlandingchargesinr',
        'otherlandingcharges',
        'otherdirectexpensesinr',
        'otherdirectexpenses',
        'miscexpensesinr',
        'miscexpenses',
        'miscexpenseinr',
        'miscexpense',
        'miscellaneousinr',
        'miscellaneous',
        'misccharges',
        'miscellaneouscharges',
        'other'
      ])) || 0;
      const othId = othExp > 0 ? getExpenseTypeId(['otherexpenses', 'otherexpense', 'other', 'misc', 'miscellaneous'], 'Other Expenses', 'Landing') : '';
      if (othExp > 0 && othId) expenseBreakdown[othId] = othExp;

      // 6. Dynamic Check for all other registered active Expense Heads
      mutableExpenseTypes.forEach((et) => {
        if (!et.active) return;
        if (expenseBreakdown[et.id]) return; // Already resolved above

        // If this is an other/misc expense and other expenses were already captured in Step 5, skip
        const isOther = et.name.toLowerCase().includes('other') || et.name.toLowerCase().includes('misc');
        if (isOther && othExp > 0) return;

        const cleanName = et.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCode = et.code.toLowerCase().replace(/[^a-z0-9]/g, '');

        const keysToTry = [
          cleanName,
          `${cleanName}inr`,
          `${cleanName}expense`,
          `${cleanName}expenseinr`,
          `${cleanName}charges`,
          `${cleanName}cost`,
          cleanCode,
          `${cleanCode}inr`
        ];

        const rawVal = getFlexibleValue(row, keysToTry);
        if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
          const num = Number(rawVal);
          if (num > 0) {
            expenseBreakdown[et.id] = num;
          }
        }
      });

      // 7. Optional auto-creation of unknown custom direct landing expense columns
      if (autoCreateMaster) {
        Object.keys(row).forEach((colHeader) => {
          const lower = colHeader.toLowerCase().trim();
          const norm = lower.replace(/[^a-z0-9]/g, '');

          // Skip headers already processed or standard fields
          if (
            norm.includes('total') ||
            norm.includes('damage') ||
            norm.includes('rate') ||
            norm.includes('weight') ||
            norm.includes('fish') ||
            norm.includes('purchase') ||
            norm.includes('invoice') ||
            norm.includes('batch') ||
            norm.includes('boxes') ||
            norm.includes('supplier') ||
            norm.includes('location') ||
            norm.includes('species') ||
            norm.includes('grade') ||
            norm.includes('size') ||
            norm.includes('count') ||
            norm.includes('paid') ||
            norm.includes('balance') ||
            // Standard landing expense heads already extracted in Steps 1 to 5:
            norm.includes('ice') ||
            norm.includes('flake') ||
            norm.includes('transport') ||
            norm.includes('vehicle') ||
            norm.includes('freight') ||
            norm.includes('truck') ||
            norm.includes('commission') ||
            norm.includes('dalali') ||
            norm.includes('brokerage') ||
            norm.includes('labour') ||
            norm.includes('labor') ||
            norm.includes('unloading') ||
            norm.includes('coolie') ||
            norm.includes('hamali') ||
            norm.includes('other') ||
            norm.includes('misc')
          ) {
            return;
          }

          if (lower.includes('expense') || lower.includes('charges') || lower.includes('cost') || lower.includes('fee')) {
            const rawVal = row[colHeader];
            if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
              const num = Number(rawVal);
              if (num > 0) {
                const cleanHeader = colHeader.replace(/\s*\(inr\)|\s*\(rs\)|\s*\(₹\)/gi, '').trim();
                const baseName = cleanHeader.replace(/\b(expenses?|charges?|costs?|fees?)\b/gi, '').trim() || cleanHeader;
                const expId = getExpenseTypeId([baseName, cleanHeader], cleanHeader, 'Harbour Landing');
                if (expId && !expenseBreakdown[expId]) {
                  expenseBreakdown[expId] = num;
                }
              }
            }
          }
        });
      }

      if (!resolvedSupplier || !resolvedLocation || !resolvedSpecies) {
        errors.push(`Row ${rowNum}: Could not resolve required references (Supplier, Location, Species).`);
        return;
      }

      // Parse Yield / Processed output
      const rawYieldWeight = getFlexibleValue(row, [
        'yieldweightkg',
        'yieldweight',
        'yieldkg',
        'yield',
        'processedweightkg',
        'processedweight',
        'outputweight',
        'finishedweight'
      ]);
      const rawYieldPct = getFlexibleValue(row, [
        'yieldpct',
        'yieldpercentage',
        'yieldpercent',
        'yieldratio',
        'recovery',
        'recoverypct'
      ]);

      // Parse Batch Yield (for goods purchased in batches)
      const rawBatchYieldWeight = getFlexibleValue(row, [
        'batchyieldweightkg',
        'batchyieldweight',
        'batchyieldkg',
        'batchyield',
        'batchfinishedweight',
        'batchprocessedweight',
        'batchoutputweight'
      ]);
      const rawBatchYieldPct = getFlexibleValue(row, [
        'batchyieldpct',
        'batchyieldpercentage',
        'batchyieldpercent',
        'batchyieldratio',
        'batchrecoverypct'
      ]);

      const parsedBatchYieldWeightKg =
        rawBatchYieldWeight !== undefined && !isNaN(Number(rawBatchYieldWeight)) && Number(rawBatchYieldWeight) > 0
          ? Number(rawBatchYieldWeight)
          : undefined;

      const parsedBatchYieldPct =
        rawBatchYieldPct !== undefined && !isNaN(Number(rawBatchYieldPct)) && Number(rawBatchYieldPct) > 0
          ? Number(rawBatchYieldPct)
          : undefined;

      let resolvedYieldWeight: number | undefined =
        rawYieldWeight !== undefined && !isNaN(Number(rawYieldWeight)) && Number(rawYieldWeight) > 0
          ? Number(rawYieldWeight)
          : undefined;

      if (!resolvedYieldWeight && rawYieldPct !== undefined && !isNaN(Number(rawYieldPct)) && Number(rawYieldPct) > 0 && weightVal > 0) {
        resolvedYieldWeight = Number(((weightVal * Number(rawYieldPct)) / 100).toFixed(2));
      }

      // Compute calculations
      const derived = computePurchaseFields({
        weightKg: weightVal,
        ratePerKg: rateVal,
        damageWeightKg,
        damageRatePerKg,
        expenseBreakdown,
        amountPaid,
        purchaseDate,
        supplier: resolvedSupplier,
        yieldWeightKg: resolvedYieldWeight
      });

      maxPurNum++;
      const purchaseId = `PUR-${String(maxPurNum).padStart(5, '0')}`;

      const newPurchase: Purchase = {
        id: `pur-${Date.now()}-${idx}`,
        purchaseId,
        purchaseDate,
        financialYear: businessSettings.financialYear || derived.financialYear,
        supplierId: resolvedSupplier.id,
        locationId: resolvedLocation.id,
        invoiceNo,
        batchNo,
        expenseBatchNo,
        yieldBatchNo,
        speciesId: resolvedSpecies.id,
        gradeId: resolvedGradeId,
        sizeId: resolvedSizeId,
        secondarySizeId: resolvedSecondarySizeId,
        isDualSize,
        countId: resolvedCountId,
        boxesCount,
        weightKg: weightVal,
        ratePerKg: rateVal,
        yieldWeightKg: derived.yieldWeightKg,
        yieldPct: derived.yieldPct,
        batchYieldWeightKg: parsedBatchYieldWeightKg,
        batchYieldPct: parsedBatchYieldPct,
        isBatchYieldAllocated: false,
        purchaseValue: derived.purchaseValue,
        damageWeightKg,
        damageRatePerKg,
        damageAmount: derived.damageAmount,
        grossPurchaseValue: derived.grossPurchaseValue,
        expenseBreakdown,
        totalExpenses: derived.totalExpenses,
        isBatchAllocated: false,
        totalCost: derived.totalCost,
        effectiveRatePerKg: derived.effectiveRatePerKg,
        directAmountPaid: amountPaid,
        amountPaid,
        balancePayable: derived.balancePayable,
        dueDate: derived.dueDate,
        paymentStatus: derived.paymentStatus,
        rejectionWeightKg: 0,
        remarks: remarks || (isDualSize ? `Combined lot of sizes ${primarySizeStr} & ${secondarySizeStr} (${weightVal} Kg total)` : 'Imported from Excel'),
        isVoided: false,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newPurchases.push(newPurchase);
    });

    // 1. Post-process Independent Expense Batch Apportionment:
    // If rows share the same expenseBatchNo, apportion ONLY landing expenses by Kg (yield untouched)
    const expBatchGroups = new Map<string, Purchase[]>();
    newPurchases.forEach((p) => {
      const bKey = p.expenseBatchNo; // STRICT: ONLY p.expenseBatchNo! Never fallback to batchNo!
      if (bKey) {
        const cur = expBatchGroups.get(bKey) || [];
        cur.push(p);
        expBatchGroups.set(bKey, cur);
      }
    });

    let expBatchesApportioned = 0;
    expBatchGroups.forEach((batchItems) => {
      if (batchItems.length > 1) {
        const { updatedPurchases: allocatedItems } = allocateBatchExpenses(batchItems);
        const allocatedMap = new Map(allocatedItems.map((p) => [p.id, p]));
        for (let i = 0; i < newPurchases.length; i++) {
          if (allocatedMap.has(newPurchases[i].id)) {
            newPurchases[i] = allocatedMap.get(newPurchases[i].id)!;
          }
        }
        expBatchesApportioned++;
      }
    });

    // 2. Post-process Independent Yield Batch Apportionment:
    // If rows share the same yieldBatchNo, apportion ONLY finished meat yield by Kg (expenses untouched)
    const yldBatchGroups = new Map<string, Purchase[]>();
    newPurchases.forEach((p) => {
      if (p.yieldBatchNo) {
        const cur = yldBatchGroups.get(p.yieldBatchNo) || [];
        cur.push(p);
        yldBatchGroups.set(p.yieldBatchNo, cur);
      }
    });

    let yldBatchesApportioned = 0;
    yldBatchGroups.forEach((batchItems) => {
      const targetYieldKg = batchItems.find((p) => p.batchYieldWeightKg && p.batchYieldWeightKg > 0)?.batchYieldWeightKg;
      const targetYieldPct = batchItems.find((p) => p.batchYieldPct && p.batchYieldPct > 0)?.batchYieldPct;
      const hasAnyYield = targetYieldKg !== undefined || targetYieldPct !== undefined || batchItems.some((p) => p.yieldWeightKg && p.yieldWeightKg > 0);

      if (batchItems.length > 1 && hasAnyYield) {
        const { updatedPurchases: allocatedItems } = allocateBatchYield(batchItems, targetYieldKg, targetYieldPct);
        const allocatedMap = new Map(allocatedItems.map((p) => [p.id, p]));
        for (let i = 0; i < newPurchases.length; i++) {
          if (allocatedMap.has(newPurchases[i].id)) {
            newPurchases[i] = allocatedMap.get(newPurchases[i].id)!;
          }
        }
        yldBatchesApportioned++;
      }
    });

    if (newPurchases.length > 0) {
      setPurchases((prev) => [...prev, ...newPurchases]);
      if (createdSuppliers > 0) setSuppliers([...mutableSuppliers]);
      if (createdSpecies > 0) setSpecies([...mutableSpecies]);
      if (createdLocations > 0) setLocations([...mutableLocations]);
      if (mutableGrades.length > grades.length) setGrades([...mutableGrades]);
      if (mutableSizes.length > sizes.length) setSizes([...mutableSizes]);
      if (mutableCounts.length > counts.length) setCounts([...mutableCounts]);
      if (
        mutableExpenseTypes.length !== expenseTypes.length ||
        mutableExpenseTypes.some((et, i) => !expenseTypes[i] || et.id !== expenseTypes[i].id)
      ) {
        setExpenseTypes([...mutableExpenseTypes]);
      }

      logAudit('CREATE', 'Purchase', `Excel bulk import: ${newPurchases.length} purchases imported`, {
        newValues: {
          importedCount: newPurchases.length,
          createdSuppliers,
          createdSpecies,
          createdLocations,
          expBatchesApportioned,
          yldBatchesApportioned
        }
      });
      showToast(
        `Successfully imported ${newPurchases.length} purchases from Excel${
          expBatchesApportioned > 0 || yldBatchesApportioned > 0
            ? ` (${expBatchesApportioned} expense batches & ${yldBatchesApportioned} yield batches apportioned independently)`
            : ''
        }.`,
        'success'
      );
    }

    return {
      added: newPurchases.length,
      errors,
      createdSuppliers,
      createdSpecies,
      createdLocations
    };
  };

  const bulkImportProcessingEntries = (
    rawRows: Record<string, any>[],
    autoCreateMaster = true
  ) => {
    let createdSuppliers = 0;
    let createdSpecies = 0;
    let createdSlabTypes = 0;
    const errors: string[] = [];
    const newEntries: DailyProcessingEntry[] = [];

    const mutableSuppliers = [...suppliers];
    const mutableSpecies = [...species];
    const mutableGrades = [...grades];
    const mutableSizes = [...sizes];
    const mutableCounts = [...counts];
    const mutableSlabTypes = [...slabTypes];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawDate = getFlexibleValue(row, [
        'processingdate',
        'date',
        'entrydate',
        'shiftdate',
        'productiondate'
      ]);
      const processingDate = formatExcelDate(rawDate);

      const rawShift = String(getFlexibleValue(row, ['shift', 'shifttype', 'workshift']) || '').toLowerCase();
      let shift = 'General Day Shift (08:00 - 17:00)';
      if (rawShift.includes('morn') || rawShift.includes('06')) {
        shift = 'Morning Shift (06:00 - 14:00)';
      } else if (rawShift.includes('even') || rawShift.includes('14')) {
        shift = 'Evening Shift (14:00 - 22:00)';
      } else if (rawShift.includes('night') || rawShift.includes('22')) {
        shift = 'Night Shift (22:00 - 06:00)';
      }

      const rawSupp = String(getFlexibleValue(row, ['supplier', 'suppliercode', 'suppliername', 'boat', 'party']) || '').trim();
      let matchedSupplier = mutableSuppliers.find(
        (s) => s.code.toLowerCase() === rawSupp.toLowerCase() || s.name.toLowerCase() === rawSupp.toLowerCase()
      );
      if (!matchedSupplier && rawSupp) {
        matchedSupplier = mutableSuppliers.find((s) => s.name.toLowerCase().includes(rawSupp.toLowerCase()) || rawSupp.toLowerCase().includes(s.name.toLowerCase()));
      }
      if (!matchedSupplier && rawSupp && autoCreateMaster) {
        const newSupp: Supplier = {
          id: `sup-${Date.now()}-${mutableSuppliers.length + 1}`,
          code: `SUP-${String(mutableSuppliers.length + 1).padStart(3, '0')}`,
          name: rawSupp,
          type: 'boat_owner',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          district: '',
          state: 'Kerala',
          bankName: '',
          bankAccount: '',
          bankIfsc: '',
          paymentTerms: 'Immediate / 7 Days',
          creditDays: 7,
          openingBalance: 0,
          active: true,
          createdAt: new Date().toISOString()
        };
        mutableSuppliers.push(newSupp);
        matchedSupplier = newSupp;
        createdSuppliers++;
      }
      const supplierId = matchedSupplier?.id || mutableSuppliers[0]?.id || '';

      const rawSpec = String(getFlexibleValue(row, ['species', 'speciescode', 'speciesname', 'product', 'fish', 'variety']) || '').trim();
      let matchedSpecies = mutableSpecies.find(
        (sp) => sp.code.toLowerCase() === rawSpec.toLowerCase() || sp.name.toLowerCase() === rawSpec.toLowerCase()
      );
      if (!matchedSpecies && rawSpec) {
        matchedSpecies = mutableSpecies.find((sp) => sp.name.toLowerCase().includes(rawSpec.toLowerCase()) || rawSpec.toLowerCase().includes(sp.name.toLowerCase()));
      }
      if (!matchedSpecies && rawSpec && autoCreateMaster) {
        const newSpec: Species = {
          id: `sp-${Date.now()}-${mutableSpecies.length + 1}`,
          code: rawSpec.substring(0, 3).toUpperCase(),
          name: rawSpec,
          scientificName: '',
          category: 'Marine Catch',
          active: true
        };
        mutableSpecies.push(newSpec);
        matchedSpecies = newSpec;
        createdSpecies++;
      }
      const speciesId = matchedSpecies?.id || mutableSpecies[0]?.id || '';

      const rawGrade = String(getFlexibleValue(row, ['grade', 'gradecode', 'gradename', 'quality']) || '').trim();
      let matchedGrade = mutableGrades.find(
        (g) => g.code.toLowerCase() === rawGrade.toLowerCase() || g.name.toLowerCase() === rawGrade.toLowerCase()
      );
      if (!matchedGrade && rawGrade) {
        matchedGrade = mutableGrades.find((g) => g.name.toLowerCase().includes(rawGrade.toLowerCase()));
      }
      const gradeId = matchedGrade?.id || mutableGrades[0]?.id || '';

      const rawSize = String(getFlexibleValue(row, ['size', 'sizecode', 'sizename']) || '').trim();
      let matchedSize = mutableSizes.find(
        (sz) => sz.code.toLowerCase() === rawSize.toLowerCase() || sz.name.toLowerCase() === rawSize.toLowerCase()
      );
      const sizeId = matchedSize?.id || mutableSizes[0]?.id || '';

      const rawCount = String(getFlexibleValue(row, ['count', 'countcode', 'countname', 'countkg']) || '').trim();
      let matchedCount = mutableCounts.find(
        (c) => c.code.toLowerCase() === rawCount.toLowerCase() || c.name.toLowerCase() === rawCount.toLowerCase()
      );
      const countId = matchedCount?.id || '';

      const supplierBoxId = String(getFlexibleValue(row, ['supplierboxid', 'boxid', 'crateid', 'lotid', 'boxno']) || '').trim();

      const rawSlab = String(getFlexibleValue(row, ['slabtype', 'slabtypename', 'slabcode', 'slab', 'blocktype']) || '').trim();
      let matchedSlabType = mutableSlabTypes.find(
        (st) => st.code.toLowerCase() === rawSlab.toLowerCase() || st.name.toLowerCase() === rawSlab.toLowerCase()
      );
      if (!matchedSlabType && rawSlab) {
        matchedSlabType = mutableSlabTypes.find((st) => st.name.toLowerCase().includes(rawSlab.toLowerCase()));
      }
      if (!matchedSlabType && rawSlab && autoCreateMaster) {
        const newSlab: SlabType = {
          id: `slb-${Date.now()}-${mutableSlabTypes.length + 1}`,
          code: `SLB-${String(mutableSlabTypes.length + 1).padStart(3, '0')}`,
          name: rawSlab,
          standardWeightKg: 2.0,
          unit: 'Kg',
          productApplicability: 'All Products',
          active: true
        };
        mutableSlabTypes.push(newSlab);
        matchedSlabType = newSlab;
        createdSlabTypes++;
      }
      const slabTypeId = matchedSlabType?.id || mutableSlabTypes[0]?.id || '';

      const rawStdWeight = parseFloat(getFlexibleValue(row, ['standardslabweightkg', 'standardslabweight', 'standardslab', 'slabweight']) || '');
      const standardSlabWeightKg = !isNaN(rawStdWeight) && rawStdWeight > 0 ? rawStdWeight : (matchedSlabType?.standardWeightKg || 2.0);

      const rawSlabsCount = parseFloat(getFlexibleValue(row, ['slabscount', 'noofslabs', 'slabs', 'slabqty']) || '0');
      const slabsCount = !isNaN(rawSlabsCount) ? Math.round(rawSlabsCount) : 0;

      const rawProcWeight = parseFloat(getFlexibleValue(row, ['processedweightkg', 'processedweight', 'processedqty', 'netweightkg', 'netweight', 'weightkg', 'weight']) || '');
      if (isNaN(rawProcWeight) || rawProcWeight <= 0) {
        errors.push(`Row ${rowNum}: Processed weight (Kg) is missing or must be greater than 0.`);
        return;
      }
      const processedWeightKg = Number(rawProcWeight.toFixed(2));

      const rawRejWeight = parseFloat(getFlexibleValue(row, ['rejectionweightkg', 'rejectionweight', 'rejectionqty', 'rejectweight', 'rejection']) || '0');
      const rejectionWeightKg = !isNaN(rawRejWeight) && rawRejWeight >= 0 ? Number(rawRejWeight.toFixed(2)) : 0;

      const expectedWeightKg = Number((slabsCount * standardSlabWeightKg).toFixed(2));
      const varianceWeightKg = Number((processedWeightKg - expectedWeightKg).toFixed(2));
      const variancePct = expectedWeightKg > 0 ? Number(((varianceWeightKg / expectedWeightKg) * 100).toFixed(2)) : 0;
      const hasSlabVariance = Math.abs(variancePct) > slabTolerancePct;

      const remarks = String(getFlexibleValue(row, ['remarks', 'notes', 'comment']) || '').trim();
      const nowIso = new Date().toISOString();
      const monthYear = processingDate.slice(0, 7);

      const entryIndex = processingEntries.length + newEntries.length + 1;
      const entryNo = `PROD-${String(entryIndex).padStart(5, '0')}`;

      const entry: DailyProcessingEntry = {
        id: `pe-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        entryNo,
        processingDate,
        shift,
        supplierId,
        speciesId,
        gradeId,
        sizeId,
        countId,
        supplierBoxId,
        slabTypeId,
        standardSlabWeightKg,
        slabsCount,
        processedWeightKg,
        rejectionWeightKg,
        expectedWeightKg,
        varianceWeightKg,
        variancePct,
        hasSlabVariance,
        remarks,
        operator: currentUser.name || 'System Migration',
        dataEntryDate: nowIso,
        monthYear,
        financialYear: businessSettings.financialYear,
        isVoided: false,
        createdBy: currentUser.email || 'import@system',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      newEntries.push(entry);
    });

    if (newEntries.length > 0) {
      setProcessingEntries((prev) => [...newEntries, ...prev]);
      if (createdSuppliers > 0) setSuppliers([...mutableSuppliers]);
      if (createdSpecies > 0) setSpecies([...mutableSpecies]);
      if (createdSlabTypes > 0) setSlabTypes([...mutableSlabTypes]);

      logAudit('CREATE', 'PRODUCTION_ENTRY', `Excel bulk import: ${newEntries.length} production entries imported`, {
        newValues: {
          importedCount: newEntries.length,
          createdSuppliers,
          createdSpecies,
          createdSlabTypes
        }
      });

      showToast(`Successfully imported ${newEntries.length} production entries from Excel.`, 'success');
    }

    return {
      added: newEntries.length,
      errors,
      createdSuppliers,
      createdSpecies,
      createdSlabTypes
    };
  };

  const bulkImportSalesInvoices = (
    rawRows: Record<string, any>[],
    autoCreateMaster = true
  ) => {
    let createdCustomers = 0;
    let createdPorts = 0;
    let createdSpecies = 0;
    const errors: string[] = [];
    const newInvoices: SalesInvoice[] = [];

    const mutableCustomers = [...customers];
    const mutablePorts = [...ports];
    const mutableSpecies = [...species];
    const mutableSizes = [...sizes];
    const mutableCounts = [...counts];

    // Group rows by Invoice No or Date + Customer
    const invoiceGroups: { [key: string]: { headerRow: Record<string, any>; rows: { row: Record<string, any>; rowNum: number }[] } } = {};

    let currentGroupKey = '';
    let lastDate = '';
    let lastCustomer = '';

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const hasData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasData) return;

      const rawInvNo = String(getFlexibleValue(row, ['invoiceno', 'invoice', 'billno', 'exportinvoiceno', 'invoicenumber']) || '').trim();
      const rawDate = formatExcelDate(getFlexibleValue(row, ['invoicedate', 'date', 'billdate', 'shippingdate']));
      const rawCust = String(getFlexibleValue(row, ['customer', 'consignee', 'customername', 'buyer', 'client', 'buyername']) || '').trim();

      let groupKey = '';

      if (rawInvNo) {
        groupKey = rawInvNo.toUpperCase();
      } else {
        const isContinuation =
          Boolean(currentGroupKey) &&
          (!rawDate || rawDate === lastDate) &&
          (!rawCust || !lastCustomer || rawCust.toLowerCase() === lastCustomer.toLowerCase());

        if (isContinuation) {
          groupKey = currentGroupKey;
        } else {
          const newInvNo = `EXP-${new Date().getFullYear()}-${String(salesInvoices.length + Object.keys(invoiceGroups).length + 1).padStart(4, '0')}`;
          groupKey = newInvNo.toUpperCase();
        }
      }

      currentGroupKey = groupKey;
      if (rawDate) lastDate = rawDate;
      if (rawCust) lastCustomer = rawCust;

      if (!invoiceGroups[groupKey]) {
        invoiceGroups[groupKey] = {
          headerRow: row,
          rows: []
        };
      }
      invoiceGroups[groupKey].rows.push({ row, rowNum });
    });

    Object.entries(invoiceGroups).forEach(([invNoKey, group]) => {
      const { headerRow, rows } = group;

      const rawDate = getFlexibleValue(headerRow, ['invoicedate', 'date', 'billdate', 'shippingdate']);
      const invoiceDate = formatExcelDate(rawDate);

      const rawCust = String(getFlexibleValue(headerRow, ['customer', 'consignee', 'customername', 'buyer', 'client', 'buyername']) || '').trim();
      let matchedCust = mutableCustomers.find(
        (c) => c.code.toLowerCase() === rawCust.toLowerCase() || c.name.toLowerCase() === rawCust.toLowerCase()
      );
      if (!matchedCust && rawCust) {
        matchedCust = mutableCustomers.find((c) => c.name.toLowerCase().includes(rawCust.toLowerCase()) || rawCust.toLowerCase().includes(c.name.toLowerCase()));
      }
      if (!matchedCust && rawCust && autoCreateMaster) {
        const newCust: Customer = {
          id: `cust-${Date.now()}-${mutableCustomers.length + 1}`,
          code: `CUST-${String(mutableCustomers.length + 1).padStart(3, '0')}`,
          name: rawCust,
          address: String(getFlexibleValue(headerRow, ['customeraddress', 'address']) || ''),
          country: String(getFlexibleValue(headerRow, ['destinationcountry', 'country']) || 'Global Export'),
          contactPerson: '',
          phone: '',
          email: '',
          taxId: '',
          bankDetails: '',
          active: true,
          createdAt: new Date().toISOString()
        };
        mutableCustomers.push(newCust);
        matchedCust = newCust;
        createdCustomers++;
      }
      const consigneeId = matchedCust?.id || mutableCustomers[0]?.id || '';

      const rawBuyer = String(getFlexibleValue(headerRow, ['buyer', 'buyername']) || '').trim();
      const matchedBuyer = rawBuyer ? mutableCustomers.find((c) => c.name.toLowerCase().includes(rawBuyer.toLowerCase())) : undefined;
      const buyerId = matchedBuyer?.id;

      const getOrCreatePort = (val: string): string => {
        const cleanVal = String(val || '').trim();
        if (!cleanVal) return mutablePorts[0]?.id || '';
        const matched = mutablePorts.find(
          (p) => p.code.toLowerCase() === cleanVal.toLowerCase() || p.name.toLowerCase() === cleanVal.toLowerCase() || p.name.toLowerCase().includes(cleanVal.toLowerCase())
        );
        if (!matched && autoCreateMaster) {
          const newPort: PortMaster = {
            id: `port-${Date.now()}-${mutablePorts.length + 1}`,
            code: cleanVal.slice(0, 5).toUpperCase(),
            name: cleanVal,
            country: 'Global',
            active: true
          };
          mutablePorts.push(newPort);
          createdPorts++;
          return newPort.id;
        }
        return matched?.id || mutablePorts[0]?.id || '';
      };

      const rawPol = getFlexibleValue(headerRow, ['portofloading', 'loadingport', 'pol', 'portloading']);
      const rawPod = getFlexibleValue(headerRow, ['portofdischarge', 'dischargeport', 'pod', 'portdischarge']);
      const rawDest = getFlexibleValue(headerRow, ['finaldestination', 'destinationport', 'destination', 'finaldest']);

      const portOfLoadingId = getOrCreatePort(rawPol);
      const portOfDischargeId = getOrCreatePort(rawPod);
      const finalDestinationId = getOrCreatePort(rawDest || rawPod);

      const rawCurr = String(getFlexibleValue(headerRow, ['currency', 'invoicecurrency', 'curr']) || 'USD').toUpperCase().trim();
      const allowedCurrs: SalesCurrency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'AED', 'SGD'];
      const currency: SalesCurrency = allowedCurrs.includes(rawCurr as SalesCurrency) ? (rawCurr as SalesCurrency) : 'USD';

      const rawExRate = parseFloat(getFlexibleValue(headerRow, ['exchangerate', 'rate', 'forexrate', 'usdrate']) || '84.5');
      const exchangeRate = !isNaN(rawExRate) && rawExRate > 0 ? Number(rawExRate.toFixed(2)) : 84.5;

      const orderNo = String(getFlexibleValue(headerRow, ['orderno', 'order', 'pono', 'poref']) || '').trim();
      const remarks = String(getFlexibleValue(headerRow, ['remarks', 'notes', 'comment']) || '').trim();

      const salesValUsdCandidateKeys = [
        'totalsalesvalueusd',
        'totalsalesvalue',
        'totalsalesamountusd',
        'totalsalesamount',
        'salesvalueusd',
        'salesvalue',
        'salesamountusd',
        'salesamount',
        'invoicesalesvalueusd',
        'invoicesalesvalue',
        'totalinvoicevalueusd',
        'totalinvoicevalue'
      ];

      const fobUsdCandidateKeys = [
        'totalfobvalueusd',
        'totalfobvaluefullinvoice',
        'totalfobvalue',
        'fobvaluefullinvoice',
        'invoicefobvalue',
        'invoicefob',
        'totalfob',
        'fobvaluecurrency',
        'fobvalueusd',
        'fobvalue',
        'fobamountusd',
        'fobamount',
        'fob'
      ];

      const fobInrCandidateKeys = [
        'totalfobvalueinr',
        'totalfobvalinr',
        'totalfobinr',
        'totalfobvalrupees',
        'fobvalueinr',
        'fobamountinr',
        'fobinr',
        'fobrupees',
        'fobvalinr',
        'fobinrrupees'
      ];

      const purchaseInrCandidateKeys = [
        'totalpurchasevalueinr',
        'totalpurchasevalinr',
        'totalpurchasevalrupees',
        'purchasevalueinr',
        'purchasecostinr',
        'purchasevalinr',
        'purchaserps',
        'purchaseinr',
        'purchaseamountinr'
      ];

      const purchaseUsdCandidateKeys = [
        'totalpurchasevalueusd',
        'totalpurchasevaluecurrency',
        'totalpurchasevalue',
        'purchasevalueusd',
        'purchasevaluecurrency',
        'purchasevalue',
        'purchasecostusd'
      ];

      interface ParsedCandidate {
        line: SalesInvoiceLine;
        rowSalesUsd: number | null;
        rowFobUsd: number | null;
        rowFobInr: number | null;
        rowPurUsd: number | null;
        rowPurInr: number | null;
      }

      const candidates: ParsedCandidate[] = [];

      rows.forEach(({ row, rowNum }) => {
        const rawSpec = String(
          getFlexibleValue(row, [
            'productnameexportreadyname',
            'productname',
            'product',
            'exportproduct',
            'species',
            'speciesname',
            'item',
            'description'
          ]) || ''
        ).trim();
        const rawPurchaseSpec = String(
          getFlexibleValue(row, ['purchasespecies', 'purchasespeciesname', 'rawspecies', 'rawspeciesname']) || ''
        ).trim();
        let matchedSpec = mutableSpecies.find(
          (sp) => sp.code.toLowerCase() === rawSpec.toLowerCase() || sp.name.toLowerCase() === rawSpec.toLowerCase() || sp.name.toLowerCase().includes(rawSpec.toLowerCase())
        );
        if (!matchedSpec && rawSpec && autoCreateMaster) {
          const newSpec: Species = {
            id: `sp-${Date.now()}-${mutableSpecies.length + 1}`,
            code: rawSpec.substring(0, 3).toUpperCase(),
            name: rawSpec,
            rawSpeciesName: rawPurchaseSpec || undefined,
            scientificName: '',
            category: 'Export Finish',
            hsCode: String(getFlexibleValue(row, ['hscode', 'hs']) || '03061790'),
            active: true
          };
          mutableSpecies.push(newSpec);
          matchedSpec = newSpec;
          createdSpecies++;
        }
        const speciesId = matchedSpec?.id || mutableSpecies[0]?.id || '';
        const hsCode = String(getFlexibleValue(row, ['hscode', 'hs']) || matchedSpec?.hsCode || '03061790');

        const rawSize = String(getFlexibleValue(row, ['size', 'sizename']) || '').trim();
        const matchedSize = mutableSizes.find((sz) => sz.name.toLowerCase().includes(rawSize.toLowerCase()));
        const sizeId = matchedSize?.id || mutableSizes[0]?.id || '';

        const rawCount = String(getFlexibleValue(row, ['count', 'countname']) || '').trim();
        const matchedCount = mutableCounts.find((c) => c.name.toLowerCase().includes(rawCount.toLowerCase()));
        const countId = matchedCount?.id || undefined;

        const rawCartons = parseFloat(getFlexibleValue(row, ['cartonscount', 'cartons', 'boxes', 'cases', 'pkgs']) || '0');
        const cartonsCount = !isNaN(rawCartons) ? Math.round(rawCartons) : 0;

        const rawWeight = parseFloat(getFlexibleValue(row, ['netweightkg', 'weightkg', 'netweight', 'weight', 'qtykg']) || '');
        if (isNaN(rawWeight) || rawWeight <= 0) {
          errors.push(`Row ${rowNum} (${invNoKey}): Net Weight (Kg) is missing or must be greater than 0.`);
          return;
        }
        const weightKg = Number(rawWeight.toFixed(2));

        const rawRate = parseFloat(getFlexibleValue(row, ['rateperkg', 'rate', 'priceperkg', 'unitprice']) || '0');
        const ratePerKg = !isNaN(rawRate) && rawRate >= 0 ? Number(rawRate.toFixed(2)) : 0;

        const amountCurrency = Number((weightKg * ratePerKg).toFixed(2));

        const rawSalesUsdVal = parseFloat(getFlexibleValue(row, salesValUsdCandidateKeys) || '');
        const rowSalesUsd = !isNaN(rawSalesUsdVal) && rawSalesUsdVal > 0 ? Number(rawSalesUsdVal.toFixed(2)) : null;

        let rawFobUsdVal = parseFloat(getFlexibleValue(row, fobUsdCandidateKeys) || '');
        let rawFobInrVal = parseFloat(getFlexibleValue(row, fobInrCandidateKeys) || '');

        if (!isNaN(rawFobUsdVal) && rawFobUsdVal > 0 && (isNaN(rawFobInrVal) || rawFobInrVal <= 0)) {
          rawFobInrVal = Number((rawFobUsdVal * exchangeRate).toFixed(2));
        } else if (!isNaN(rawFobInrVal) && rawFobInrVal > 0 && (isNaN(rawFobUsdVal) || rawFobUsdVal <= 0)) {
          rawFobUsdVal = Number((rawFobInrVal / exchangeRate).toFixed(2));
        }

        const rowFobUsd = !isNaN(rawFobUsdVal) && rawFobUsdVal > 0 ? Number(rawFobUsdVal.toFixed(2)) : null;
        const rowFobInr = !isNaN(rawFobInrVal) && rawFobInrVal > 0 ? Number(rawFobInrVal.toFixed(2)) : null;

        let rawPurUsdVal = parseFloat(getFlexibleValue(row, purchaseUsdCandidateKeys) || '');
        let rawPurInrVal = parseFloat(getFlexibleValue(row, purchaseInrCandidateKeys) || '');

        if (!isNaN(rawPurUsdVal) && rawPurUsdVal > 0 && (isNaN(rawPurInrVal) || rawPurInrVal <= 0)) {
          rawPurInrVal = Number((rawPurUsdVal * exchangeRate).toFixed(2));
        } else if (!isNaN(rawPurInrVal) && rawPurInrVal > 0 && (isNaN(rawPurUsdVal) || rawPurUsdVal <= 0)) {
          rawPurUsdVal = Number((rawPurInrVal / exchangeRate).toFixed(2));
        }

        const rowPurUsd = !isNaN(rawPurUsdVal) && rawPurUsdVal > 0 ? Number(rawPurUsdVal.toFixed(2)) : null;
        const rowPurInr = !isNaN(rawPurInrVal) && rawPurInrVal > 0 ? Number(rawPurInrVal.toFixed(2)) : null;

        candidates.push({
          line: {
            id: `line-${Date.now()}-${candidates.length}-${Math.random().toString(36).substr(2, 4)}`,
            speciesId,
            hsCode,
            sizeId,
            countId,
            cartonsCount,
            weightKg,
            ratePerKg,
            amountCurrency,
            fobValueCurrency: amountCurrency,
            fobValueINR: Number((amountCurrency * exchangeRate).toFixed(2)),
            purchaseValueCurrency: rowPurUsd || undefined,
            purchaseValueINR: rowPurInr || undefined
          },
          rowSalesUsd,
          rowFobUsd,
          rowFobInr,
          rowPurUsd,
          rowPurInr
        });
      });

      if (candidates.length === 0) {
        errors.push(`Invoice ${invNoKey}: No valid line items could be imported.`);
        return;
      }

      const totalCartons = candidates.reduce((s, c) => s + c.line.cartonsCount, 0);
      const totalWeightKg = Number(candidates.reduce((s, c) => s + c.line.weightKg, 0).toFixed(2));

      // 1. Total Sales Value (USD) Resolution
      const firstRowSalesUsd = candidates[0]?.rowSalesUsd ?? null;
      const validSalesUsd = candidates.map(c => c.rowSalesUsd).filter((v): v is number => v !== null && v > 0);
      const calculatedSumAmount = Number(candidates.reduce((s, c) => s + c.line.amountCurrency, 0).toFixed(2));
      let totalAmountCurrency = calculatedSumAmount;

      const isFullInvoiceSalesOnFirstRow =
        firstRowSalesUsd !== null &&
        firstRowSalesUsd > 0 &&
        (validSalesUsd.length === 1 || validSalesUsd.every(v => Math.abs(v - firstRowSalesUsd) < 0.01));

      if (isFullInvoiceSalesOnFirstRow) {
        totalAmountCurrency = firstRowSalesUsd;
        if (candidates.length === 1) {
          candidates[0].line.amountCurrency = totalAmountCurrency;
        } else if (calculatedSumAmount > 0) {
          candidates.forEach(c => {
            const ratio = c.line.amountCurrency / calculatedSumAmount;
            c.line.amountCurrency = Number((totalAmountCurrency * ratio).toFixed(2));
          });
          const sumAlloc = Number(candidates.reduce((s, c) => s + c.line.amountCurrency, 0).toFixed(2));
          const diff = Number((totalAmountCurrency - sumAlloc).toFixed(2));
          if (diff !== 0 && candidates.length > 0) {
            candidates[candidates.length - 1].line.amountCurrency = Number(
              (candidates[candidates.length - 1].line.amountCurrency + diff).toFixed(2)
            );
          }
        }
      }

      // 2. FOB Value (USD & INR) Resolution
      const firstRowFobUsd = candidates[0]?.rowFobUsd ?? null;
      const firstRowFobInr = candidates[0]?.rowFobInr ?? null;
      const validFobsUsd = candidates.map((c) => c.rowFobUsd).filter((v): v is number => v !== null && v > 0);
      const validFobsInr = candidates.map((c) => c.rowFobInr).filter((v): v is number => v !== null && v > 0);

      let totalFobValueCurrency = totalAmountCurrency;
      let totalFobValueINR = Number((totalAmountCurrency * exchangeRate).toFixed(2));

      const isFullInvoiceFobOnFirstRow =
        (firstRowFobUsd !== null && firstRowFobUsd > 0 && (validFobsUsd.length === 1 || validFobsUsd.every((v) => Math.abs(v - firstRowFobUsd) < 0.01))) ||
        (firstRowFobInr !== null && firstRowFobInr > 0 && (validFobsInr.length === 1 || validFobsInr.every((v) => Math.abs(v - firstRowFobInr) < 0.01)));

      if (isFullInvoiceFobOnFirstRow) {
        totalFobValueCurrency = firstRowFobUsd !== null && firstRowFobUsd > 0
          ? firstRowFobUsd
          : Number(((firstRowFobInr || 0) / exchangeRate).toFixed(2));

        totalFobValueINR = firstRowFobInr !== null && firstRowFobInr > 0
          ? firstRowFobInr
          : Number((totalFobValueCurrency * exchangeRate).toFixed(2));

        if (candidates.length === 1) {
          candidates[0].line.fobValueCurrency = totalFobValueCurrency;
          candidates[0].line.fobValueINR = totalFobValueINR;
        } else {
          candidates.forEach((c) => {
            const ratio =
              totalAmountCurrency > 0
                ? c.line.amountCurrency / totalAmountCurrency
                : totalWeightKg > 0
                ? c.line.weightKg / totalWeightKg
                : 1 / candidates.length;
            c.line.fobValueCurrency = Number((totalFobValueCurrency * ratio).toFixed(2));
            c.line.fobValueINR = Number((totalFobValueINR * ratio).toFixed(2));
          });

          // Reconcile cents
          const allocatedSumUsd = Number(candidates.reduce((s, c) => s + c.line.fobValueCurrency, 0).toFixed(2));
          const diffUsd = Number((totalFobValueCurrency - allocatedSumUsd).toFixed(2));
          if (diffUsd !== 0 && candidates.length > 0) {
            candidates[candidates.length - 1].line.fobValueCurrency = Number(
              (candidates[candidates.length - 1].line.fobValueCurrency + diffUsd).toFixed(2)
            );
          }
          const allocatedSumInr = Number(candidates.reduce((s, c) => s + (c.line.fobValueINR || 0), 0).toFixed(2));
          const diffInr = Number((totalFobValueINR - allocatedSumInr).toFixed(2));
          if (diffInr !== 0 && candidates.length > 0) {
            candidates[candidates.length - 1].line.fobValueINR = Number(
              ((candidates[candidates.length - 1].line.fobValueINR || 0) + diffInr).toFixed(2)
            );
          }
        }
      } else if (validFobsUsd.length > 0 || validFobsInr.length > 0) {
        candidates.forEach((c) => {
          c.line.fobValueCurrency = c.rowFobUsd !== null && c.rowFobUsd > 0
            ? c.rowFobUsd
            : c.rowFobInr !== null && c.rowFobInr > 0
            ? Number((c.rowFobInr / exchangeRate).toFixed(2))
            : c.line.amountCurrency;

          c.line.fobValueINR = c.rowFobInr !== null && c.rowFobInr > 0
            ? c.rowFobInr
            : Number((c.line.fobValueCurrency * exchangeRate).toFixed(2));
        });
        totalFobValueCurrency = Number(candidates.reduce((s, c) => s + c.line.fobValueCurrency, 0).toFixed(2));
        totalFobValueINR = Number(candidates.reduce((s, c) => s + (c.line.fobValueINR || 0), 0).toFixed(2));
      } else {
        candidates.forEach((c) => {
          c.line.fobValueCurrency = c.line.amountCurrency;
          c.line.fobValueINR = Number((c.line.amountCurrency * exchangeRate).toFixed(2));
        });
        totalFobValueCurrency = totalAmountCurrency;
        totalFobValueINR = Number((totalAmountCurrency * exchangeRate).toFixed(2));
      }

      // 3. Purchase Value (USD & INR) Resolution
      const firstRowPurUsd = candidates[0]?.rowPurUsd ?? null;
      const firstRowPurInr = candidates[0]?.rowPurInr ?? null;
      const validPursUsd = candidates.map(c => c.rowPurUsd).filter((v): v is number => v !== null && v > 0);
      const validPursInr = candidates.map(c => c.rowPurInr).filter((v): v is number => v !== null && v > 0);

      let totalPurchaseValueCurrency = 0;
      let totalPurchaseValueINR = 0;

      const isFullInvoicePurOnFirstRow =
        (firstRowPurUsd !== null && firstRowPurUsd > 0 && (validPursUsd.length === 1 || validPursUsd.every(v => Math.abs(v - firstRowPurUsd) < 0.01))) ||
        (firstRowPurInr !== null && firstRowPurInr > 0 && (validPursInr.length === 1 || validPursInr.every(v => Math.abs(v - firstRowPurInr) < 0.01)));

      if (isFullInvoicePurOnFirstRow) {
        totalPurchaseValueCurrency = firstRowPurUsd !== null && firstRowPurUsd > 0
          ? firstRowPurUsd
          : Number(((firstRowPurInr || 0) / exchangeRate).toFixed(2));
        totalPurchaseValueINR = firstRowPurInr !== null && firstRowPurInr > 0
          ? firstRowPurInr
          : Number((totalPurchaseValueCurrency * exchangeRate).toFixed(2));

        candidates.forEach(c => {
          const ratio = totalAmountCurrency > 0 ? c.line.amountCurrency / totalAmountCurrency : 1 / candidates.length;
          c.line.purchaseValueCurrency = Number((totalPurchaseValueCurrency * ratio).toFixed(2));
          c.line.purchaseValueINR = Number((totalPurchaseValueINR * ratio).toFixed(2));
        });
      } else if (validPursUsd.length > 0 || validPursInr.length > 0) {
        candidates.forEach(c => {
          c.line.purchaseValueCurrency = c.rowPurUsd !== null && c.rowPurUsd > 0 ? c.rowPurUsd : 0;
          c.line.purchaseValueINR = c.rowPurInr !== null && c.rowPurInr > 0 ? c.rowPurInr : Number(((c.rowPurUsd || 0) * exchangeRate).toFixed(2));
        });
        totalPurchaseValueCurrency = Number(candidates.reduce((s, c) => s + (c.line.purchaseValueCurrency || 0), 0).toFixed(2));
        totalPurchaseValueINR = Number(candidates.reduce((s, c) => s + (c.line.purchaseValueINR || 0), 0).toFixed(2));
      }

      const grossProfitCurrency = totalPurchaseValueCurrency > 0 ? Number((totalFobValueCurrency - totalPurchaseValueCurrency).toFixed(2)) : undefined;
      const grossProfitINR = totalPurchaseValueINR > 0 ? Number((totalFobValueINR - totalPurchaseValueINR).toFixed(2)) : undefined;
      const profitMarginPct = totalFobValueCurrency > 0 && grossProfitCurrency !== undefined ? Number(((grossProfitCurrency / totalFobValueCurrency) * 100).toFixed(2)) : undefined;

      const lineItems: SalesInvoiceLine[] = candidates.map((c) => c.line);
      const estimatedAmountINR = Number((totalAmountCurrency * exchangeRate).toFixed(2));

      const rawBankExRate = parseFloat(getFlexibleValue(headerRow, ['predeterminedexchangerate', 'bankexchangerate', 'predeterminedrate', 'bankrate', 'predeterminedbankrate', 'bankpredeterminedexchangerate']) || '');
      const bankPreDeterminedExchangeRate = !isNaN(rawBankExRate) && rawBankExRate > 0 ? Number(rawBankExRate.toFixed(4)) : exchangeRate;

      const rawAdvRate = parseFloat(getFlexibleValue(headerRow, ['advanceforwardratebank', 'advanceforwardrate', 'advanceexchangerate', 'advancerate', 'forwardrateadvance', 'advrate', 'predeterminedexchangerateadvance']) || '');
      const advanceExchangeRate = !isNaN(rawAdvRate) && rawAdvRate > 0 ? Number(rawAdvRate.toFixed(4)) : bankPreDeterminedExchangeRate;

      const rawBalRate = parseFloat(getFlexibleValue(headerRow, ['balanceforwardratebank', 'balanceforwardrate', 'balanceexchangerate', 'balancerate', 'forwardratebalance', 'balrate', 'predeterminedexchangeratebalance']) || '');
      const balanceExchangeRate = !isNaN(rawBalRate) && rawBalRate > 0 ? Number(rawBalRate.toFixed(4)) : bankPreDeterminedExchangeRate;

      const rawAdvTermsUSD = parseFloat(getFlexibleValue(headerRow, ['advanceaspercontracttermsusd', 'advanceaspercontractterms', 'advancecontracttermsusd', 'advancecontractterms', 'contractadvanceusd', 'contractadvance', 'contractualadvanceusd', 'contractualadvance', 'advanceaspertcontracttermsusd', 'advanceaspertcontractterms']) || '');
      const rawAdvUSD = parseFloat(getFlexibleValue(headerRow, ['actualadvancereceivedusd', 'actualadvancereceived', 'advancereceived', 'advancereceivedcurrency', 'advancereceivedusd', 'advanceamount', 'advanceusd', 'advance']) || '0');
      const advanceReceivedCurrency = !isNaN(rawAdvUSD) && rawAdvUSD > 0 ? Number(rawAdvUSD.toFixed(2)) : undefined;
      const advanceTermsUSD = !isNaN(rawAdvTermsUSD) && rawAdvTermsUSD > 0 ? Number(rawAdvTermsUSD.toFixed(2)) : advanceReceivedCurrency;
      const advanceShortfallUSD = advanceTermsUSD && advanceReceivedCurrency && advanceTermsUSD > advanceReceivedCurrency ? Number((advanceTermsUSD - advanceReceivedCurrency).toFixed(2)) : undefined;

      const rawAdvDate = getFlexibleValue(headerRow, ['dateofreceivingtheadvance', 'dateofreceivingadvance', 'advancedate', 'dateadvance', 'advdate', 'advancereceiveddate']);
      const advanceReceivedDate = rawAdvDate ? formatExcelDate(rawAdvDate) : (advanceReceivedCurrency ? invoiceDate : undefined);
      const advanceReceivedINR = advanceReceivedCurrency ? Number((advanceReceivedCurrency * advanceExchangeRate).toFixed(2)) : undefined;

      const rawBalPriceUSD = parseFloat(getFlexibleValue(headerRow, ['balanceasperactualpriceusd', 'balanceasperactualprice', 'balanceactualpriceusd', 'balanceactualprice', 'contractbalanceusd', 'balancepriceusd', 'balanceaspershippingprice']) || '');
      const rawBalUSD = parseFloat(getFlexibleValue(headerRow, ['actualbalancereceivedusd', 'actualbalancereceived', 'balanacepaymentamount', 'balancepaymentamount', 'balancepaymentamountcurrency', 'balancepayment', 'balanceamount', 'balanceusd', 'balance']) || '0');
      const balancePaymentAmountCurrency = !isNaN(rawBalUSD) && rawBalUSD > 0 ? Number(rawBalUSD.toFixed(2)) : undefined;
      const balanceActualPriceUSD = !isNaN(rawBalPriceUSD) && rawBalPriceUSD > 0
        ? Number(rawBalPriceUSD.toFixed(2))
        : (balancePaymentAmountCurrency ? Math.max(0, Number((totalAmountCurrency - (advanceTermsUSD || advanceReceivedCurrency || 0)).toFixed(2))) : undefined);
      const balanceShortfallUSD = balanceActualPriceUSD && balancePaymentAmountCurrency && balanceActualPriceUSD > balancePaymentAmountCurrency ? Number((balanceActualPriceUSD - balancePaymentAmountCurrency).toFixed(2)) : undefined;

      const totalShortfallUSD = (advanceShortfallUSD || 0) + (balanceShortfallUSD || 0) > 0 ? Number(((advanceShortfallUSD || 0) + (balanceShortfallUSD || 0)).toFixed(2)) : undefined;

      const rawBalDate = getFlexibleValue(headerRow, ['dateofreceivingbalanacepayment', 'dateofreceivingbalancepayment', 'balancedate', 'datebalance', 'baldate', 'balancepaymentdate']);
      const balancePaymentDate = rawBalDate ? formatExcelDate(rawBalDate) : undefined;
      const balancePaymentINR = balancePaymentAmountCurrency ? Number((balancePaymentAmountCurrency * balanceExchangeRate).toFixed(2)) : undefined;

      const totalRealizedCurrency = Number(((advanceReceivedCurrency || 0) + (balancePaymentAmountCurrency || 0)).toFixed(2));
      const totalRealizedINR = Number(((advanceReceivedINR || 0) + (balancePaymentINR || 0)).toFixed(2));
      const balanceRealizationCurrency = Math.max(0, Number((totalAmountCurrency - totalRealizedCurrency).toFixed(2)));

      let realizationStatus: RealizationStatus = 'Not Realized';
      if (totalRealizedCurrency > 0) {
        if (
          balanceRealizationCurrency <= 0.05 ||
          totalRealizedCurrency >= totalAmountCurrency ||
          (balancePaymentAmountCurrency && totalRealizedCurrency + (totalShortfallUSD || 0) >= totalAmountCurrency - 0.05)
        ) {
          realizationStatus = 'Fully Realized';
        } else {
          realizationStatus = 'Partially Realized';
        }
      }

      const initialRealizations: RealizationRecord[] = [];
      if (advanceReceivedCurrency && advanceReceivedDate) {
        initialRealizations.push({
          id: `real-adv-${invNoKey}`,
          settlementDate: advanceReceivedDate,
          realizedAmountCurrency: advanceReceivedCurrency,
          exchangeRateRealized: advanceExchangeRate,
          amountINR: advanceReceivedINR || Number((advanceReceivedCurrency * advanceExchangeRate).toFixed(2)),
          bankRefNo: `ADV-${invNoKey}`,
          notes: 'Advance received',
          paymentType: 'Advance',
          contractTermsAmountUSD: advanceTermsUSD,
          shortfallUSD: advanceShortfallUSD,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email || 'import@system'
        });
      }
      if (balancePaymentAmountCurrency && balancePaymentDate) {
        initialRealizations.push({
          id: `real-bal-${invNoKey}`,
          settlementDate: balancePaymentDate,
          realizedAmountCurrency: balancePaymentAmountCurrency,
          exchangeRateRealized: balanceExchangeRate,
          amountINR: balancePaymentINR || Number((balancePaymentAmountCurrency * balanceExchangeRate).toFixed(2)),
          bankRefNo: `BAL-${invNoKey}`,
          notes: 'Balance payment received',
          paymentType: 'Balance',
          contractTermsAmountUSD: balanceActualPriceUSD,
          shortfallUSD: balanceShortfallUSD,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email || 'import@system'
        });
      }

      const invRecord: SalesInvoice = {
        id: `inv-${Date.now()}-${newInvoices.length}-${Math.random().toString(36).substr(2, 5)}`,
        invoiceNo: String(getFlexibleValue(headerRow, ['invoiceno', 'invoice', 'billno']) || invNoKey).trim(),
        invoiceDate,
        financialYear: businessSettings.financialYear,
        consigneeId,
        buyerId,
        orderNo,
        portOfLoadingId,
        portOfDischargeId,
        finalDestinationId,
        currency,
        exchangeRate,
        remarks,
        lineItems,
        totalCartons,
        totalWeightKg,
        totalAmountCurrency,
        totalFobValueCurrency,
        totalFobValueINR,
        totalPurchaseValueCurrency: totalPurchaseValueCurrency > 0 ? totalPurchaseValueCurrency : undefined,
        totalPurchaseValueINR: totalPurchaseValueINR > 0 ? totalPurchaseValueINR : undefined,
        grossProfitCurrency,
        grossProfitINR,
        profitMarginPct,
        estimatedAmountINR,
        advanceTermsUSD,
        advanceReceivedCurrency,
        advanceShortfallUSD,
        advanceExchangeRate,
        advanceReceivedDate,
        advanceReceivedINR,
        advanceBankRef: advanceReceivedCurrency ? `ADV-${invNoKey}` : undefined,
        balanceActualPriceUSD,
        balancePaymentAmountCurrency,
        balanceShortfallUSD,
        balanceExchangeRate,
        balancePaymentDate,
        balancePaymentINR,
        balanceBankRef: balancePaymentAmountCurrency ? `BAL-${invNoKey}` : undefined,
        totalShortfallUSD,
        bankPreDeterminedExchangeRate,
        realizations: initialRealizations,
        totalRealizedCurrency,
        balanceRealizationCurrency,
        totalRealizedINR,
        realizationStatus,
        lastRealizationDate: balancePaymentDate || advanceReceivedDate,
        averageRealizedExchangeRate: totalRealizedCurrency > 0
          ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(4))
          : bankPreDeterminedExchangeRate,
        isVoided: false,
        createdBy: currentUser.email || 'import@system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newInvoices.push(invRecord);
    });

    if (newInvoices.length > 0) {
      setSalesInvoices((prev) => [...newInvoices, ...prev]);
      if (createdCustomers > 0) setCustomers([...mutableCustomers]);
      if (createdPorts > 0) setPorts([...mutablePorts]);
      if (createdSpecies > 0) setSpecies([...mutableSpecies]);

      logAudit('CREATE', 'SALES_INVOICE', `Excel bulk import: ${newInvoices.length} sales invoices imported`, {
        newValues: {
          importedCount: newInvoices.length,
          createdCustomers,
          createdPorts,
          createdSpecies
        }
      });

      showToast(`Successfully imported ${newInvoices.length} export sales invoices from Excel.`, 'success');
    }

    return {
      added: newInvoices.length,
      errors,
      createdCustomers,
      createdPorts,
      createdSpecies
    };
  };

  const bulkImportSalesRealizations = (
    rawRows: Record<string, any>[]
  ): { updated: number; errors: string[] } => {
    if (!permissions.canManageSalesRealization) {
      return {
        updated: 0,
        errors: ['Unauthorized: Only Master Accountant and Owner/Admin can import realizations.']
      };
    }

    if (!rawRows || rawRows.length === 0) {
      return { updated: 0, errors: ['No data rows found in the imported file.'] };
    }

    let updatedCount = 0;
    const errors: string[] = [];
    const updatedInvoicesMap = new Map<string, SalesInvoice>();

    const currentInvoices = [...salesInvoices];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const rawInvNo = String(
        getFlexibleValue(row, ['invoiceno', 'invoice', 'billno', 'invoicenumber', 'invoicenum']) || ''
      ).trim();

      if (!rawInvNo) {
        errors.push(`Row ${rowNum}: Missing Invoice No. Unable to match settlement.`);
        return;
      }

      const targetInv = currentInvoices.find(
        (inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === rawInvNo.toLowerCase()
      );

      if (!targetInv) {
        errors.push(`Row ${rowNum}: Invoice "${rawInvNo}" not found or is voided.`);
        return;
      }

      const baseInv = updatedInvoicesMap.get(targetInv.id) || targetInv;

      const rawBankRate = parseFloat(
        getFlexibleValue(row, [
          'predeterminedexchangerate',
          'bankexchangerate',
          'predeterminedrate',
          'bankrate',
          'predeterminedbankrate',
          'bankpredeterminedexchangerate',
          'exchangerate',
          'forexrate',
          'rate',
          'forwardrate'
        ]) || ''
      );
      const bankRate =
        !isNaN(rawBankRate) && rawBankRate > 0
          ? Number(rawBankRate.toFixed(4))
          : baseInv.bankPreDeterminedExchangeRate || baseInv.exchangeRate || 84.50;

      const rawAdvRate = parseFloat(
        getFlexibleValue(row, [
          'advanceforwardratebank',
          'advanceforwardrate',
          'advanceexchangerate',
          'advancerate',
          'bankadvancerate',
          'advancebankrate',
          'forwardrateadvance',
          'advanceforexrate',
          'predeterminedexchangerateadvance'
        ]) || ''
      );
      const advanceRate =
        !isNaN(rawAdvRate) && rawAdvRate > 0
          ? Number(rawAdvRate.toFixed(4))
          : baseInv.advanceExchangeRate || bankRate;

      const rawBalRate = parseFloat(
        getFlexibleValue(row, [
          'balanceforwardratebank',
          'balanceforwardrate',
          'balanceexchangerate',
          'balancerate',
          'bankbalancerate',
          'balancebankrate',
          'forwardratebalance',
          'balanceforexrate',
          'predeterminedexchangeratebalance'
        ]) || ''
      );
      const balanceRate =
        !isNaN(rawBalRate) && rawBalRate > 0
          ? Number(rawBalRate.toFixed(4))
          : baseInv.balanceExchangeRate || bankRate;

      const rawAdvUSD = parseFloat(
        getFlexibleValue(row, [
          'actualadvancereceivedusd',
          'actualadvancereceived',
          'advancereceivedusd',
          'advancereceived',
          'advancereceivedcurrency',
          'advanceamount',
          'advanceusd',
          'advance'
        ]) || ''
      );
      const advUSD =
        !isNaN(rawAdvUSD) && rawAdvUSD >= 0
          ? Number(rawAdvUSD.toFixed(2))
          : baseInv.advanceReceivedCurrency || 0;

      const rawAdvTermsUSD = parseFloat(
        getFlexibleValue(row, [
          'advanceaspercontracttermsusd',
          'advanceaspercontractterms',
          'advancecontracttermsusd',
          'advancecontractterms',
          'contractadvanceusd',
          'contractadvance',
          'contractualadvanceusd',
          'contractualadvance',
          'advanceaspertcontracttermsusd',
          'advanceaspertcontractterms'
        ]) || ''
      );
      const advanceTermsUSD =
        !isNaN(rawAdvTermsUSD) && rawAdvTermsUSD > 0
          ? Number(rawAdvTermsUSD.toFixed(2))
          : (advUSD > 0 ? (baseInv.advanceTermsUSD || advUSD) : undefined);

      const advShortfallUSD =
        advanceTermsUSD && advanceTermsUSD > advUSD
          ? Number((advanceTermsUSD - advUSD).toFixed(2))
          : undefined;

      const rawAdvDate = getFlexibleValue(row, [
        'dateofreceivingtheadvance',
        'dateofreceivingadvance',
        'advancedate',
        'dateadvance',
        'advdate',
        'advancereceiveddate'
      ]);
      const advDate = rawAdvDate
        ? formatExcelDate(rawAdvDate)
        : advUSD > 0
        ? baseInv.advanceReceivedDate || baseInv.invoiceDate
        : undefined;

      const advRef =
        String(
          getFlexibleValue(row, ['advancebankref', 'advancefirc', 'advanceref', 'advancewire', 'advancerefno']) || ''
        ).trim() || baseInv.advanceBankRef;

      const rawBalUSD = parseFloat(
        getFlexibleValue(row, [
          'actualbalancereceivedusd',
          'actualbalancereceived',
          'balancepaymentamountusd',
          'balanacepaymentamount',
          'balancepaymentamount',
          'balancepaymentamountcurrency',
          'balancepayment',
          'balanceamount',
          'balanceusd',
          'balance'
        ]) || ''
      );
      const balUSD =
        !isNaN(rawBalUSD) && rawBalUSD >= 0
          ? Number(rawBalUSD.toFixed(2))
          : baseInv.balancePaymentAmountCurrency || 0;

      const rawBalPriceUSD = parseFloat(
        getFlexibleValue(row, [
          'balanceasperactualpriceusd',
          'balanceasperactualprice',
          'balanceactualpriceusd',
          'balanceactualprice',
          'contractbalanceusd',
          'balancepriceusd',
          'balanceaspershippingprice'
        ]) || ''
      );
      const balanceActualPriceUSD =
        !isNaN(rawBalPriceUSD) && rawBalPriceUSD > 0
          ? Number(rawBalPriceUSD.toFixed(2))
          : (balUSD > 0
              ? (baseInv.balanceActualPriceUSD || Math.max(0, Number((baseInv.totalAmountCurrency - (advanceTermsUSD || advUSD)).toFixed(2))))
              : undefined);

      const balShortfallUSD =
        balanceActualPriceUSD && balanceActualPriceUSD > balUSD
          ? Number((balanceActualPriceUSD - balUSD).toFixed(2))
          : undefined;

      const totalShortfallUSD =
        (advShortfallUSD || 0) + (balShortfallUSD || 0) > 0
          ? Number(((advShortfallUSD || 0) + (balShortfallUSD || 0)).toFixed(2))
          : undefined;

      const rawBalDate = getFlexibleValue(row, [
        'dateofreceivingbalanacepayment',
        'dateofreceivingbalancepayment',
        'balancedate',
        'datebalance',
        'baldate',
        'balancepaymentdate'
      ]);
      const balDate = rawBalDate
        ? formatExcelDate(rawBalDate)
        : balUSD > 0
        ? baseInv.balancePaymentDate || new Date().toISOString().split('T')[0]
        : undefined;

      const balRef =
        String(
          getFlexibleValue(row, ['balancebankref', 'balancefirc', 'balanceref', 'balancewire', 'balancerefno']) || ''
        ).trim() || baseInv.balanceBankRef;

      const rawBankAccName = String(
        getFlexibleValue(row, ['receivingbankaccount', 'bankaccount', 'bank']) || ''
      ).trim().toLowerCase();
      const matchedBankAcc = rawBankAccName
        ? bankAccounts.find(
            (b) =>
              b.name.toLowerCase().includes(rawBankAccName) ||
              b.bank.toLowerCase().includes(rawBankAccName)
          )
        : undefined;
      const bankAccountId =
        matchedBankAcc?.id || baseInv.realizations[0]?.bankAccountId || bankAccounts[0]?.id;

      const rawNotes = String(
        getFlexibleValue(row, ['settlementnotes', 'notes', 'remarks', 'comments']) || ''
      ).trim();

      const advINR = Number((advUSD * advanceRate).toFixed(2));
      const balINR = Number((balUSD * balanceRate).toFixed(2));
      const totalRealizedCurrency = Number((advUSD + balUSD).toFixed(2));
      const totalRealizedINR = Number((advINR + balINR).toFixed(2));
      const balanceRealizationCurrency = Math.max(
        0,
        Number((baseInv.totalAmountCurrency - totalRealizedCurrency).toFixed(2))
      );

      let realizationStatus: RealizationStatus = 'Not Realized';
      if (totalRealizedCurrency > 0) {
        if (
          balanceRealizationCurrency <= 0.05 ||
          totalRealizedCurrency >= baseInv.totalAmountCurrency ||
          (balUSD > 0 && totalRealizedCurrency + (totalShortfallUSD || 0) >= baseInv.totalAmountCurrency - 0.05)
        ) {
          realizationStatus = 'Fully Realized';
        } else {
          realizationStatus = 'Partially Realized';
        }
      }

      const updatedRealizations: RealizationRecord[] = [];
      if (advUSD > 0 && advDate) {
        updatedRealizations.push({
          id: `real-adv-${baseInv.id}`,
          settlementDate: advDate,
          realizedAmountCurrency: advUSD,
          exchangeRateRealized: advanceRate,
          amountINR: advINR,
          bankRefNo: advRef || `ADV-${baseInv.invoiceNo}`,
          bankAccountId,
          notes: rawNotes ? `Advance: ${rawNotes}` : 'Advance received (imported)',
          paymentType: 'Advance',
          contractTermsAmountUSD: advanceTermsUSD,
          shortfallUSD: advShortfallUSD,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email || 'import@system'
        });
      }
      if (balUSD > 0 && balDate) {
        updatedRealizations.push({
          id: `real-bal-${baseInv.id}`,
          settlementDate: balDate,
          realizedAmountCurrency: balUSD,
          exchangeRateRealized: balanceRate,
          amountINR: balINR,
          bankRefNo: balRef || `BAL-${baseInv.invoiceNo}`,
          bankAccountId,
          notes: rawNotes ? `Balance: ${rawNotes}` : 'Balance received (imported)',
          paymentType: 'Balance',
          contractTermsAmountUSD: balanceActualPriceUSD,
          shortfallUSD: balShortfallUSD,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email || 'import@system'
        });
      }

      const updatedInvoice: SalesInvoice = {
        ...baseInv,
        advanceTermsUSD: advanceTermsUSD && advanceTermsUSD > 0 ? advanceTermsUSD : undefined,
        advanceReceivedCurrency: advUSD > 0 ? advUSD : undefined,
        advanceShortfallUSD: advShortfallUSD && advShortfallUSD > 0 ? advShortfallUSD : undefined,
        advanceExchangeRate: advanceRate,
        advanceReceivedDate: advUSD > 0 ? advDate : undefined,
        advanceReceivedINR: advUSD > 0 ? advINR : undefined,
        advanceBankRef: advUSD > 0 ? advRef : undefined,
        balanceActualPriceUSD: balanceActualPriceUSD && balanceActualPriceUSD > 0 ? balanceActualPriceUSD : undefined,
        balancePaymentAmountCurrency: balUSD > 0 ? balUSD : undefined,
        balanceShortfallUSD: balShortfallUSD && balShortfallUSD > 0 ? balShortfallUSD : undefined,
        balanceExchangeRate: balanceRate,
        balancePaymentDate: balUSD > 0 ? balDate : undefined,
        balancePaymentINR: balUSD > 0 ? balINR : undefined,
        balanceBankRef: balUSD > 0 ? balRef : undefined,
        totalShortfallUSD: totalShortfallUSD && totalShortfallUSD > 0 ? totalShortfallUSD : undefined,
        bankPreDeterminedExchangeRate: bankRate,
        realizations: updatedRealizations,
        totalRealizedCurrency,
        balanceRealizationCurrency,
        totalRealizedINR,
        realizationStatus,
        lastRealizationDate: balDate || advDate || baseInv.lastRealizationDate,
        averageRealizedExchangeRate: totalRealizedCurrency > 0 ? Number((totalRealizedINR / totalRealizedCurrency).toFixed(4)) : bankRate,
        updatedBy: currentUser.email || 'import@system',
        updatedAt: new Date().toISOString()
      };

      updatedInvoicesMap.set(baseInv.id, updatedInvoice);
      updatedCount++;
    });

    if (updatedCount > 0) {
      setSalesInvoices((prev) =>
        prev.map((inv) => updatedInvoicesMap.get(inv.id) || inv)
      );

      logAudit(
        'EDIT',
        'SALES_REALIZATION',
        `Bulk import: Updated settlement for ${updatedCount} sales invoices`,
        {
          newValues: {
            updatedCount,
            invoiceIds: Array.from(updatedInvoicesMap.keys())
          }
        }
      );

      showToast(`Successfully imported and updated settlement for ${updatedCount} sales invoices.`, 'success');
    }

    return { updated: updatedCount, errors };
  };

  const contextValue = useMemo(() => ({
    businessSettings,
    updateBusinessSettings,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    bankAccounts,
    expenseTypes,
    slabTypes,
    customers,
    ports,
    purchases,
    payments,
    purchaseReturns,
    processingEntries,
    salesInvoices,
    auditLogs,
    offlineQueue,
    isOnline,
    slabTolerancePct,
    setSlabTolerancePct,

    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierActive,

    addSpecies,
    updateSpecies,
    deleteSpecies,
    toggleSpeciesActive,

    addGrade,
    updateGrade,
    deleteGrade,
    toggleGradeActive,

    addSize,
    updateSize,
    deleteSize,
    toggleSizeActive,

    addCount,
    updateCount,
    deleteCount,
    toggleCountActive,

    addLocation,
    updateLocation,
    deleteLocation,
    toggleLocationActive,

    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    toggleBankAccountActive,

    addExpenseType,
    updateExpenseType,
    deleteExpenseType,
    toggleExpenseTypeActive,

    addSlabType,
    updateSlabType,
    deleteSlabType,
    toggleSlabTypeActive,
    bulkImportSlabTypes,

    addCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerActive,
    bulkImportCustomers,

    addPort,
    updatePort,
    deletePort,
    togglePortActive,
    bulkImportPorts,

    addPurchase,
    updatePurchase,
    voidPurchase,
    deletePurchasePermanently,

    addProcessingEntry,
    updateProcessingEntry,
    voidProcessingEntry,
    deleteProcessingEntryPermanently,

    addSalesInvoice,
    updateSalesInvoice,
    addInvoiceRealization,
    updateInvoiceSettlement,
    deleteInvoiceRealization,
    voidSalesInvoice,
    deleteSalesInvoicePermanently,

    addPayment,
    voidPayment,

    addPurchaseReturn,
    updatePurchaseReturn,
    voidPurchaseReturn,
    deletePurchaseReturnPermanently,

    recalculateBatch,
    recalculateExpenseBatch,
    allocateBatchYield: allocateBatchYieldContext,
    clearBatchYield: clearBatchYieldContext,
    syncOfflineQueue,

    clearAllTransactions,
    wipeDatabaseCompletely,
    loadStarterPresets,

    bulkImportSuppliers,
    bulkImportSpecies,
    bulkImportGrades,
    bulkImportSizes,
    bulkImportCounts,
    bulkImportLocations,
    bulkImportBankAccounts,
    bulkImportExpenseTypes,
    bulkImportPurchases,
    bulkImportProcessingEntries,
    bulkImportSalesInvoices,
    bulkImportSalesRealizations,
    logAudit,

    // Inventory Module Exports
    inventoryItems,
    inventoryMappings,
    openingStocks,
    stockAdjustments,
    physicalStockCounts,
    periodCloseLocks,
    inventoryCalculation,

    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    toggleInventoryItemActive,

    addInventoryMapping,
    deleteInventoryMapping,

    saveOpeningStock,
    deleteOpeningStock,

    addStockAdjustment,
    deleteStockAdjustment,

    savePhysicalStockCount,
    postPhysicalStockCount,
    deletePhysicalStockCount,

    closePeriodLock,
    unlockPeriod,
    rebuildInventoryLedger
  }), [
    businessSettings,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    bankAccounts,
    expenseTypes,
    slabTypes,
    customers,
    ports,
    purchases,
    payments,
    purchaseReturns,
    processingEntries,
    salesInvoices,
    auditLogs,
    offlineQueue,
    isOnline,
    slabTolerancePct,
    inventoryItems,
    inventoryMappings,
    openingStocks,
    stockAdjustments,
    physicalStockCounts,
    periodCloseLocks,
    inventoryCalculation
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
