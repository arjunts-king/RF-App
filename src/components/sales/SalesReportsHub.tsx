import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import {
  FileText,
  Users,
  Layers,
  Anchor,
  Clock,
  ShieldAlert,
  Printer,
  Download,
  AlertTriangle,
  Percent,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

type SalesReportTab =
  | 'invoice-register'
  | 'customer-analysis'
  | 'product-analysis'
  | 'destination-analysis'
  | 'realization-ageing'
  | 'hs-code-summary'
  | 'exceptions'
  | 'margin-analysis';

export const SalesReportsHub: React.FC = () => {
  const {
    salesInvoices,
    purchases,
    customers,
    ports,
    species,
    sizes
  } = useData();

  const [activeReport, setActiveReport] = useState<SalesReportTab>('invoice-register');

  // Filter States
  const today = new Date().toISOString().split('T')[0];
  const currentMonthStr = today.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState<string>(today);
  const [overdueThresholdDays, setOverdueThresholdDays] = useState<number>(60);

  // Lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const portMap = new Map(ports.map((p) => [p.id, p]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));

  const activeInvoices = salesInvoices.filter((inv) => !inv.isVoided);

  // --------------------------------------------------------------------------
  // 1. INVOICE REGISTER (Date range)
  // --------------------------------------------------------------------------
  const registerInvoices = activeInvoices.filter(
    (inv) => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  );
  const regTotalWeight = registerInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const regTotalUSD = registerInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const regTotalINR = registerInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const regTotalBalance = registerInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);

  // --------------------------------------------------------------------------
  // 2. CUSTOMER-WISE SALES ANALYSIS (Monthly)
  // --------------------------------------------------------------------------
  const monthInvoices = activeInvoices.filter((inv) => inv.invoiceDate.startsWith(selectedMonth));
  const monthTotalUSD = monthInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const monthTotalWeight = monthInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);

  const customerAggMap = new Map<string, { weight: number; usd: number; cartons: number; invoices: number }>();
  monthInvoices.forEach((inv) => {
    const cur = customerAggMap.get(inv.consigneeId) || { weight: 0, usd: 0, cartons: 0, invoices: 0 };
    customerAggMap.set(inv.consigneeId, {
      weight: cur.weight + inv.totalWeightKg,
      usd: cur.usd + inv.totalAmountCurrency,
      cartons: cur.cartons + inv.totalCartons,
      invoices: cur.invoices + 1
    });
  });

  const customerBreakdown = Array.from(customerAggMap.entries())
    .map(([custId, data]) => {
      const cust = customerMap.get(custId);
      const pct = monthTotalUSD > 0 ? (data.usd / monthTotalUSD) * 100 : 0;
      const avgRate = data.weight > 0 ? data.usd / data.weight : 0;
      return {
        id: custId,
        name: cust?.name || 'Unknown',
        country: cust?.country || 'Export',
        ...data,
        pct,
        avgRate
      };
    })
    .sort((a, b) => b.usd - a.usd);

  const topCustomer = customerBreakdown[0];
  const lowestCustomer = customerBreakdown[customerBreakdown.length - 1];
  const avgCustomerUSD = customerBreakdown.length > 0 ? monthTotalUSD / customerBreakdown.length : 0;

  // --------------------------------------------------------------------------
  // 3. PRODUCT & SIZE ANALYSIS (Monthly)
  // --------------------------------------------------------------------------
  const productAggMap = new Map<string, { weight: number; usd: number; cartons: number; linesCount: number }>();
  const sizeAggMap = new Map<string, { weight: number; usd: number; cartons: number }>();

  monthInvoices.forEach((inv) => {
    inv.lineItems.forEach((l) => {
      // Product
      const curP = productAggMap.get(l.speciesId) || { weight: 0, usd: 0, cartons: 0, linesCount: 0 };
      productAggMap.set(l.speciesId, {
        weight: curP.weight + l.weightKg,
        usd: curP.usd + l.amountCurrency,
        cartons: curP.cartons + l.cartonsCount,
        linesCount: curP.linesCount + 1
      });

      // Size
      const curS = sizeAggMap.get(l.sizeId) || { weight: 0, usd: 0, cartons: 0 };
      sizeAggMap.set(l.sizeId, {
        weight: curS.weight + l.weightKg,
        usd: curS.usd + l.amountCurrency,
        cartons: curS.cartons + l.cartonsCount
      });
    });
  });

  const productBreakdown = Array.from(productAggMap.entries())
    .map(([spId, data]) => {
      const sp = speciesMap.get(spId);
      const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
      const pct = monthTotalUSD > 0 ? (data.usd / monthTotalUSD) * 100 : 0;
      return {
        id: spId,
        name: sp?.name || 'Unknown',
        hsCode: sp?.hsCode || '03061790',
        form: sp?.productForm || '-',
        ...data,
        weightedAvgUSD,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  const sizeBreakdown = Array.from(sizeAggMap.entries())
    .map(([szId, data]) => {
      const sz = sizeMap.get(szId);
      const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
      const pct = monthTotalUSD > 0 ? (data.usd / monthTotalUSD) * 100 : 0;
      return {
        id: szId,
        name: sz?.name || 'Standard',
        ...data,
        weightedAvgUSD,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  // --------------------------------------------------------------------------
  // 4. DESTINATION & PORT ANALYSIS
  // --------------------------------------------------------------------------
  const podAggMap = new Map<string, { weight: number; usd: number; count: number }>();
  monthInvoices.forEach((inv) => {
    const cur = podAggMap.get(inv.portOfDischargeId) || { weight: 0, usd: 0, count: 0 };
    podAggMap.set(inv.portOfDischargeId, {
      weight: cur.weight + inv.totalWeightKg,
      usd: cur.usd + inv.totalAmountCurrency,
      count: cur.count + 1
    });
  });

  const podBreakdown = Array.from(podAggMap.entries())
    .map(([podId, data]) => {
      const p = portMap.get(podId);
      const pct = monthTotalUSD > 0 ? (data.usd / monthTotalUSD) * 100 : 0;
      return {
        id: podId,
        name: p?.name || 'Unknown',
        code: p?.code || 'POD',
        country: p?.country || 'Export',
        ...data,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  // --------------------------------------------------------------------------
  // 5. REALIZATION & AGEING SCHEDULE (0-30, 31-60, 61-90, 91-180, 180+ days)
  // --------------------------------------------------------------------------
  const now = new Date().getTime();
  const ageingBuckets = {
    '0-30': { count: 0, balanceUSD: 0 },
    '31-60': { count: 0, balanceUSD: 0 },
    '61-90': { count: 0, balanceUSD: 0 },
    '91-180': { count: 0, balanceUSD: 0 },
    '180+': { count: 0, balanceUSD: 0 }
  };

  const outstandingInvoices = activeInvoices
    .filter((inv) => inv.balanceRealizationCurrency > 0)
    .map((inv) => {
      const invTime = new Date(inv.invoiceDate).getTime();
      const ageDays = Math.max(0, Math.floor((now - invTime) / (1000 * 60 * 60 * 24)));

      let bucket: '0-30' | '31-60' | '61-90' | '91-180' | '180+' = '0-30';
      if (ageDays > 180) bucket = '180+';
      else if (ageDays > 90) bucket = '91-180';
      else if (ageDays > 60) bucket = '61-90';
      else if (ageDays > 30) bucket = '31-60';

      ageingBuckets[bucket].count += 1;
      ageingBuckets[bucket].balanceUSD += inv.balanceRealizationCurrency;

      return {
        ...inv,
        ageDays,
        bucket
      };
    })
    .sort((a, b) => b.ageDays - a.ageDays);

  const totalOutstandingUSD = Object.values(ageingBuckets).reduce((s, b) => s + b.balanceUSD, 0);

  // --------------------------------------------------------------------------
  // 6. HS CODE / COMPLIANCE SUMMARY
  // --------------------------------------------------------------------------
  const hsAggMap = new Map<string, { weight: number; usd: number; invoiceSet: Set<string> }>();
  activeInvoices.forEach((inv) => {
    inv.lineItems.forEach((l) => {
      const code = l.hsCode || '03061790';
      const cur = hsAggMap.get(code) || { weight: 0, usd: 0, invoiceSet: new Set() };
      cur.invoiceSet.add(inv.id);
      hsAggMap.set(code, {
        weight: cur.weight + l.weightKg,
        usd: cur.usd + l.amountCurrency,
        invoiceSet: cur.invoiceSet
      });
    });
  });

  const hsCodeBreakdown = Array.from(hsAggMap.entries()).map(([code, data]) => ({
    code,
    invoicesCount: data.invoiceSet.size,
    weight: data.weight,
    usd: data.usd,
    avgUSDPerKg: data.weight > 0 ? data.usd / data.weight : 0
  }));

  // --------------------------------------------------------------------------
  // 7. EXCEPTION REPORT (Missing data, Duplicates, Zero rate/weight, Overdue)
  // --------------------------------------------------------------------------
  interface ExceptionItem {
    id: string;
    type: 'Missing Data' | 'Duplicate Invoice No' | 'Zero / Negative Value' | 'Overdue Realization';
    severity: 'High' | 'Medium';
    invoiceNo: string;
    date: string;
    customer: string;
    description: string;
  }

  const exceptionItems: ExceptionItem[] = [];

  // Check 1: Missing Data & Zero Values
  activeInvoices.forEach((inv) => {
    const cust = customerMap.get(inv.consigneeId);
    if (!cust?.taxId) {
      exceptionItems.push({
        id: `exc-tax-${inv.id}`,
        type: 'Missing Data',
        severity: 'Medium',
        invoiceNo: inv.invoiceNo,
        date: inv.invoiceDate,
        customer: cust?.name || 'N/A',
        description: 'Customer Tax ID / VAT is not recorded on consignee master.'
      });
    }

    inv.lineItems.forEach((l, i) => {
      if (l.weightKg <= 0 || l.ratePerKg <= 0) {
        exceptionItems.push({
          id: `exc-zero-${inv.id}-${i}`,
          type: 'Zero / Negative Value',
          severity: 'High',
          invoiceNo: inv.invoiceNo,
          date: inv.invoiceDate,
          customer: cust?.name || 'N/A',
          description: `Line ${i + 1} has zero or invalid weight (${l.weightKg} Kg) or rate ($${l.ratePerKg}).`
        });
      }
    });

    // Check Overdue realization
    const invTime = new Date(inv.invoiceDate).getTime();
    const ageDays = Math.floor((now - invTime) / (1000 * 60 * 60 * 24));
    if (inv.balanceRealizationCurrency > 0 && ageDays > overdueThresholdDays) {
      exceptionItems.push({
        id: `exc-overdue-${inv.id}`,
        type: 'Overdue Realization',
        severity: 'High',
        invoiceNo: inv.invoiceNo,
        date: inv.invoiceDate,
        customer: cust?.name || 'N/A',
        description: `Unrealized balance of ${inv.currency} ${inv.balanceRealizationCurrency.toLocaleString()} is ${ageDays} days overdue (> ${overdueThresholdDays} days).`
      });
    }
  });

  // Check Duplicate Invoice No.
  const invNoMap = new Map<string, string[]>();
  activeInvoices.forEach((inv) => {
    const no = inv.invoiceNo.toLowerCase().trim();
    const list = invNoMap.get(no) || [];
    list.push(inv.id);
    invNoMap.set(no, list);
  });
  invNoMap.forEach((ids, no) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        const inv = activeInvoices.find((i) => i.id === id);
        if (inv) {
          exceptionItems.push({
            id: `exc-dup-${inv.id}`,
            type: 'Duplicate Invoice No',
            severity: 'High',
            invoiceNo: inv.invoiceNo,
            date: inv.invoiceDate,
            customer: customerMap.get(inv.consigneeId)?.name || 'N/A',
            description: `Duplicate Commercial Invoice No detected (${ids.length} matches): ${no.toUpperCase()}`
          });
        }
      });
    }
  });

  // --------------------------------------------------------------------------
  // 8. LANDED COST VS SALES REALIZATION (Period-Level Margin Approximation)
  // --------------------------------------------------------------------------
  const purchaseMonthRecords = purchases.filter(
    (p) => !p.isVoided && p.purchaseDate >= startDate && p.purchaseDate <= endDate
  );

  const productMarginAnalysis = species.map((sp) => {
    const matchedPurchases = purchaseMonthRecords.filter((p) => p.speciesId === sp.id);
    const purchaseWeight = matchedPurchases.reduce((s, p) => s + p.weightKg, 0);
    const purchaseCost = matchedPurchases.reduce((s, p) => s + p.totalCost, 0);
    const purchaseAvgCostPerKg = purchaseWeight > 0 ? purchaseCost / purchaseWeight : 0;

    const matchedInvoices = registerInvoices.filter((inv) =>
      inv.lineItems.some((l) => l.speciesId === sp.id)
    );
    let salesWeight = 0;
    let salesUSD = 0;
    matchedInvoices.forEach((inv) => {
      inv.lineItems
        .filter((l) => l.speciesId === sp.id)
        .forEach((l) => {
          salesWeight += l.weightKg;
          salesUSD += l.amountCurrency;
        });
    });

    const salesAvgUSDPerKg = salesWeight > 0 ? salesUSD / salesWeight : 0;
    // Realized INR rate approximation using booking rate (e.g. 84.50)
    const salesAvgINRPerKg = salesAvgUSDPerKg * 84.5;
    const grossMarginINRPerKg = salesAvgINRPerKg > 0 && purchaseAvgCostPerKg > 0 ? salesAvgINRPerKg - purchaseAvgCostPerKg : 0;
    const grossMarginPct = salesAvgINRPerKg > 0 ? (grossMarginINRPerKg / salesAvgINRPerKg) * 100 : 0;

    return {
      speciesId: sp.id,
      name: sp.name,
      purchaseWeight,
      purchaseCost,
      purchaseAvgCostPerKg,
      salesWeight,
      salesUSD,
      salesAvgUSDPerKg,
      salesAvgINRPerKg,
      grossMarginINRPerKg,
      grossMarginPct
    };
  }).filter((m) => m.purchaseWeight > 0 || m.salesWeight > 0);

  // Tab definitions
  const reportTabs: { id: SalesReportTab; label: string; icon: any; count?: number }[] = [
    { id: 'invoice-register', label: '1. Invoice Register', icon: FileText, count: registerInvoices.length },
    { id: 'customer-analysis', label: '2. Customer Analysis', icon: Users },
    { id: 'product-analysis', label: '3. Product & Size', icon: Layers },
    { id: 'destination-analysis', label: '4. Ports & Destination', icon: Anchor },
    { id: 'realization-ageing', label: '5. Realization & Ageing', icon: Clock, count: outstandingInvoices.length },
    { id: 'hs-code-summary', label: '6. HS Code / Compliance', icon: Percent },
    { id: 'exceptions', label: '7. Exception Audit', icon: ShieldAlert, count: exceptionItems.length },
    { id: 'margin-analysis', label: '8. Margin Reconciliation', icon: DollarSign }
  ];

  const handleExportCSV = () => {
    if (activeReport === 'invoice-register') {
      const data = registerInvoices.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Customer: customerMap.get(inv.consigneeId)?.name || '',
        POD: portMap.get(inv.portOfDischargeId)?.name || '',
        WeightKg: inv.totalWeightKg,
        AmountUSD: inv.totalAmountCurrency,
        Status: inv.realizationStatus,
        RealizedINR: inv.totalRealizedINR,
        BalanceUSD: inv.balanceRealizationCurrency
      }));
      const csv = convertToCSV(data, [
        { key: 'InvoiceNo', label: 'Invoice No' },
        { key: 'Date', label: 'Invoice Date' },
        { key: 'Customer', label: 'Customer' },
        { key: 'POD', label: 'Discharge Port' },
        { key: 'WeightKg', label: 'Net Weight (Kg)' },
        { key: 'AmountUSD', label: 'Invoice Amount (USD)' },
        { key: 'Status', label: 'Realization Status' },
        { key: 'RealizedINR', label: 'Realized (INR)' },
        { key: 'BalanceUSD', label: 'Balance (USD)' }
      ]);
      downloadFile(csv, `Invoice_Register_${startDate}_${endDate}.csv`);
    } else {
      const data = customerBreakdown.map((c) => ({
        Customer: c.name,
        Country: c.country,
        Invoices: c.invoices,
        WeightKg: c.weight,
        AmountUSD: c.usd,
        SharePct: c.pct.toFixed(1) + '%',
        AvgUSDPerKg: c.avgRate.toFixed(2)
      }));
      const csv = convertToCSV(data, [
        { key: 'Customer', label: 'Customer' },
        { key: 'Country', label: 'Country' },
        { key: 'Invoices', label: 'Invoices' },
        { key: 'WeightKg', label: 'Total Weight (Kg)' },
        { key: 'AmountUSD', label: 'Total USD' },
        { key: 'SharePct', label: 'Share %' },
        { key: 'AvgUSDPerKg', label: 'Avg USD/Kg' }
      ]);
      downloadFile(csv, `Commercial_Sales_Report_${selectedMonth}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            Commercial Export Reports Hub
          </h2>
          <p className="text-xs text-ink-500">
            Computed live from commercial sales invoices, customer masters, and bank realization remittances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={triggerPrint}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-gray-200">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white hover:bg-rose-50 text-ink-700 hover:text-rose-700 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-ink-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 1. INVOICE REGISTER */}
      {/* ==================================================================== */}
      {activeReport === 'invoice-register' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Commercial Invoice Register</h3>
              <p className="text-xs text-ink-500">Chronological register of export shipments within date range.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
              />
              <span className="text-xs font-semibold text-ink-700">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Net Weight</span>
              <span className="text-lg font-black text-ink-900 mt-0.5 block">{formatKg(regTotalWeight)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Invoiced (USD)</span>
              <span className="text-lg font-black text-rose-950 mt-0.5 block">${regTotalUSD.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Realized Inward (INR)</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">{formatINR(regTotalINR)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Outstanding (USD)</span>
              <span className="text-lg font-black text-amber-800 mt-0.5 block">${regTotalBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer / Consignee</th>
                  <th className="py-2.5 px-3">POD</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Amount (USD)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Realized (INR)</th>
                  <th className="py-2.5 px-3 text-right">Balance (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {registerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-ink-500">
                      No invoices recorded between {startDate} and {endDate}.
                    </td>
                  </tr>
                ) : (
                  registerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/20">
                      <td className="py-2 px-3 font-bold text-rose-700">{inv.invoiceNo}</td>
                      <td className="py-2 px-3 text-ink-700">{inv.invoiceDate}</td>
                      <td className="py-2 px-3 font-semibold text-ink-900">
                        {customerMap.get(inv.consigneeId)?.name || 'Unknown'}
                      </td>
                      <td className="py-2 px-3">{portMap.get(inv.portOfDischargeId)?.name || 'POD'}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatKg(inv.totalWeightKg)}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-rose-950">
                        ${inv.totalAmountCurrency.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-ink-800">
                          {inv.realizationStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                        {formatINR(inv.totalRealizedINR)}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-700 font-bold">
                        ${inv.balanceRealizationCurrency.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. CUSTOMER-WISE SALES ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'customer-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Customer &amp; Consignee Performance</h3>
              <p className="text-xs text-ink-500">Monthly breakdown of export volume, value share, and average USD/Kg.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Total Month Export</span>
              <span className="text-lg font-black text-rose-950 mt-1 block">
                ${monthTotalUSD.toLocaleString()}
              </span>
              <span className="text-xs text-rose-800 mt-1 block">
                {formatKg(monthTotalWeight)} across {monthInvoices.length} shipments
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Top Customer</span>
              <span className="text-lg font-black text-emerald-950 mt-1 block">
                {topCustomer ? topCustomer.name : 'N/A'}
              </span>
              <span className="text-xs text-emerald-800 mt-1 block">
                {topCustomer ? `$${topCustomer.usd.toLocaleString()} (${topCustomer.pct.toFixed(1)}% share)` : '-'}
              </span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">Lowest Volume Customer</span>
              <span className="text-lg font-black text-amber-950 mt-1 block">
                {lowestCustomer ? lowestCustomer.name : 'N/A'}
              </span>
              <span className="text-xs text-amber-800 mt-1 block">
                {lowestCustomer ? `$${lowestCustomer.usd.toLocaleString()} (${lowestCustomer.pct.toFixed(1)}% share)` : '-'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block tracking-wider">Average per Customer</span>
              <span className="text-lg font-black text-ink-900 mt-1 block">
                ${avgCustomerUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-ink-700 mt-1 block">
                Across {customerBreakdown.length} purchasing overseas clients
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3 text-right">Invoices</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Value (USD)</th>
                  <th className="py-2.5 px-3 text-right">% of Total</th>
                  <th className="py-2.5 px-3 text-right">Avg USD/Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {customerBreakdown.map((row) => (
                  <tr key={row.id} className="hover:bg-rose-50/20">
                    <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-ink-700">{row.country}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{row.invoices}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-950">
                      ${row.usd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-ink-700">{row.pct.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      ${row.avgRate.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PRODUCT & SIZE ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'product-analysis' && (
        <div className="space-y-6">
          {/* Products */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink-900">Product / Species Export Distribution ({selectedMonth})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Product / Species</th>
                    <th className="py-2.5 px-3">HS Code</th>
                    <th className="py-2.5 px-3">Form</th>
                    <th className="py-2.5 px-3 text-right">Total Net Wt (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Export Value (USD)</th>
                    <th className="py-2.5 px-3 text-right">% Share</th>
                    <th className="py-2.5 px-3 text-right">Weighted Avg (USD/Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {productBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-rose-50/20">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-600">{row.hsCode}</td>
                      <td className="py-2.5 px-3 text-ink-600">{row.form}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-950">
                        ${row.usd.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{row.pct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        ${row.weightedAvgUSD.toFixed(2)}/kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink-900">Physical Size Export Breakdown ({selectedMonth})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Physical Size</th>
                    <th className="py-2.5 px-3 text-right">Cartons</th>
                    <th className="py-2.5 px-3 text-right">Net Weight (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Value (USD)</th>
                    <th className="py-2.5 px-3 text-right">% of Total</th>
                    <th className="py-2.5 px-3 text-right">Weighted Avg (USD/Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sizeBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-rose-50/20">
                      <td className="py-2 px-3 font-bold text-ink-900">{row.name}</td>
                      <td className="py-2 px-3 text-right">{row.cartons}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-rose-950">
                        ${row.usd.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold">{row.pct.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        ${row.weightedAvgUSD.toFixed(2)}/kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. DESTINATION & PORT ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'destination-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Destination Ports &amp; Overseas Terminal Volume</h3>
              <p className="text-xs text-ink-500">Volume and value breakdown by Port of Discharge (POD) for {selectedMonth}.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Port of Discharge</th>
                  <th className="py-2.5 px-3">UN/LOCODE</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3 text-right">Shipments</th>
                  <th className="py-2.5 px-3 text-right">Net Weight (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Value (USD)</th>
                  <th className="py-2.5 px-3 text-right">% Volume Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {podBreakdown.map((row) => (
                  <tr key={row.id} className="hover:bg-rose-50/20">
                    <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-ink-600">{row.code}</td>
                    <td className="py-2.5 px-3 text-ink-700">{row.country}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{row.count}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-950">
                      ${row.usd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-ink-700">{row.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. REALIZATION & OUTSTANDING AGEING */}
      {/* ==================================================================== */}
      {activeReport === 'realization-ageing' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">
                Inward Realization &amp; Export Receivables Ageing Schedule
              </h3>
              <p className="text-xs text-ink-500">
                Mirrors the Purchase module's payment ageing pattern. Tracks pending foreign remittances across 0–30, 31–60, 61–90, 91–180, and 180+ days.
              </p>
            </div>
          </div>

          {/* Ageing Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Outstanding</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">
                ${totalOutstandingUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">{outstandingInvoices.length} invoices</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">0–30 Days</span>
              <span className="text-base font-extrabold text-emerald-950 mt-1 block">
                ${ageingBuckets['0-30'].balanceUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-800 mt-0.5 block">{ageingBuckets['0-30'].count} inv</span>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">31–60 Days</span>
              <span className="text-base font-extrabold text-blue-950 mt-1 block">
                ${ageingBuckets['31-60'].balanceUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-800 mt-0.5 block">{ageingBuckets['31-60'].count} inv</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">61–90 Days</span>
              <span className="text-base font-extrabold text-amber-950 mt-1 block">
                ${ageingBuckets['61-90'].balanceUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-800 mt-0.5 block">{ageingBuckets['61-90'].count} inv</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">91–180 Days</span>
              <span className="text-base font-extrabold text-rose-950 mt-1 block">
                ${ageingBuckets['91-180'].balanceUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-800 mt-0.5 block">{ageingBuckets['91-180'].count} inv</span>
            </div>

            <div className="p-3 bg-rose-100 rounded-xl border border-rose-300">
              <span className="text-[10px] font-bold text-rose-900 uppercase block">180+ Days Overdue</span>
              <span className="text-base font-black text-rose-950 mt-1 block">
                ${ageingBuckets['180+'].balanceUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-900 mt-0.5 block">{ageingBuckets['180+'].count} inv</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Invoice Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Invoice Value</th>
                  <th className="py-2.5 px-3 text-right">Realized Foreign</th>
                  <th className="py-2.5 px-3 text-right">Realized INR</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (USD)</th>
                  <th className="py-2.5 px-3 text-right">Age (Days)</th>
                  <th className="py-2.5 px-3 text-center">Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {outstandingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-ink-500">
                      All export invoices are 100% fully realized! Zero outstanding receivables.
                    </td>
                  </tr>
                ) : (
                  outstandingInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/20">
                      <td className="py-2.5 px-3 font-bold text-rose-700">{inv.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-ink-700">{inv.invoiceDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-ink-900">
                        {customerMap.get(inv.consigneeId)?.name || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-ink-900">
                        ${inv.totalAmountCurrency.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                        ${inv.totalRealizedCurrency.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 font-bold">
                        {formatINR(inv.totalRealizedINR)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-700">
                        ${inv.balanceRealizationCurrency.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">{inv.ageDays} d</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.bucket === '180+'
                              ? 'bg-rose-200 text-rose-900 font-black'
                              : inv.bucket === '91-180'
                              ? 'bg-rose-100 text-rose-800'
                              : inv.bucket === '61-90'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {inv.bucket}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. HS CODE / COMPLIANCE SUMMARY */}
      {/* ==================================================================== */}
      {activeReport === 'hs-code-summary' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Harmonized Tariff (HS Code) Compliance Register</h3>
              <p className="text-xs text-ink-500">Summary of export consignments and trade values grouped by 8-digit Customs Tariff code.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Customs HS Code</th>
                  <th className="py-2.5 px-3 text-right">Invoices Declared</th>
                  <th className="py-2.5 px-3 text-right">Total Net Weight (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Export Declared Value (USD)</th>
                  <th className="py-2.5 px-3 text-right">Average USD/Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {hsCodeBreakdown.map((row) => (
                  <tr key={row.code} className="hover:bg-rose-50/20">
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{row.code}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{row.invoicesCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-950">
                      ${row.usd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      ${row.avgUSDPerKg.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. EXCEPTION REPORT */}
      {/* ==================================================================== */}
      {activeReport === 'exceptions' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Commercial Audit &amp; Exception Surveillance</h3>
              <p className="text-xs text-ink-500">
                Automated detection of missing compliance data, duplicate invoice numbers, zero weights/rates, and overdue remittances.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Overdue Days:</span>
              <input
                type="number"
                min="15"
                max="365"
                value={overdueThresholdDays}
                onChange={(e) => setOverdueThresholdDays(parseInt(e.target.value) || 60)}
                className="w-16 p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none text-center"
              />
            </div>
          </div>

          <div className="space-y-3">
            {exceptionItems.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-semibold text-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                <p>100% Clean Audit Status: Zero commercial compliance exceptions detected.</p>
              </div>
            ) : (
              exceptionItems.map((exc) => (
                <div
                  key={exc.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    exc.severity === 'High'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      exc.severity === 'High' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{exc.type}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold ${
                          exc.severity === 'High'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {exc.severity}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-medium">{exc.description}</p>
                    <div className="text-[10px] text-ink-500 font-semibold">
                      Invoice: {exc.invoiceNo} · Date: {exc.date} · Customer: {exc.customer}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. LANDED COST VS SALES REALIZATION */}
      {/* ==================================================================== */}
      {activeReport === 'margin-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">
                Period Landed Cost vs. Sales Realization Margin
              </h3>
              <p className="text-xs text-ink-500">
                Period-level margin approximation comparing Purchase/Production Cost per Kg against Realized Export Amount in INR per Kg for matching species.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold outline-none"
              />
              <span className="text-xs font-semibold text-ink-700">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                  <th className="py-2.5 px-3">Product / Species</th>
                  <th className="py-2.5 px-3 text-right">Purchase Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Raw Landed Cost / Kg</th>
                  <th className="py-2.5 px-3 text-right">Exported Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Export Rate (USD/Kg)</th>
                  <th className="py-2.5 px-3 text-right">Realized INR / Kg</th>
                  <th className="py-2.5 px-3 text-right">Gross Margin / Kg</th>
                  <th className="py-2.5 px-3 text-right">Gross Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {productMarginAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-ink-500">
                      No matching purchase and sales data in the selected period.
                    </td>
                  </tr>
                ) : (
                  productMarginAnalysis.map((m) => (
                    <tr key={m.speciesId} className="hover:bg-rose-50/20">
                      <td className="py-2.5 px-3 font-bold text-ink-900">{m.name}</td>
                      <td className="py-2.5 px-3 text-right">{formatKg(m.purchaseWeight)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900">
                        {m.purchaseAvgCostPerKg > 0 ? formatINR(m.purchaseAvgCostPerKg) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatKg(m.salesWeight)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {m.salesAvgUSDPerKg > 0 ? `$${m.salesAvgUSDPerKg.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {m.salesAvgINRPerKg > 0 ? formatINR(m.salesAvgINRPerKg) : '-'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black ${m.grossMarginINRPerKg >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {m.grossMarginINRPerKg !== 0 ? formatINR(m.grossMarginINRPerKg) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.grossMarginPct >= 20
                              ? 'bg-emerald-50 text-emerald-800'
                              : m.grossMarginPct >= 0
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.grossMarginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
