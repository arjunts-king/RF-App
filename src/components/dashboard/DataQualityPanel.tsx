import React from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg, getAgeingBucket } from '../../utils/calculations';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileCheck2,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const DataQualityPanel: React.FC = () => {
  const { purchases, species, suppliers } = useData();

  const activePurchases = purchases.filter((p) => !p.isVoided);
  const today = new Date();
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  // 1. Duplicate Invoice Check (Same supplier + same invoice + same date)
  const invoiceTracker = new Map<string, number>();
  const duplicateInvoices: { key: string; invoiceNo: string; date: string; supplierId: string }[] = [];

  activePurchases.forEach((p) => {
    if (p.invoiceNo?.trim()) {
      const key = `${p.supplierId}_${p.invoiceNo.trim().toLowerCase()}_${p.purchaseDate}`;
      const count = (invoiceTracker.get(key) || 0) + 1;
      invoiceTracker.set(key, count);
      if (count === 2) {
        duplicateInvoices.push({ key, invoiceNo: p.invoiceNo.trim(), date: p.purchaseDate, supplierId: p.supplierId });
      }
    }
  });

  // 2. Missing Required Fields Check
  const missingFieldEntries = activePurchases.filter(
    (p) => !p.supplierId || !p.speciesId || !p.locationId || !p.weightKg || !p.ratePerKg
  );

  // 3. Zero / Negative Weights Check
  const invalidWeightEntries = activePurchases.filter((p) => p.weightKg <= 0 || p.ratePerKg < 0);

  // 4. Unpaid Purchases Count & Total
  const unpaidPurchases = activePurchases.filter((p) => p.paymentStatus === 'Unpaid');
  const unpaidTotal = unpaidPurchases.reduce((s, p) => s + p.balancePayable, 0);

  // 5. Overdue Payments Count (Due date passed)
  const overduePurchases = activePurchases.filter((p) => {
    if (p.balancePayable <= 0) return false;
    const bucket = getAgeingBucket(p.dueDate, today);
    return bucket !== 'Not Due';
  });
  const overdueTotal = overduePurchases.reduce((s, p) => s + p.balancePayable, 0);

  // -------------------------------------------------------------------------
  // SECTION 10: BUILT-IN AUTOMATED RECONCILIATION CHECK
  // -------------------------------------------------------------------------
  const sumEntryWeight = activePurchases.reduce((s, p) => s + p.weightKg, 0);
  const sumEntryCost = activePurchases.reduce((s, p) => s + p.totalCost, 0);

  // Re-sum via species grouping
  const speciesSumWeight = species.reduce((s, sp) => {
    return s + activePurchases.filter((p) => p.speciesId === sp.id).reduce((w, p) => w + p.weightKg, 0);
  }, 0);

  const speciesSumCost = species.reduce((s, sp) => {
    return s + activePurchases.filter((p) => p.speciesId === sp.id).reduce((c, p) => c + p.totalCost, 0);
  }, 0);

  const weightVariance = Math.abs(sumEntryWeight - speciesSumWeight);
  const costVariance = Math.abs(sumEntryCost - speciesSumCost);
  const weightMismatch = weightVariance > 0.001;
  const costMismatch = costVariance > 0.01;
  const isReconciled = !weightMismatch && !costMismatch;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Data Quality &amp; Automated Audit Control Panel
          </h2>
          <p className="text-xs text-ink-500">
            Surfaces anomalies, duplicate slips, zero weights, and reconciliation drifts prior to month-end book closure.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Active Data Integrity Guardian</span>
        </div>
      </div>

      {/* 5 GREEN / AMBER / RED TILES (SECTION 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Duplicate Invoices */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            duplicateInvoices.length === 0
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Duplicate Invoices</span>
            {duplicateInvoices.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <span className="text-2xl font-black block mt-1">{duplicateInvoices.length}</span>
          <span className="text-[10px] mt-1 block">
            {duplicateInvoices.length === 0 ? 'Zero duplicates detected' : 'Same supplier/invoice/date'}
          </span>
        </div>

        {/* 2. Missing Required Fields */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            missingFieldEntries.length === 0
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Missing Fields</span>
            {missingFieldEntries.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <span className="text-2xl font-black block mt-1">{missingFieldEntries.length}</span>
          <span className="text-[10px] mt-1 block">
            {missingFieldEntries.length === 0 ? 'All transactions complete' : 'Incomplete master links'}
          </span>
        </div>

        {/* 3. Zero / Negative Weights */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            invalidWeightEntries.length === 0
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Zero/Neg Weights</span>
            {invalidWeightEntries.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <span className="text-2xl font-black block mt-1">{invalidWeightEntries.length}</span>
          <span className="text-[10px] mt-1 block">
            {invalidWeightEntries.length === 0 ? 'All weights valid (>0)' : 'Illegal weight or rate'}
          </span>
        </div>

        {/* 4. Unpaid Purchases */}
        <div className="p-4 rounded-2xl border border-gray-200 bg-white text-ink-900 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Unpaid Lots</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black block mt-1">{unpaidPurchases.length}</span>
          <span className="text-[10px] text-ink-500 mt-1 block">Payable: {formatINR(unpaidTotal)}</span>
        </div>

        {/* 5. Overdue Payments */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            overduePurchases.length === 0
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue Dues</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black block mt-1">{overduePurchases.length}</span>
          <span className="text-[10px] mt-1 block">Due: {formatINR(overdueTotal)}</span>
        </div>
      </div>

      {/* BUILT-IN RECONCILIATION CHECK (SECTION 10) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isReconciled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-900">
                Automated Transaction Reconciliation Verification
              </h3>
              <p className="text-xs text-ink-500">
                Continuous mathematical verification: Sum(Source Entries) ≡ Sum(All Analytical Reports)
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isReconciled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
            }`}
          >
            {isReconciled ? '100% RECONCILED (NO DISCREPANCY)' : 'RECONCILIATION DRIFT DETECTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <span className="font-bold text-ink-900 uppercase text-[11px] block">
              1. Weight Conservation Check
            </span>
            <div className="flex justify-between">
              <span className="text-ink-500">Sum of Raw Purchase Rows:</span>
              <span className="font-bold text-ink-900">{formatKg(sumEntryWeight)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Sum across Species Reports:</span>
              <span className="font-bold text-ink-900">{formatKg(speciesSumWeight)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-ink-500">Variance:</span>
              <span className={`font-bold ${weightMismatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                {weightMismatch ? `${weightVariance.toFixed(2)} Kg (Variance detected)` : '0.00 Kg (Exact match)'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <span className="font-bold text-ink-900 uppercase text-[11px] block">
              2. Valuation &amp; Landed Cost Check
            </span>
            <div className="flex justify-between">
              <span className="text-ink-500">Sum of Total Landed Cost Rows:</span>
              <span className="font-bold text-ink-900">{formatINR(sumEntryCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Sum across Category Breakdowns:</span>
              <span className="font-bold text-ink-900">{formatINR(speciesSumCost)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-ink-500">Variance:</span>
              <span className={`font-bold ${costMismatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                {costMismatch ? `${formatINR(costVariance)} (Variance detected)` : '₹0.00 (Exact match)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ANOMALY INSPECTION & RESOLUTION DRILLDOWN */}
      {(duplicateInvoices.length > 0 || missingFieldEntries.length > 0 || invalidWeightEntries.length > 0) && (
        <div className="bg-white rounded-2xl shadow-xs border border-rose-200 overflow-hidden">
          <div className="px-6 py-4 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-ink-900">Flagged Anomalies Requiring Resolution</h3>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
              {duplicateInvoices.length + missingFieldEntries.length + invalidWeightEntries.length} Items Flagged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-4">Anomaly Type</th>
                  <th className="py-2.5 px-4">Transaction / Identifier</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Details / Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-900">
                {duplicateInvoices.map((dup, i) => (
                  <tr key={`dup-${i}`} className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Duplicate Invoice
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-700">Invoice: {dup.invoiceNo}</td>
                    <td className="py-3 px-4">{dup.date}</td>
                    <td className="py-3 px-4">{supplierMap.get(dup.supplierId)?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-ink-600">Multiple purchases entered with identical bill number on the same day.</td>
                  </tr>
                ))}

                {missingFieldEntries.map((p) => (
                  <tr key={`mis-${p.id}`} className="hover:bg-amber-50/20">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Missing Required Fields
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-ink-900">{p.purchaseId}</td>
                    <td className="py-3 px-4">{p.purchaseDate}</td>
                    <td className="py-3 px-4">{supplierMap.get(p.supplierId)?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-ink-600">
                      {[
                        !p.supplierId && 'Supplier missing',
                        !p.speciesId && 'Species missing',
                        !p.locationId && 'Harbour missing',
                        !p.weightKg && 'Weight is 0',
                        !p.ratePerKg && 'Rate missing'
                      ].filter(Boolean).join(', ')}
                    </td>
                  </tr>
                ))}

                {invalidWeightEntries.map((p) => (
                  <tr key={`inv-${p.id}`} className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Invalid Weight/Rate
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-700">{p.purchaseId}</td>
                    <td className="py-3 px-4">{p.purchaseDate}</td>
                    <td className="py-3 px-4">{supplierMap.get(p.supplierId)?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-rose-700">Weight: {p.weightKg} Kg, Rate: ₹{p.ratePerKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
