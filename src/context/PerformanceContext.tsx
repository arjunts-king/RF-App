import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  PerformanceExpenseEntry,
  PerformanceSalesEntry,
  PerformanceHeadShare,
  PerformanceFilters,
  PerformanceAuditEntry,
  PerformanceSavedView,
  SalesInvoice,
  Species,
  SpeciesHead,
  Customer,
  User,
} from '../types';
import { resolveSpeciesHead } from '../utils/performanceHelpers';

const EXPENSES_KEY = 'seafood_v2_performance_expenses';
const SALES_KEY = 'seafood_v2_performance_sales';
const AUDIT_KEY = 'seafood_v2_performance_audit';
const SAVED_VIEWS_KEY = 'seafood_v2_performance_saved_views';

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export const DEFAULT_PERFORMANCE_FILTERS: PerformanceFilters = {
  dateFrom: '',
  dateTo: '',
  financialYear: '',
  month: '',
  speciesHeadIds: [],
  customerIds: [],
  invoiceNumbers: [],
  portIds: [],
  expenseTypes: [],
  expensesStatus: 'all',
  drawbackStatus: 'all',
  rodtepStatus: 'all',
  profitLoss: 'all',
};

export function computeExpenseGrandTotal(e: Partial<PerformanceExpenseEntry>): number {
  return Number(
    (
      (Number(e.eiaExpense) || 0) +
      (Number(e.cartonExpense) || 0) +
      (Number(e.cover) || 0) +
      (Number(e.freight) || 0) +
      (Number(e.courier) || 0) +
      (Number(e.freezingCharge) || 0) +
      (Number(e.ice) || 0) +
      (Number(e.otherExpense) || 0)
    ).toFixed(2)
  );
}

interface RebuildReport {
  totalInvoicesProcessed: number;
  expenseRowsBefore: number;
  expenseRowsAfter: number;
  salesRowsBefore: number;
  salesRowsAfter: number;
  grandTotalBefore: number;
  grandTotalAfter: number;
  salesInrBefore: number;
  salesInrAfter: number;
  matchedCleanly: boolean;
}

interface PerformanceContextValue {
  performanceExpenses: PerformanceExpenseEntry[];
  performanceSales: PerformanceSalesEntry[];
  performanceAuditLogs: PerformanceAuditEntry[];
  filters: PerformanceFilters;
  setFilters: React.Dispatch<React.SetStateAction<PerformanceFilters>>;
  resetFilters: () => void;
  savedViews: PerformanceSavedView[];
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  upsertExpenseEntry: (entry: PerformanceExpenseEntry, user?: User | null, reason?: string) => void;
  upsertSalesEntry: (entry: PerformanceSalesEntry, user?: User | null) => void;
  applySharedInvoiceExpenses: (
    invoiceId: string,
    expenses: {
      eiaExpense?: number;
      cartonExpense?: number;
      cover?: number;
      freightTotal?: number;
      courierTotal?: number;
      freezingCharge?: number;
      ice?: number;
      otherExpense?: number;
    },
    splitBasis: 'weight' | 'value',
    user?: User | null
  ) => void;
  softDeleteExpenseEntry: (id: string, reason: string, user?: User | null) => void;
  permanentDeleteExpenseEntry: (id: string, user?: User | null) => void;
  syncFromInvoices: (
    salesInvoices: SalesInvoice[],
    speciesList: Species[],
    speciesHeads: SpeciesHead[],
    customers: Customer[]
  ) => void;
  rebuildPerformanceData: (
    salesInvoices: SalesInvoice[],
    speciesList: Species[],
    speciesHeads: SpeciesHead[],
    customers: Customer[],
    user?: User | null
  ) => RebuildReport;
  isSynced: boolean;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [performanceExpenses, setPerformanceExpenses] = useState<PerformanceExpenseEntry[]>(() =>
    readLS<PerformanceExpenseEntry[]>(EXPENSES_KEY, [])
  );
  const [performanceSales, setPerformanceSales] = useState<PerformanceSalesEntry[]>(() =>
    readLS<PerformanceSalesEntry[]>(SALES_KEY, [])
  );
  const [performanceAuditLogs, setPerformanceAuditLogs] = useState<PerformanceAuditEntry[]>(() =>
    readLS<PerformanceAuditEntry[]>(AUDIT_KEY, [])
  );
  const [savedViews, setSavedViews] = useState<PerformanceSavedView[]>(() =>
    readLS<PerformanceSavedView[]>(SAVED_VIEWS_KEY, [])
  );
  const [filters, setFilters] = useState<PerformanceFilters>(DEFAULT_PERFORMANCE_FILTERS);
  const [isSynced, setIsSynced] = useState(false);

