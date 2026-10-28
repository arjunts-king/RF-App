import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  RealizationRecord,
  RealizationStatus
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
  SAMPLE_STARTER_PRESETS
} from '../data/initialData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { computePurchaseFields, allocateBatchExpenses, getIndianFinancialYear } from '../utils/calculations';
import { normalizeKey, getFlexibleValue, formatExcelDate } from '../utils/excelImport';

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

  logAudit: (
    action: AuditAction,
    entityName: string,
    entityId: string,
    options?: { oldValues?: any; newValues?: any; changeReason?: string }
  ) => void;
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
      const hasOther = list.some((e) => e.name.toLowerCase().includes('other'));
      if (!hasOther) {
        list = [
          ...list,
          {
            id: 'exp-other-landing',
            code: `EXP-${String(list.length + 1).padStart(3, '0')}`,
            name: 'Other Expenses',
            category: 'Landing',
            active: true
          }
        ];
      }
    } else {
      list = SAMPLE_STARTER_PRESETS.expenseTypes;
    }
    return list;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(`${DB_PREFIX}purchases`);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
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

  // Persist state to localStorage
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}settings`, JSON.stringify(businessSettings)); }, [businessSettings]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}suppliers`, JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}species`, JSON.stringify(species)); }, [species]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}grades`, JSON.stringify(grades)); }, [grades]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}sizes`, JSON.stringify(sizes)); }, [sizes]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}counts`, JSON.stringify(counts)); }, [counts]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}locations`, JSON.stringify(locations)); }, [locations]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}bank_accounts`, JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}expense_types`, JSON.stringify(expenseTypes)); }, [expenseTypes]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}slab_types`, JSON.stringify(slabTypes)); }, [slabTypes]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}customers`, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}ports`, JSON.stringify(ports)); }, [ports]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}processing_entries`, JSON.stringify(processingEntries)); }, [processingEntries]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}sales_invoices`, JSON.stringify(salesInvoices)); }, [salesInvoices]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}slab_tolerance`, String(slabTolerancePct)); }, [slabTolerancePct]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}purchases`, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}payments`, JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}purchase_returns`, JSON.stringify(purchaseReturns)); }, [purchaseReturns]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}audit_logs`, JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(`${DB_PREFIX}offline_queue`, JSON.stringify(offlineQueue)); }, [offlineQueue]);

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
      supplier
    });

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseId,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
      financialYear: businessSettings.financialYear || derived.financialYear,
      supplierId: purchaseData.supplierId,
      locationId: purchaseData.locationId,
      invoiceNo: purchaseData.invoiceNo || '',
      batchNo: purchaseData.batchNo?.trim() || undefined,
      speciesId: purchaseData.speciesId,
      gradeId: purchaseData.gradeId || '',
      sizeId: purchaseData.sizeId || '',
      secondarySizeId: purchaseData.secondarySizeId || undefined,
      isDualSize: Boolean(purchaseData.isDualSize && purchaseData.secondarySizeId),
      countId: purchaseData.countId || '',
      boxesCount: Number(purchaseData.boxesCount) || 0,
      weightKg: Number(purchaseData.weightKg),
      ratePerKg: Number(purchaseData.ratePerKg),
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

    if (newPurchase.batchNo) {
      const batchRows = allPurchases.filter((p) => p.batchNo === newPurchase.batchNo);
      const { updatedPurchases, warnings: batchWarnings } = allocateBatchExpenses(batchRows);
      warnings.push(...batchWarnings);

      const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
      allPurchases = allPurchases.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p));
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
      supplier
    });

    const updatedPurchase: Purchase = {
      ...existing,
      ...updates,
      secondarySizeId: isDualSize ? (updates.secondarySizeId !== undefined ? (updates.secondarySizeId || undefined) : existing.secondarySizeId) : undefined,
      isDualSize: Boolean(isDualSize && (updates.secondarySizeId !== undefined ? updates.secondarySizeId : existing.secondarySizeId)),
      ...derived,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    };

    let allPurchases = purchases.map((p) => (p.id === id ? updatedPurchase : p));

    const batchToCheck = updatedPurchase.batchNo || existing.batchNo;
    if (batchToCheck) {
      const batchRows = allPurchases.filter((p) => p.batchNo === batchToCheck);
      const { updatedPurchases } = allocateBatchExpenses(batchRows);
      const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
      allPurchases = allPurchases.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p));
    }

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

    if (existing.batchNo) {
      const remainingBatchRows = allPurchases.filter((p) => p.batchNo === existing.batchNo);
      const { updatedPurchases } = allocateBatchExpenses(remainingBatchRows);
      const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
      allPurchases = allPurchases.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p));
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

    if (existing.batchNo) {
      const remainingBatchRows = allPurchases.filter((p) => p.batchNo === existing.batchNo);
      const { updatedPurchases } = allocateBatchExpenses(remainingBatchRows);
      const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
      allPurchases = allPurchases.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p));
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

    const paymentNo = `PAY-${String(payments.length + 1).padStart(5, '0')}`;
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
    const returnedValue = Number((weight * rate).toFixed(2));

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
    const returnedValue = Number((weight * rate).toFixed(2));
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

  const recalculateBatch = (batchNo: string) => {
    const batchRows = purchases.filter((p) => p.batchNo === batchNo);
    if (batchRows.length === 0) return;

    const { updatedPurchases, warnings } = allocateBatchExpenses(batchRows);
    const batchMap = new Map(updatedPurchases.map((p) => [p.id, p]));
    setPurchases((prev) => prev.map((p) => (batchMap.has(p.id) ? batchMap.get(p.id)! : p)));

    if (warnings.length > 0) {
      warnings.forEach((w) => showToast(w, 'warning'));
    } else {
      showToast(`Batch ${batchNo} recalculated.`, 'success');
    }
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
        fobValueCurrency: fobVal
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

      lineItems: computedLines,
      totalCartons,
      totalWeightKg,
      totalAmountCurrency,
      totalFobValueCurrency,
      estimatedAmountINR,

      realizations: [],
      totalRealizedCurrency: 0,
      balanceRealizationCurrency: totalAmountCurrency,
      totalRealizedINR: 0,
      realizationStatus: 'Not Realized',

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
        fobValueCurrency: fobVal
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
    logAudit('DELETE', 'Database', 'Transactions', { changeReason: 'User purged all purchase, return, production, and sales transactions' });
    showToast('All purchases, payments, returns, processing lots, and sales invoices cleared.', 'info');
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
    showToast('Common seafood master presets loaded. You can edit or delete them anytime.', 'success');
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
        'speciesname',
        'species',
        'fish',
        'productname',
        'product',
        'item',
        'variety',
        'name'
      ]);
      const name = String(rawName || '').trim();
      if (!name) {
        errors.push(`Row ${idx + 1}: Species name is required.`);
        return;
      }
      const rawCode = getFlexibleValue(row, ['speciescode', 'code', 'productcode', 'itemcode']);
      const code = rawCode ? String(rawCode).trim() : name.slice(0, 3).toUpperCase();
      const scientificName = String(getFlexibleValue(row, ['scientificname', 'scientific']) || '').trim();
      const category = String(getFlexibleValue(row, ['category', 'type', 'group']) || 'Fish').trim();

      const existingIdx = currentList.findIndex(
        (s) =>
          (code && normalizeKey(s.code) === normalizeKey(code)) ||
          normalizeKey(s.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          scientificName: scientificName || currentList[existingIdx].scientificName,
          category: category || currentList[existingIdx].category
        };
        updated++;
      } else {
        currentList.push({
          id: `sp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
          scientificName,
          category,
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
      const rawCode = getFlexibleValue(row, ['expensecode', 'code']);
      const code = rawCode ? String(rawCode).trim() : `EXP-${String(currentList.length + 1).padStart(2, '0')}`;
      const category = String(getFlexibleValue(row, ['category', 'type']) || 'Landing').trim();

      const existingIdx = currentList.findIndex(
        (e) =>
          (code && normalizeKey(e.code) === normalizeKey(code)) ||
          normalizeKey(e.name) === normalizeKey(name)
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name,
          category: category || currentList[existingIdx].category
        };
        updated++;
      } else {
        currentList.push({
          id: `exp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          code,
          name,
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
    const mutableExpenseTypes = [...expenseTypes];

    const getExpenseTypeId = (keywords: string[], defaultName: string, category: string): string => {
      const matched = mutableExpenseTypes.find((et) => {
        const n = et.name.toLowerCase().trim();
        const c = et.code.toLowerCase().trim();
        return keywords.some((kw) => n.includes(kw.toLowerCase()) || c.includes(kw.toLowerCase()));
      });
      if (matched) return matched.id;

      if (autoCreateMaster) {
        const newCode = `EXP-${defaultName.substring(0, 3).toUpperCase()}-${String(mutableExpenseTypes.length + 1).padStart(2, '0')}`;
        const newEt: ExpenseType = {
          id: `exp-${defaultName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          code: newCode,
          name: defaultName,
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
      const batchNo = String(getFlexibleValue(row, ['batchno', 'batch', 'lotno', 'lot']) || '').trim() || undefined;
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

      // 6. Optional auto-creation of unknown custom direct landing expense columns
      if (autoCreateMaster) {
        Object.keys(row).forEach((colHeader) => {
          const lower = colHeader.toLowerCase().trim();
          if (
            (lower.includes('expense') || lower.includes('charges') || lower.includes('cost') || lower.includes('fee')) &&
            !lower.includes('total') && !lower.includes('damage') && !lower.includes('rate') && !lower.includes('weight') &&
            !lower.includes('fish') && !lower.includes('purchase')
          ) {
            const rawVal = row[colHeader];
            if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
              const num = Number(rawVal);
              if (num > 0) {
                const baseName = colHeader.replace(/\(inr\)|\(rs\)|\(₹\)|expense|charges|cost/gi, '').trim() || colHeader.trim();
                const expId = getExpenseTypeId([baseName], colHeader.trim(), 'Harbour Landing');
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

      // Compute calculations
      const derived = computePurchaseFields({
        weightKg: weightVal,
        ratePerKg: rateVal,
        damageWeightKg,
        damageRatePerKg,
        expenseBreakdown,
        amountPaid,
        purchaseDate,
        supplier: resolvedSupplier
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
        speciesId: resolvedSpecies.id,
        gradeId: resolvedGradeId,
        sizeId: resolvedSizeId,
        secondarySizeId: resolvedSecondarySizeId,
        isDualSize,
        countId: resolvedCountId,
        boxesCount,
        weightKg: weightVal,
        ratePerKg: rateVal,
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

    if (newPurchases.length > 0) {
      setPurchases((prev) => [...prev, ...newPurchases]);
      if (createdSuppliers > 0) setSuppliers([...mutableSuppliers]);
      if (createdSpecies > 0) setSpecies([...mutableSpecies]);
      if (createdLocations > 0) setLocations([...mutableLocations]);
      if (mutableGrades.length > grades.length) setGrades([...mutableGrades]);
      if (mutableSizes.length > sizes.length) setSizes([...mutableSizes]);
      if (mutableCounts.length > counts.length) setCounts([...mutableCounts]);
      if (mutableExpenseTypes.length > expenseTypes.length) setExpenseTypes([...mutableExpenseTypes]);

      logAudit('CREATE', 'Purchase', `Excel bulk import: ${newPurchases.length} purchases imported`, {
        newValues: {
          importedCount: newPurchases.length,
          createdSuppliers,
          createdSpecies,
          createdLocations
        }
      });
      showToast(`Successfully imported ${newPurchases.length} purchases from Excel.`, 'success');
    }

    return {
      added: newPurchases.length,
      errors,
      createdSuppliers,
      createdSpecies,
      createdLocations
    };
  };

  return (
    <DataContext.Provider
      value={{
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
        logAudit
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
