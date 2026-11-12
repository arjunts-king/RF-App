import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatINR, formatKg, formatForwardRate } from '../../utils/calculations';
import { getSettledInvoiceShortfallBreakdown } from '../../utils/collectionAnalysis';
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
  Calendar,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Package,
  Boxes,
  Table,
  LayoutGrid,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { SalesInvoice } from '../../types';

export type SalesReportTab =
  | 'invoice-register'
  | 'invoice-product-analysis'
  | 'customer-analysis'
  | 'product-analysis'
  | 'destination-analysis'
  | 'realization-ageing'
  | 'hs-code-summary'
  | 'exceptions'
  | 'margin-analysis'
  | 'shortfall-breakup';

export interface EnrichedInvoiceProductLine {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  salesOrderNo?: string;
  orderNo?: string;
  orderDate?: string;
  internalInvoiceNo?: string;
  customerId: string;
  customerName: string;
  customerCountry: string;
  portOfDischargeId: string;
  portOfDischargeName: string;
  finalDestination: string;
  realizationStatus: string;
  totalRealizedINR: number;
  speciesId: string;
  productName: string;
  scientificName?: string;
  sizeId: string;
  gradeSize: string;
  hsCode: string;
  cartonsCount: number;
  weightKg: number;
  ratePerKg: number;
  amountCurrency: number;
  invoiceTotalUSD: number;
  invoiceTotalWeightKg: number;
  lineSharePct: number;
}

