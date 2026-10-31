import React from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, getAgeingBucket } from '../../utils/calculations';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { Download, Info } from 'lucide-react';

export const OutstandingReport: React.FC = () => {
  const { suppliers, purchases, payments, purchaseReturns } = useData();

  interface SupplierAgeing {
    supplierId: string;
    code: string;
    name: string;
    creditDays: number;
    openingBalance: number;
    purchasesTotal: number;
    paymentsTotal: number;
    returnsTotal: number;
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
    const suppReturns = (purchaseReturns || []).filter(
      (r) => r.supplierId === supp.id && !r.isVoided && r.adjustSupplierPayable !== false
    );

    const purchasesTotal = suppPurchases.reduce((s, p) => s + p.totalCost, 0);
    const directPaid = suppPurchases.reduce((s, p) => s + (p.directAmountPaid !== undefined ? p.directAmountPaid : (suppPayments.length === 0 ? p.amountPaid : 0)), 0);
    const standalonePaid = suppPayments.reduce((s, pay) => s + pay.amount, 0);
    const paymentsTotal = directPaid + standalonePaid;
    const returnsTotal = suppReturns.reduce((s, r) => s + r.returnedValue, 0);

    const openingBalance = supp.openingBalance || 0;
    const closingBalance = openingBalance + purchasesTotal - paymentsTotal - returnsTotal;

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
      returnsTotal,
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
  const totalReturns = reportData.reduce((s, r) => s + r.returnsTotal, 0);
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
      { key: 'returnsTotal', label: 'Purchase Returns / Debit Notes (INR)' },
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Supplier payment and ageing report"
        subtitle="Real-time ageing buckets derived from credit due dates. Overdue buckets are conditionally highlighted for risk mitigation."
        breadcrumbs={['Purchase', 'Ageing Schedule']}
        primaryAction={{
          label: 'Export Ageing CSV',
          onClick: handleExportCSV,
          icon: Download
        }}
      />

      {/* Bento Ageing Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BentoCard
          label="Not Due"
          value={formatINR(totalNotDue)}
          caption="Within credit period"
          variant="success"
        />
        <BentoCard
          label="0–30d Overdue"
          value={formatINR(total0_30)}
          caption="Initial grace period"
          variant="default"
        />
        <BentoCard
          label="31–60d Overdue"
          value={formatINR(total31_60)}
          caption="Attention required"
          variant="warning"
        />
        <BentoCard
          label="61–90d Overdue"
          value={formatINR(total61_90)}
          caption="Substantial delay"
          variant="warning"
        />
        <BentoCard
          label="91–180d Overdue"
          value={formatINR(total91_180)}
          caption="High priority risk"
          variant="highlight"
        />
        <BentoCard
          label="180+d Critical"
          value={formatINR(total180Plus)}
          caption="Audit reconciliation"
          variant="highlight"
        />
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
                <th className="py-3 px-3 text-right">Returns</th>
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
                  <td colSpan={13} className="py-12 text-center text-ink-500">
                    No suppliers registered yet. Add your suppliers under <strong>Master Reference Data</strong> to view portfolio ageing.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr key={row.supplierId} className="hover:bg-rose-50/20 transition">
                    <td className="py-3 px-3 font-bold text-ink-900">
                      <div>{row.name}</div>
                      <div className="text-[10px] text-ink-500 font-normal">{row.code}</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-ink-700">
                        {row.creditDays ? `${row.creditDays}d` : '0d'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatINR(row.openingBalance)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-rose-900">{formatINR(row.purchasesTotal)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-emerald-700">{formatINR(row.paymentsTotal)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-800">
                      {row.returnsTotal > 0 ? formatINR(row.returnsTotal) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-ink-900 tabular-nums">
                      {formatINR(row.closingBalance)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold tabular-nums">
                      {row.notDue > 0 ? formatINR(row.notDue) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-800 font-medium tabular-nums">
                      {row.d0_30 > 0 ? formatINR(row.d0_30) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-orange-800 font-semibold tabular-nums">
                      {row.d31_60 > 0 ? formatINR(row.d31_60) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-800 font-bold tabular-nums">
                      {row.d61_90 > 0 ? formatINR(row.d61_90) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-900 font-extrabold tabular-nums">
                      {row.d91_180 > 0 ? formatINR(row.d91_180) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-950 font-black tabular-nums">
                      {row.d180Plus > 0 ? formatINR(row.d180Plus) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-ink-900 text-xs">
                <td colSpan={2} className="py-3 px-3 uppercase text-[11px]">
                  Total Portfolio Outstanding
                </td>
                <td className="py-3 px-3 text-right tabular-nums">{formatINR(totalOpening)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-rose-900">{formatINR(totalPurchases)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-700">{formatINR(totalPayments)}</td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-800">{formatINR(totalReturns)}</td>
                <td className="py-3 px-3 text-right font-black text-rose-700 tabular-nums">{formatINR(totalClosing)}</td>
                <td className="py-3 px-3 text-right text-emerald-700 tabular-nums">{formatINR(totalNotDue)}</td>
                <td className="py-3 px-3 text-right text-amber-800 tabular-nums">{formatINR(total0_30)}</td>
                <td className="py-3 px-3 text-right text-orange-800 tabular-nums">{formatINR(total31_60)}</td>
                <td className="py-3 px-3 text-right text-rose-800 tabular-nums">{formatINR(total61_90)}</td>
                <td className="py-3 px-3 text-right text-rose-900 tabular-nums">{formatINR(total91_180)}</td>
                <td className="py-3 px-3 text-right text-rose-950 tabular-nums">{formatINR(total180Plus)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 bg-gray-50/40 border-t border-gray-100 text-[11px] text-ink-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>Ageing Calculation Formula:</strong> Due Date = Purchase Date + Supplier Credit Days. Unpaid balances past due are stratified into dynamic risk aging intervals.
          </span>
        </div>
      </div>
    </div>
  );
};
