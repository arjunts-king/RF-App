import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR } from '../../utils/calculations';
import { triggerPrint } from '../../utils/exportUtils';
import {
  buildFishwiseLedgerStatement,
  exportFishwiseLedgerToWord,
  exportFishwiseLedgerToExcel
} from '../../utils/exportFishwiseStatement';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { Printer, FileText, FileSpreadsheet, Fish, RefreshCw } from 'lucide-react';
import type { Species } from '../../types';

export const FishwiseLedgerView: React.FC = () => {
  const {
    purchases,
    purchaseReturns,
    purchaseSpecies,
    species,
    speciesHeads,
    suppliers,
    locations,
    grades,
    sizes,
    counts,
    businessSettings
  } = useData();

  // Combine purchaseSpecies and commercial species
  const allSpeciesCombined = useMemo(() => {
    const list: Species[] = [...(purchaseSpecies || []), ...(species || [])];
    const seen = new Set<string>();
    const unique: Species[] = [];

    list.forEach((sp) => {
      const key = sp.id.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(sp);
      }
    });

    // Also look through purchases for any speciesId not in master list
    purchases.forEach((p) => {
      if (p.isVoided) return;
      const spId = (p.speciesId || '').trim();
      if (!spId || seen.has(spId.toLowerCase())) return;

      const normName = p.remarks && !p.remarks.toLowerCase().includes('auto')
        ? p.remarks.trim()
        : spId.replace(/^Frozen\s+/i, '').replace(/\[.*?\]/g, '').trim();

      seen.add(spId.toLowerCase());
      unique.push({
        id: spId,
        code: spId.toUpperCase(),
        name: normName || 'Raw Catch Species',
        scientificName: 'Marine Species',
        category: 'Fish',
        active: true
      });
    });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [purchaseSpecies, species, purchases]);

  // Selected species state - default to first species or 'ALL'
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(
    allSpeciesCombined[0]?.id || 'ALL'
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  const selectedSpecies = useMemo(() => {
    if (selectedSpeciesId === 'ALL') return undefined;
    return allSpeciesCombined.find((s) => s.id === selectedSpeciesId);
  }, [selectedSpeciesId, allSpeciesCombined]);

  // Filter purchases by supplier if selected
  const filteredPurchases = useMemo(() => {
    if (selectedSupplierId === 'ALL') return purchases;
    return purchases.filter((p) => p.supplierId === selectedSupplierId);
  }, [purchases, selectedSupplierId]);

  const filteredReturns = useMemo(() => {
    if (selectedSupplierId === 'ALL') return purchaseReturns;
    return (purchaseReturns || []).filter((r) => r.supplierId === selectedSupplierId);
  }, [purchaseReturns, selectedSupplierId]);

  // Compute statement
  const statement = useMemo(
    () =>
      buildFishwiseLedgerStatement({
        speciesId: selectedSpeciesId,
        selectedSpecies,
        purchases: filteredPurchases,
        purchaseReturns: filteredReturns,
        suppliers,
        locations,
        grades,
        sizes,
        counts,
        speciesList: species,
        purchaseSpeciesList: purchaseSpecies,
        speciesHeads,
        startDate,
        endDate
      }),
    [
      selectedSpeciesId,
      selectedSpecies,
      filteredPurchases,
      filteredReturns,
      suppliers,
      locations,
      grades,
      sizes,
      counts,
      species,
      purchaseSpecies,
      speciesHeads,
      startDate,
      endDate
    ]
  );

  const {
    rows: ledgerEntries,
    openingWeightKg,
    openingCost,
    totalInwardWeightKg,
    totalOutwardWeightKg,
    totalDebits,
    totalCredits,
    closingWeightKg,
    closingCost,
    weightedAvgLandedRate,
    totalLotsCount
  } = statement;

  const handleDownloadWord = () => {
    exportFishwiseLedgerToWord(statement, selectedSpecies, businessSettings, startDate, endDate).catch((err) => {
      console.error('Failed to export fish-wise ledger to Word:', err);
      alert('Failed to generate Word document. Please try again.');
    });
  };

  const handleDownloadExcel = () => {
    try {
      exportFishwiseLedgerToExcel(statement, selectedSpecies, businessSettings, startDate, endDate);
    } catch (err) {
      console.error('Failed to export fish-wise ledger to Excel:', err);
      alert('Failed to generate Excel workbook. Please try again.');
    }
  };

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const displayName = selectedSpecies?.name || 'All Fish Species (Consolidated)';
  const displayCode = selectedSpecies?.code || 'ALL';
  const displayCategory = selectedSpecies?.category || 'Seafood Commodity';
  const displayScientific = selectedSpecies?.scientificName || 'Marine Finfish & Shellfish';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header Strip */}
      <div className="print:hidden">
        <PageHeader
          title="Fish-wise commodity ledger"
          subtitle="Debits record landed catch purchases & expenses; Credits record rejections & debit notes. Reconciles running inventory volume & cost."
          breadcrumbs={['Purchase', 'Fish-wise Ledger']}
          secondaryActions={[
            {
              label: 'Download Excel',
              onClick: handleDownloadExcel,
              icon: FileSpreadsheet
            },
            {
              label: 'Download Word',
              onClick: handleDownloadWord,
              icon: FileText
            },
            {
              label: 'Print / PDF (A4)',
              onClick: triggerPrint,
              icon: Printer
            }
          ]}
        />
      </div>

      {/* Bento Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <BentoCard
          label="Total Landed Volume"
          value={`${totalInwardWeightKg.toLocaleString('en-IN')} Kg`}
          caption={`${totalLotsCount} landing transactions`}
          variant="highlight"
        />
        <BentoCard
          label="Total Landed Spend"
          value={formatINR(totalDebits)}
          caption="Gross purchase + landing costs"
          variant="default"
        />
        <BentoCard
          label="Rejections &amp; Debit Notes"
          value={`${totalOutwardWeightKg.toLocaleString('en-IN')} Kg`}
          caption={`${formatINR(totalCredits)} credited back`}
          variant={totalCredits > 0 ? 'warning' : 'default'}
        />
        <BentoCard
          label="Weighted Avg Landed Rate"
          value={`₹${weightedAvgLandedRate.toFixed(2)} / Kg`}
          caption={`Closing Net: ${closingWeightKg.toLocaleString('en-IN')} Kg`}
          variant="success"
        />
      </div>

      {/* Selector & Filter Controls Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        {/* Fish / Species Selector */}
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Fish className="w-3.5 h-3.5 text-sky-600" />
            <span>Select Fish / Species</span>
          </label>
          <select
            value={selectedSpeciesId}
            onChange={(e) => setSelectedSpeciesId(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-ink-900 focus:bg-white focus:border-sky-400 outline-none transition"
          >
            <option value="ALL">All Fish Species (Consolidated Catch Ledger)</option>
            {allSpeciesCombined.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code || s.id}) · {s.category || 'Fish'}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier Filter (Optional) */}
        <div className="min-w-[180px]">
          <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
            Supplier Filter
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-ink-900 focus:bg-white focus:border-sky-400 outline-none transition"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-400 outline-none"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={clearDates}
              className="mt-5 p-2 bg-gray-100 hover:bg-gray-200 text-ink-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              title="Clear date range filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable A4 Statement Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Letterhead Header */}
        <div className="border-b border-gray-200 pb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-ink-900 uppercase">
              {businessSettings.businessName || 'Coastal Marine Traders'}
            </h1>
            <p className="text-xs text-ink-500 mt-0.5">
              {[businessSettings.address, businessSettings.district, businessSettings.state].filter(Boolean).join(', ') || 'Headquarters'}
            </p>
            <p className="text-xs text-ink-500">
              GSTIN: {businessSettings.gstin || 'Unregistered'} · PAN: {businessSettings.pan || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-sky-50 text-sky-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-sky-200">
              Fish-wise Statement of Account
            </span>
            <p className="text-xs text-ink-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
            <p className="text-[11px] text-ink-400">
              {startDate || endDate
                ? `Period: ${startDate || 'Start'} to ${endDate || 'Today'}`
                : 'All Historical Transactions'}
            </p>
          </div>
        </div>

        {/* Fish / Species Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-sky-50/40 rounded-xl border border-sky-100 text-xs">
          <div>
            <span className="text-sky-700 block uppercase font-bold text-[10px] tracking-wider">
              Fish / Species Particulars:
            </span>
            <h3 className="text-sm font-bold text-ink-900 mt-0.5 flex items-center gap-2">
              <Fish className="w-4 h-4 text-sky-600" />
              <span>{displayName}</span>
              <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] rounded-md font-mono">
                {displayCode}
              </span>
            </h3>
            <p className="text-ink-600 italic mt-0.5">{displayScientific}</p>
            <div className="mt-2 text-ink-700 flex flex-wrap gap-4">
              <span>Category: <strong>{displayCategory}</strong></span>
              {selectedSpecies?.hsCode && (
                <span>HS Code: <strong>{selectedSpecies.hsCode}</strong></span>
              )}
              {selectedSpecies?.productForm && (
                <span>Form: <strong>{selectedSpecies.productForm}</strong></span>
              )}
            </div>
          </div>

          <div className="md:text-right flex flex-col justify-between">
            <div>
              <span className="text-sky-700 block uppercase font-bold text-[10px] tracking-wider">
                Cumulative Valuation Summary:
              </span>
              <div className="mt-1 flex items-baseline md:justify-end gap-2">
                <span className="text-xs text-ink-500">Net Volume:</span>
                <span className="text-sm font-bold text-ink-900">{closingWeightKg.toLocaleString('en-IN')} Kg</span>
              </div>
              <div className="mt-0.5 flex items-baseline md:justify-end gap-2">
                <span className="text-xs text-ink-500">Net Landed Spend:</span>
                <span className="text-sm font-bold text-sky-900">{formatINR(closingCost)}</span>
              </div>
            </div>
            <p className="text-[11px] text-ink-500 mt-2">
              Weighted Average Landed Rate: <strong className="text-ink-800">₹{weightedAvgLandedRate.toFixed(2)} / Kg</strong>
            </p>
          </div>
        </div>

        {/* Ledger Statement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs print:text-[8.5px]">
            <thead>
              <tr className="bg-gray-100/90 border-b border-gray-200 text-[10px] print:text-[8px] font-bold text-ink-700 uppercase tracking-wider">
                <th className="py-2.5 px-2 print:px-1">Voucher Ref / ID</th>
                <th className="py-2.5 px-2 print:px-1">Date</th>
                <th className="py-2.5 px-2 print:px-1">Supplier &amp; Harbour</th>
                <th className="py-2.5 px-2 print:px-1">Grade &amp; Size / Count</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Inward (Kg)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Return (Kg)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Pur. Rate</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Exp. Rate</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Pur. Value</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Exp. Value</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Landed Cost (Dr)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Return (Cr)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Net Wt (Kg)</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Cumul. Cost</th>
                <th className="py-2.5 px-2 print:px-1 text-right">Avg Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
              {/* Opening Balance Row */}
              <tr className="bg-sky-50/30 font-semibold">
                <td className="py-2.5 px-2 print:px-1 italic">
                  <div className="text-sky-900 font-bold">Opening</div>
                  <div className="text-[10px] font-normal text-ink-500">Opening Balance B/F</div>
                </td>
                <td className="py-2.5 px-2 print:px-1 italic whitespace-nowrap text-ink-500">
                  {startDate || 'Opening'}
                </td>
                <td className="py-2.5 px-2 print:px-1 text-ink-500 italic" colSpan={2}>
                  Carried forward from earlier periods
                </td>
                <td className="py-2.5 px-2 print:px-1 text-right tabular-nums font-bold text-sky-900">
                  {openingWeightKg > 0 ? `${openingWeightKg.toLocaleString('en-IN')} Kg` : '—'}
                </td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right tabular-nums font-bold text-sky-900 whitespace-nowrap">
                  {openingCost > 0 ? formatINR(openingCost) : '—'}
                </td>
                <td className="py-2.5 px-2 print:px-1 text-right"></td>
                <td className="py-2.5 px-2 print:px-1 text-right tabular-nums font-bold text-ink-900 whitespace-nowrap">
                  {openingWeightKg > 0 ? `${openingWeightKg.toLocaleString('en-IN')} Kg` : '—'}
                </td>
                <td className="py-2.5 px-2 print:px-1 text-right tabular-nums font-bold text-ink-900 whitespace-nowrap">
                  {openingCost > 0 ? formatINR(openingCost) : '—'}
                </td>
                <td className="py-2.5 px-2 print:px-1 text-right tabular-nums font-bold text-ink-700 whitespace-nowrap">
                  {openingWeightKg > 0 ? `₹${(openingCost / openingWeightKg).toFixed(2)}` : '—'}
                </td>
              </tr>

              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-10 text-center text-ink-500">
                    No transactions recorded for this fish species in the selected period.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((row) => {
                  const isReturn = row.type === 'RETURN';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/70 ${isReturn ? 'bg-amber-50/40' : ''}`}
                    >
                      {/* Voucher Ref */}
                      <td className="py-2.5 px-2 print:px-1 font-bold">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className={isReturn ? 'text-amber-800' : 'text-sky-700'}>
                            {row.voucherRef}
                          </span>
                          {isReturn ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                              Debit Note
                            </span>
                          ) : (
                            row.invoiceNo && (
                              <span className="text-[10px] font-normal text-ink-400">
                                #{row.invoiceNo}
                              </span>
                            )
                          )}
                        </div>
                        {row.briefDetails && (
                          <div className="text-[10px] print:text-[7.5px] font-normal text-ink-500 mt-0.5 leading-snug">
                            {row.briefDetails}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-2 print:px-1 whitespace-nowrap text-ink-700">
                        {row.formattedDate}
                      </td>

                      {/* Supplier & Harbour */}
                      <td className="py-2.5 px-2 print:px-1">
                        <div className="font-semibold text-ink-900 whitespace-nowrap">
                          {row.supplierName}
                        </div>
                        <div className="text-[10px] print:text-[7.5px] text-ink-500">
                          {row.locationName}
                        </div>
                      </td>

                      {/* Grade & Spec */}
                      <td className="py-2.5 px-2 print:px-1">
                        <div className="font-semibold text-ink-900 whitespace-nowrap">
                          {row.grade}
                        </div>
                        <div className="text-[10px] print:text-[7.5px] text-ink-500">
                          {row.sizeCount}
                        </div>
                      </td>

                      {/* Inward Weight (Kg) & Boxes */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums font-bold text-sky-950">
                        {row.inwardWeightKg !== null ? (
                          <div>
                            {row.inwardWeightKg > 0 ? (
                              <>
                                <div>{row.inwardWeightKg.toLocaleString('en-IN')} Kg</div>
                                {row.boxesCount && row.boxesCount > 0 ? (
                                  <div className="text-[9px] print:text-[7.5px] font-bold text-amber-800">
                                    {row.boxesCount.toLocaleString('en-IN')} Boxes
                                  </div>
                                ) : null}
                              </>
                            ) : row.boxesCount && row.boxesCount > 0 ? (
                              <div className="text-amber-800">
                                {row.boxesCount.toLocaleString('en-IN')} Boxes
                              </div>
                            ) : (
                              '0 Kg'
                            )}
                          </div>
                        ) : ''}
                      </td>

                      {/* Return Weight (Kg) */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums font-bold text-amber-800">
                        {row.outwardWeightKg !== null ? `-${row.outwardWeightKg.toLocaleString('en-IN')} Kg` : ''}
                      </td>

                      {/* Purchase Rate */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                        {row.purchaseRatePerKg !== null ? formatINR(row.purchaseRatePerKg) : ''}
                      </td>

                      {/* Expense Rate */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums text-ink-500">
                        {row.expenseRatePerKg !== null ? formatINR(row.expenseRatePerKg) : ''}
                      </td>

                      {/* Purchase Value */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums">
                        {row.purchaseValue !== null ? formatINR(row.purchaseValue) : ''}
                      </td>

                      {/* Expense Value */}
                      <td className="py-2.5 px-2 print:px-1 text-right whitespace-nowrap tabular-nums text-ink-500">
                        {row.expenseValue !== null ? formatINR(row.expenseValue) : ''}
                      </td>

                      {/* Landed Cost (Debit) */}
                      <td className="py-2.5 px-2 print:px-1 text-right font-bold whitespace-nowrap text-sky-900 tabular-nums">
                        {row.landedCost > 0 ? formatINR(row.landedCost) : ''}
                      </td>

                      {/* Return Credit */}
                      <td className="py-2.5 px-2 print:px-1 text-right font-bold whitespace-nowrap text-amber-800 tabular-nums">
                        {row.returnCredit > 0 ? formatINR(row.returnCredit) : ''}
                      </td>

                      {/* Running Net Weight */}
                      <td className="py-2.5 px-2 print:px-1 text-right font-bold whitespace-nowrap text-ink-900 tabular-nums">
                        {`${row.runningWeightKg.toLocaleString('en-IN')} Kg`}
                      </td>

                      {/* Running Cumulative Cost */}
                      <td className="py-2.5 px-2 print:px-1 text-right font-bold whitespace-nowrap text-ink-900 tabular-nums">
                        {formatINR(row.runningLandedCost)}
                      </td>

                      {/* Running Avg Rate */}
                      <td className="py-2.5 px-2 print:px-1 text-right font-semibold whitespace-nowrap text-ink-700 tabular-nums">
                        {row.runningAvgRatePerKg > 0 ? `₹${row.runningAvgRatePerKg.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold bg-gray-50/90 text-[11px] print:text-[8px]">
                <td colSpan={4} className="py-3 px-2 print:px-1 uppercase text-ink-800">
                  Totals &amp; Net Cumulative Position
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-sky-950 tabular-nums whitespace-nowrap">
                  <div>{totalInwardWeightKg > 0 ? `${totalInwardWeightKg.toLocaleString('en-IN')} Kg` : '—'}</div>
                  {statement.rows.reduce((s, r) => s + (r.boxesCount || 0), 0) > 0 && (
                    <div className="text-[9px] text-amber-800">
                      {statement.rows.reduce((s, r) => s + (r.boxesCount || 0), 0).toLocaleString('en-IN')} Boxes
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-amber-800 tabular-nums whitespace-nowrap">
                  {totalOutwardWeightKg > 0 ? `-${totalOutwardWeightKg.toLocaleString('en-IN')} Kg` : '—'}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-700 tabular-nums whitespace-nowrap">
                  {statement.weightedAvgPurchaseRate > 0 ? `Avg ₹${statement.weightedAvgPurchaseRate.toFixed(2)}` : ''}
                </td>
                <td className="py-3 px-2 print:px-1"></td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-900 tabular-nums whitespace-nowrap">
                  {statement.totalPurchaseValue > 0 ? formatINR(statement.totalPurchaseValue) : ''}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-500 tabular-nums whitespace-nowrap">
                  {statement.totalExpenseValue > 0 ? formatINR(statement.totalExpenseValue) : ''}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-sky-900 font-extrabold tabular-nums whitespace-nowrap">
                  {formatINR(totalDebits)}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-amber-800 font-extrabold tabular-nums whitespace-nowrap">
                  {formatINR(totalCredits)}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-ink-900 font-extrabold tabular-nums whitespace-nowrap">
                  {`${closingWeightKg.toLocaleString('en-IN')} Kg`}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-sky-950 font-extrabold text-sm tabular-nums whitespace-nowrap">
                  {formatINR(closingCost)}
                </td>
                <td className="py-3 px-2 print:px-1 text-right text-sky-800 font-extrabold tabular-nums whitespace-nowrap">
                  {weightedAvgLandedRate > 0 ? `₹${weightedAvgLandedRate.toFixed(2)}` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures & Seal Section for Print */}
        <div className="pt-12 flex justify-between items-end text-xs text-ink-500 border-t border-gray-200">
          <div>
            <p>Prepared By: Accounts &amp; Costing Dept</p>
            <p className="mt-8 font-semibold text-ink-900">Authorized Signatory</p>
            <p className="text-[10px]">{businessSettings.businessName || 'Coastal Marine Traders'}</p>
          </div>
          <div className="text-center">
            <p>Harbour Inspection &amp; QC</p>
            <p className="mt-8 font-semibold text-ink-900">Procurement In-Charge</p>
            <p className="text-[10px]">Catch Receiving &amp; Weighment</p>
          </div>
          <div className="text-right">
            <p>Internal Audit Verification</p>
            <p className="mt-8 font-semibold text-ink-900">Sign &amp; Company Stamp</p>
            <p className="text-[10px]">{displayName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