export const SalesReportsHub: React.FC = () => {
  const {
    salesInvoices,
    purchases,
    customers,
    ports,
    species,
    salesSizes
  } = useData();

  const [activeReport, setActiveReport] = useState<SalesReportTab>('invoice-register');

  // Executive Top Banner Filter
  const today = new Date().toISOString().split('T')[0];
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Shortfall Report Filters
  const [shortfallSearch, setShortfallSearch] = useState('');
  const [shortfallLegFilter, setShortfallLegFilter] = useState<'all' | 'advance-only' | 'balance-only' | 'both'>('all');
  const [shortfallCustomerFilter, setShortfallCustomerFilter] = useState('');

  // Lookups
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const portMap = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);
  const speciesMap = useMemo(() => new Map(species.map((sp) => [sp.id, sp])), [species]);
  const sizeMap = useMemo(() => new Map(salesSizes.map((sz) => [sz.id, sz])), [salesSizes]);

  const activeInvoices = useMemo(() => salesInvoices.filter((inv) => !inv.isVoided), [salesInvoices]);

  // Shortfall Breakup Items (settled invoices only)
  const shortfallReportRows = useMemo(() => {
    return activeInvoices
      .map((inv) => {
        const advUSD = inv.advanceReceivedCurrency || 0;
        const termsUSD = inv.advanceTermsUSD ?? (advUSD > 0 ? advUSD : undefined);
        const balUSD = inv.balancePaymentAmountCurrency || 0;
        const priceUSD = inv.balanceActualPriceUSD ?? (balUSD > 0 ? Number((inv.totalAmountCurrency - (termsUSD || advUSD || 0)).toFixed(2)) : undefined);
        const {
          isSettled,
          advShortfallUSD: advShortfall,
          balShortfallUSD: balShortfall,
          totalShortfallUSD: totalShortfall
        } = getSettledInvoiceShortfallBreakdown(inv);

        const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5;
        const advRate = inv.advanceExchangeRate || bankRate;
        const balRate = inv.balanceExchangeRate || bankRate;
        const advShortfallINR = Number((advShortfall * advRate).toFixed(2));
        const balShortfallINR = Number((balShortfall * balRate).toFixed(2));
        const totalShortfallINR = Number((advShortfallINR + balShortfallINR).toFixed(2));

        const consignee = customerMap.get(inv.consigneeId);
        const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;

        return {
          ...inv,
          isSettled,
          termsUSD,
          advUSD,
          advShortfall,
          advRate,
          advShortfallINR,
          priceUSD,
          balUSD,
          balShortfall,
          balRate,
          balShortfallINR,
          totalShortfall,
          totalShortfallINR,
          customerName: consignee?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer',
          buyerName: buyer?.name || '',
          country: consignee?.country || 'Export'
        };
      })
      .filter((inv) => inv.isSettled && inv.totalShortfall > 0);
  }, [activeInvoices, customerMap]);

  const filteredShortfallRows = useMemo(() => {
    return shortfallReportRows.filter((inv) => {
      if (selectedMonth !== 'ALL' && !inv.invoiceDate.startsWith(selectedMonth)) return false;
      if (shortfallCustomerFilter && inv.consigneeId !== shortfallCustomerFilter) return false;
      if (shortfallLegFilter === 'advance-only' && (inv.advShortfall <= 0 || inv.balShortfall > 0)) return false;
      if (shortfallLegFilter === 'balance-only' && (inv.balShortfall <= 0 || inv.advShortfall > 0)) return false;
      if (shortfallLegFilter === 'both' && (inv.advShortfall <= 0 || inv.balShortfall <= 0)) return false;

      if (shortfallSearch.trim()) {
        const q = shortfallSearch.toLowerCase().trim();
        const matchNo = inv.invoiceNo.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q) || inv.buyerName.toLowerCase().includes(q);
        const matchOrder = inv.orderNo?.toLowerCase().includes(q) || inv.salesOrderNo?.toLowerCase().includes(q);
        return matchNo || matchCust || matchOrder;
      }
      return true;
    });
  }, [shortfallReportRows, selectedMonth, shortfallCustomerFilter, shortfallLegFilter, shortfallSearch]);

  // Available unique months from commercial invoice dates
  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(activeInvoices.map((inv) => inv.invoiceDate.slice(0, 7)).filter(Boolean))
    ).sort().reverse();
  }, [activeInvoices]);

  const availableCountries = useMemo(() => {
    return Array.from(
      new Set(
        activeInvoices
          .map((inv) => inv.countryOfDestination || customerMap.get(inv.consigneeId)?.country)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [activeInvoices, customerMap]);

  const formatMonthLabel = (m: string) => {
    if (m === 'ALL') return 'All FY 2026-27 (Full Year Overview)';
    const [year, month] = m.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // --------------------------------------------------------------------------
  // EXECUTIVE SALES PERFORMANCE OVERVIEW (Top banner)
  // --------------------------------------------------------------------------
  const periodInvoices = useMemo(() => {
    return selectedMonth === 'ALL'
      ? activeInvoices
      : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(selectedMonth));
  }, [activeInvoices, selectedMonth]);

  const totalPeriodUSD = periodInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const totalPeriodWeightKg = periodInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const totalPeriodCartons = periodInvoices.reduce((s, inv) => s + inv.totalCartons, 0);
  const totalPeriodRealizedINR = periodInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const totalPeriodOutstandingUSD = periodInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);
  const overallAvgUSDPerKg = totalPeriodWeightKg > 0 ? totalPeriodUSD / totalPeriodWeightKg : 0;
  const realizationRatePct = totalPeriodUSD > 0
    ? Math.min(100, Math.max(0, ((totalPeriodUSD - totalPeriodOutstandingUSD) / totalPeriodUSD) * 100))
    : 0;

  // --------------------------------------------------------------------------
  // 1. INVOICE REGISTER STATE & FILTERING
  // --------------------------------------------------------------------------
  const [regStartDate, setRegStartDate] = useState<string>('2026-04-01');
  const [regEndDate, setRegEndDate] = useState<string>(today);
  const [regCustomerFilter, setRegCustomerFilter] = useState<string>('');
  const [regPortFilter, setRegPortFilter] = useState<string>('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('');
  const [regSearch, setRegSearch] = useState<string>('');

  const registerInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      if (regStartDate && inv.invoiceDate < regStartDate) return false;
      if (regEndDate && inv.invoiceDate > regEndDate) return false;
      if (regCustomerFilter && inv.consigneeId !== regCustomerFilter) return false;
      if (regPortFilter && inv.portOfDischargeId !== regPortFilter) return false;
      if (regStatusFilter && inv.realizationStatus !== regStatusFilter) return false;
      if (regSearch) {
        const q = regSearch.toLowerCase();
        const matchNo = inv.invoiceNo.toLowerCase().includes(q);
        const matchCust = (customerMap.get(inv.consigneeId)?.name || '').toLowerCase().includes(q);
        const matchPort = (portMap.get(inv.portOfDischargeId)?.name || inv.portOfDischarge || '').toLowerCase().includes(q);
        const matchDest = (inv.finalDestination || '').toLowerCase().includes(q);
        if (!matchNo && !matchCust && !matchPort && !matchDest) return false;
      }
      return true;
    });
  }, [activeInvoices, regStartDate, regEndDate, regCustomerFilter, regPortFilter, regStatusFilter, regSearch, customerMap, portMap]);

  const regTotalWeight = registerInvoices.reduce((s, inv) => s + inv.totalWeightKg, 0);
  const regTotalUSD = registerInvoices.reduce((s, inv) => s + inv.totalAmountCurrency, 0);
  const regTotalINR = registerInvoices.reduce((s, inv) => s + inv.totalRealizedINR, 0);
  const regTotalBalance = registerInvoices.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);

  const isRegFiltered = Boolean(
    regStartDate !== '2026-04-01' ||
    regEndDate !== today ||
    regCustomerFilter ||
    regPortFilter ||
    regStatusFilter ||
    regSearch
  );

  const resetRegFilters = () => {
    setRegStartDate('2026-04-01');
    setRegEndDate(today);
    setRegCustomerFilter('');
    setRegPortFilter('');
    setRegStatusFilter('');
    setRegSearch('');
  };

  // --------------------------------------------------------------------------
  // 2. INVOICE & PRODUCT CROSS-ANALYSIS (NEW REPORT)
  // --------------------------------------------------------------------------
  const [invProdMonth, setInvProdMonth] = useState<string>('ALL');
  const [invProdCustomer, setInvProdCustomer] = useState<string>('');
  const [invProdSpecies, setInvProdSpecies] = useState<string>('');
  const [invProdSize, setInvProdSize] = useState<string>('');
  const [invProdPort, setInvProdPort] = useState<string>('');
  const [invProdStatus, setInvProdStatus] = useState<string>('');
  const [invProdSearch, setInvProdSearch] = useState<string>('');
  const [invProdViewMode, setInvProdViewMode] = useState<'hierarchy' | 'flat' | 'matrix'>('hierarchy');
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());

  // Flattened enriched product lines across active invoices
  const allEnrichedLines = useMemo(() => {
    const list: EnrichedInvoiceProductLine[] = [];
    activeInvoices.forEach((inv) => {
      const cust = customerMap.get(inv.consigneeId);
      const pod = portMap.get(inv.portOfDischargeId);
      inv.lineItems.forEach((l, idx) => {
        const sp = speciesMap.get(l.speciesId);
        const sz = sizeMap.get(l.sizeId);
        const prodName = sp?.name || l.productDescription || 'Export Seafood';
        const grade = l.gradeSize || sz?.name || 'Standard';
        const hs = l.hsCode || sp?.hsCode || '03061790';
        const sharePct = inv.totalAmountCurrency > 0 ? (l.amountCurrency / inv.totalAmountCurrency) * 100 : 0;

        list.push({
          id: l.id || `${inv.id}-${idx}`,
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          salesOrderNo: inv.salesOrderNo || (inv.orderNo?.startsWith('SO-') ? inv.orderNo : undefined),
          orderNo: inv.orderNo,
          orderDate: inv.orderDate || inv.invoiceDate,
          internalInvoiceNo: inv.internalInvoiceNo,
          customerId: inv.consigneeId,
          customerName: cust?.name || inv.consigneeName || inv.buyerName || 'Overseas Buyer',
          customerCountry: cust?.country || inv.countryOfDestination || 'Export',
          portOfDischargeId: inv.portOfDischargeId,
          portOfDischargeName: pod?.name || inv.portOfDischarge || 'Discharge Port',
          finalDestination: inv.finalDestination || `${cust?.address || ''}, ${cust?.country || ''}`,
          realizationStatus: inv.realizationStatus,
          totalRealizedINR: inv.totalRealizedINR,
          speciesId: l.speciesId,
          productName: prodName,
          scientificName: sp?.scientificName,
          sizeId: l.sizeId,
          gradeSize: grade,
          hsCode: hs,
          cartonsCount: l.cartonsCount,
          weightKg: l.weightKg,
          ratePerKg: l.ratePerKg,
          amountCurrency: l.amountCurrency,
          invoiceTotalUSD: inv.totalAmountCurrency,
          invoiceTotalWeightKg: inv.totalWeightKg,
          lineSharePct: sharePct
        });
      });
    });
    return list;
  }, [activeInvoices, customerMap, portMap, speciesMap, sizeMap]);

  // Filtered enriched lines
  const filteredInvoiceProductLines = useMemo(() => {
    return allEnrichedLines.filter((line) => {
      if (invProdMonth !== 'ALL' && !line.invoiceDate.startsWith(invProdMonth)) return false;
      if (invProdCustomer && line.customerId !== invProdCustomer) return false;
      if (invProdSpecies && line.speciesId !== invProdSpecies && !line.productName.toLowerCase().includes(invProdSpecies.toLowerCase())) return false;
      if (invProdSize && line.sizeId !== invProdSize && !line.gradeSize.toLowerCase().includes(invProdSize.toLowerCase())) return false;
      if (invProdPort && line.portOfDischargeId !== invProdPort) return false;
      if (invProdStatus && line.realizationStatus !== invProdStatus) return false;
      if (invProdSearch) {
        const q = invProdSearch.toLowerCase();
        const mInv = line.invoiceNo.toLowerCase().includes(q);
        const mSo = (line.salesOrderNo || '').toLowerCase().includes(q);
        const mProd = line.productName.toLowerCase().includes(q);
        const mGrade = line.gradeSize.toLowerCase().includes(q);
        const mCust = line.customerName.toLowerCase().includes(q);
        const mHs = line.hsCode.toLowerCase().includes(q);
        const mOrder = (line.orderNo || '').toLowerCase().includes(q);
        if (!mInv && !mSo && !mProd && !mGrade && !mCust && !mHs && !mOrder) return false;
      }
      return true;
    });
  }, [allEnrichedLines, invProdMonth, invProdCustomer, invProdSpecies, invProdSize, invProdPort, invProdStatus, invProdSearch]);

  // Invoices represented in the filtered lines
  const filteredInvoiceMap = useMemo(() => {
    const map = new Map<string, { invoice: SalesInvoice; lines: EnrichedInvoiceProductLine[] }>();
    filteredInvoiceProductLines.forEach((line) => {
      const inv = activeInvoices.find((i) => i.id === line.invoiceId);
      if (inv) {
        const cur = map.get(inv.id) || { invoice: inv, lines: [] };
        cur.lines.push(line);
        map.set(inv.id, cur);
      }
    });
    return map;
  }, [filteredInvoiceProductLines, activeInvoices]);

  const filteredInvoicesCount = filteredInvoiceMap.size;
  const invProdTotalWeight = filteredInvoiceProductLines.reduce((s, l) => s + l.weightKg, 0);
  const invProdTotalUSD = filteredInvoiceProductLines.reduce((s, l) => s + l.amountCurrency, 0);
  const invProdTotalCartons = filteredInvoiceProductLines.reduce((s, l) => s + l.cartonsCount, 0);
  const invProdAvgRate = invProdTotalWeight > 0 ? invProdTotalUSD / invProdTotalWeight : 0;
  const ratesList = filteredInvoiceProductLines.map((l) => l.ratePerKg).filter((r) => r > 0);
  const invProdMinRate = ratesList.length > 0 ? Math.min(...ratesList) : 0;
  const invProdMaxRate = ratesList.length > 0 ? Math.max(...ratesList) : 0;

  // Grouping by Product for Matrix View
  const productMatrixMap = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      hsCode: string;
      totalWeight: number;
      totalUSD: number;
      totalCartons: number;
      lines: EnrichedInvoiceProductLine[];
      minRate: number;
      maxRate: number;
      invoicesSet: Set<string>;
    }>();

    filteredInvoiceProductLines.forEach((l) => {
      const key = l.speciesId || l.productName;
      const cur = map.get(key) || {
        productName: l.productName,
        hsCode: l.hsCode,
        totalWeight: 0,
        totalUSD: 0,
        totalCartons: 0,
        lines: [],
        minRate: l.ratePerKg,
        maxRate: l.ratePerKg,
        invoicesSet: new Set<string>()
      };

      cur.totalWeight += l.weightKg;
      cur.totalUSD += l.amountCurrency;
      cur.totalCartons += l.cartonsCount;
      cur.lines.push(l);
      cur.minRate = Math.min(cur.minRate, l.ratePerKg);
      cur.maxRate = Math.max(cur.maxRate, l.ratePerKg);
      cur.invoicesSet.add(l.invoiceNo);

      map.set(key, cur);
    });

    return Array.from(map.values()).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [filteredInvoiceProductLines]);

  const toggleInvoiceExpansion = (id: string) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllInvoices = () => {
    setExpandedInvoiceIds(new Set(Array.from(filteredInvoiceMap.keys())));
  };

  const collapseAllInvoices = () => {
    setExpandedInvoiceIds(new Set());
  };

  const isInvProdFiltered = Boolean(
    invProdMonth !== 'ALL' ||
    invProdCustomer ||
    invProdSpecies ||
    invProdSize ||
    invProdPort ||
    invProdStatus ||
    invProdSearch
  );

  const resetInvProdFilters = () => {
    setInvProdMonth('ALL');
    setInvProdCustomer('');
    setInvProdSpecies('');
    setInvProdSize('');
    setInvProdPort('');
    setInvProdStatus('');
    setInvProdSearch('');
  };

  // --------------------------------------------------------------------------
  // 3. CUSTOMER-WISE SALES ANALYSIS
  // --------------------------------------------------------------------------
  const [custMonth, setCustMonth] = useState<string>('ALL');
  const [custCountryFilter, setCustCountryFilter] = useState<string>('');
  const [custSearch, setCustSearch] = useState<string>('');
  const [custMinValue, setCustMinValue] = useState<number>(0);
  const [custSortBy, setCustSortBy] = useState<'usd' | 'weight' | 'invoices' | 'rate'>('usd');

  const customerAnalysisInvoices = useMemo(() => {
    return custMonth === 'ALL'
      ? activeInvoices
      : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(custMonth));
  }, [activeInvoices, custMonth]);

  const customerBreakdown = useMemo(() => {
    const customerAggMap = new Map<string, { weight: number; usd: number; cartons: number; invoices: number }>();
    customerAnalysisInvoices.forEach((inv) => {
      const cur = customerAggMap.get(inv.consigneeId) || { weight: 0, usd: 0, cartons: 0, invoices: 0 };
      customerAggMap.set(inv.consigneeId, {
        weight: cur.weight + inv.totalWeightKg,
        usd: cur.usd + inv.totalAmountCurrency,
        cartons: cur.cartons + inv.totalCartons,
        invoices: cur.invoices + 1
      });
    });

    const totalCustUSD = Array.from(customerAggMap.values()).reduce((s, v) => s + v.usd, 0);

    let list = Array.from(customerAggMap.entries())
      .map(([custId, data]) => {
        const cust = customerMap.get(custId);
        const pct = totalCustUSD > 0 ? (data.usd / totalCustUSD) * 100 : 0;
        const avgRate = data.weight > 0 ? data.usd / data.weight : 0;
        return {
          id: custId,
          name: cust?.name || 'Overseas Buyer',
          country: cust?.country || 'Export Market',
          address: cust?.address || '',
          ...data,
          pct,
          avgRate
        };
      })
      .filter((c) => {
        if (custCountryFilter && c.country !== custCountryFilter) return false;
        if (custMinValue > 0 && c.usd < custMinValue) return false;
        if (custSearch) {
          const q = custSearch.toLowerCase();
          const matchName = c.name.toLowerCase().includes(q);
          const matchCountry = c.country.toLowerCase().includes(q);
          const matchAddress = c.address.toLowerCase().includes(q);
          if (!matchName && !matchCountry && !matchAddress) return false;
        }
        return true;
      });

    if (custSortBy === 'usd') list.sort((a, b) => b.usd - a.usd);
    else if (custSortBy === 'weight') list.sort((a, b) => b.weight - a.weight);
    else if (custSortBy === 'invoices') list.sort((a, b) => b.invoices - a.invoices);
    else if (custSortBy === 'rate') list.sort((a, b) => b.avgRate - a.avgRate);

    return list;
  }, [customerAnalysisInvoices, customerMap, custCountryFilter, custMinValue, custSearch, custSortBy]);

  const topCustomer = customerBreakdown[0];
  const lowestCustomer = customerBreakdown[customerBreakdown.length - 1];
  const totalFilteredCustUSD = customerBreakdown.reduce((s, c) => s + c.usd, 0);
  const totalFilteredCustWeight = customerBreakdown.reduce((s, c) => s + c.weight, 0);
  const avgCustomerUSD = customerBreakdown.length > 0 ? totalFilteredCustUSD / customerBreakdown.length : 0;

  const isCustFiltered = Boolean(
    custMonth !== 'ALL' ||
    custCountryFilter ||
    custSearch ||
    custMinValue > 0 ||
    custSortBy !== 'usd'
  );

  const resetCustFilters = () => {
    setCustMonth('ALL');
    setCustCountryFilter('');
    setCustSearch('');
    setCustMinValue(0);
    setCustSortBy('usd');
  };

  // --------------------------------------------------------------------------
  // 4. PRODUCT & SIZE ANALYSIS
  // --------------------------------------------------------------------------
  const [prodMonth, setProdMonth] = useState<string>('ALL');
  const [prodFormFilter, setProdFormFilter] = useState<string>('');
  const [prodSearch, setProdSearch] = useState<string>('');
  const [prodSizeSearch, setProdSizeSearch] = useState<string>('');
  const [prodSortBy, setProdSortBy] = useState<'usd' | 'weight' | 'rate'>('usd');

  const prodAnalysisInvoices = useMemo(() => {
    return prodMonth === 'ALL'
      ? activeInvoices
      : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(prodMonth));
  }, [activeInvoices, prodMonth]);

  const { productBreakdown, sizeBreakdown, availableForms } = useMemo(() => {
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
    const formsSet = new Set<string>();

    prodAnalysisInvoices.forEach((inv) => {
      inv.lineItems.forEach((l) => {
        const sp = speciesMap.get(l.speciesId);
        const prodName = sp?.name || l.productDescription || 'Export Seafood';
        const hsCode = l.hsCode || sp?.hsCode || '03061790';
        const form = sp?.category || (prodName.toLowerCase().includes('shrimp') || prodName.toLowerCase().includes('vanamei') ? 'Frozen Block / IQF' : 'Frozen Whole');
        formsSet.add(form);
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

    const totalProdUSD = Array.from(productAggMap.values()).reduce((s, p) => s + p.usd, 0);

    let pList = Array.from(productAggMap.entries())
      .map(([key, data]) => {
        const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
        const pct = totalProdUSD > 0 ? (data.usd / totalProdUSD) * 100 : 0;
        return {
          id: key,
          ...data,
          weightedAvgUSD,
          pct
        };
      })
      .filter((p) => {
        if (prodFormFilter && p.form !== prodFormFilter) return false;
        if (prodSearch) {
          const q = prodSearch.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchHs = p.hsCode.toLowerCase().includes(q);
          if (!matchName && !matchHs) return false;
        }
        return true;
      });

    if (prodSortBy === 'usd') pList.sort((a, b) => b.usd - a.usd);
    else if (prodSortBy === 'weight') pList.sort((a, b) => b.weight - a.weight);
    else if (prodSortBy === 'rate') pList.sort((a, b) => b.weightedAvgUSD - a.weightedAvgUSD);

    let sList = Array.from(sizeAggMap.entries())
      .map(([key, data]) => {
        const weightedAvgUSD = data.weight > 0 ? data.usd / data.weight : 0;
        const pct = totalProdUSD > 0 ? (data.usd / totalProdUSD) * 100 : 0;
        return {
          id: key,
          ...data,
          weightedAvgUSD,
          pct
        };
      })
      .filter((s) => {
        if (prodSizeSearch && !s.name.toLowerCase().includes(prodSizeSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.usd - a.usd);

    return { productBreakdown: pList, sizeBreakdown: sList, availableForms: Array.from(formsSet) };
  }, [prodAnalysisInvoices, speciesMap, sizeMap, prodFormFilter, prodSearch, prodSizeSearch, prodSortBy]);

  const topProduct = productBreakdown[0];

  const isProdFiltered = Boolean(
    prodMonth !== 'ALL' ||
    prodFormFilter ||
    prodSearch ||
    prodSizeSearch ||
    prodSortBy !== 'usd'
  );

  const resetProdFilters = () => {
    setProdMonth('ALL');
    setProdFormFilter('');
    setProdSearch('');
    setProdSizeSearch('');
    setProdSortBy('usd');
  };

  // --------------------------------------------------------------------------
  // 5. DESTINATION & PORT ANALYSIS
  // --------------------------------------------------------------------------
  const [destMonth, setDestMonth] = useState<string>('ALL');
  const [destCountryFilter, setDestCountryFilter] = useState<string>('');
  const [destSearch, setDestSearch] = useState<string>('');
  const [destSortBy, setDestSortBy] = useState<'usd' | 'weight' | 'count'>('usd');

  const destAnalysisInvoices = useMemo(() => {
    return destMonth === 'ALL'
      ? activeInvoices
      : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(destMonth));
  }, [activeInvoices, destMonth]);

  const podBreakdown = useMemo(() => {
    const podAggMap = new Map<string, { name: string; code: string; country: string; weight: number; usd: number; count: number }>();
    destAnalysisInvoices.forEach((inv) => {
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

    const totalDestUSD = Array.from(podAggMap.values()).reduce((s, v) => s + v.usd, 0);

    let list = Array.from(podAggMap.entries())
      .map(([key, data]) => {
        const pct = totalDestUSD > 0 ? (data.usd / totalDestUSD) * 100 : 0;
        return {
          id: key,
          ...data,
          pct
        };
      })
      .filter((p) => {
        if (destCountryFilter && p.country !== destCountryFilter) return false;
        if (destSearch) {
          const q = destSearch.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCode = p.code.toLowerCase().includes(q);
          const matchCountry = p.country.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchCountry) return false;
        }
        return true;
      });

    if (destSortBy === 'usd') list.sort((a, b) => b.usd - a.usd);
    else if (destSortBy === 'weight') list.sort((a, b) => b.weight - a.weight);
    else if (destSortBy === 'count') list.sort((a, b) => b.count - a.count);

    return list;
  }, [destAnalysisInvoices, portMap, destCountryFilter, destSearch, destSortBy]);

  const topPort = podBreakdown[0];

  const isDestFiltered = Boolean(
    destMonth !== 'ALL' ||
    destCountryFilter ||
    destSearch ||
    destSortBy !== 'usd'
  );

  const resetDestFilters = () => {
    setDestMonth('ALL');
    setDestCountryFilter('');
    setDestSearch('');
    setDestSortBy('usd');
  };

  // --------------------------------------------------------------------------
  // 6. REALIZATION & AGEING SCHEDULE
  // --------------------------------------------------------------------------
  const [ageingBucketFilter, setAgeingBucketFilter] = useState<string>('ALL');
  const [ageingCustomerFilter, setAgeingCustomerFilter] = useState<string>('');
  const [ageingStatusFilter, setAgeingStatusFilter] = useState<string>('ALL');
  const [ageingSearch, setAgeingSearch] = useState<string>('');

  const now = new Date().getTime();

  const { ageingBuckets, filteredAgeingInvoices, totalOutstandingUSD } = useMemo(() => {
    const buckets = {
      '0-30': { count: 0, balanceUSD: 0 },
      '31-60': { count: 0, balanceUSD: 0 },
      '61-90': { count: 0, balanceUSD: 0 },
      '91-180': { count: 0, balanceUSD: 0 },
      '180+': { count: 0, balanceUSD: 0 }
    };

    const calculated = activeInvoices
      .filter((inv) => inv.balanceRealizationCurrency > 0)
      .map((inv) => {
        const invTime = new Date(inv.invoiceDate).getTime();
        const ageDays = Math.max(0, Math.floor((now - invTime) / (1000 * 60 * 60 * 24)));

        let bucket: '0-30' | '31-60' | '61-90' | '91-180' | '180+' = '0-30';
        if (ageDays > 180) bucket = '180+';
        else if (ageDays > 90) bucket = '91-180';
        else if (ageDays > 60) bucket = '61-90';
        else if (ageDays > 30) bucket = '31-60';

        buckets[bucket].count += 1;
        buckets[bucket].balanceUSD += inv.balanceRealizationCurrency;

        return {
          ...inv,
          ageDays,
          bucket
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays);

    const filtered = calculated.filter((inv) => {
      if (ageingBucketFilter !== 'ALL' && inv.bucket !== ageingBucketFilter) return false;
      if (ageingCustomerFilter && inv.consigneeId !== ageingCustomerFilter) return false;
      if (ageingStatusFilter === 'unrealized_only' && (inv.advanceReceivedCurrency || 0) > 0) return false;
      if (ageingStatusFilter === 'partial_only' && (!inv.advanceReceivedCurrency || inv.advanceReceivedCurrency <= 0)) return false;
      if (ageingSearch) {
        const q = ageingSearch.toLowerCase();
        const mNo = inv.invoiceNo.toLowerCase().includes(q);
        const mCust = (customerMap.get(inv.consigneeId)?.name || '').toLowerCase().includes(q);
        if (!mNo && !mCust) return false;
      }
      return true;
    });

    const totalBal = filtered.reduce((s, inv) => s + inv.balanceRealizationCurrency, 0);

    return { ageingBuckets: buckets, filteredAgeingInvoices: filtered, totalOutstandingUSD: totalBal };
  }, [activeInvoices, now, ageingBucketFilter, ageingCustomerFilter, ageingStatusFilter, ageingSearch, customerMap]);

  const isAgeingFiltered = Boolean(
    ageingBucketFilter !== 'ALL' ||
    ageingCustomerFilter ||
    ageingStatusFilter !== 'ALL' ||
    ageingSearch
  );

  const resetAgeingFilters = () => {
    setAgeingBucketFilter('ALL');
    setAgeingCustomerFilter('');
    setAgeingStatusFilter('ALL');
    setAgeingSearch('');
  };

  // --------------------------------------------------------------------------
  // 7. HS CODE / COMPLIANCE SUMMARY
  // --------------------------------------------------------------------------
  const [hsMonth, setHsMonth] = useState<string>('ALL');
  const [hsSearch, setHsSearch] = useState<string>('');
  const [hsSortBy, setHsSortBy] = useState<'usd' | 'weight' | 'invoices' | 'rate'>('usd');

  const hsCodeBreakdown = useMemo(() => {
    const hsInvoices = hsMonth === 'ALL'
      ? activeInvoices
      : activeInvoices.filter((inv) => inv.invoiceDate.startsWith(hsMonth));

    const hsAggMap = new Map<string, { weight: number; usd: number; invoiceSet: Set<string> }>();
    hsInvoices.forEach((inv) => {
      inv.lineItems.forEach((l) => {
        const sp = speciesMap.get(l.speciesId);
        const code = l.hsCode || sp?.hsCode || '03061790';
        const cur = hsAggMap.get(code) || { weight: 0, usd: 0, invoiceSet: new Set() };
        cur.invoiceSet.add(inv.id);
        hsAggMap.set(code, {
          weight: cur.weight + l.weightKg,
          usd: cur.usd + l.amountCurrency,
          invoiceSet: cur.invoiceSet
        });
      });
    });

    let list = Array.from(hsAggMap.entries()).map(([code, data]) => ({
      code,
      invoicesCount: data.invoiceSet.size,
      weight: data.weight,
      usd: data.usd,
      avgUSDPerKg: data.weight > 0 ? data.usd / data.weight : 0
    })).filter((item) => {
      if (hsSearch && !item.code.toLowerCase().includes(hsSearch.toLowerCase())) return false;
      return true;
    });

    if (hsSortBy === 'usd') list.sort((a, b) => b.usd - a.usd);
    else if (hsSortBy === 'weight') list.sort((a, b) => b.weight - a.weight);
    else if (hsSortBy === 'invoices') list.sort((a, b) => b.invoicesCount - a.invoicesCount);
    else if (hsSortBy === 'rate') list.sort((a, b) => b.avgUSDPerKg - a.avgUSDPerKg);

    return list;
  }, [hsMonth, activeInvoices, speciesMap, hsSearch, hsSortBy]);

  const isHsFiltered = Boolean(hsMonth !== 'ALL' || hsSearch || hsSortBy !== 'usd');
  const resetHsFilters = () => {
    setHsMonth('ALL');
    setHsSearch('');
    setHsSortBy('usd');
  };

  // --------------------------------------------------------------------------
  // 8. EXCEPTION AUDIT
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

  const [overdueThresholdDays, setOverdueThresholdDays] = useState<number>(60);
  const [excTypeFilter, setExcTypeFilter] = useState<string>('ALL');
  const [excSeverityFilter, setExcSeverityFilter] = useState<string>('ALL');
  const [excSearch, setExcSearch] = useState<string>('');

  const exceptionItems = useMemo(() => {
    const list: ExceptionItem[] = [];

    // Check 1: Missing Data & Zero Values
    activeInvoices.forEach((inv) => {
      const cust = customerMap.get(inv.consigneeId);
      if (!cust?.taxId && cust?.customerType === 'Domestic' && !cust?.isGstExempt) {
        list.push({
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
          list.push({
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
        list.push({
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
      const ids = invNoMap.get(no) || [];
      ids.push(inv.id);
      invNoMap.set(no, ids);
    });
    invNoMap.forEach((ids, no) => {
      if (ids.length > 1) {
        ids.forEach((id) => {
          const inv = activeInvoices.find((i) => i.id === id);
          if (inv) {
            list.push({
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

    return list.filter((exc) => {
      if (excTypeFilter !== 'ALL' && exc.type !== excTypeFilter) return false;
      if (excSeverityFilter !== 'ALL' && exc.severity !== excSeverityFilter) return false;
      if (excSearch) {
        const q = excSearch.toLowerCase();
        const mInv = exc.invoiceNo.toLowerCase().includes(q);
        const mCust = exc.customer.toLowerCase().includes(q);
        const mDesc = exc.description.toLowerCase().includes(q);
        if (!mInv && !mCust && !mDesc) return false;
      }
      return true;
    });
  }, [activeInvoices, customerMap, now, overdueThresholdDays, excTypeFilter, excSeverityFilter, excSearch]);

  const isExcFiltered = Boolean(
    excTypeFilter !== 'ALL' ||
    excSeverityFilter !== 'ALL' ||
    overdueThresholdDays !== 60 ||
    excSearch
  );

  const resetExcFilters = () => {
    setExcTypeFilter('ALL');
    setExcSeverityFilter('ALL');
    setOverdueThresholdDays(60);
    setExcSearch('');
  };

  // --------------------------------------------------------------------------
  // 9. MARGIN ANALYSIS
  // --------------------------------------------------------------------------
  const [marginStartDate, setMarginStartDate] = useState<string>('2026-04-01');
  const [marginEndDate, setMarginEndDate] = useState<string>(today);
  const [marginSpeciesFilter, setMarginSpeciesFilter] = useState<string>('');
  const [marginHealthFilter, setMarginHealthFilter] = useState<string>('ALL');
  const [marginSearch, setMarginSearch] = useState<string>('');

  const productMarginAnalysis = useMemo(() => {
    const purchaseMonthRecords = purchases.filter(
      (p) => !p.isVoided && p.purchaseDate >= marginStartDate && p.purchaseDate <= marginEndDate
    );
    const registerRangeInvoices = activeInvoices.filter(
      (inv) => inv.invoiceDate >= marginStartDate && inv.invoiceDate <= marginEndDate
    );

    return species.map((sp) => {
      const matchedPurchases = purchaseMonthRecords.filter((p) => p.speciesId === sp.id);
      const purchaseWeight = matchedPurchases.reduce((s, p) => s + p.weightKg, 0);
      const purchaseCost = matchedPurchases.reduce((s, p) => s + p.totalCost, 0);
      const purchaseAvgCostPerKg = purchaseWeight > 0 ? purchaseCost / purchaseWeight : 0;

      const matchedInvoices = registerRangeInvoices.filter((inv) =>
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
    }).filter((m) => {
      if (m.purchaseWeight <= 0 && m.salesWeight <= 0) return false;
      if (marginSpeciesFilter && m.speciesId !== marginSpeciesFilter) return false;
      if (marginHealthFilter === 'profitable' && m.grossMarginPct <= 0) return false;
      if (marginHealthFilter === 'high_margin' && m.grossMarginPct < 20) return false;
      if (marginHealthFilter === 'negative' && m.grossMarginPct >= 0) return false;
      if (marginSearch && !m.name.toLowerCase().includes(marginSearch.toLowerCase())) return false;
      return true;
    });
  }, [purchases, activeInvoices, species, marginStartDate, marginEndDate, marginSpeciesFilter, marginHealthFilter, marginSearch]);

  const isMarginFiltered = Boolean(
    marginStartDate !== '2026-04-01' ||
    marginEndDate !== today ||
    marginSpeciesFilter ||
    marginHealthFilter !== 'ALL' ||
    marginSearch
  );

  const resetMarginFilters = () => {
    setMarginStartDate('2026-04-01');
    setMarginEndDate(today);
    setMarginSpeciesFilter('');
    setMarginHealthFilter('ALL');
    setMarginSearch('');
  };

  // --------------------------------------------------------------------------
  // TAB DEFINITIONS
  // --------------------------------------------------------------------------
  const reportTabs: { id: SalesReportTab; label: string; icon: any; count?: number }[] = [
    { id: 'invoice-register', label: '1. Invoice Register', icon: FileText, count: registerInvoices.length },
    { id: 'invoice-product-analysis', label: '2. Invoice & Product Analysis', icon: Boxes, count: filteredInvoiceProductLines.length },
    { id: 'customer-analysis', label: '3. Customer Analysis', icon: Users, count: customerBreakdown.length },
    { id: 'product-analysis', label: '4. Product & Size', icon: Layers, count: productBreakdown.length },
    { id: 'destination-analysis', label: '5. Ports & Destination', icon: Anchor, count: podBreakdown.length },
    { id: 'realization-ageing', label: '6. Realization & Ageing', icon: Clock, count: filteredAgeingInvoices.length },
    { id: 'hs-code-summary', label: '7. HS Code / Compliance', icon: Percent, count: hsCodeBreakdown.length },
    { id: 'exceptions', label: '8. Exception Audit', icon: ShieldAlert, count: exceptionItems.length },
    { id: 'margin-analysis', label: '9. Margin Reconciliation', icon: DollarSign, count: productMarginAnalysis.length },
    { id: 'shortfall-breakup', label: '10. Shortfall & Deductions Breakup', icon: Receipt, count: filteredShortfallRows.length }
  ];

  // --------------------------------------------------------------------------
  // EXPORT CSV HANDLER
  // --------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (activeReport === 'invoice-register') {
      const data = registerInvoices.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        SalesOrderNo: inv.salesOrderNo || '',
        SalesOrderDate: inv.orderDate || '',
        BuyerOrderRef: inv.orderNo && inv.orderNo !== inv.salesOrderNo ? inv.orderNo : '',
        Customer: customerMap.get(inv.consigneeId)?.name || inv.consigneeName || inv.buyerName || '',
        POD: portMap.get(inv.portOfDischargeId)?.name || inv.portOfDischarge || '',
        WeightKg: inv.totalWeightKg,
        AmountUSD: inv.totalAmountCurrency,
        Status: inv.realizationStatus,
        RealizedINR: inv.totalRealizedINR > 0 ? inv.totalRealizedINR : '',
        BalanceUSD: inv.balanceRealizationCurrency
      }));
      const csv = convertToCSV(data, [
        { key: 'InvoiceNo', label: 'Commercial Invoice No' },
        { key: 'Date', label: 'Invoice Date' },
        { key: 'SalesOrderNo', label: 'Sales Order No' },
        { key: 'SalesOrderDate', label: 'Sales Order Date' },
        { key: 'BuyerOrderRef', label: 'Buyer Order / PO Ref' },
        { key: 'Customer', label: 'Customer' },
        { key: 'POD', label: 'Discharge Port' },
        { key: 'WeightKg', label: 'Net Weight (Kg)' },
        { key: 'AmountUSD', label: 'Invoice Amount (USD)' },
        { key: 'Status', label: 'Realization Status' },
        { key: 'RealizedINR', label: 'Realized (INR)' },
        { key: 'BalanceUSD', label: 'Balance (USD)' }
      ]);
      downloadFile(csv, `Invoice_Register_${regStartDate}_${regEndDate}.csv`);
    } else if (activeReport === 'invoice-product-analysis') {
      const data = filteredInvoiceProductLines.map((l) => ({
        InvoiceNo: l.invoiceNo,
        InvoiceDate: l.invoiceDate,
        SalesOrderNo: l.salesOrderNo || '',
        SalesOrderDate: l.orderDate || '',
        BuyerOrderRef: l.orderNo && l.orderNo !== l.salesOrderNo ? l.orderNo : '',
        Customer: l.customerName,
        Country: l.customerCountry,
        DischargePort: l.portOfDischargeName,
        Product: l.productName,
        GradeSize: l.gradeSize,
        HSCode: l.hsCode,
        Cartons: l.cartonsCount,
        NetWeightKg: l.weightKg,
        RateUSD: l.ratePerKg,
        AmountUSD: l.amountCurrency,
        RealizationStatus: l.realizationStatus,
        RealizedINR: l.totalRealizedINR > 0 ? l.totalRealizedINR : ''
      }));
      const csv = convertToCSV(data, [
        { key: 'InvoiceNo', label: 'Commercial Invoice No' },
        { key: 'InvoiceDate', label: 'Invoice Date' },
        { key: 'SalesOrderNo', label: 'Sales Order No' },
        { key: 'SalesOrderDate', label: 'Sales Order Date' },
        { key: 'BuyerOrderRef', label: 'Buyer Order / PO Ref' },
        { key: 'Customer', label: 'Customer' },
        { key: 'Country', label: 'Destination Country' },
        { key: 'DischargePort', label: 'Port of Discharge' },
        { key: 'Product', label: 'Product / Species' },
        { key: 'GradeSize', label: 'Grade / Size' },
        { key: 'HSCode', label: 'HS Code' },
        { key: 'Cartons', label: 'Cartons' },
        { key: 'NetWeightKg', label: 'Net Weight (Kg)' },
        { key: 'RateUSD', label: 'Rate (USD/Kg)' },
        { key: 'AmountUSD', label: 'Amount (USD)' },
        { key: 'RealizationStatus', label: 'Realization Status' },
        { key: 'RealizedINR', label: 'Realized INR' }
      ]);
      downloadFile(csv, `Invoice_Product_Analysis_${invProdMonth}.csv`);
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
      downloadFile(csv, `Product_Export_Analysis_${prodMonth}.csv`);
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
      downloadFile(csv, `Destination_Analysis_${destMonth}.csv`);
    } else if (activeReport === 'realization-ageing') {
      const data = filteredAgeingInvoices.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Customer: customerMap.get(inv.consigneeId)?.name || '',
        InvoiceUSD: inv.totalAmountCurrency,
        AdvanceUSD: inv.advanceReceivedCurrency || 0,
        BalanceUSD: inv.balanceRealizationCurrency,
        AgeDays: inv.ageDays,
        Bucket: inv.bucket
      }));
      const csv = convertToCSV(data, [
        { key: 'InvoiceNo', label: 'Invoice No' },
        { key: 'Date', label: 'Invoice Date' },
        { key: 'Customer', label: 'Customer' },
        { key: 'InvoiceUSD', label: 'Invoice Amount (USD)' },
        { key: 'AdvanceUSD', label: 'Advance Recd (USD)' },
        { key: 'BalanceUSD', label: 'Outstanding Balance (USD)' },
        { key: 'AgeDays', label: 'Age (Days)' },
        { key: 'Bucket', label: 'Ageing Bucket' }
      ]);
      downloadFile(csv, `Realization_Ageing_Schedule.csv`);
    } else if (activeReport === 'hs-code-summary') {
      const data = hsCodeBreakdown.map((h) => ({
        HSCode: h.code,
        InvoicesCount: h.invoicesCount,
        WeightKg: h.weight,
        AmountUSD: h.usd,
        AvgUSDPerKg: h.avgUSDPerKg.toFixed(2)
      }));
      const csv = convertToCSV(data, [
        { key: 'HSCode', label: 'HS Code' },
        { key: 'InvoicesCount', label: 'Invoices Declared' },
        { key: 'WeightKg', label: 'Net Weight (Kg)' },
        { key: 'AmountUSD', label: 'Total Value (USD)' },
        { key: 'AvgUSDPerKg', label: 'Avg USD/Kg' }
      ]);
      downloadFile(csv, `HS_Code_Compliance_${hsMonth}.csv`);
    } else if (activeReport === 'exceptions') {
      const data = exceptionItems.map((e) => ({
        Type: e.type,
        Severity: e.severity,
        InvoiceNo: e.invoiceNo,
        Date: e.date,
        Customer: e.customer,
        Description: e.description
      }));
      const csv = convertToCSV(data, [
        { key: 'Type', label: 'Exception Type' },
        { key: 'Severity', label: 'Severity' },
        { key: 'InvoiceNo', label: 'Invoice No' },
        { key: 'Date', label: 'Date' },
        { key: 'Customer', label: 'Customer' },
        { key: 'Description', label: 'Description' }
      ]);
      downloadFile(csv, `Sales_Exception_Audit.csv`);
    } else if (activeReport === 'margin-analysis') {
      const data = productMarginAnalysis.map((m) => ({
        Species: m.name,
        PurchaseWeightKg: m.purchaseWeight,
        RawCostPerKg: m.purchaseAvgCostPerKg.toFixed(2),
        ExportWeightKg: m.salesWeight,
        ExportUSDPerKg: m.salesAvgUSDPerKg.toFixed(2),
        RealizedINRPerKg: m.salesAvgINRPerKg.toFixed(2),
        GrossMarginINRPerKg: m.grossMarginINRPerKg.toFixed(2),
        GrossMarginPct: m.grossMarginPct.toFixed(1) + '%'
      }));
      const csv = convertToCSV(data, [
        { key: 'Species', label: 'Species' },
        { key: 'PurchaseWeightKg', label: 'Purchase Wt (Kg)' },
        { key: 'RawCostPerKg', label: 'Raw Cost/Kg (INR)' },
        { key: 'ExportWeightKg', label: 'Exported Wt (Kg)' },
        { key: 'ExportUSDPerKg', label: 'Export Rate (USD/Kg)' },
        { key: 'RealizedINRPerKg', label: 'Realized INR/Kg' },
        { key: 'GrossMarginINRPerKg', label: 'Gross Margin/Kg (INR)' },
        { key: 'GrossMarginPct', label: 'Gross Margin %' }
      ]);
      downloadFile(csv, `Export_Margin_Analysis_${marginStartDate}_${marginEndDate}.csv`);
    } else if (activeReport === 'shortfall-breakup') {
      const data = filteredShortfallRows.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: inv.invoiceDate,
        Customer: inv.customerName,
        Country: inv.country,
        InvoicedUSD: inv.totalAmountCurrency,
        AdvanceTermsUSD: inv.termsUSD ?? '',
        ActualAdvanceUSD: inv.advUSD,
        AdvanceShortfallUSD: inv.advShortfall,
        AdvanceRateINR: inv.advRate,
        AdvanceShortfallINR: inv.advShortfallINR,
        BalancePriceUSD: inv.priceUSD ?? '',
        ActualBalanceUSD: inv.balUSD,
        BalanceShortfallUSD: inv.balShortfall,
        BalanceRateINR: inv.balRate,
        BalanceShortfallINR: inv.balShortfallINR,
        TotalShortfallUSD: inv.totalShortfall,
        TotalShortfallINR: inv.totalShortfallINR,
        RealizationStatus: 'Fully Realized',
        PendingOutstandingUSD: 0
      }));
      const csv = convertToCSV(data, [
        { key: 'InvoiceNo', label: 'Commercial Invoice No' },
        { key: 'Date', label: 'Invoice Date' },
        { key: 'Customer', label: 'Customer / Consignee' },
        { key: 'Country', label: 'Destination Country' },
        { key: 'InvoicedUSD', label: 'Invoiced Amount (USD)' },
        { key: 'AdvanceTermsUSD', label: 'Advance Contract Terms (USD)' },
        { key: 'ActualAdvanceUSD', label: 'Actual Advance Received (USD)' },
        { key: 'AdvanceShortfallUSD', label: 'Advance Shortfall (USD)' },
        { key: 'AdvanceRateINR', label: 'Advance Forward Rate (INR)' },
        { key: 'AdvanceShortfallINR', label: 'Advance Shortfall (INR)' },
        { key: 'BalancePriceUSD', label: 'Balance Actual Price (USD)' },
        { key: 'ActualBalanceUSD', label: 'Actual Balance Received (USD)' },
        { key: 'BalanceShortfallUSD', label: 'Balance Shortfall (USD)' },
        { key: 'BalanceRateINR', label: 'Balance Forward Rate (INR)' },
        { key: 'BalanceShortfallINR', label: 'Balance Shortfall (INR)' },
        { key: 'TotalShortfallUSD', label: 'Total Shortfall Deductions (USD)' },
        { key: 'TotalShortfallINR', label: 'Total Shortfall Deductions (INR)' },
        { key: 'RealizationStatus', label: 'Realization Status' },
        { key: 'PendingOutstandingUSD', label: 'Pending Outstanding (USD)' }
      ]);
      downloadFile(csv, `Sales_Shortfall_Deductions_Breakup_${new Date().toISOString().split('T')[0]}.csv`);
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
      downloadFile(csv, `Commercial_Customer_Report_${custMonth}.csv`);
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
      <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl text-ink-900 p-6 sm:p-8 shadow-md border border-rose-100/90">
        {/* Mild red liquid ambient effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 rounded-full bg-gradient-to-br from-rose-200/50 via-rose-100/30 to-transparent blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-96 h-96 rounded-full bg-gradient-to-tr from-rose-300/35 via-pink-100/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-rose-50/40 to-white/90 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-100/80 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100/70 text-rose-800 border border-rose-200/80">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Executive Performance Analysis
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 font-mono text-rose-800 border border-rose-200">
                  {periodInvoices.length} Shipments
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
                Export Sales &amp; Realization Performance
              </h2>
              <p className="text-xs text-ink-600 max-w-2xl font-medium">
                Comprehensive commercial turnover, metric tonnage, foreign exchange earnings, and customer market distribution.
              </p>
            </div>

            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-2xl border border-rose-200/80 shadow-xs backdrop-blur-md">
              <Calendar className="w-4 h-4 text-rose-600 ml-2" />
              <span className="text-xs font-bold text-ink-700">Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter performance report by period"
                className="bg-white text-ink-900 font-bold text-xs px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="ALL">All FY 2026-27 (Full Period Overview)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-white text-ink-900">
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6 Key Executive Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-rose-700 uppercase block tracking-wider">
                Total Export Turnover
              </span>
              <span className="text-lg sm:text-xl font-black text-ink-950 mt-1 block truncate">
                ${totalPeriodUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] text-amber-700 font-bold mt-0.5 block truncate">
                {totalPeriodRealizedINR > 0 ? formatINR(totalPeriodRealizedINR) : '₹0.00 (Unrealized)'}
              </span>
            </div>

            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-rose-700 uppercase block tracking-wider">
                Export Net Volume
              </span>
              <span className="text-lg sm:text-xl font-black text-ink-950 mt-1 block truncate">
                {formatKg(totalPeriodWeightKg)}
              </span>
              <span className="text-[11px] text-ink-600 font-medium mt-0.5 block truncate">
                {totalPeriodCartons.toLocaleString()} Cartons Shipped
              </span>
            </div>

            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block tracking-wider">
                Bank Realization
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 mt-1 block truncate">
                {realizationRatePct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-emerald-700 font-bold mt-0.5 block truncate">
                {totalPeriodRealizedINR > 0 ? formatINR(totalPeriodRealizedINR) : 'Remittance Inward'}
              </span>
            </div>

            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-rose-700 uppercase block tracking-wider">
                Avg Realization / Kg
              </span>
              <span className="text-lg sm:text-xl font-black text-ink-950 mt-1 block truncate">
                ${overallAvgUSDPerKg.toFixed(2)}
              </span>
              <span className="text-[11px] text-ink-600 font-medium mt-0.5 block truncate">
                ≈ ₹{(overallAvgUSDPerKg * 84.5).toFixed(0)} / Kg
              </span>
            </div>

            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-amber-700 uppercase block tracking-wider">
                Top Product
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink-950 mt-1 block truncate" title={topProduct?.name || 'N/A'}>
                {topProduct ? topProduct.name : 'N/A'}
              </span>
              <span className="text-[11px] text-amber-800 font-bold mt-0.5 block truncate">
                {topProduct ? `$${topProduct.usd.toLocaleString()} (${topProduct.pct.toFixed(0)}%)` : '—'}
              </span>
            </div>

            <div className="relative overflow-hidden bg-white/85 hover:bg-white border border-rose-100/90 rounded-2xl p-4 shadow-xs hover:shadow-sm backdrop-blur-md transition-all">
              <span className="text-[10px] font-bold text-sky-700 uppercase block tracking-wider">
                Top Overseas Buyer
              </span>
              <span className="text-sm sm:text-base font-extrabold text-ink-950 mt-1 block truncate" title={topCustomer?.name || 'N/A'}>
                {topCustomer ? topCustomer.name : 'N/A'}
              </span>
              <span className="text-[11px] text-sky-800 font-bold mt-0.5 block truncate">
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">Commercial Invoice Register</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {registerInvoices.length} of {activeInvoices.length} invoices
                </span>
              </div>
              <p className="text-xs text-ink-500">Chronological export shipment records with real-time customer, destination, and payment tracking.</p>
            </div>
            {isRegFiltered && (
              <button
                onClick={resetRegFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Component-Level Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search invoice #, customer, discharge port, destination..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
              <span className="text-[11px] font-semibold text-ink-500">From:</span>
              <input
                type="date"
                value={regStartDate}
                onChange={(e) => setRegStartDate(e.target.value)}
                className="p-1 text-xs font-semibold outline-none bg-transparent"
              />
              <span className="text-[11px] font-semibold text-ink-500">To:</span>
              <input
                type="date"
                value={regEndDate}
                onChange={(e) => setRegEndDate(e.target.value)}
                className="p-1 text-xs font-semibold outline-none bg-transparent"
              />
            </div>

            <select
              value={regCustomerFilter}
              onChange={(e) => setRegCustomerFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Customers ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.country})
                </option>
              ))}
            </select>

            <select
              value={regPortFilter}
              onChange={(e) => setRegPortFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Discharge Ports ({ports.length})</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={regStatusFilter}
              onChange={(e) => setRegStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Realization Statuses</option>
              <option value="Not Realized">Not Realized</option>
              <option value="Partially Realized">Partially Realized</option>
              <option value="Fully Realized">Fully Realized</option>
            </select>
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
                  <th className="py-2.5 px-3">Commercial Invoice #</th>
                  <th className="py-2.5 px-3">Invoice Date</th>
                  <th className="py-2.5 px-3">Sales Order #</th>
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
                    <td colSpan={10} className="py-8 text-center text-ink-500">
                      No invoices match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  registerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/20">
                      <td className="py-2 px-3">
                        <span className="font-bold text-rose-700 block">{inv.invoiceNo}</span>
                        {inv.internalInvoiceNo && inv.internalInvoiceNo !== inv.invoiceNo && (
                          <span className="text-[10px] text-ink-400 font-mono block">Ref: {inv.internalInvoiceNo}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-ink-700 whitespace-nowrap">{inv.invoiceDate}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-blue-700 font-semibold block">{inv.salesOrderNo || '—'}</span>
                        {inv.orderDate && (
                          <span className="text-[10px] text-ink-400 block">{inv.orderDate}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-ink-900">
                        {customerMap.get(inv.consigneeId)?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer'}
                      </td>
                      <td className="py-2 px-3">{portMap.get(inv.portOfDischargeId)?.name || inv.portOfDischarge || 'POD'}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatKg(inv.totalWeightKg)}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-rose-950">
                        ${inv.totalAmountCurrency.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.realizationStatus === 'Fully Realized'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.realizationStatus === 'Partially Realized'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-ink-800'
                        }`}>
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
      {/* 2. INVOICE & PRODUCT CROSS-ANALYSIS (NEW REPORT COMPONENT) */}
      {/* ==================================================================== */}
      {activeReport === 'invoice-product-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          {/* Header & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">Commercial Invoice &amp; Product Cross-Analysis</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {filteredInvoiceProductLines.length} product lines across {filteredInvoicesCount} invoices
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Granular cross-tabulation connecting export commercial invoices with species, physical grades, cartons, and realization rates.
              </p>
            </div>

            {/* View Mode Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setInvProdViewMode('hierarchy')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    invProdViewMode === 'hierarchy' ? 'bg-white text-rose-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  }`}
                  title="Grouped by Invoice with nested line items"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Invoice Breakdown</span>
                </button>
                <button
                  onClick={() => setInvProdViewMode('flat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    invProdViewMode === 'flat' ? 'bg-white text-rose-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  }`}
                  title="Flat granular itemized register"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Itemized Register</span>
                </button>
                <button
                  onClick={() => setInvProdViewMode('matrix')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    invProdViewMode === 'matrix' ? 'bg-white text-rose-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  }`}
                  title="Product-to-Invoice price and volume matrix"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Product Matrix</span>
                </button>
              </div>

              {isInvProdFiltered && (
                <button
                  onClick={resetInvProdFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Component-Level Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search invoice #, product / species, grade size, buyer, order #..."
                  value={invProdSearch}
                  onChange={(e) => setInvProdSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
                />
              </div>

              {/* Month Dropdown */}
              <select
                value={invProdMonth}
                onChange={(e) => setInvProdMonth(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="ALL">All FY 2026-27 (All Months)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>

              {/* Customer Dropdown */}
              <select
                value={invProdCustomer}
                onChange={(e) => setInvProdCustomer(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Overseas Buyers ({customers.length})</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
              </select>

              {/* Product / Species Dropdown */}
              <select
                value={invProdSpecies}
                onChange={(e) => setInvProdSpecies(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Species / Commodities ({species.length})</option>
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>

              {/* Size / Grade Dropdown */}
              <select
                value={invProdSize}
                onChange={(e) => setInvProdSize(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Grade Sizes ({salesSizes.length})</option>
                {salesSizes.map((sz) => (
                  <option key={sz.id} value={sz.id}>
                    {sz.name}
                  </option>
                ))}
              </select>

              {/* Port of Discharge Dropdown */}
              <select
                value={invProdPort}
                onChange={(e) => setInvProdPort(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Discharge Ports ({ports.length})</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Realization Status Dropdown */}
              <select
                value={invProdStatus}
                onChange={(e) => setInvProdStatus(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Realization Statuses</option>
                <option value="Not Realized">Not Realized</option>
                <option value="Partially Realized">Partially Realized</option>
                <option value="Fully Realized">Fully Realized</option>
              </select>
            </div>

            {/* Filter tags & quick action */}
            {invProdViewMode === 'hierarchy' && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                <span className="text-ink-500 font-medium">
                  Showing {filteredInvoicesCount} invoices ({filteredInvoiceProductLines.length} line items)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAllInvoices}
                    className="text-rose-700 font-bold hover:underline"
                  >
                    Expand All Products
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={collapseAllInvoices}
                    className="text-ink-600 font-semibold hover:underline"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Product Lines</span>
              <span className="text-lg font-black text-ink-900 mt-0.5 block">{filteredInvoiceProductLines.length}</span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">{filteredInvoicesCount} Invoices</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Net Weight</span>
              <span className="text-lg font-black text-ink-900 mt-0.5 block">{formatKg(invProdTotalWeight)}</span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">{invProdTotalCartons.toLocaleString()} Cartons</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Invoiced (USD)</span>
              <span className="text-lg font-black text-rose-950 mt-0.5 block">${invProdTotalUSD.toLocaleString()}</span>
              <span className="text-[10px] text-rose-800 font-semibold mt-0.5 block">≈ {formatINR(invProdTotalUSD * 84.5)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Weighted Avg Price</span>
              <span className="text-lg font-black text-emerald-950 mt-0.5 block">${invProdAvgRate.toFixed(2)}/kg</span>
              <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block">≈ ₹{(invProdAvgRate * 84.5).toFixed(0)}/kg</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Price Range ($/Kg)</span>
              <span className="text-base font-extrabold text-amber-950 mt-0.5 block">
                ${invProdMinRate.toFixed(2)} – ${invProdMaxRate.toFixed(2)}
              </span>
              <span className="text-[10px] text-amber-800 font-medium mt-0.5 block">Min to Max spread</span>
            </div>
            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
              <span className="text-[10px] font-bold text-cyan-800 uppercase block">Top Product by Value</span>
              <span className="text-xs font-black text-cyan-950 mt-1 block truncate" title={productMatrixMap[0]?.productName || 'N/A'}>
                {productMatrixMap[0]?.productName || 'N/A'}
              </span>
              <span className="text-[10px] text-cyan-800 font-bold mt-0.5 block truncate">
                {productMatrixMap[0] ? `$${productMatrixMap[0].totalUSD.toLocaleString()}` : '—'}
              </span>
            </div>
          </div>

          {/* VIEW 1: HIERARCHY VIEW (INVOICE WITH NESTED LINE ITEMS) */}
          {invProdViewMode === 'hierarchy' && (
            <div className="space-y-4">
              {Array.from(filteredInvoiceMap.values()).length === 0 ? (
                <div className="py-12 text-center text-ink-500 bg-gray-50 rounded-2xl border border-gray-200">
                  <Package className="w-8 h-8 mx-auto text-ink-300 mb-2" />
                  <p className="text-sm font-semibold">No invoices or product line items matched the current filters.</p>
                  <p className="text-xs text-ink-400 mt-1">Try resetting the filters or modifying your search query.</p>
                </div>
              ) : (
                Array.from(filteredInvoiceMap.values()).map(({ invoice: inv, lines }) => {
                  const isExpanded = expandedInvoiceIds.has(inv.id);
                  const cust = customerMap.get(inv.consigneeId);
                  const pod = portMap.get(inv.portOfDischargeId);

                  return (
                    <div
                      key={inv.id}
                      className="border border-gray-200 rounded-2xl overflow-hidden hover:border-rose-300 transition bg-white shadow-2xs"
                    >
                      {/* Invoice Summary Header */}
                      <div
                        onClick={() => toggleInvoiceExpansion(inv.id)}
                        className="p-4 bg-gray-50/70 hover:bg-rose-50/30 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1 rounded-lg bg-white border border-gray-200 text-ink-600 hover:text-rose-700 transition"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-rose-700">{inv.invoiceNo}</span>
                              <span className="text-[11px] font-semibold text-ink-700 bg-gray-100 px-2 py-0.5 rounded">Inv Date: {inv.invoiceDate}</span>
                              {inv.salesOrderNo && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  SO: {inv.salesOrderNo}
                                </span>
                              )}
                              {inv.orderDate && (
                                <span className="text-[10px] text-ink-500 font-medium">
                                  (SO Date: {inv.orderDate})
                                </span>
                              )}
                              {inv.orderNo && inv.orderNo !== inv.salesOrderNo && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                  Buyer Ref: {inv.orderNo}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  inv.realizationStatus === 'Fully Realized'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inv.realizationStatus === 'Partially Realized'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-ink-700'
                                }`}
                              >
                                {inv.realizationStatus}
                              </span>
                            </div>
                            <div className="text-xs text-ink-600 font-medium mt-0.5">
                              {cust?.name || inv.consigneeName || inv.buyerName || 'Overseas Buyer'} · {inv.portOfDischarge || pod?.name || 'Port'} ({inv.countryOfDestination || cust?.country || 'Export'})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <div className="text-right">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Total Weight</span>
                            <span className="text-ink-900 font-extrabold">{formatKg(inv.totalWeightKg)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Invoice Amount</span>
                            <span className="text-rose-950 font-black text-sm">${inv.totalAmountCurrency.toLocaleString()}</span>
                          </div>
                          {inv.totalRealizedINR > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-emerald-600 uppercase block font-bold">Realized INR</span>
                              <span className="text-emerald-700 font-extrabold">{formatINR(inv.totalRealizedINR)}</span>
                            </div>
                          )}
                          <div className="text-right pl-2 border-l border-gray-200">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Lines</span>
                            <span className="text-ink-700 font-bold">{lines.length} items</span>
                          </div>
                        </div>
                      </div>

                      {/* Nested Line Items Table */}
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-200 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-[10px] font-bold text-ink-500 uppercase border-b border-gray-200">
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Product / Species</th>
                                <th className="py-2 px-3">Grade / Size</th>
                                <th className="py-2 px-3 font-mono">HS Code</th>
                                <th className="py-2 px-3 text-right">Cartons</th>
                                <th className="py-2 px-3 text-right">Net Wt (Kg)</th>
                                <th className="py-2 px-3 text-right">Rate ($/Kg)</th>
                                <th className="py-2 px-3 text-right">Total (USD)</th>
                                <th className="py-2 px-3 text-right">% of Inv</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {lines.map((l, i) => (
                                <tr key={l.id} className="hover:bg-rose-50/20">
                                  <td className="py-2 px-3 text-ink-400 font-mono text-[11px]">{i + 1}</td>
                                  <td className="py-2 px-3 font-bold text-ink-900">
                                    {l.productName}
                                    {l.scientificName && (
                                      <span className="block text-[10px] italic text-ink-400 font-normal">
                                        {l.scientificName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-semibold text-ink-700">{l.gradeSize}</td>
                                  <td className="py-2 px-3 font-mono text-[11px] text-ink-500">{l.hsCode}</td>
                                  <td className="py-2 px-3 text-right">{l.cartonsCount.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right font-bold text-ink-900">{formatKg(l.weightKg)}</td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-700">${l.ratePerKg.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right font-black text-rose-950">${l.amountCurrency.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-ink-500">{l.lineSharePct.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50/80 font-bold text-ink-900 border-t border-gray-200">
                                <td colSpan={4} className="py-2 px-3 text-right uppercase text-[10px] text-ink-500">
                                  Invoice Total ({lines.length} lines)
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {lines.reduce((s, l) => s + l.cartonsCount, 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right text-rose-900">
                                  {formatKg(lines.reduce((s, l) => s + l.weightKg, 0))}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-800 font-bold">
                                  ${(lines.reduce((s, l) => s + l.amountCurrency, 0) / (lines.reduce((s, l) => s + l.weightKg, 0) || 1)).toFixed(2)} avg
                                </td>
                                <td className="py-2 px-3 text-right text-rose-950 font-black">
                                  ${lines.reduce((s, l) => s + l.amountCurrency, 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right text-ink-500">100%</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: FLAT ITEMIZED REGISTER */}
          {invProdViewMode === 'flat' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Commercial Invoice #</th>
                    <th className="py-2.5 px-3">Invoice Date</th>
                    <th className="py-2.5 px-3">Sales Order #</th>
                    <th className="py-2.5 px-3">SO Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">POD</th>
                    <th className="py-2.5 px-3">Product / Species</th>
                    <th className="py-2.5 px-3 font-mono">Grade Size</th>
                    <th className="py-2.5 px-3 font-mono">HS Code</th>
                    <th className="py-2.5 px-3 text-right">Cartons</th>
                    <th className="py-2.5 px-3 text-right">Weight (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Rate ($/Kg)</th>
                    <th className="py-2.5 px-3 text-right">Amount (USD)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredInvoiceProductLines.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-ink-500">
                        No product lines found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoiceProductLines.map((l) => (
                      <tr key={l.id} className="hover:bg-rose-50/20">
                        <td className="py-2 px-3">
                          <span className="font-bold text-rose-700 whitespace-nowrap block">{l.invoiceNo}</span>
                          {l.internalInvoiceNo && l.internalInvoiceNo !== l.invoiceNo && (
                            <span className="text-[10px] text-ink-400 font-mono block">Ref: {l.internalInvoiceNo}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-ink-700 whitespace-nowrap">{l.invoiceDate}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-mono text-blue-700 font-semibold block">{l.salesOrderNo || l.orderNo || '—'}</span>
                          {l.orderNo && l.orderNo !== l.salesOrderNo && (
                            <span className="text-[10px] text-amber-800 font-mono block">PO: {l.orderNo}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-ink-500 whitespace-nowrap">{l.orderDate || '—'}</td>
                        <td className="py-2 px-3 font-semibold text-ink-900">{l.customerName}</td>
                        <td className="py-2 px-3 text-ink-600">{l.portOfDischargeName}</td>
                        <td className="py-2 px-3 font-bold text-ink-900">{l.productName}</td>
                        <td className="py-2 px-3 font-mono text-ink-700">{l.gradeSize}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-ink-500">{l.hsCode}</td>
                        <td className="py-2 px-3 text-right">{l.cartonsCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-ink-900">{formatKg(l.weightKg)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">${l.ratePerKg.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-black text-rose-950">${l.amountCurrency.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            l.realizationStatus === 'Fully Realized'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.realizationStatus === 'Partially Realized'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-ink-800'
                          }`}>
                            {l.realizationStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/90 font-bold text-ink-900 border-t-2 border-gray-200">
                    <td colSpan={9} className="py-3 px-3 uppercase text-[10px] text-ink-500 text-right">
                      Total Across Filtered Lines ({filteredInvoiceProductLines.length})
                    </td>
                    <td className="py-3 px-3 text-right font-bold">{invProdTotalCartons.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-rose-900">{formatKg(invProdTotalWeight)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-800">${invProdAvgRate.toFixed(2)}/kg</td>
                    <td className="py-3 px-3 text-right font-black text-rose-950 text-sm">${invProdTotalUSD.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* VIEW 3: PRODUCT CROSS-MATRIX VIEW */}
          {invProdViewMode === 'matrix' && (
            <div className="space-y-4">
              {productMatrixMap.length === 0 ? (
                <div className="py-8 text-center text-ink-500">No products match current filters.</div>
              ) : (
                productMatrixMap.map((pm) => {
                  const avgPrice = pm.totalWeight > 0 ? pm.totalUSD / pm.totalWeight : 0;
                  return (
                    <div key={pm.productName} className="border border-gray-200 rounded-2xl p-5 bg-white space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-ink-900">{pm.productName}</h4>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-ink-600 font-semibold">
                              HS {pm.hsCode}
                            </span>
                          </div>
                          <span className="text-xs text-ink-500">
                            Exported in {pm.invoicesSet.size} shipments ({pm.lines.length} line items)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <div className="text-right">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Total Exported</span>
                            <span className="font-extrabold text-ink-900">{formatKg(pm.totalWeight)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Total Value</span>
                            <span className="font-black text-rose-950 text-sm">${pm.totalUSD.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Weighted Avg Rate</span>
                            <span className="font-bold text-emerald-700">${avgPrice.toFixed(2)}/kg</span>
                          </div>
                          <div className="text-right pl-3 border-l border-gray-200">
                            <span className="text-[10px] text-ink-400 uppercase block font-bold">Price Spread</span>
                            <span className="font-mono text-amber-800 font-bold">${pm.minRate.toFixed(2)} – ${pm.maxRate.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shipments breakdown for this product */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold text-ink-500 uppercase">
                              <th className="py-1.5 px-3">Commercial Invoice #</th>
                              <th className="py-1.5 px-3">Invoice Date</th>
                              <th className="py-1.5 px-3">Sales Order #</th>
                              <th className="py-1.5 px-3">Buyer / Consignee</th>
                              <th className="py-1.5 px-3">POD</th>
                              <th className="py-1.5 px-3">Grade Size</th>
                              <th className="py-1.5 px-3 text-right">Cartons</th>
                              <th className="py-1.5 px-3 text-right">Net Wt (Kg)</th>
                              <th className="py-1.5 px-3 text-right">Rate ($/Kg)</th>
                              <th className="py-1.5 px-3 text-right">Amount (USD)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {pm.lines.map((l) => (
                              <tr key={l.id} className="hover:bg-rose-50/20">
                                <td className="py-1.5 px-3">
                                  <span className="font-bold text-rose-700 block">{l.invoiceNo}</span>
                                </td>
                                <td className="py-1.5 px-3 text-ink-700 whitespace-nowrap">{l.invoiceDate}</td>
                                <td className="py-1.5 px-3 whitespace-nowrap font-mono text-blue-700 font-semibold">
                                  {l.salesOrderNo || l.orderNo || '—'}
                                </td>
                                <td className="py-1.5 px-3 font-semibold text-ink-900">{l.customerName}</td>
                                <td className="py-1.5 px-3 text-ink-600">{l.portOfDischargeName}</td>
                                <td className="py-1.5 px-3 font-mono text-ink-700">{l.gradeSize}</td>
                                <td className="py-1.5 px-3 text-right">{l.cartonsCount.toLocaleString()}</td>
                                <td className="py-1.5 px-3 text-right font-bold text-ink-900">{formatKg(l.weightKg)}</td>
                                <td className="py-1.5 px-3 text-right font-bold text-emerald-700">${l.ratePerKg.toFixed(2)}</td>
                                <td className="py-1.5 px-3 text-right font-black text-rose-950">${l.amountCurrency.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. CUSTOMER-WISE SALES ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'customer-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">
                  Customer &amp; Consignee Performance
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {customerBreakdown.length} buyers active
                </span>
              </div>
              <p className="text-xs text-ink-500">Breakdown of export volume, value share, and average USD/Kg across overseas clients.</p>
            </div>
            {isCustFiltered && (
              <button
                onClick={resetCustFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Component-Level Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search overseas buyer name, city, country..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <select
              value={custMonth}
              onChange={(e) => setCustMonth(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All FY 2026-27</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={custCountryFilter}
              onChange={(e) => setCustCountryFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Countries ({availableCountries.length})</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={custMinValue}
              onChange={(e) => setCustMinValue(Number(e.target.value))}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="0">All Export Values</option>
              <option value="50000">&gt; $50,000</option>
              <option value="100000">&gt; $100,000</option>
              <option value="250000">&gt; $250,000</option>
            </select>

            <select
              value={custSortBy}
              onChange={(e) => setCustSortBy(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="usd">Sort by: Value (USD)</option>
              <option value="weight">Sort by: Weight (Kg)</option>
              <option value="invoices">Sort by: Invoices Count</option>
              <option value="rate">Sort by: Avg USD/Kg</option>
            </select>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block tracking-wider">Total Filtered Export</span>
              <span className="text-lg font-black text-rose-950 mt-1 block">
                ${totalFilteredCustUSD.toLocaleString()}
              </span>
              <span className="text-xs text-rose-800 mt-1 block">
                {formatKg(totalFilteredCustWeight)} across {customerBreakdown.reduce((s, c) => s + c.invoices, 0)} shipments
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
      {/* 4. PRODUCT & SIZE ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'product-analysis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink-900">
                    Product &amp; Species Export Distribution
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {productBreakdown.length} species
                  </span>
                </div>
                <p className="text-xs text-ink-500">
                  Extracted directly from Commercial Invoices line items with pricing and weight totals.
                </p>
              </div>
              {isProdFiltered && (
                <button
                  onClick={resetProdFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Product Filter Toolbar */}
            <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search species / commodity or HS code..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
                />
              </div>

              <select
                value={prodMonth}
                onChange={(e) => setProdMonth(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="ALL">All FY 2026-27</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>

              <select
                value={prodFormFilter}
                onChange={(e) => setProdFormFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="">All Product Forms ({availableForms.length})</option>
                {availableForms.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={prodSortBy}
                onChange={(e) => setProdSortBy(e.target.value as any)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
              >
                <option value="usd">Sort by: Export Value (USD)</option>
                <option value="weight">Sort by: Net Weight (Kg)</option>
                <option value="rate">Sort by: Weighted Avg Rate</option>
              </select>
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
                        No product line items found for the selected filter criteria.
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
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-ink-900">
                Physical Grade / Size Breakdown ({sizeBreakdown.length} active sizes)
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Filter grade size (e.g. 6/8, 10/20)..."
                  value={prodSizeSearch}
                  onChange={(e) => setProdSizeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none"
                />
              </div>
            </div>

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
                        No size breakdown available for the selected filters.
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
      {/* 5. DESTINATION & PORT ANALYSIS */}
      {/* ==================================================================== */}
      {activeReport === 'destination-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">
                  Destination Ports &amp; Overseas Terminal Volume
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {podBreakdown.length} discharge terminals
                </span>
              </div>
              <p className="text-xs text-ink-500">Volume and value breakdown by Port of Discharge (POD) and arrival country.</p>
            </div>
            {isDestFiltered && (
              <button
                onClick={resetDestFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Destination Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search port name, country, UN/LOCODE..."
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <select
              value={destMonth}
              onChange={(e) => setDestMonth(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All FY 2026-27</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={destCountryFilter}
              onChange={(e) => setDestCountryFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Destination Countries ({availableCountries.length})</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={destSortBy}
              onChange={(e) => setDestSortBy(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="usd">Sort by: Value (USD)</option>
              <option value="weight">Sort by: Volume (Kg)</option>
              <option value="count">Sort by: Shipments Count</option>
            </select>
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
      {/* 6. REALIZATION & OUTSTANDING AGEING */}
      {/* ==================================================================== */}
      {activeReport === 'realization-ageing' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">
                  Inward Realization &amp; Export Receivables Ageing Schedule
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {filteredAgeingInvoices.length} outstanding invoices
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Tracks pending foreign remittances across 0–30, 31–60, 61–90, 91–180, and 180+ days.
              </p>
            </div>
            {isAgeingFiltered && (
              <button
                onClick={resetAgeingFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Ageing Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search invoice #, customer name..."
                value={ageingSearch}
                onChange={(e) => setAgeingSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <select
              value={ageingBucketFilter}
              onChange={(e) => setAgeingBucketFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All Ageing Buckets</option>
              <option value="0-30">0–30 Days ({ageingBuckets['0-30'].count})</option>
              <option value="31-60">31–60 Days ({ageingBuckets['31-60'].count})</option>
              <option value="61-90">61–90 Days ({ageingBuckets['61-90'].count})</option>
              <option value="91-180">91–180 Days ({ageingBuckets['91-180'].count})</option>
              <option value="180+">180+ Days ({ageingBuckets['180+'].count})</option>
            </select>

            <select
              value={ageingCustomerFilter}
              onChange={(e) => setAgeingCustomerFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Customers ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={ageingStatusFilter}
              onChange={(e) => setAgeingStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All Pending Balances</option>
              <option value="unrealized_only">Fully Pending (0% Recd)</option>
              <option value="partial_only">Partially Realized (Advance Recd)</option>
            </select>
          </div>

          {/* Ageing Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold text-ink-500 uppercase block">Total Outstanding</span>
              <span className="text-base font-extrabold text-ink-900 mt-1 block">
                ${totalOutstandingUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-ink-500 mt-0.5 block">{filteredAgeingInvoices.length} invoices</span>
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
                {filteredAgeingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-ink-500">
                      No invoices found matching the selected ageing criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAgeingInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/20">
                      <td className="py-2.5 px-3 font-bold text-rose-700">{inv.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-ink-700">{inv.invoiceDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-ink-900">
                        {customerMap.get(inv.consigneeId)?.name || inv.consigneeName || inv.buyerName || 'Overseas Customer'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-ink-900">
                        ${inv.totalAmountCurrency.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-800" title={`Bank Rate: ₹${formatForwardRate(inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5)}`}>
                        ₹{formatForwardRate(inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 84.5)}
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
      {/* 7. HS CODE / COMPLIANCE SUMMARY */}
      {/* ==================================================================== */}
      {activeReport === 'hs-code-summary' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">Harmonized Tariff (HS Code) Compliance Register</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {hsCodeBreakdown.length} HS classifications
                </span>
              </div>
              <p className="text-xs text-ink-500">Summary of export consignments and trade values grouped by 8-digit Customs Tariff code.</p>
            </div>
            {isHsFiltered && (
              <button
                onClick={resetHsFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* HS Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search HS Code (e.g. 03061790)..."
                value={hsSearch}
                onChange={(e) => setHsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <select
              value={hsMonth}
              onChange={(e) => setHsMonth(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All FY 2026-27</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={hsSortBy}
              onChange={(e) => setHsSortBy(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="usd">Sort by: Declared USD</option>
              <option value="weight">Sort by: Net Weight</option>
              <option value="invoices">Sort by: Invoices Count</option>
              <option value="rate">Sort by: Avg USD/Kg</option>
            </select>
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
      {/* 8. EXCEPTION REPORT */}
      {/* ==================================================================== */}
      {activeReport === 'exceptions' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">Commercial Audit &amp; Exception Surveillance</h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  exceptionItems.length === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {exceptionItems.length} issues flagged
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Automated detection of missing compliance data, duplicate invoice numbers, zero weights/rates, and overdue remittances.
              </p>
            </div>
            {isExcFiltered && (
              <button
                onClick={resetExcFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Exception Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search invoice #, customer name, issue description..."
                value={excSearch}
                onChange={(e) => setExcSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <select
              value={excTypeFilter}
              onChange={(e) => setExcTypeFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All Exception Categories</option>
              <option value="Overdue Realization">Overdue Realization</option>
              <option value="Missing Data">Missing Data</option>
              <option value="Duplicate Invoice No">Duplicate Invoice No</option>
              <option value="Zero / Negative Value">Zero / Negative Value</option>
            </select>

            <select
              value={excSeverityFilter}
              onChange={(e) => setExcSeverityFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All Severities</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
            </select>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-ink-700">Overdue Days:</span>
              <input
                type="number"
                min="15"
                max="365"
                value={overdueThresholdDays}
                onChange={(e) => setOverdueThresholdDays(parseInt(e.target.value) || 60)}
                className="w-14 text-xs font-bold outline-none text-center bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-3">
            {exceptionItems.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-semibold text-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                <p>100% Clean Audit Status: Zero commercial compliance exceptions detected with current filters.</p>
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
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
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
      {/* 9. LANDED COST VS SALES REALIZATION */}
      {/* ==================================================================== */}
      {activeReport === 'margin-analysis' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">
                  Period Landed Cost vs. Sales Realization Margin
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {productMarginAnalysis.length} commodity reconciliations
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Period-level margin approximation comparing Purchase/Production Cost per Kg against Realized Export Amount in INR per Kg for matching species.
              </p>
            </div>
            {isMarginFiltered && (
              <button
                onClick={resetMarginFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Margin Filter Toolbar */}
          <div className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search species / commodity name..."
                value={marginSearch}
                onChange={(e) => setMarginSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
              <span className="text-[11px] font-semibold text-ink-500">From:</span>
              <input
                type="date"
                value={marginStartDate}
                onChange={(e) => setMarginStartDate(e.target.value)}
                className="p-1 text-xs font-semibold outline-none bg-transparent"
              />
              <span className="text-[11px] font-semibold text-ink-500">To:</span>
              <input
                type="date"
                value={marginEndDate}
                onChange={(e) => setMarginEndDate(e.target.value)}
                className="p-1 text-xs font-semibold outline-none bg-transparent"
              />
            </div>

            <select
              value={marginSpeciesFilter}
              onChange={(e) => setMarginSpeciesFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="">All Species ({species.length})</option>
              {species.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>

            <select
              value={marginHealthFilter}
              onChange={(e) => setMarginHealthFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-400 outline-none transition text-ink-800"
            >
              <option value="ALL">All Margin Ranges</option>
              <option value="profitable">Profitable Only (&gt; 0%)</option>
              <option value="high_margin">High Margin (&ge; 20%)</option>
              <option value="negative">Negative Margin (&lt; 0%)</option>
            </select>
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

      {/* 10. Shortfall & Deductions Breakup Report */}
      {activeReport === 'shortfall-breakup' && (
        <div className="space-y-4">
          {/* Policy Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-white to-blue-50 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Commercial Realization Shortfall &amp; Deductions Breakup</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                  Zero Outstanding · Fully Realized
                </span>
              </div>
              <p className="text-xs text-ink-600 max-w-4xl">
                Audit report of remittance shortfalls (bank wire fee deductions, exchange differences, or contractual adjustments). These invoices are settled as <strong>Fully Realized</strong> with <strong>$0.00 Outstanding Balance</strong>; all shortfalls are itemized separately by advance and balance legs below.
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Total Shortfall (USD)</span>
              <span className="text-lg font-black text-amber-900 block tabular-nums">
                -${filteredShortfallRows.reduce((s, i) => s + i.totalShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-ink-500">{filteredShortfallRows.length} adjusted invoices</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Total Shortfall (INR)</span>
              <span className="text-lg font-black text-ink-950 block tabular-nums">
                {formatINR(filteredShortfallRows.reduce((s, i) => s + i.totalShortfallINR, 0))}
              </span>
              <span className="text-[10px] text-ink-500">Converted at forward rates</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Advance Leg Shortfall</span>
              <span className="text-lg font-black text-blue-900 block tabular-nums">
                -${filteredShortfallRows.reduce((s, i) => s + i.advShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-ink-500">Contract terms vs actual</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Balance Leg Shortfall</span>
              <span className="text-lg font-black text-emerald-900 block tabular-nums">
                -${filteredShortfallRows.reduce((s, i) => s + i.balShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-ink-500">Actual price vs wire credit</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Shortfall Invoices</span>
              <span className="text-lg font-black text-ink-900 block tabular-nums">
                {filteredShortfallRows.length}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">100% Fully Realized</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Pending Outstanding</span>
              <span className="text-lg font-black text-emerald-700 block tabular-nums">
                $0.00
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Zero Outstanding Balance</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by invoice #, customer, order ref..."
                  value={shortfallSearch}
                  onChange={(e) => setShortfallSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={shortfallLegFilter}
                onChange={(e) => setShortfallLegFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-ink-700"
              >
                <option value="all">All Shortfall Legs</option>
                <option value="advance-only">Advance Shortfall Only</option>
                <option value="balance-only">Balance Shortfall Only</option>
                <option value="both">Both Advance &amp; Balance Shortfall</option>
              </select>

              <select
                value={shortfallCustomerFilter}
                onChange={(e) => setShortfallCustomerFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-ink-700 max-w-[200px]"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-ink-500">
              {filteredShortfallRows.length} shortfall entries
            </span>
          </div>

          {/* Itemized Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-ink-500 uppercase text-[10px] font-bold border-b border-gray-100">
                  <tr>
                    <th className="py-2.5 px-3 text-center">#</th>
                    <th className="py-2.5 px-3">Invoice No &amp; Date</th>
                    <th className="py-2.5 px-3">Customer &amp; Country</th>
                    <th className="py-2.5 px-3 text-right">Invoiced USD</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50">Adv Terms / Actual</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50">Adv Shortfall</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50">Bal Price / Actual</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50">Bal Shortfall</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/60 font-black">Total Shortfall (USD)</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/60 font-black">Total Shortfall (INR)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShortfallRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-ink-400">
                        <Receipt className="w-8 h-8 mx-auto text-ink-300 mb-2 opacity-60" />
                        <p className="font-bold text-sm text-ink-800">No shortfall invoices found</p>
                        <p className="text-xs text-ink-500 mt-1">All invoices are settled without wire deductions</p>
                      </td>
                    </tr>
                  ) : (
                    filteredShortfallRows.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-amber-50/20 transition">
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-ink-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 align-middle">
                          <div className="font-bold text-ink-900">{inv.invoiceNo}</div>
                          <div className="text-[10px] text-ink-500">{inv.invoiceDate}</div>
                          {inv.orderNo && <div className="text-[9px] text-ink-400 font-mono">PO: {inv.orderNo}</div>}
                        </td>
                        <td className="py-2.5 px-3 align-middle max-w-[200px]">
                          <div className="font-bold text-ink-900 truncate" title={inv.customerName}>{inv.customerName}</div>
                          <div className="text-[10px] text-ink-500">{inv.country}</div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                          <div className="font-black text-ink-950 tabular-nums">
                            ${inv.totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            Realized: ${(inv.totalRealizedCurrency || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                          <div className="font-bold text-blue-900 tabular-nums">
                            Terms: ${inv.termsUSD ? inv.termsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                          </div>
                          <div className="text-[10px] text-blue-700 tabular-nums">
                            Actual: ${inv.advUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-blue-50/30">
                          {inv.advShortfall > 0 ? (
                            <div>
                              <div className="font-black text-rose-700 tabular-nums">
                                -${inv.advShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-blue-800 font-semibold tabular-nums">
                                {formatINR(inv.advShortfallINR)}
                              </div>
                              <div className="text-[9px] text-ink-400">@ ₹{formatForwardRate(inv.advRate)}</div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-bold">Nil Shortfall</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                          <div className="font-bold text-emerald-900 tabular-nums">
                            Price: ${inv.priceUSD ? inv.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                          </div>
                          <div className="text-[10px] text-emerald-700 tabular-nums">
                            Actual: ${inv.balUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-emerald-50/30">
                          {inv.balShortfall > 0 ? (
                            <div>
                              <div className="font-black text-rose-700 tabular-nums">
                                -${inv.balShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-emerald-800 font-semibold tabular-nums">
                                {formatINR(inv.balShortfallINR)}
                              </div>
                              <div className="text-[9px] text-ink-400">@ ₹{formatForwardRate(inv.balRate)}</div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-bold">Nil Shortfall</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-amber-50/50">
                          <div className="font-black text-amber-900 text-sm tabular-nums">
                            -${inv.totalShortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Deductions Cleared</div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap bg-amber-50/50">
                          <div className="font-black text-ink-950 tabular-nums">
                            {formatINR(inv.totalShortfallINR)}
                          </div>
                          <div className="text-[9px] text-ink-500">Bank Forward Equiv</div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                            Fully Realized
                          </span>
                          <div className="text-[9px] text-amber-700 font-semibold mt-0.5">Shortfall Cleared</div>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                          <div className="font-black text-emerald-700 tabular-nums">$0.00</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">Cleared</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredShortfallRows.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold text-ink-900 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 uppercase text-xs">
                        Total Shortfall ({filteredShortfallRows.length} Invoices)
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        ${filteredShortfallRows.reduce((s, i) => s + i.totalAmountCurrency, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-blue-50/30">
                        ${filteredShortfallRows.reduce((s, i) => s + (i.termsUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-rose-700 bg-blue-50/30">
                        -${filteredShortfallRows.reduce((s, i) => s + i.advShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-emerald-50/30">
                        ${filteredShortfallRows.reduce((s, i) => s + (i.priceUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-rose-700 bg-emerald-50/30">
                        -${filteredShortfallRows.reduce((s, i) => s + i.balShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums text-amber-900 bg-amber-50/60 text-sm font-black">
                        -${filteredShortfallRows.reduce((s, i) => s + i.totalShortfall, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums bg-amber-50/60 font-black">
                        {formatINR(filteredShortfallRows.reduce((s, i) => s + i.totalShortfallINR, 0))}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-emerald-800">
                        All Fully Realized
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 tabular-nums">
                        $0.00
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