  const expensesRef = useRef(performanceExpenses);
  const salesRef = useRef(performanceSales);
  expensesRef.current = performanceExpenses;
  salesRef.current = performanceSales;

  useEffect(() => {
    writeLS(EXPENSES_KEY, performanceExpenses);
  }, [performanceExpenses]);

  useEffect(() => {
    writeLS(SALES_KEY, performanceSales);
  }, [performanceSales]);

  useEffect(() => {
    writeLS(AUDIT_KEY, performanceAuditLogs);
  }, [performanceAuditLogs]);

  useEffect(() => {
    writeLS(SAVED_VIEWS_KEY, savedViews);
  }, [savedViews]);

  const appendAudit = useCallback(
    (
      action: PerformanceAuditEntry['action'],
      targetType: PerformanceAuditEntry['targetType'],
      targetId: string,
      summary: string,
      user?: User | null,
      details?: string
    ) => {
      const entry: PerformanceAuditEntry = {
        id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        userId: user?.id || 'system',
        userName: user?.name || 'System',
        userRole: user?.role || 'admin',
        action,
        targetType,
        targetId,
        summary,
        details,
      };
      setPerformanceAuditLogs((prev) => [entry, ...prev].slice(0, 500));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_PERFORMANCE_FILTERS);
  }, []);

  const saveView = useCallback(
    (name: string) => {
      if (!name.trim()) return;
      const view: PerformanceSavedView = {
        id: `pv_${Date.now()}`,
        name: name.trim(),
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };
      setSavedViews((prev) => [view, ...prev]);
    },
    [filters]
  );

  const deleteView = useCallback((id: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const upsertExpenseEntry = useCallback(
    (entry: PerformanceExpenseEntry, user?: User | null, reason?: string) => {
      const grandTotal = computeExpenseGrandTotal(entry);
      const normalized: PerformanceExpenseEntry = {
        ...entry,
        grandTotal,
        expensesComplete: grandTotal > 0,
        updatedAt: new Date().toISOString(),
      };
      setPerformanceExpenses((prev) => {
        const idx = prev.findIndex((e) => e.id === normalized.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = normalized;
          return next;
        }
        return [...prev, normalized];
      });
      appendAudit(
        'UPDATE',
        'expense',
        normalized.id,
        `Updated expenses for ${normalized.invoiceNo} (${normalized.speciesHeadName}) — ₹${grandTotal.toLocaleString('en-IN')}`,
        user,
        reason
      );
    },
    [appendAudit]
  );

  const upsertSalesEntry = useCallback(
    (entry: PerformanceSalesEntry, user?: User | null) => {
      const drawbackPending = Math.max(0, Number(((entry.drawbackExpected || 0) - (entry.drawbackReceived || 0)).toFixed(2)));
      const rodtepPending = Math.max(0, Number(((entry.rodtepExpected || 0) - (entry.rodtepReceived || 0)).toFixed(2)));
      const normalized: PerformanceSalesEntry = {
        ...entry,
        drawbackPending,
        rodtepPending,
        updatedAt: new Date().toISOString(),
      };
      setPerformanceSales((prev) => {
        const idx = prev.findIndex((e) => e.id === normalized.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = normalized;
          return next;
        }
        return [...prev, normalized];
      });
      appendAudit(
        'UPDATE',
        'sales',
        normalized.id,
        `Updated Drawback/RoTDEP for ${normalized.invoiceNo} (${normalized.speciesHeadName})`,
        user
      );
    },
    [appendAudit]
  );

  const applySharedInvoiceExpenses = useCallback(
    (
      invoiceId: string,
      expenses: {
        eiaExpense?: number;
        cartonExpense?: number;
        cover?: number;
        freightTotal?: number;
        courierTotal?: number;
        freezingCharge?: number;
        ice?: number;
        otherExpense?: number;
      },
      splitBasis: 'weight' | 'value',
      user?: User | null
    ) => {
      const currentSales = salesRef.current;
      setPerformanceExpenses((prev) => {
        const invoiceRows = prev.filter((e) => e.invoiceId === invoiceId && !e.isDeleted && !e.isVoided);
        if (invoiceRows.length === 0) return prev;

        const totalWeight = invoiceRows.reduce((s, r) => s + (r.lineWeightKg || 0), 0);
        const invoiceSalesRows = currentSales.filter((s) => s.invoiceId === invoiceId && !s.isDeleted);
        const totalValue = invoiceSalesRows.reduce((s, r) => s + (r.salesAmountINR || 0), 0);

        const now = new Date().toISOString();
        return prev.map((row) => {
          if (row.invoiceId !== invoiceId || row.isDeleted || row.isVoided) return row;

          let ratio = 1 / invoiceRows.length;
          if (splitBasis === 'weight' && totalWeight > 0) {
            ratio = (row.lineWeightKg || 0) / totalWeight;
          } else if (splitBasis === 'value' && totalValue > 0) {
            const matchSale = invoiceSalesRows.find((s) => s.speciesHeadId === row.speciesHeadId);
            ratio = (matchSale?.salesAmountINR || 0) / totalValue;
          }

          const updated: PerformanceExpenseEntry = {
            ...row,
            splitRatio: ratio,
            eiaExpense: expenses.eiaExpense !== undefined ? Number((expenses.eiaExpense * ratio).toFixed(2)) : row.eiaExpense,
            cartonExpense: expenses.cartonExpense !== undefined ? Number((expenses.cartonExpense * ratio).toFixed(2)) : row.cartonExpense,
            cover: expenses.cover !== undefined ? Number((expenses.cover * ratio).toFixed(2)) : row.cover,
            freight: expenses.freightTotal !== undefined ? Number((expenses.freightTotal * ratio).toFixed(2)) : row.freight,
            freightEnteredTotal: expenses.freightTotal !== undefined ? expenses.freightTotal : row.freightEnteredTotal,
            courier: expenses.courierTotal !== undefined ? Number((expenses.courierTotal * ratio).toFixed(2)) : row.courier,
            courierEnteredTotal: expenses.courierTotal !== undefined ? expenses.courierTotal : row.courierEnteredTotal,
            freezingCharge: expenses.freezingCharge !== undefined ? Number((expenses.freezingCharge * ratio).toFixed(2)) : row.freezingCharge,
            ice: expenses.ice !== undefined ? Number((expenses.ice * ratio).toFixed(2)) : row.ice,
            otherExpense: expenses.otherExpense !== undefined ? Number((expenses.otherExpense * ratio).toFixed(2)) : row.otherExpense,
            updatedAt: now,
          };
          updated.grandTotal = computeExpenseGrandTotal(updated);
          updated.expensesComplete = updated.grandTotal > 0;
          return updated;
        });
      });

      appendAudit(
        'UPDATE',
        'expense',
        invoiceId,
        `Applied shared invoice expenses (split by ${splitBasis}) for invoice ${invoiceId}`,
        user
      );
    },
    [appendAudit]
  );

  const softDeleteExpenseEntry = useCallback(
    (id: string, reason: string, user?: User | null) => {
      const now = new Date().toISOString();
      setPerformanceExpenses((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, isDeleted: true, deletionReason: reason, deletedAt: now, deletedBy: user?.name || 'User' }
            : e
        )
      );
      appendAudit('SOFT_DELETE', 'expense', id, `Soft-deleted expense row ${id}: ${reason}`, user, reason);
    },
    [appendAudit]
  );

  const permanentDeleteExpenseEntry = useCallback(
    (id: string, user?: User | null) => {
      setPerformanceExpenses((prev) => prev.filter((e) => e.id !== id));
      appendAudit('DELETE', 'expense', id, `Permanently deleted expense row ${id}`, user);
    },
    [appendAudit]
  );

  const computeSyncedArrays = useCallback(
    (
      salesInvoices: SalesInvoice[],
      speciesList: Species[],
      speciesHeads: SpeciesHead[],
      customers: Customer[],
      prevExpenses: PerformanceExpenseEntry[],
      prevSales: PerformanceSalesEntry[]
    ) => {
      const customerById = new Map(customers.map((c) => [c.id, c]));

      // Index existing entries by invoiceId (summing if migrating from multi-row per invoice)
      const existingExpenseByInvoice = new Map<string, PerformanceExpenseEntry>();
      for (const e of prevExpenses) {
        if (e.isDeleted) continue;
        const cur = existingExpenseByInvoice.get(e.invoiceId);
        if (!cur) {
          existingExpenseByInvoice.set(e.invoiceId, { ...e });
        } else {
          existingExpenseByInvoice.set(e.invoiceId, {
            ...cur,
            eiaExpense: (cur.eiaExpense || 0) + (e.eiaExpense || 0),
            cartonExpense: (cur.cartonExpense || 0) + (e.cartonExpense || 0),
            cover: (cur.cover || 0) + (e.cover || 0),
            freight: (cur.freight || 0) + (e.freight || 0),
            courier: (cur.courier || 0) + (e.courier || 0),
            freezingCharge: (cur.freezingCharge || 0) + (e.freezingCharge || 0),
            ice: (cur.ice || 0) + (e.ice || 0),
            otherExpense: (cur.otherExpense || 0) + (e.otherExpense || 0),
          });
        }
      }

      const existingSalesByInvoice = new Map<string, PerformanceSalesEntry>();
      for (const s of prevSales) {
        if (s.isDeleted) continue;
        const cur = existingSalesByInvoice.get(s.invoiceId);
        if (!cur) {
          existingSalesByInvoice.set(s.invoiceId, { ...s });
        } else {
          existingSalesByInvoice.set(s.invoiceId, {
            ...cur,
            drawbackExpected: (cur.drawbackExpected || 0) + (s.drawbackExpected || 0),
            drawbackReceived: (cur.drawbackReceived || 0) + (s.drawbackReceived || 0),
            rodtepExpected: (cur.rodtepExpected || 0) + (s.rodtepExpected || 0),
            rodtepReceived: (cur.rodtepReceived || 0) + (s.rodtepReceived || 0),
          });
        }
      }

      const newExpenses: PerformanceExpenseEntry[] = [];
      const newSales: PerformanceSalesEntry[] = [];
      const now = new Date().toISOString();
      let serialCounter = 1;

      for (const invoice of salesInvoices) {
        if (invoice.isVoided) continue;
        const lines = invoice.lineItems || [];

        const customer = customerById.get(invoice.consigneeId);
        const customerName = customer?.name || invoice.consigneeName || invoice.consigneeId || '';

        const totalWeightKg =
          invoice.totalWeightKg || lines.reduce((s, l) => s + (Number(l.weightKg) || 0), 0);
        const totalCartons =
          invoice.totalCartons || lines.reduce((s, l) => s + (Number(l.cartonsCount) || 0), 0);
        const totalSalesUSD =
          invoice.totalAmountCurrency || lines.reduce((s, l) => s + (Number(l.amountCurrency) || 0), 0);
        const totalFobINR =
          invoice.totalFobValueINR || lines.reduce((s, l) => s + (Number(l.fobValueINR) || 0), 0);
        const exchangeRate = invoice.exchangeRate || 83;

        const realizations: any[] = (invoice as any).realizations || [];
        const totalRealizedINRFromSettlement = realizations.reduce(
          (sum, r) => sum + (Number(r.amountINR) || 0),
          0
        );

        let salesAmountINR = 0;
        let salesBasis: 'realized' | 'estimated' = 'estimated';
        if (totalRealizedINRFromSettlement > 0) {
          salesAmountINR = Number(totalRealizedINRFromSettlement.toFixed(2));
          salesBasis = 'realized';
        } else if ((invoice as any).realizationStatus === 'Fully Realized' && totalFobINR > 0) {
          salesAmountINR = Number(totalFobINR.toFixed(2));
          salesBasis = 'realized';
        } else {
          salesAmountINR = Number((totalSalesUSD * exchangeRate).toFixed(2));
          salesBasis = 'estimated';
        }

        // Resolve species head per line for accurate headBreakdown (while keeping 1 row per invoice)
        const headGroups = new Map<
          string,
          { headId: string; headName: string; weightKg: number; cartonsCount: number; salesUSD: number }
        >();
        for (const line of lines) {
          const { headId, headName } = resolveSpeciesHead(
            line.speciesId,
            line.productDescription,
            speciesList,
            speciesHeads
          );
          const cur = headGroups.get(headId) || {
            headId,
            headName,
            weightKg: 0,
            cartonsCount: 0,
            salesUSD: 0,
          };
          cur.weightKg += Number(line.weightKg) || 0;
          cur.cartonsCount += Number(line.cartonsCount) || 0;
          cur.salesUSD += Number(line.amountCurrency) || 0;
          headGroups.set(headId, cur);
        }

        const headList = Array.from(headGroups.values()).sort((a, b) => b.weightKg - a.weightKg);
        const primaryHead = headList[0] || {
          headId: '__unmapped__',
          headName: 'Unmapped Product',
          weightKg: totalWeightKg,
          cartonsCount: totalCartons,
          salesUSD: totalSalesUSD,
        };
        const displayHeadName =
          headList.length > 1
            ? headList.map((h) => h.headName).join(' / ')
            : primaryHead.headName;

        const headBreakdown: PerformanceHeadShare[] = headList.map((h) => {
          const ratio = totalWeightKg > 0 ? h.weightKg / totalWeightKg : 1 / Math.max(1, headList.length);
          const usdRatio = totalSalesUSD > 0 ? h.salesUSD / totalSalesUSD : ratio;
          return {
            speciesHeadId: h.headId,
            speciesHeadName: h.headName,
            weightKg: h.weightKg,
            cartonsCount: h.cartonsCount,
            salesAmountUSD: h.salesUSD,
            salesAmountINR: Number((salesAmountINR * usdRatio).toFixed(2)),
            splitRatio: ratio,
          };
        });

        const serialStr = String(serialCounter++);
        const existingExp = existingExpenseByInvoice.get(invoice.id);
        const expEntry: PerformanceExpenseEntry = {
          id: `pe_${invoice.id}`,
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          financialYear: invoice.financialYear,
          customerId: invoice.consigneeId,
          customerName,
          portOfLoadingId: invoice.portOfLoadingId,
          portOfDischargeId: invoice.portOfDischargeId,
          speciesHeadId: primaryHead.headId,
          speciesHeadName: displayHeadName,
          headBreakdown,
          serialNo: existingExp?.serialNo || serialStr,
          invoiceTotalWeightKg: totalWeightKg,
          invoiceTotalValueINR: salesAmountINR,
          lineWeightKg: totalWeightKg,
          lineCartonsCount: totalCartons,
          splitRatio: 1,
          eiaExpense: existingExp?.eiaExpense ?? 0,
          cartonExpense: existingExp?.cartonExpense ?? 0,
          cover: existingExp?.cover ?? 0,
          freight: existingExp?.freight ?? 0,
          freightEnteredTotal: existingExp?.freightEnteredTotal,
          courier: existingExp?.courier ?? 0,
          courierEnteredTotal: existingExp?.courierEnteredTotal,
          freezingCharge: existingExp?.freezingCharge ?? 0,
          ice: existingExp?.ice ?? 0,
          otherExpense: existingExp?.otherExpense ?? 0,
          grandTotal: existingExp ? computeExpenseGrandTotal(existingExp) : 0,
          expensesComplete: existingExp ? computeExpenseGrandTotal(existingExp) > 0 : false,
          isVoided: false,
          isDeleted: existingExp?.isDeleted ?? false,
          deletionReason: existingExp?.deletionReason,
          deletedAt: existingExp?.deletedAt,
          deletedBy: existingExp?.deletedBy,
          createdAt: existingExp?.createdAt ?? now,
          updatedAt: existingExp ? existingExp.updatedAt : now,
        };
        newExpenses.push(expEntry);

        const existingSale = existingSalesByInvoice.get(invoice.id);
        const dbExp = existingSale?.drawbackExpected ?? 0;
        const dbRec = existingSale?.drawbackReceived ?? 0;
        const rtExp = existingSale?.rodtepExpected ?? 0;
        const rtRec = existingSale?.rodtepReceived ?? 0;

        const saleEntry: PerformanceSalesEntry = {
          id: `ps_${invoice.id}`,
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          financialYear: invoice.financialYear,
          customerId: invoice.consigneeId,
          customerName,
          portOfDischargeId: invoice.portOfDischargeId,
          speciesHeadId: primaryHead.headId,
          speciesHeadName: displayHeadName,
          headBreakdown,
          cartonsCount: totalCartons,
          weightKg: totalWeightKg,
          salesAmountUSD: totalSalesUSD,
          salesAmountINR,
          salesBasis,
          exchangeRate,
          drawbackExpected: dbExp,
          drawbackReceived: dbRec,
          drawbackPending: Math.max(0, Number((dbExp - dbRec).toFixed(2))),
          rodtepExpected: rtExp,
          rodtepReceived: rtRec,
          rodtepPending: Math.max(0, Number((rtExp - rtRec).toFixed(2))),
          isVoided: false,
          isDeleted: existingSale?.isDeleted ?? false,
          deletionReason: existingSale?.deletionReason,
          createdAt: existingSale?.createdAt ?? now,
          updatedAt: existingSale ? existingSale.updatedAt : now,
        };
        newSales.push(saleEntry);
      }

      return { newExpenses, newSales };
    },
    []
  );

  const syncFromInvoices = useCallback(
    (
      salesInvoices: SalesInvoice[],
      speciesList: Species[],
      speciesHeads: SpeciesHead[],
      customers: Customer[]
    ) => {
      const { newExpenses, newSales } = computeSyncedArrays(
        salesInvoices,
        speciesList,
        speciesHeads,
        customers,
        expensesRef.current,
        salesRef.current
      );
      setPerformanceExpenses(newExpenses);
      setPerformanceSales(newSales);
      setIsSynced(true);
    },
    [computeSyncedArrays]
  );

  const rebuildPerformanceData = useCallback(
    (
      salesInvoices: SalesInvoice[],
      speciesList: Species[],
      speciesHeads: SpeciesHead[],
      customers: Customer[],
      user?: User | null
    ): RebuildReport => {
      const prevExp = expensesRef.current;
      const prevSales = salesRef.current;
      const grandTotalBefore = prevExp.filter((e) => !e.isDeleted && !e.isVoided).reduce((s, e) => s + e.grandTotal, 0);
      const salesInrBefore = prevSales.filter((s) => !s.isDeleted && !s.isVoided).reduce((s, r) => s + r.salesAmountINR, 0);

      const { newExpenses, newSales } = computeSyncedArrays(
        salesInvoices,
        speciesList,
        speciesHeads,
        customers,
        prevExp,
        prevSales
      );

      setPerformanceExpenses(newExpenses);
      setPerformanceSales(newSales);
      setIsSynced(true);

      const grandTotalAfter = newExpenses.filter((e) => !e.isDeleted && !e.isVoided).reduce((s, e) => s + e.grandTotal, 0);
      const salesInrAfter = newSales.filter((s) => !s.isDeleted && !s.isVoided).reduce((s, r) => s + r.salesAmountINR, 0);

      const report: RebuildReport = {
        totalInvoicesProcessed: salesInvoices.filter((i) => !i.isVoided).length,
        expenseRowsBefore: prevExp.length,
        expenseRowsAfter: newExpenses.length,
        salesRowsBefore: prevSales.length,
        salesRowsAfter: newSales.length,
        grandTotalBefore,
        grandTotalAfter,
        salesInrBefore,
        salesInrAfter,
        matchedCleanly:
          Math.abs(grandTotalBefore - grandTotalAfter) < 0.01 &&
          Math.abs(salesInrBefore - salesInrAfter) < 0.01,
      };

      appendAudit(
        'REBUILD',
        'system',
        'performance_rebuild',
        `Rebuilt ${report.totalInvoicesProcessed} invoices (${report.expenseRowsAfter} expense rows, ${report.salesRowsAfter} sales rows)`,
        user
      );

      return report;
    },
    [computeSyncedArrays, appendAudit]
  );

  return (
    <PerformanceContext.Provider
      value={{
        performanceExpenses,
        performanceSales,
        performanceAuditLogs,
        filters,
        setFilters,
        resetFilters,
        savedViews,
        saveView,
        deleteView,
        upsertExpenseEntry,
        upsertSalesEntry,
        applySharedInvoiceExpenses,
        softDeleteExpenseEntry,
        permanentDeleteExpenseEntry,
        syncFromInvoices,
        rebuildPerformanceData,
        isSynced,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

export function usePerformance(): PerformanceContextValue {
  const ctx = useContext(PerformanceContext);
  if (!ctx) {
    throw new Error('usePerformance must be used inside <PerformanceProvider>');
  }
  return ctx;
}
