import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import { PageHeader } from '../common/PageHeader';
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
  DollarSign,
  Sparkles,
  Calendar
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

  // Filter States: Default to ALL for full FY 2026-27 period analysis
  const today = new Date().toISOString().split('T')[0];
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-04-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [overdueThresholdDays, setOverdueThresholdDays] = useState<number>(60);

  // Lookups
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const portMap = new Map(ports.map((p) => [p.id, p]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));

  const activeInvoices = salesInvoices.filter((inv) => !inv.isVoided);

  // Available unique months from commercial invoice dates
  const availableMonths = Array.from(
    new Set(activeInvoices.map((inv) => inv.invoiceDate.slice(0, 7)).filter(Boolean))
  ).sort().reverse();

  const formatMonthLabel = (m: string) => {
    if (m === 'ALL') return 'All FY 2026-27 (Full Year Overview)';
    const [year, month] = m.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // --------------------------------------------------------------------------
  // EXECUTIVE SALES PERFORMANCE OVERVIEW (Filtered by selectedMonth)
  // --------------------------------------------------------------------------
  const periodInvoices = selectedMonth === 'ALL'
    ? activeInvoices
    : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(selectedMonth));

  const totalPeriodUSD = periodInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalPeriodWeightKg = periodInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalPeriodCartons = periodInvoices.reduce((s, inv) => s + inv.totalCartons, 0);
  const totalPeriodRealizedINR = periodInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalPeriodOutstandingUSD = periodInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);
  const overallAvgUSDPerKg = totalPeriodWeightKg > 0 ? totalPeriodUSD / totalPeriodWeightKg : 0;
  const realizationRatePct = totalPeriodUSD > 0
    ? Math.min(100, Math.max(0, ((totalPeriodUSD - totalPeriodOutstandingUSD) / totalPeriodUSD) * 100))
    : 0;
  const estimatedINRValue = totalPeriodUSD * 84.5;

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
  // 2. CUSTOMER-WISE SALES ANALYSIS (Period / Month)
  // --------------------------------------------------------------------------
  const customerAggMap = new Map<string, { weight: number; usd: number; cartons: number; invoices: number }>();
  periodInvoices.forEach((inv) => {
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
      const pct = totalPeriodUSD > 0 ? (data.usd / totalPeriodUSD) * 100 : 0;
      const avgRate = data.weight > 0 ? data.usd / data.weight : 0;
      return {
        id: custId,
        name: cust?.name || 'Overseas Buyer',
        country: cust?.country || 'Export Market',
        ...data,
        pct,
        avgRate
      };
    })
    .sort((a, b) => b.usd - a.usd);

  const topCustomer = customerBreakdown[0];
  const lowestCustomer = customerBreakdown[customerBreakdown.length - 1];
  const avgCustomerUSD = customerBreakdown.length > 0 ? totalPeriodUSD / customerBreakdown.length : 0;

  // --------------------------------------------------------------------------
  // 3. PRODUCT & SIZE ANALYSIS (Period / Month)
  // --------------------------------------------------------------------------
  const productAggMap = new Map<string, {
    name: string;
    hsCode: string;
    form: string;
    weight: number;
    usd: number;
    cartons: number;
    linesCount: number;
  }>();
  const sizeAggMap = new Map<string, {
    name: string;
    weight: number;
    usd: number;
    cartons: number;
  }>();

  periodInvoices.forEach((inv) => {
    inv.lineItems.forEach((l) => {
      // Product
      const sp = speciesMap.get(l.speciesId);
      const prodName = sp?.name || l.productDescription || 'Export Seafood';
      const hsCode = l.hsCode || sp?.hsCode || '03061790';
      const form = sp?.category || (prodName.toLowerCase().includes('shrimp') || prodName.toLowerCase().includes('vanamei') ? 'Frozen Block / IQF' : 'Frozen Whole');
      const prodKey = l.speciesId || prodName;

      const curP = productAggMap.get(prodKey) || {
        name: prodName,
        hsCode,
        form,
        weight: 0,
        usd: 0,
        cartons: 0,
        linesCount: 0
      };
      productAggMap.set(prodKey, {
        ...curP,
        weight: curP.weight + l.weightKg,
        usd: curP.usd + l.amountCurrency,
        cartons: curP.cartons + l.cartonsCount,
        linesCount: curP.linesCount + 1
      });

      // Size
      const sz = sizeMap.get(l.sizeId);
      const sizeName = l.gradeSize || sz?.name || 'Standard';
      const sizeKey = sizeName;

      const curS = sizeAggMap.get(sizeKey) || {
        name: sizeName,
        weight: 0,
        usd: 0,
        cartons: 0
      };
      sizeAggMap.set(sizeKey, {
        ...curS,
        weight: curS.weight + l.weightKg,
        usd: curS.usd + l.amountCurrency,
        cartons: curS.cartons + l.cartonsCount
      });
    });
  });

  const productBreakdown = Array.from(productAggMap.entries())
    .map(([key, data]) => {
      const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
      const pct = totalPeriodUSD > 0 ? (data.usd / totalPeriodUSD) * 100 : 0;
      return {
        id: key,
        ...data,
        weightedAvgUSD,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  const topProduct = productBreakdown[0];

  const sizeBreakdown = Array.from(sizeAggMap.entries())
    .map(([key, data]) => {
      const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
      const pct = totalPeriodUSD > 0 ? (data.usd / totalPeriodUSD) * 100 : 0;
      return {
        id: key,
        ...data,
        weightedAvgUSD,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  // --------------------------------------------------------------------------
  // 4. DESTINATION & PORT ANALYSIS
  // --------------------------------------------------------------------------
  const podAggMap = new Map<string, { name: string; code: string; country: string; weight: number; usd: number; count: number }>();
  periodInvoices.forEach((inv) => {
    const p = portMap.get(inv.portOfDischargeId);
    const podName = inv.portOfDischarge || p?.name || 'Port of Qingdao, China';
    const podCode = p?.code || 'POD';
    const podCountry = p?.country || inv.countryOfDestination || 'Export';
    const key = podName;

    const cur = podAggMap.get(key) || { name: podName, code: podCode, country: podCountry, weight: 0, usd: 0, count: 0 };
    podAggMap.set(key, {
      ...cur,
      weight: cur.weight + inv.totalWeightKg,
      usd: cur.usd + inv.totalAmountCurrency,
      count: cur.count + 1
    });
  });

  const podBreakdown = Array.from(podAggMap.entries())
    .map(([key, data]) => {
      const pct = totalPeriodUSD > 0 ? (data.usd / totalPeriodUSD) * 100 : 0;
      return {
        id: key,
        ...data,
        pct
      };
    })
    .sort((a, b) => b.usd - a.usd);

  const topPort = podBreakdown[0];

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
  })).sort((a, b) => b.usd - a.usd);

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
    if (!cust?.taxId && cust?.customerType === 'Domestic' && !cust?.isGstExempt) {
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
      inv.lineItems.some((l) => l.speciesId === sp.id || (l.productDescription && l.productDescription.toLowerCase().includes(sp.name.toLowerCase())))
    );
    let salesWeight = 0;
    let salesUSD = 0;
    matchedInvoices.forEach((inv) => {
      inv.lineItems
        .filter((l) => l.speciesId === sp.id || (l.productDescription && l.productDescription.toLowerCase().includes(sp.name.toLowerCase())))
        .forEach((l) => {
          salesWeight += l.weightKg;
          salesUSD += l.amountCurrency;
        });
    });

    const salesAvgUSDPerKg = salesWeight > 0 ? salesUSD / salesWeight : 0;
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
    { id: 'customer-analysis', label: '2. Customer Analysis', icon: Users, count: customerBreakdown.length },
    { id: 'product-analysis', label: '3. Product & Size', icon: Layers, count: productBreakdown.length },
    { id: 'destination-analysis', label: '4. Ports & Destination', icon: Anchor, count: podBreakdown.length },
    { id: 'realization-ageing', label: '5. Realization & Ageing', icon: Clock, count: outstandingInvoices.length },
    { id: 'hs-code-summary', label: '6. HS Code / Compliance', icon: Percent, count: hsCodeBreakdown.length },
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
        RealizedINR: inv.totalRealizedINR > 0 ? inv.totalRealizedINR : '',
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
    } else if (activeReport === 'product-analysis') {
      const data = productBreakdown.map((p) => ({
        Product: p.name,
        HSCode: p.hsCode,
        Form: p.form,
        WeightKg: p.weight,
        AmountUSD: p.usd,
        SharePct: p.pct.toFixed(1) + '%',
        AvgUSDPerKg: p.weightedAvgUSD.toFixed(2)
      }));
      const csv = convertToCSV(data, [
        { key: 'Product', label: 'Product / Species' },
        { key: 'HSCode', label: 'HS Code' },
        { key: 'Form', label: 'Product Form' },
        { key: 'WeightKg', label: 'Total Net Weight (Kg)' },
        { key: 'AmountUSD', label: 'Total USD' },
        { key: 'SharePct', label: 'Share %' },
        { key: 'AvgUSDPerKg', label: 'Avg USD/Kg' }
      ]);
      downloadFile(csv, `Product_Export_Analysis_${selectedMonth}.csv`);
    } else if (activeReport === 'destination-analysis') {
      const data = podBreakdown.map((p) => ({
        Port: p.name,
        Code: p.code,
        Country: p.country,
        Shipments: p.count,
        WeightKg: p.weight,
        AmountUSD: p.usd,
        SharePct: p.pct.toFixed(1) + '%'
      }));
      const csv = convertToCSV(data, [
        { key: 'Port', label: 'Port of Discharge' },
        { key: 'Code', label: 'Port Code' },
        { key: 'Country', label: 'Country' },
        { key: 'Shipments', label: 'Shipments Count' },
        { key: 'WeightKg', label: 'Net Weight (Kg)' },
        { key: 'AmountUSD', label: 'Total USD' },
        { key: 'SharePct', label: 'Share %' }
      ]);
      downloadFile(csv, `Destination_Analysis_${selectedMonth}.csv`);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Commercial export reports hub"
        subtitle="Computed live from commercial sales invoices, customer masters, and bank realization remittances."
        breadcrumbs={['Sales', 'Export Reports']}
        primaryAction={{
          label: 'Export CSV',
          onClick: handleExportCSV,
          icon: Download
        }}
        secondaryActions={[
          {
            label: 'Print Report',
            onClick: triggerPrint,
            icon: Printer
          }
        ]}
      />

      {/* ==================================================================== */}
      {/* EXECUTIVE SALES PERFORMANCE DASHBOARD BANNER */}
      {/* ==================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950 via-rose-900 to-ink-950 text-white p-6 sm:p-8 shadow-xl border border-rose-800/40">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Row with Title and Period Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Executive Performance Analysis
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-white/90">
                  {periodInvoices.length} Shipments
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Export Sales &amp; Realization Performance
              </h2>
              <p className="text-xs text-rose-200/80 max-w-2xl">
                Comprehensive commercial turnover, metric tonnage, foreign exchange earnings, and customer market distribution.
              </p>
            </div>

            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
              <Calendar className="w-4 h-4 text-rose-300 ml-2" />
              <span className="text-xs font-semibold text-rose-200">Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter performance report by period"
                className="bg-rose-950/80 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
              >
                <option value="ALL">All FY 2026-27 (Full Period Overview)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-ink-900 text-white">
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6 Key Executive Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Tile 1: Total Turnover */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-rose-300 uppercase block tracking-wider">
                Total Export Turnover
              </span>
              <span className="text-lg sm:text-xl font-black text-white mt-1 block truncate">
                ${totalPeriodUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] text-amber-300 font-bold mt-0.5 block truncate">
                ≈ {formatINR(estimatedINRValue)}
              </span>
            </div>

            {/* Tile 2: Volume Shipped */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-rose-300 uppercase block tracking-wider">
                Export Net Volume
              </span>
              <span className="text-lg sm:text-xl font-black text-white mt-1 block truncate">
                {formatKg(totalPeriodWeightKg)}
              </span>
              <span className="text-[11px] text-rose-200/80 font-medium mt-0.5 block truncate">
                {totalPeriodCartons.toLocaleString()} Cartons Shipped
              </span>
            </div>

            {/* Tile 3: Realization % */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-emerald-300 uppercase block tracking-wider">
                Bank Realization
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 mt-1 block truncate">
                {realizationRatePct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-emerald-200/90 font-bold mt-0.5 block truncate">
                {totalPeriodRealizedINR > 0 ? formatINR(totalPeriodRealizedINR) : 'Remittance Inward'}
              </span>
            </div>

            {/* Tile 4: Average Price */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-rose-300 uppercase block tracking-wider">
                Avg Realization / Kg
              </span>
              <span className="text-lg sm:text-xl font-black text-white mt-1 block truncate">
                ${overallAvgUSDPerKg.toFixed(2)}
              </span>
              <span className="text-[11px] text-rose-200/80 font-medium mt-0.5 block truncate">
                ≈ ₹{(overallAvgUSDPerKg * 84.5).toFixed(0)} / Kg
              </span>
            </div>

            {/* Tile 5: Top Commodity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-amber-300 uppercase block tracking-wider">
                Top Product
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white mt-1 block truncate" title={topProduct?.name || 'N/A'}>
                {topProduct ? topProduct.name : 'N/A'}
              </span>
              <span className="text-[11px] text-amber-200/90 font-bold mt-0.5 block truncate">
                {topProduct ? `$${topProduct.usd.toLocaleString()} (${topProduct.pct.toFixed(0)}%)` : '—'}
              </span>
            </div>

            {/* Tile 6: Top Customer */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <span className="text-[10px] font-bold text-cyan-300 uppercase block tracking-wider">
                Top Overseas Buyer
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white mt-1 block truncate" title={topCustomer?.name || 'N/A'}>
                {topCustomer ? topCustomer.name : 'N/A'}
              </span>
              <span className="text-[11px] text-cyan-200/90 font-bold mt-0.5 block truncate">
                {topCustomer ? `$${topCustomer.usd.toLocaleString()} · ${topPort?.name || topCustomer.country}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pill Tab Bar (Liquid Glass Surface) */}
      <div className="glass-surface-thin p-3 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold btn-secondary-liquid transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'glass-surface-thin text-ink-700 hover:bg-rose-50 border border-white/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-ink-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. INVOICE REGISTER */}
      {/* ==================================================================== */}
      {activeReport === 'invoice-register' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Commercial Invoice Register</h3>
              <p className="text-xs text-ink-500">Chronological register of export shipments within date range ({registerInvoices.length} shipments).</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white transition"
              />
              <span className="text-xs font-semibold text-ink-700">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white transition"
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
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">{regTotalINR > 0 ? formatINR(regTotalINR) : '—'}</span>
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
                        {inv.totalRealizedINR > 0 ? formatINR(inv.totalRealizedINR) : '—'}
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
              <h3 className="text-sm font-bold text-ink-900">
                Customer &amp; Consignee Performance ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-ink-500">Breakdown of export volume, value share, and average USD/Kg across overseas clients.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Filter Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter customer analysis by period"
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-ink-800 focus:border-rose-500 focus:bg-white transition"
              >
                <option value="ALL">All FY 2026-27 (Full Year Overview)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Total Period Export</span>
              <span className="text-lg font-black text-rose-950 mt-1 block">
                ${totalPeriodUSD.toLocaleString()}
              </span>
              <span className="text-xs text-rose-800 mt-1 block">
                {formatKg(totalPeriodWeightKg)} across {periodInvoices.length} shipments
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Top Overseas Customer</span>
              <span className="text-base font-black text-emerald-950 mt-1 block truncate" title={topCustomer?.name || 'N/A'}>
                {topCustomer ? topCustomer.name : 'N/A'}
              </span>
              <span className="text-xs text-emerald-800 mt-1 block">
                {topCustomer ? `$${topCustomer.usd.toLocaleString()} (${topCustomer.pct.toFixed(1)}% share)` : '-'}
              </span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">Lowest Volume Customer</span>
              <span className="text-base font-black text-amber-950 mt-1 block truncate" title={lowestCustomer?.name || 'N/A'}>
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
          {/* Products Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-ink-900">
                  Product &amp; Species Export Distribution ({formatMonthLabel(selectedMonth)})
                </h3>
                <p className="text-xs text-ink-500">
                  Extracted directly from Commercial Invoices line items ({productBreakdown.length} species / product lines).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-700">Filter Period:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Filter product analysis by period"
                  className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-ink-800 focus:border-rose-500 focus:bg-white transition"
                >
                  <option value="ALL">All FY 2026-27 (Full Year Overview)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Product / Species</th>
                    <th className="py-2.5 px-3">HS Code</th>
                    <th className="py-2.5 px-3">Product Form</th>
                    <th className="py-2.5 px-3 text-right">Total Net Wt (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Export Value (USD)</th>
                    <th className="py-2.5 px-3 text-right">% Share</th>
                    <th className="py-2.5 px-3 text-right">Weighted Avg (USD/Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {productBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-500">
                        No product line items found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    productBreakdown.map((row) => (
                      <tr key={row.id} className="hover:bg-rose-50/20">
                        <td className="py-2.5 px-3 font-bold text-ink-900">{row.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-600">{row.hsCode}</td>
                        <td className="py-2.5 px-3 text-ink-600">{row.form}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-950">
                          ${row.usd.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-ink-700">{row.pct.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                          ${row.weightedAvgUSD.toFixed(2)}/kg
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sizes Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink-900">
              Physical Grade / Size Breakdown ({sizeBreakdown.length} active sizes)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Grade Size</th>
                    <th className="py-2.5 px-3 text-right">Cartons</th>
                    <th className="py-2.5 px-3 text-right">Net Weight (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Value (USD)</th>
                    <th className="py-2.5 px-3 text-right">% of Total</th>
                    <th className="py-2.5 px-3 text-right">Weighted Avg (USD/Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sizeBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-500">
                        No size breakdown available for the selected period.
                      </td>
                    </tr>
                  ) : (
                    sizeBreakdown.map((row) => (
                      <tr key={row.id} className="hover:bg-rose-50/20">
                        <td className="py-2 px-3 font-bold text-ink-900 font-mono">{row.name}</td>
                        <td className="py-2 px-3 text-right">{row.cartons.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold">{formatKg(row.weight)}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-rose-950">
                          ${row.usd.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-ink-700">{row.pct.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ${row.weightedAvgUSD.toFixed(2)}/kg
                        </td>
                      </tr>
                    ))
                  )}
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
              <h3 className="text-sm font-bold text-ink-900">
                Destination Ports &amp; Overseas Terminal Volume ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-ink-500">Volume and value breakdown by Port of Discharge (POD).</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Filter Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter destination analysis by period"
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-ink-800 focus:border-rose-500 focus:bg-white transition"
              >
                <option value="ALL">All FY 2026-27 (Full Year Overview)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
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
                Tracks pending foreign remittances across 0–30, 31–60, 61–90, 91–180, and 180+ days.
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
                  <th className="py-2.5 px-3 text-center">Bank Rate</th>
                  <th className="py-2.5 px-3 text-right">Advance Recd</th>
                  <th className="py-2.5 px-3 text-right">Balance Payment</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (USD)</th>
                  <th className="py-2.5 px-3 text-right">Age (Days)</th>
                  <th className="py-2.5 px-3 text-center">Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {outstandingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-ink-500">
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
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-800">
                        ₹{(inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-bold">
                        {inv.advanceReceivedCurrency ? (
                          <div>
                            <div>${inv.advanceReceivedCurrency.toLocaleString()}</div>
                            <div className="text-[10px] text-ink-500">{inv.advanceReceivedDate || ''}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                        {inv.balancePaymentAmountCurrency ? (
                          <div>
                            <div>${inv.balancePaymentAmountCurrency.toLocaleString()}</div>
                            <div className="text-[10px] text-ink-500">{inv.balancePaymentDate || ''}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-700">Pending</span>
                        )}
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
