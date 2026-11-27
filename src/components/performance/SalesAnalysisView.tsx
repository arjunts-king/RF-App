import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { PaginationControls } from '../common/PaginationControls';
import { PerformanceFilterBar } from './PerformanceFilterBar';
import { PerformanceSalesEntry } from '../../types';
import {
  applySharedFiltersToSales,
  formatINR,
  formatUSD,
  formatDDMMYYYY,
  exportSalesAnalysisExcel,
  printPdfReport,
  isDateInLockedPeriod,
} from '../../utils/performanceHelpers';
import { FileSpreadsheet, Printer, ShieldAlert, Lock } from 'lucide-react';

export const SalesAnalysisView: React.FC = () => {
  const { salesInvoices, species, speciesHeads, customers, periodCloseLocks: periodLocks } = useData();
  const { performanceSales, filters, upsertSalesEntry, syncFromInvoices } = usePerformance();
  const { currentUser, permissions } = useAuth();

  const [edits, setEdits] = useState<Record<string, Partial<PerformanceSalesEntry>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    syncFromInvoices(salesInvoices, species, speciesHeads, customers);
  }, [salesInvoices, species, speciesHeads, customers, syncFromInvoices]);

  const filteredEntries = useMemo(() => {
    return applySharedFiltersToSales(performanceSales, filters);
  }, [performanceSales, filters]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, e) => {
        const patch = edits[e.id] || {};
        const dbExp = Number(patch.drawbackExpected ?? e.drawbackExpected) || 0;
        const dbRec = Number(patch.drawbackReceived ?? e.drawbackReceived) || 0;
        const rtExp = Number(patch.rodtepExpected ?? e.rodtepExpected) || 0;
        const rtRec = Number(patch.rodtepReceived ?? e.rodtepReceived) || 0;
        return {
          carton: acc.carton + (e.cartonsCount || 0),
          kg: acc.kg + (e.weightKg || 0),
          usd: acc.usd + (e.salesAmountUSD || 0),
          inr: acc.inr + (e.salesAmountINR || 0),
          dbExp: acc.dbExp + dbExp,
          dbRec: acc.dbRec + dbRec,
          dbPend: acc.dbPend + Math.max(0, dbExp - dbRec),
          rtExp: acc.rtExp + rtExp,
          rtRec: acc.rtRec + rtRec,
          rtPend: acc.rtPend + Math.max(0, rtExp - rtRec),
        };
      },
      { carton: 0, kg: 0, usd: 0, inr: 0, dbExp: 0, dbRec: 0, dbPend: 0, rtExp: 0, rtRec: 0, rtPend: 0 }
    );
  }, [filteredEntries, edits]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  if (!permissions.canViewPerformanceExpenses && currentUser.role !== 'viewer') {
    return (
      <div className="glass-surface-regular rounded-2xl p-8 text-center space-y-2 border border-rose-200">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-ink-900">Access Restricted</h2>
        <p className="text-sm text-ink-600">
          You do not have permission to view Sales Analysis figures.
        </p>
      </div>
    );
  }

  const handleFieldChange = (id: string, field: keyof PerformanceSalesEntry, val: number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: val },
    }));
  };

  const commitRow = (entry: PerformanceSalesEntry) => {
    const patch = edits[entry.id];
    if (!patch) return;
    const merged: PerformanceSalesEntry = {
      ...entry,
      ...patch,
      drawbackExpected: Number(patch.drawbackExpected ?? entry.drawbackExpected) || 0,
      drawbackReceived: Number(patch.drawbackReceived ?? entry.drawbackReceived) || 0,
      rodtepExpected: Number(patch.rodtepExpected ?? entry.rodtepExpected) || 0,
      rodtepReceived: Number(patch.rodtepReceived ?? entry.rodtepReceived) || 0,
    };
    upsertSalesEntry(merged, currentUser);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
  };

  const handleExportPdf = () => {
    const headers = [
      'Item', 'Inv Date', 'Inv No.', 'Carton', 'Kg',
      'Sales Amount (USD)', 'Sales Amount (INR)', 'Drawback', 'RoTDEP',
    ];
    const totalsRow = [
      'TOTALS', '', '', totals.carton, totals.kg.toFixed(2),
      totals.usd.toFixed(2), totals.inr.toFixed(2), totals.dbRec.toFixed(2), totals.rtRec.toFixed(2),
    ];
    const rows = filteredEntries.map((e) => [
      e.speciesHeadName, formatDDMMYYYY(e.invoiceDate), e.invoiceNo,
      e.cartonsCount, e.weightKg.toFixed(2),
      e.salesAmountUSD.toFixed(2), e.salesAmountINR > 0 ? e.salesAmountINR.toFixed(2) : '',
      e.drawbackReceived.toFixed(2), e.rodtepReceived.toFixed(2),
    ]);
    printPdfReport('Sales Analysis', headers, rows, totalsRow);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Analysis"
        subtitle="Part 2 — Invoice-wise realizations, USD/INR sales, Drawback & RoTDEP tracking"
        badge={`${filteredEntries.length} rows`}
        primaryAction={{
          label: 'Export Excel',
          icon: FileSpreadsheet,
          onClick: () => exportSalesAnalysisExcel(filteredEntries),
        }}
        secondaryActions={[{ label: 'Export PDF', icon: Printer, onClick: handleExportPdf }]}
      />

      <PerformanceFilterBar showExpenseStatus={false} showDrawbackRodtepStatus showProfitLoss />

      <div className="glass-surface-regular rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Totals Row ABOVE Table */}
              <tr className="bg-rose-900 text-white font-bold">
                <td className="px-2.5 py-2.5 whitespace-nowrap" colSpan={3}>
                  FILTERED TOTALS ({filteredEntries.length} rows)
                </td>
                <td className="px-2.5 py-2.5 text-right">{totals.carton.toLocaleString('en-IN')}</td>
                <td className="px-2.5 py-2.5 text-right">{totals.kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td className="px-2.5 py-2.5 text-right">{formatUSD(totals.usd)}</td>
                <td className="px-2.5 py-2.5 text-right">{formatINR(totals.inr)}</td>
                <td className="px-2 py-2.5 text-right" colSpan={3}>
                  Rec: {formatINR(totals.dbRec)} | Pend: {formatINR(totals.dbPend)}
                </td>
                <td className="px-2 py-2.5 text-right" colSpan={3}>
                  Rec: {formatINR(totals.rtRec)} | Pend: {formatINR(totals.rtPend)}
                </td>
              </tr>

              {/* Group Band Row */}
              <tr className="text-[10px] uppercase tracking-wider font-extrabold text-ink-700 border-b border-gray-200">
                <th colSpan={7} className="px-3 py-1.5 bg-rose-50/90 text-left border-r border-rose-200">
                  Shipment &amp; Sales Realization
                </th>
                <th colSpan={3} className="px-3 py-1.5 bg-sky-50/90 text-center border-r border-sky-200">
                  Drawback
                </th>
                <th colSpan={3} className="px-3 py-1.5 bg-emerald-50/90 text-center">
                  RoTDEP
                </th>
              </tr>

              {/* Exact Column Headings */}
              <tr className="bg-gray-50 text-ink-700 font-bold border-b border-gray-200">
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap">Item</th>
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap">Inv Date</th>
                <th className="px-2.5 py-2.5 text-left whitespace-nowrap">Inv No.</th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Carton</th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Kg</th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Sales Amount (USD)</th>
                <th className="px-2.5 py-2.5 text-right whitespace-nowrap border-r border-gray-200">Sales Amount (INR)</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Expected</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Received</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap border-r border-gray-200">Pending</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Expected</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Received</th>
                <th className="px-2 py-2.5 text-right whitespace-nowrap">Pending</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-ink-500">
                    No sales entries match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const patch = edits[entry.id] || {};
                  const dbExp = Number(patch.drawbackExpected ?? entry.drawbackExpected) || 0;
                  const dbRec = Number(patch.drawbackReceived ?? entry.drawbackReceived) || 0;
                  const dbPend = Math.max(0, dbExp - dbRec);
                  const rtExp = Number(patch.rodtepExpected ?? entry.rodtepExpected) || 0;
                  const rtRec = Number(patch.rodtepReceived ?? entry.rodtepReceived) || 0;
                  const rtPend = Math.max(0, rtExp - rtRec);

                  const locked = isDateInLockedPeriod(entry.invoiceDate, periodLocks);
                  const canEdit = permissions.canEnterPerformanceData && !locked;

                  return (
                    <tr key={entry.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-2.5 py-2 font-semibold text-ink-900 whitespace-nowrap">
                        {entry.speciesHeadName}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-ink-600">
                        {formatDDMMYYYY(entry.invoiceDate)}
                      </td>
                      <td className="px-2.5 py-2 font-mono font-semibold text-rose-800 whitespace-nowrap">
                        {entry.invoiceNo}
                        {locked && <Lock className="w-3 h-3 inline ml-1 text-amber-600" />}
                      </td>
                      <td className="px-2.5 py-2 text-right font-medium">{entry.cartonsCount}</td>
                      <td className="px-2.5 py-2 text-right font-medium">{entry.weightKg.toFixed(2)}</td>
                      <td className="px-2.5 py-2 text-right font-semibold text-ink-800 whitespace-nowrap">
                        {formatUSD(entry.salesAmountUSD)}
                      </td>
                      <td className="px-2.5 py-2 text-right whitespace-nowrap border-r border-gray-100">
                        {entry.salesAmountINR > 0 ? (
                          <>
                            <div className="font-bold text-ink-900">{formatINR(entry.salesAmountINR)}</div>
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                entry.salesBasis === 'realized'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                              title={
                                entry.salesBasis === 'realized'
                                  ? 'Realized INR from settlement'
                                  : `Estimated: USD × ${entry.exchangeRate}`
                              }
                            >
                              {entry.salesBasis === 'realized' ? 'Realized' : `Est @${entry.exchangeRate}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-300" title="No advance or balance realized (Exchange Rate: ₹0.00)">
                            —
                          </span>
                        )}
                      </td>

                      {/* Drawback */}
                      <td className="px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={dbExp || ''}
                          placeholder="0"
                          onChange={(e) => handleFieldChange(entry.id, 'drawbackExpected', parseFloat(e.target.value) || 0)}
                          onBlur={() => commitRow(entry)}
                          className="w-20 px-1.5 py-1 text-right border border-gray-200/70 focus:border-rose-500 rounded bg-white text-xs disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={dbRec || ''}
                          placeholder="0"
                          onChange={(e) => handleFieldChange(entry.id, 'drawbackReceived', parseFloat(e.target.value) || 0)}
                          onBlur={() => commitRow(entry)}
                          className="w-20 px-1.5 py-1 text-right border border-gray-200/70 focus:border-rose-500 rounded bg-white text-xs disabled:bg-gray-50"
                        />
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap border-r border-gray-100 ${dbPend > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatINR(dbPend)}
                      </td>

                      {/* RoTDEP */}
                      <td className="px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={rtExp || ''}
                          placeholder="0"
                          onChange={(e) => handleFieldChange(entry.id, 'rodtepExpected', parseFloat(e.target.value) || 0)}
                          onBlur={() => commitRow(entry)}
                          className="w-20 px-1.5 py-1 text-right border border-gray-200/70 focus:border-rose-500 rounded bg-white text-xs disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canEdit}
                          value={rtRec || ''}
                          placeholder="0"
                          onChange={(e) => handleFieldChange(entry.id, 'rodtepReceived', parseFloat(e.target.value) || 0)}
                          onBlur={() => commitRow(entry)}
                          className="w-20 px-1.5 py-1 text-right border border-gray-200/70 focus:border-rose-500 rounded bg-white text-xs disabled:bg-gray-50"
                        />
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${rtPend > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatINR(rtPend)}
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
    </div>
  );
};
