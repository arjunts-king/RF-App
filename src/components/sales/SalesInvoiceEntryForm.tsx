import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SalesCurrency } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import {
  FileText,
  PlusCircle,
  Trash2,
  Save,
  RotateCcw,
  Calendar,
  Globe,
  Anchor,
  AlertTriangle,
  Building,
  CreditCard,
  Hash
} from 'lucide-react';

interface LineItemDraft {
  id: string;
  speciesId: string;
  hsCode: string;
  sizeId: string;
  countId: string;
  cartonsCount: number | '';
  weightKg: number | '';
  ratePerKg: number | '';
  fobValueCurrency: number | '';
}

export const SalesInvoiceEntryForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { customers, ports, species, sizes, counts, salesInvoices, addSalesInvoice } = useData();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Header State
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [consigneeId, setConsigneeId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [portOfLoadingId, setPortOfLoadingId] = useState('');
  const [portOfDischargeId, setPortOfDischargeId] = useState('');
  const [finalDestinationId, setFinalDestinationId] = useState('');
  const [currency, setCurrency] = useState<SalesCurrency>('USD');
  const [exchangeRate, setExchangeRate] = useState('84.50');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Repeatable Lines State
  const [lines, setLines] = useState<LineItemDraft[]>([]);

  // Auto-generate invoice sequential number & pre-select default ports
  useEffect(() => {
    const nextSeq = String(salesInvoices.length + 1).padStart(4, '0');
    setInvoiceNo(`EXP-${currentYear}-${nextSeq}`);

    // Pre-select Indian port of loading if available
    const indianPort = ports.find((p) => p.country.toLowerCase() === 'india' && p.active) || ports[0];
    if (indianPort && !portOfLoadingId) {
      setPortOfLoadingId(indianPort.id);
    }

    // Pre-select first foreign port
    const foreignPort = ports.find((p) => p.country.toLowerCase() !== 'india' && p.active) || ports[1] || ports[0];
    if (foreignPort && !portOfDischargeId) {
      setPortOfDischargeId(foreignPort.id);
      setFinalDestinationId(foreignPort.id);
    }

    // Initialize 1 empty line item
    if (lines.length === 0 && species.length > 0) {
      const defaultSpecies = species.find((s) => s.active) || species[0];
      setLines([
        {
          id: `line-${Date.now()}`,
          speciesId: defaultSpecies?.id || '',
          hsCode: defaultSpecies?.hsCode || '03061790',
          sizeId: sizes[0]?.id || '',
          countId: counts[0]?.id || '',
          cartonsCount: 500,
          weightKg: 5000,
          ratePerKg: 10.5,
          fobValueCurrency: ''
        }
      ]);
    }
  }, [salesInvoices.length, ports, species, sizes, counts, currentYear]);

  // Handle Species selection for a line - auto-fills HS Code
  const handleSpeciesChange = (lineId: string, spId: string) => {
    const found = species.find((s) => s.id === spId);
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, speciesId: spId, hsCode: found?.hsCode || '03061790' } : l))
    );
  };

  const handleAddLine = () => {
    const defaultSpecies = species.find((s) => s.active) || species[0];
    const newLine: LineItemDraft = {
      id: `line-${Date.now()}-${lines.length}`,
      speciesId: defaultSpecies?.id || '',
      hsCode: defaultSpecies?.hsCode || '03061790',
      sizeId: sizes[0]?.id || '',
      countId: counts[0]?.id || '',
      cartonsCount: '',
      weightKg: '',
      ratePerKg: '',
      fobValueCurrency: ''
    };
    setLines((prev) => [...prev, newLine]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (lines.length <= 1) {
      showToast('At least one product line item is required.', 'warning');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const updateLine = (lineId: string, field: keyof LineItemDraft, val: any) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, [field]: val } : l)));
  };

  // Live Server-Style Totals Calculation
  const computedLines = lines.map((l) => {
    const w = parseFloat(String(l.weightKg)) || 0;
    const r = parseFloat(String(l.ratePerKg)) || 0;
    const amt = Number((w * r).toFixed(2));
    const fob = l.fobValueCurrency !== '' ? parseFloat(String(l.fobValueCurrency)) || amt : amt;
    return {
      ...l,
      computedAmount: amt,
      computedFOB: fob
    };
  });

  const totalCartons = lines.reduce((s, l) => s + (parseInt(String(l.cartonsCount)) || 0), 0);
  const totalWeightKg = Number(lines.reduce((s, l) => s + (parseFloat(String(l.weightKg)) || 0), 0).toFixed(2));
  const totalAmountCurrency = Number(computedLines.reduce((s, l) => s + l.computedAmount, 0).toFixed(2));
  const totalFobValueCurrency = Number(computedLines.reduce((s, l) => s + l.computedFOB, 0).toFixed(2));
  const currentRate = parseFloat(exchangeRate) || 84.5;
  const estimatedAmountINR = Number((totalAmountCurrency * currentRate).toFixed(2));

  // Check if invoice number is duplicate
  const isDuplicateInvoiceNo =
    invoiceNo.trim() !== '' &&
    salesInvoices.some((inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === invoiceNo.trim().toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consigneeId) {
      showToast('Validation Error: Please select a Consignee / Customer.', 'error');
      return;
    }

    if (lines.length === 0) {
      showToast('Validation Error: At least one line item is required.', 'error');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const w = parseFloat(String(l.weightKg)) || 0;
      const r = parseFloat(String(l.ratePerKg)) || 0;
      if (w <= 0) {
        showToast(`Line ${i + 1}: Net Weight must be greater than 0 Kg.`, 'error');
        return;
      }
      if (r < 0) {
        showToast(`Line ${i + 1}: Rate must be >= 0.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      invoiceNo: invoiceNo.trim(),
      invoiceDate,
      consigneeId,
      buyerId: buyerId || undefined,
      orderNo: orderNo.trim() || undefined,
      orderDate: orderDate || undefined,
      portOfLoadingId,
      portOfDischargeId,
      finalDestinationId: finalDestinationId || portOfDischargeId,
      currency,
      exchangeRate: currentRate,
      remarks: remarks.trim() || undefined,
      lineItems: lines.map((l) => ({
        id: l.id,
        speciesId: l.speciesId,
        hsCode: l.hsCode,
        sizeId: l.sizeId,
        countId: l.countId || undefined,
        cartonsCount: parseInt(String(l.cartonsCount)) || 0,
        weightKg: parseFloat(String(l.weightKg)) || 0,
        ratePerKg: parseFloat(String(l.ratePerKg)) || 0,
        amountCurrency: (parseFloat(String(l.weightKg)) || 0) * (parseFloat(String(l.ratePerKg)) || 0),
        fobValueCurrency:
          l.fobValueCurrency !== ''
            ? parseFloat(String(l.fobValueCurrency)) || 0
            : (parseFloat(String(l.weightKg)) || 0) * (parseFloat(String(l.ratePerKg)) || 0)
      }))
    };

    const res = addSalesInvoice(payload);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleReset = () => {
    const nextSeq = String(salesInvoices.length + 1).padStart(4, '0');
    setInvoiceNo(`EXP-${currentYear}-${nextSeq}`);
    setInvoiceDate(today);
    setConsigneeId('');
    setBuyerId('');
    setOrderNo('');
    setRemarks('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            Commercial Export Invoice Entry
          </h2>
          <p className="text-xs text-ink-500">
            One form = one export commercial invoice. Auto-fills HS Codes, recalculates product lines, and tracks bank realizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Invoice...' : 'Generate Commercial Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Duplicate Invoice Warning (non-blocking) */}
      {isDuplicateInvoiceNo && (
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Warning:</strong> An active invoice with number <strong>"{invoiceNo}"</strong> already exists in the system. You may proceed if this is an intentional revision, or modify the invoice number.
          </span>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
          <Building className="w-4 h-4 text-rose-600" />
          Invoice &amp; Parties Identification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Commercial Invoice No. <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
                placeholder="e.g. EXP-2026-0001"
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Invoice Date <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:bg-white focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Consignee / Customer <span className="text-rose-600">*</span>
            </label>
            <select
              value={consigneeId}
              onChange={(e) => setConsigneeId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-600"
            >
              <option value="">Select Consignee...</option>
              {customers
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Buyer (if other than Consignee)</label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-600"
            >
              <option value="">Same as Consignee</option>
              {customers
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Shipping & Logistics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-2">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Order / PO Reference</label>
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="e.g. PO-88231-USA"
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Order Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port of Loading (POL) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Anchor className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={portOfLoadingId}
                onChange={(e) => setPortOfLoadingId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:bg-white focus:border-rose-600"
              >
                <option value="">Select Port of Loading...</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - {p.country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port of Discharge (POD) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={portOfDischargeId}
                onChange={(e) => {
                  setPortOfDischargeId(e.target.value);
                  if (!finalDestinationId) setFinalDestinationId(e.target.value);
                }}
                required
                className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:bg-white focus:border-rose-600"
              >
                <option value="">Select Port of Discharge...</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - {p.country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Final Destination <span className="text-rose-600">*</span>
            </label>
            <select
              value={finalDestinationId}
              onChange={(e) => setFinalDestinationId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:bg-white focus:border-rose-600"
            >
              <option value="">Select Final Destination...</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) - {p.country}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Currency & Booking Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Invoice Currency</label>
            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SalesCurrency)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-600"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CAD">CAD - Canadian Dollar (C$)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="AED">AED - UAE Dirham (AED)</option>
                <option value="SGD">SGD - Singapore Dollar (S$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Booking Exchange Rate (INR / {currency})
            </label>
            <input
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g. 84.50"
              required
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Remarks &amp; Container #</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Container MSKU-8829103 / Temp -18C"
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-600"
            />
          </div>
        </div>
      </div>

      {/* Repeatable Line Items Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-rose-600" />
            Product Lines &amp; Cargo Specifications ({lines.length})
          </h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Product Line</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[200px]">Product / Goods</th>
                <th className="py-2.5 px-3">HS Code</th>
                <th className="py-2.5 px-3 min-w-[120px]">Size</th>
                <th className="py-2.5 px-3 min-w-[100px]">Count</th>
                <th className="py-2.5 px-3 text-right">Cartons</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">Net Wt (Kg)</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">Rate ({currency}/Kg)</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">Amount ({currency})</th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">FOB Val ({currency})</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {computedLines.map((l, idx) => (
                <tr key={l.id} className="hover:bg-rose-50/20">
                  <td className="py-2.5 px-3 text-ink-500 font-bold">{idx + 1}</td>

                  {/* Species / Product */}
                  <td className="py-2 px-3">
                    <select
                      value={l.speciesId}
                      onChange={(e) => handleSpeciesChange(l.id, e.target.value)}
                      required
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-rose-600"
                    >
                      {species.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} {sp.productForm ? `(${sp.productForm})` : ''}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* HS Code (Auto-filled, Read-Only) */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={l.hsCode}
                      readOnly
                      title="HS Code auto-filled from Species Master"
                      className="w-24 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[11px] text-ink-700 outline-none cursor-not-allowed"
                    />
                  </td>

                  {/* Size */}
                  <td className="py-2 px-3">
                    <select
                      value={l.sizeId}
                      onChange={(e) => updateLine(l.id, 'sizeId', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-rose-600"
                    >
                      {sizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Count */}
                  <td className="py-2 px-3">
                    <select
                      value={l.countId}
                      onChange={(e) => updateLine(l.id, 'countId', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-rose-600"
                    >
                      <option value="">N/A</option>
                      {counts.map((cnt) => (
                        <option key={cnt.id} value={cnt.id}>
                          {cnt.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Cartons */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={l.cartonsCount}
                      onChange={(e) => updateLine(l.id, 'cartonsCount', e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-medium text-xs outline-none focus:border-rose-600"
                    />
                  </td>

                  {/* Weight (Kg) */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={l.weightKg}
                      onChange={(e) => updateLine(l.id, 'weightKg', e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-bold text-xs outline-none focus:border-rose-600"
                    />
                  </td>

                  {/* Rate */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={l.ratePerKg}
                      onChange={(e) => updateLine(l.id, 'ratePerKg', e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-bold text-xs outline-none focus:border-rose-600"
                    />
                  </td>

                  {/* Calculated Amount in USD (Read-Only) */}
                  <td className="py-2 px-3 text-right font-extrabold text-ink-900">
                    {currency} {l.computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* FOB Value */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={l.fobValueCurrency !== '' ? l.fobValueCurrency : ''}
                      onChange={(e) => updateLine(l.id, 'fobValueCurrency', e.target.value)}
                      placeholder={String(l.computedAmount)}
                      className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right text-xs outline-none focus:border-rose-600 font-semibold"
                    />
                  </td>

                  {/* Delete Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(l.id)}
                      disabled={lines.length <= 1}
                      title="Delete Line"
                      className="p-1 text-ink-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Grand Totals Strip (Read-Only) */}
      <div className="bg-rose-950 text-white rounded-2xl p-5 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">Total Cartons</span>
          <span className="text-xl font-black mt-1 block">{totalCartons} ctn</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">Total Weight</span>
          <span className="text-xl font-black mt-1 block">{formatKg(totalWeightKg)}</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">
            Total Value ({currency})
          </span>
          <span className="text-xl font-black text-rose-200 mt-1 block">
            {currency} {totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">
            Total FOB Value ({currency})
          </span>
          <span className="text-xl font-black text-white mt-1 block">
            {currency} {totalFobValueCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">
            Estimated INR Realization
          </span>
          <span className="text-xl font-black text-emerald-300 mt-1 block">
            {formatINR(estimatedAmountINR)}
          </span>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
        <span className="text-xs text-ink-500 font-medium">
          Ready to save commercial export invoice <strong>{invoiceNo}</strong> ({lines.length} product lines).
        </span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving Invoice...' : 'Generate Commercial Invoice'}</span>
        </button>
      </div>
    </form>
  );
};
