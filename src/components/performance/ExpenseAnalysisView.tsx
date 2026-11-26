import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance, computeExpenseGrandTotal } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { PaginationControls } from '../common/PaginationControls';
import { PerformanceFilterBar } from './PerformanceFilterBar';
import { PerformanceExpenseEntry } from '../../types';
import {
  applySharedFiltersToExpenses,
  formatINR,
  formatDDMMYYYY,
  exportExpenseAnalysisExcel,
  printPdfReport,
  isDateInLockedPeriod,
} from '../../utils/performanceHelpers';
import {
  FileSpreadsheet,
  Printer,
  PlusCircle,
  ClipboardPaste,
  X,
  Lock,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const EXPENSE_FIELDS: { key: keyof PerformanceExpenseEntry; label: string }[] = [
  { key: 'eiaExpense', label: 'EIA Expense' },
  { key: 'cartonExpense', label: 'Carton ' },
  { key: 'cover', label: 'Cover' },
  { key: 'freight', label: 'Freight' },
  { key: 'courier', label: 'Courier' },
  { key: 'freezingCharge', label: 'Freezing Charge' },
  { key: 'ice', label: 'Ice' },
  { key: 'otherExpense', label: 'Other Expense' },
];

export const ExpenseAnalysisView: React.FC = () => {
  const { salesInvoices, species, speciesHeads, customers, periodCloseLocks: periodLocks } = useData();
  const {
    performanceExpenses,
    filters,
    upsertExpenseEntry,
    applySharedInvoiceExpenses,
    softDeleteExpenseEntry,
    permanentDeleteExpenseEntry,
    syncFromInvoices,
  } = usePerformance();
  const { currentUser, permissions } = useAuth();

  const [edits, setEdits] = useState<Record<string, Partial<PerformanceExpenseEntry>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Side drawer for whole-invoice expense entry
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null);
  const [splitBasis, setSplitBasis] = useState<'weight' | 'value'>('weight');
  const [drawerForm, setDrawerForm] = useState({
    eiaExpense: 0,
    cartonExpense: 0,
    cover: 0,
    freightTotal: 0,
    courierTotal: 0,
    freezingCharge: 0,
    ice: 0,
    otherExpense: 0,
  });

  // Bulk paste modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');

  // Auto-backfill & live sync
  useEffect(() => {
    syncFromInvoices(salesInvoices, species, speciesHeads, customers);
  }, [salesInvoices, species, speciesHeads, customers, syncFromInvoices]);

  const invoiceLineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    performanceExpenses.forEach((e) => {
      if (!e.isDeleted && !e.isVoided) {
        counts.set(e.invoiceId, (counts.get(e.invoiceId) || 0) + 1);
      }
    });
    return counts;
  }, [performanceExpenses]);

  const filteredEntries = useMemo(() => {
    return applySharedFiltersToExpenses(performanceExpenses, filters);
  }, [performanceExpenses, filters]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, e) => {
        const merged = { ...e, ...(edits[e.id] || {}) };
        const gt = computeExpenseGrandTotal(merged);
        return {
          carton: acc.carton + (e.lineCartonsCount || 0),
          kg: acc.kg + (e.lineWeightKg || 0),
          eiaExpense: acc.eiaExpense + (Number(merged.eiaExpense) || 0),
          cartonExpense: acc.cartonExpense + (Number(merged.cartonExpense) || 0),
          cover: acc.cover + (Number(merged.cover) || 0),
          freight: acc.freight + (Number(merged.freight) || 0),
          courier: acc.courier + (Number(merged.courier) || 0),
          freezingCharge: acc.freezingCharge + (Number(merged.freezingCharge) || 0),
          ice: acc.ice + (Number(merged.ice) || 0),
          otherExpense: acc.otherExpense + (Number(merged.otherExpense) || 0),
          grandTotal: acc.grandTotal + gt,
        };
      },
      {
        carton: 0,
        kg: 0,
        eiaExpense: 0,
        cartonExpense: 0,
        cover: 0,
        freight: 0,
        courier: 0,
        freezingCharge: 0,
        ice: 0,
        otherExpense: 0,
        grandTotal: 0,
      }
    );
  }, [filteredEntries, edits]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  if (!permissions.canViewPerformanceExpenses) {
    return (
      <div className="glass-surface-regular rounded-2xl p-8 text-center space-y-2 border border-rose-200">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-ink-900">Access Restricted</h2>
        <p className="text-sm text-ink-600">
          Direct Expense Analysis is accessible only to Owner / Admin and Master Accountant roles.
        </p>
      </div>
    );
  }

  const handleFieldChange = (id: string, field: keyof PerformanceExpenseEntry, val: string | number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: val },
    }));
  };

  const commitRow = (entry: PerformanceExpenseEntry) => {
    const patch = edits[entry.id];
    if (!patch) return;
    const merged: PerformanceExpenseEntry = {
      ...entry,
      ...patch,
      eiaExpense: Number(patch.eiaExpense ?? entry.eiaExpense) || 0,
      cartonExpense: Number(patch.cartonExpense ?? entry.cartonExpense) || 0,
      cover: Number(patch.cover ?? entry.cover) || 0,
      freight: Number(patch.freight ?? entry.freight) || 0,
      courier: Number(patch.courier ?? entry.courier) || 0,
      freezingCharge: Number(patch.freezingCharge ?? entry.freezingCharge) || 0,
      ice: Number(patch.ice ?? entry.ice) || 0,
      otherExpense: Number(patch.otherExpense ?? entry.otherExpense) || 0,
    };
    upsertExpenseEntry(merged, currentUser);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
  };

  const openDrawerForInvoice = (invoiceId: string) => {
    const rows = performanceExpenses.filter((e) => e.invoiceId === invoiceId && !e.isDeleted && !e.isVoided);
    setDrawerForm({
      eiaExpense: rows.reduce((s, r) => s + r.eiaExpense, 0),
      cartonExpense: rows.reduce((s, r) => s + r.cartonExpense, 0),
      cover: rows.reduce((s, r) => s + r.cover, 0),
      freightTotal: rows.reduce((s, r) => s + r.freight, 0),
      courierTotal: rows.reduce((s, r) => s + r.courier, 0),
      freezingCharge: rows.reduce((s, r) => s + r.freezingCharge, 0),
      ice: rows.reduce((s, r) => s + r.ice, 0),
      otherExpense: rows.reduce((s, r) => s + r.otherExpense, 0),
    });
    setDrawerInvoiceId(invoiceId);
  };

  const handleApplyDrawer = () => {
    if (!drawerInvoiceId) return;
    applySharedInvoiceExpenses(drawerInvoiceId, drawerForm, splitBasis, currentUser);
    setDrawerInvoiceId(null);
  };

  const handleBulkPaste = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    let updated = 0;
    for (const line of lines) {
      const cols = line.split(/\t|,/).map((c) => c.trim());
      if (cols.length < 10) continue;
      // Expect format: InvNo, SpeciesHead (or match by InvNo), EIA, Carton, Cover, Freight, Courier, Freezing, Ice, Other
      const invNo = cols[0];
      const itemHint = cols[1]?.toLowerCase() || '';
      const match = performanceExpenses.find(
        (e) =>
          !e.isDeleted &&
          e.invoiceNo.toLowerCase() === invNo.toLowerCase() &&
          (!itemHint || e.speciesHeadName.toLowerCase().includes(itemHint))
      );
      if (match && !isDateInLockedPeriod(match.invoiceDate, periodLocks)) {
        const nums = cols.slice(2, 10).map((v) => parseFloat(v.replace(/[₹,\s]/g, '')) || 0);
        upsertExpenseEntry(
          {
            ...match,
            eiaExpense: nums[0] || 0,
            cartonExpense: nums[1] || 0,
            cover: nums[2] || 0,
            freight: nums[3] || 0,
            courier: nums[4] || 0,
            freezingCharge: nums[5] || 0,
            ice: nums[6] || 0,
            otherExpense: nums[7] || 0,
          },
          currentUser,
          'Bulk paste import'
        );
        updated++;
      }
    }
    setPasteMessage(`Matched and updated ${updated} row(s).`);
    if (updated > 0) {
      setTimeout(() => {
        setShowPasteModal(false);
        setPasteText('');
        setPasteMessage('');
      }, 1000);
    }
  };

  const handleDeleteRow = (entry: PerformanceExpenseEntry) => {
    if (permissions.canDeletePerformanceData) {
      if (window.confirm(`Permanently delete expense row for ${entry.invoiceNo} (${entry.speciesHeadName})?`)) {
        permanentDeleteExpenseEntry(entry.id, currentUser);
      }
    } else {
      const reason = window.prompt('Enter deletion reason (soft-delete):');
      if (reason && reason.trim()) {
        softDeleteExpenseEntry(entry.id, reason.trim(), currentUser);
      }
    }
  };

  const handleExportPdf = () => {
    const headers = [
      'Inv No.', 'Item', 'Inv Date', 'Inv No.', 'Carton', 'Kg',
      'EIA Expense', 'Carton ', 'Cover', 'Freight', 'Courier', 'Freezing Charge', 'Ice', 'Other Expense', 'Grand Total',
    ];
    const totalsRow = [
      '', 'TOTALS', '', '', totals.carton, totals.kg.toFixed(2),
      totals.eiaExpense.toFixed(2), totals.cartonExpense.toFixed(2), totals.cover.toFixed(2),
      totals.freight.toFixed(2), totals.courier.toFixed(2), totals.freezingCharge.toFixed(2),
      totals.ice.toFixed(2), totals.otherExpense.toFixed(2), totals.grandTotal.toFixed(2),
    ];
    const rows = filteredEntries.map((e) => [
      e.serialNo || '', e.speciesHeadName, formatDDMMYYYY(e.invoiceDate), e.invoiceNo,
      e.lineCartonsCount, e.lineWeightKg.toFixed(2),
      e.eiaExpense.toFixed(2), e.cartonExpense.toFixed(2), e.cover.toFixed(2),
      e.freight.toFixed(2), e.courier.toFixed(2), e.freezingCharge.toFixed(2),
      e.ice.toFixed(2), e.otherExpense.toFixed(2), e.grandTotal.toFixed(2),
    ]);
    printPdfReport('Direct Expense Analysis', headers, rows, totalsRow);
  };

  const drawerRows = drawerInvoiceId
    ? performanceExpenses.filter((e) => e.invoiceId === drawerInvoiceId && !e.isDeleted && !e.isVoided)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Direct Expense Analysis"
        subtitle="Part 1 — Auto-synced from Sales Invoices (one row per invoice per species head)"
        badge={`${filteredEntries.length} rows`}
        primaryAction={{
          label: 'Export Excel',
          icon: FileSpreadsheet,
          onClick: () => exportExpenseAnalysisExcel(filteredEntries),
        }}
        secondaryActions={[
          { label: 'Export PDF', icon: Printer, onClick: handleExportPdf },
          ...(permissions.canEnterPerformanceData
            ? [{ label: 'Bulk Paste', icon: ClipboardPaste, onClick: () => setShowPasteModal(true) }]
            : []),
        ]}
      />

      <PerformanceFilterBar showExpenseStatus showProfitLoss />

      <div className="glass-surface-regular rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Totals Row ABOVE Table */}
              <tr className="bg-rose-900 text-white font-bold">
                <td className="px-2.5 py-2.5 whitespace-nowrap" colSpan={4}>
                  FILTERED TOTALS ({filteredEntries.length} rows)
                </td>
                <td className="px-2.5 py-2.5 text-right">{totals.carton.toLocaleString('en-IN')}</td>
                <td className="px-2.5 py-2.5 text-right">{totals.kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.eiaExpense)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.cartonExpense)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.cover)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.freight)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.courier)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.freezingCharge)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.ice)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.otherExpense)}</td>
                <td className="px-2.5 py-2.5 text-right bg-rose-950">{formatINR(totals.grandTotal)}</td>
                <td className="px-2 py-2.5"></td>
              </tr>

              {/* Group Bands Row */}
              <tr className="text-[10px] uppercase tracking-wider font-extrabold text-ink-700 border-b border-gray-200">
                <th colSpan={6} className="px-3 py-1.5 bg-rose-50/90 text-left border-r border-rose-200">
                  Shipment
                </th>
                <th colSpan={8} className="px-3 py-1.5 bg-emerald-50/90 text-center border-r border-emerald-200">
                  Direct Expenses
                </th>
                <th colSpan={2} className="px-3 py-1.5 bg-gray-100 text-right">
                  Total &amp; Actions
                </th>
              </tr>

              {/* Exact Column Headings Row */}
              <tr className="bg-gray-50 text-ink-700 font-bold border-b border-gray-200">
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap" title="Inv No.: Serial or Reference Number">
                  Inv No.
                </th>
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap">Item</th>
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap">Inv Date</th>
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap" title="Inv No.: Commercial Invoice Number">
                  Inv No.
                </th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap" title="Carton: quantity shipped">
                  Carton
                </th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap border-r border-gray-200">Kg</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">EIA Expense</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap" title="Carton: carton expense">
                  Carton{' '}
                </th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Cover</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Freight</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Courier</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Freezing Charge</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Ice</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap border-r border-gray-200">Other Expense</th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Grand Total</th>
                <th className="px-2 py-2.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center text-ink-500">
                    No invoice rows match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const patch = edits[entry.id] || {};
                  const merged = { ...entry, ...patch };
                  const grandTotal = computeExpenseGrandTotal(merged);
                  const locked = isDateInLockedPeriod(entry.invoiceDate, periodLocks);
                  const canEdit = permissions.canEnterPerformanceData && !locked;
                  const headCount = invoiceLineCounts.get(entry.invoiceId) || 1;

                  return (
                    <tr key={entry.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-2.5 py-2">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={String(patch.serialNo ?? entry.serialNo ?? '')}
                          onChange={(e) => handleFieldChange(entry.id, 'serialNo', e.target.value)}
                          onBlur={() => commitRow(entry)}
                          className="w-12 px-1 py-0.5 border border-transparent hover:border-gray-200 focus:border-rose-400 rounded bg-transparent text-xs"
                        />
                      </td>
                      <td className="px-2.5 py-2 font-semibold text-ink-900 whitespace-nowrap">
                        {entry.speciesHeadName}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-ink-600">
                        {formatDDMMYYYY(entry.invoiceDate)}
                      </td>
                      <td className="px-2.5 py-2 font-mono font-semibold text-rose-800 whitespace-nowrap">
                        {entry.invoiceNo}
                      </td>
                      <td className="px-2.5 py-2 text-right font-medium">{entry.lineCartonsCount}</td>
                      <td className="px-2.5 py-2 text-right font-medium border-r border-gray-100">
                        {entry.lineWeightKg.toFixed(2)}
                      </td>

                      {EXPENSE_FIELDS.map((f) => {
                        const val = Number((patch as any)[f.key] ?? (entry as any)[f.key] ?? 0);
                        const isShared = (f.key === 'freight' || f.key === 'courier') && headCount > 1;
                        const enteredTotal =
                          f.key === 'freight'
                            ? entry.freightEnteredTotal
                            : f.key === 'courier'
                            ? entry.courierEnteredTotal
                            : undefined;

                        return (
                          <td
                            key={f.key}
                            className={`px-1.5 py-1.5 text-right ${f.key === 'otherExpense' ? 'border-r border-gray-100' : ''}`}
                          >
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              disabled={!canEdit}
                              value={val || ''}
                              placeholder="0"
                              onChange={(e) => handleFieldChange(entry.id, f.key, parseFloat(e.target.value) || 0)}
                              onBlur={() => commitRow(entry)}
                              className="w-20 px-1.5 py-1 text-right border border-gray-200/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 rounded bg-white/80 text-xs disabled:bg-gray-50 disabled:text-ink-400"
                            />
                            {isShared && (
                              <div className="text-[9px] text-ink-400 mt-0.5 whitespace-nowrap">
                                {enteredTotal ? `Tot ₹${enteredTotal.toLocaleString('en-IN')} · ` : ''}
                                {(entry.splitRatio * 100).toFixed(0)}%
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-2.5 py-2 text-right whitespace-nowrap">
                        <div className="font-bold text-ink-900">{formatINR(grandTotal)}</div>
                        {grandTotal === 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" /> expenses pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" /> complete
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {locked ? (
                            <span title={`Locked period ${locked.period}`} className="text-amber-600 p-1">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <>
                              {permissions.canEnterPerformanceData && (
                                <button
                                  onClick={() => openDrawerForInvoice(entry.invoiceId)}
                                  className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg inline-flex items-center gap-1"
                                  title="Add / Split Expenses for Whole Invoice"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  Add
                                </button>
                              )}
                              {permissions.canEnterPerformanceData && (
                                <button
                                  onClick={() => handleDeleteRow(entry)}
                                  className="p-1 text-ink-400 hover:text-rose-600 rounded"
                                  title={permissions.canDeletePerformanceData ? 'Permanent delete (Admin)' : 'Soft delete with reason'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredEntries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Add Expenses Side Drawer for Whole Invoice */}
      {drawerInvoiceId && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-ink-900">Add Whole-Invoice Expenses</h3>
                  <p className="text-xs text-ink-500">
                    Invoice: <span className="font-mono font-bold text-rose-700">{drawerRows[0]?.invoiceNo}</span> ({drawerRows.length} species head{drawerRows.length > 1 ? 's' : ''})
                  </p>
                </div>
                <button onClick={() => setDrawerInvoiceId(null)} className="p-1 text-ink-400 hover:text-ink-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 text-xs space-y-2">
                <div className="font-bold text-rose-900">Shared Expense Split Basis</div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={splitBasis === 'weight'}
                      onChange={() => setSplitBasis('weight')}
                    />
                    <span>By Weight (Kg) — Default</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={splitBasis === 'value'}
                      onChange={() => setSplitBasis('value')}
                    />
                    <span>By Sales Value (INR)</span>
                  </label>
                </div>
                <div className="text-[11px] text-ink-600">
                  Heads on this invoice: {drawerRows.map((r) => `${r.speciesHeadName} (${r.lineWeightKg} Kg)`).join(', ')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'eiaExpense', label: 'EIA Expense (₹)' },
                  { key: 'cartonExpense', label: 'Carton Expense (₹)' },
                  { key: 'cover', label: 'Cover (₹)' },
                  { key: 'freightTotal', label: 'Total Freight (Shared ₹)' },
                  { key: 'courierTotal', label: 'Total Courier (Shared ₹)' },
                  { key: 'freezingCharge', label: 'Freezing Charge (₹)' },
                  { key: 'ice', label: 'Ice (₹)' },
                  { key: 'otherExpense', label: 'Other Expense (₹)' },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block font-bold text-ink-600 mb-1">{item.label}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={(drawerForm as any)[item.key] || ''}
                      onChange={(e) =>
                        setDrawerForm((prev) => ({
                          ...prev,
                          [item.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setDrawerInvoiceId(null)}
                className="px-4 py-2 text-xs font-bold text-ink-600 bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDrawer}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Apply &amp; Split Expenses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-ink-900">Bulk Paste / Import Direct Expenses</h3>
              <button onClick={() => setShowPasteModal(false)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-ink-600">
              Paste tab-separated or comma-separated rows from Excel in this column order:
              <br />
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                Inv No., Item, EIA Expense, Carton, Cover, Freight, Courier, Freezing Charge, Ice, Other Expense
              </code>
            </p>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="RF/EXP/71/26-27&#9;Ribbonfish&#9;1200&#9;4500&#9;600&#9;25000&#9;1500&#9;8000&#9;2000&#9;500"
              className="w-full p-3 text-xs font-mono border border-gray-200 rounded-xl focus:outline-hidden focus:border-rose-500"
            />
            {pasteMessage && <div className="text-xs font-bold text-emerald-700">{pasteMessage}</div>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPaste}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Import Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
