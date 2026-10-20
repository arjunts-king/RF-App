import React from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, getAgeingBucket } from '../../utils/calculations';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { Clock, Download, Info } from 'lucide-react';

export const OutstandingReport: React.FC = () => {
  const { suppliers, purchases, payments } = useData();

  interface SupplierAgeing {
    supplierId: string;
    code: string;
    name: string;
    creditDays: number;
    openingBalance: number;
    purchasesTotal: number;
    paymentsTotal: number;
    closingBalance: number;
    notDue: number;
    d0_30: number;
    d31_60: number;
    d61_90: number;
    d91_180: number;
    d180Plus: number;
  }

  const today = new Date();

  const reportData: SupplierAgeing[] = suppliers.map((supp) => {
    const suppPurchases = purchases.filter((p) => p.supplierId === supp.id && !p.isVoided);
    const suppPayments = payments.filter((pay) => pay.supplierId === supp.id && !pay.isVoided);

    const purchasesTotal = suppPurchases.reduce((s, p) => s + p.totalCost, 0);
    const directPaid = suppPurchases.reduce((s, p) => s + (p.directAmountPaid !== undefined ? p.directAmountPaid : (suppPayments.length === 0 ? p.amountPaid : 0)), 0);
    const standalonePaid = suppPayments.reduce((s, pay) => s + pay.amount, 0);
    const paymentsTotal = directPaid + standalonePaid;

    const openingBalance = supp.openingBalance || 0;
    const closingBalance = openingBalance + purchasesTotal - paymentsTotal;

    // Ageing bucket calculations across unpaid balances on purchases
    let notDue = 0;
    let d0_30 = 0;
    let d31_60 = 0;
    let d61_90 = 0;
    let d91_180 = 0;
    let d180Plus = 0;

    suppPurchases.forEach((p) => {
      const balance = p.balancePayable || 0;
      if (balance > 0) {
        const bucket = getAgeingBucket(p.dueDate, today);
        if (bucket === 'Not Due') notDue += balance;
        else if (bucket === '0-30 Days') d0_30 += balance;
        else if (bucket === '31-60 Days') d31_60 += balance;
        else if (bucket === '61-90 Days') d61_90 += balance;
        else if (bucket === '91-180 Days') d91_180 += balance;
        else if (bucket === '180+ Days') d180Plus += balance;
      }
    });

    // Prior financial year opening balance is allocated to 180+ Days bucket for accounting reconciliation
    if (openingBalance > 0) {
      d180Plus += openingBalance;
    }

    return {
      supplierId: supp.id,
      code: supp.code,
      name: supp.name,
      creditDays: supp.creditDays,
      openingBalance,
      purchasesTotal,
      paymentsTotal,
      closingBalance,
      notDue,
      d0_30,
      d31_60,
      d61_90,
      d91_180,
      d180Plus
    };
  });

  // Calculate totals
  const totalOpening = reportData.reduce((s, r) => s + r.openingBalance, 0);
  const totalPurchases = reportData.reduce((s, r) => s + r.purchasesTotal, 0);
  const totalPayments = reportData.reduce((s, r) => s + r.paymentsTotal, 0);
  const totalClosing = reportData.reduce((s, r) => s + r.closingBalance, 0);
  const totalNotDue = reportData.reduce((s, r) => s + r.notDue, 0);
  const total0_30 = reportData.reduce((s, r) => s + r.d0_30, 0);
  const total31_60 = reportData.reduce((s, r) => s + r.d31_60, 0);
  const total61_90 = reportData.reduce((s, r) => s + r.d61_90, 0);
  const total91_180 = reportData.reduce((s, r) => s + r.d91_180, 0);
  const total180Plus = reportData.reduce((s, r) => s + r.d180Plus, 0);

  const handleExportCSV = () => {
    const csvStr = convertToCSV(reportData, [
      { key: 'code', label: 'Supplier Code' },
      { key: 'name', label: 'Supplier Name' },
      { key: 'creditDays', label: 'Credit Terms (Days)' },
      { key: 'openingBalance', label: 'Opening Balance (INR)' },
      { key: 'purchasesTotal', label: 'Current Purchases (INR)' },
      { key: 'paymentsTotal', label: 'Payments Settled (INR)' },
      { key: 'closingBalance', label: 'Net Outstanding Balance (INR)' },
      { key: 'notDue', label: 'Not Due (INR)' },
      { key: 'd0_30', label: '0-30 Days Overdue' },
      { key: 'd31_60', label: '31-60 Days Overdue' },
      { key: 'd61_90', label: '61-90 Days Overdue' },
      { key: 'd91_180', label: '91-180 Days Overdue' },
      { key: 'd180Plus', label: '180+ Days Overdue' }
    ]);
    downloadFile(csvStr, `Supplier_Ageing_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-600" />
            Supplier Payment &amp; Ageing Outstanding Report
          </h2>
          <p className="text-xs text-ink-500">
            Real-time ageing buckets derived from credit due dates. Overdue buckets are conditionally highlighted for risk mitigation.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Ageing CSV</span>
        </button>
      </div>

      {/* Ageing Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold text-ink-500 uppercase block">Not Due</span>
          <span className="text-xs font-bold text-emerald-700 mt-1 block">{formatINR(totalNotDue)}</span>
        </div>
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase block">0-30d Overdue</span>
          <span className="text-xs font-bold text-amber-900 mt-1 block">{formatINR(total0_30)}</span>
        </div>
        <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 shadow-xs">
          <span className="text-[10px] font-bold text-orange-800 uppercase block">31-60d Overdue</span>
          <span className="text-xs font-bold text-orange-900 mt-1 block">{formatINR(total31_60)}</span>
        </div>
        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase block">61-90d Overdue</span>
          <span className="text-xs font-bold text-rose-900 mt-1 block">{formatINR(total61_90)}</span>
        </div>
        <div className="p-3 bg-rose-100/70 rounded-xl border border-rose-300 shadow-xs">
          <span className="text-[10px] font-bold text-rose-900 uppercase block">91-180d Overdue</span>
          <span className="text-xs font-extrabold text-rose-950 mt-1 block">{formatINR(total91_180)}</span>
        </div>
        <div className="p-3 bg-rose-900 text-white rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-rose-200 uppercase block">180+d Critical</span>
          <span className="text-xs font-black mt-1 block">{formatINR(total180Plus)}</span>
        </div>
      </div>

      {/* Ageing Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-2 text-center">Credit</th>
                <th className="py-3 px-3 text-right">Opening</th>
                <th className="py-3 px-3 text-right">Purchases</th>
                <th className="py-3 px-3 text-right">Payments</th>
                <th className="py-3 px-3 text-right font-extrabold text-ink-900">Closing Balance</th>
                <th className="py-3 px-3 text-right text-emerald-700">Not Due</th>
                <th className="py-3 px-3 text-right text-amber-800">0-30 Days</th>
                <th className="py-3 px-3 text-right text-orange-800">31-60 Days</th>
                <th className="py-3 px-3 text-right text-rose-800">61-90 Days</th>
                <th className="py-3 px-3 text-right text-rose-900">91-180 Days</th>
                <th className="py-3 px-3 text-right text-rose-950">180+ Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink-900 font-medium">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-ink-500">
                    No suppliers registered yet. Add your suppliers under <strong>Master Reference Data</strong> to view portfolio ageing.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.supplierId} className="hover:bg-rose-50/30 transition">
                    <td className="py-3 px-3 font-bold text-ink-900 whitespace-nowrap">
                    {row.name}
                    <div className="text-[10px] text-ink-500 font-normal">{row.code}</div>
                  </td>
                  <td className="py-3 px-2 text-center text-ink-500">{row.creditDays ? `${row.creditDays}d` : '—'}</td>
                  <td className="py-3 px-3 text-right">{formatINR(row.openingBalance)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-rose-900">{formatINR(row.purchasesTotal)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-700">{formatINR(row.paymentsTotal)}</td>
                  <td className="py-3 px-3 text-right font-bold text-rose-700">{formatINR(row.closingBalance)}</td>

                  {/* Ageing Columns with conditional alerts */}
                  <td className="py-3 px-3 text-right text-emerald-700 font-medium">
                    {row.notDue > 0 ? formatINR(row.notDue) : '—'}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${row.d0_30 > 0 ? 'bg-amber-50/70 text-amber-900 font-semibold' : 'text-gray-400'}`}>
                    {row.d0_30 > 0 ? formatINR(row.d0_30) : '—'}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${row.d31_60 > 0 ? 'bg-orange-50/70 text-orange-900 font-semibold' : 'text-gray-400'}`}>
                    {row.d31_60 > 0 ? formatINR(row.d31_60) : '—'}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${row.d61_90 > 0 ? 'bg-rose-50/70 text-rose-900 font-bold' : 'text-gray-400'}`}>
                    {row.d61_90 > 0 ? formatINR(row.d61_90) : '—'}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${row.d91_180 > 0 ? 'bg-rose-100 text-rose-950 font-bold' : 'text-gray-400'}`}>
                    {row.d91_180 > 0 ? formatINR(row.d91_180) : '—'}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${row.d180Plus > 0 ? 'bg-rose-200 text-rose-950 font-extrabold' : 'text-gray-400'}`}>
                    {row.d180Plus > 0 ? formatINR(row.d180Plus) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
            <tfoot>
              <tr className="bg-gray-100/90 border-t-2 border-gray-300 font-bold text-xs text-ink-900">
                <td colSpan={2} className="py-3 px-3 uppercase">Total Portfolio Outstanding</td>
                <td className="py-3 px-3 text-right">{formatINR(totalOpening)}</td>
                <td className="py-3 px-3 text-right text-rose-900">{formatINR(totalPurchases)}</td>
                <td className="py-3 px-3 text-right text-emerald-700">{formatINR(totalPayments)}</td>
                <td className="py-3 px-3 text-right text-rose-700 font-black">{formatINR(totalClosing)}</td>
                <td className="py-3 px-3 text-right text-emerald-700">{formatINR(totalNotDue)}</td>
                <td className="py-3 px-3 text-right text-amber-900">{formatINR(total0_30)}</td>
                <td className="py-3 px-3 text-right text-orange-900">{formatINR(total31_60)}</td>
                <td className="py-3 px-3 text-right text-rose-900">{formatINR(total61_90)}</td>
                <td className="py-3 px-3 text-right text-rose-950">{formatINR(total91_180)}</td>
                <td className="py-3 px-3 text-right text-rose-950">{formatINR(total180Plus)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Audit Reconciliation Footnote */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-ink-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>
              <strong>Accounting Reconciliation:</strong> Positive prior financial year opening balances are classified under the <strong>180+ Days</strong> ageing bucket so that total portfolio ageing reconciles with Net Closing Balance.
            </span>
          </div>
          <span className="font-semibold text-ink-700 whitespace-nowrap">
            As on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};
