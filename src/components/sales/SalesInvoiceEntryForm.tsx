import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SalesCurrency } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { StickySaveBar } from '../common/StickySaveBar';
import { exportInvoiceToWord, numberToWordsInternational } from '../../utils/exportWordInvoice';
import { ExportInvoicePreviewModal } from './ExportInvoicePreviewModal';
import {
  FileText,
  PlusCircle,
  Trash2,
  RotateCcw,
  Calendar,
  Anchor,
  AlertTriangle,
  Building,
  CreditCard,
  Hash,
  Download,
  Ship,
  Sparkles,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface LineItemDraft {
  id: string;
  speciesId: string;
  hsCode: string;
  sizeId: string;
  countId: string;
  productDescription: string;
  gradeSize: string;
  cartonsCount: number | '';
  weightKg: number | '';
  ratePerKg: number | '';
  fobValueCurrency: number | '';
}

export const SalesInvoiceEntryForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { customers, ports, species, sizes, counts, salesInvoices, businessSettings, addSalesInvoice } = useData();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // --- Section 1: Exporter & Document Identification ---
  const [exporterName, setExporterName] = useState(businessSettings.businessName || 'ABC Pvt. Ltd.');
  const [exporterAddress, setExporterAddress] = useState(
    businessSettings.address || 'Ambattur Industrial Estate, Ambattur,\nChennai, Tamil Nadu - 600094'
  );
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [exporterRef, setExporterRef] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [otherReferences, setOtherReferences] = useState('');

  // --- Section 2: Consignee & Buyer ---
  const [consigneeId, setConsigneeId] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [buyerName, setBuyerName] = useState('N.A.');
  const [buyerAddress, setBuyerAddress] = useState('');

  // --- Section 3: Shipping, Logistics & Valuation ---
  const [countryOfOrigin, setCountryOfOrigin] = useState('INDIA');
  const [countryOfDestination, setCountryOfDestination] = useState('');
  const [preCarriageBy, setPreCarriageBy] = useState('N.A.');
  const [placeOfReceipt, setPlaceOfReceipt] = useState('N.A.');
  const [termsOfPayment, setTermsOfPayment] = useState('100% TT AFTER MAILING THE ORIGINAL DOCUMENTS');
  const [priceTerms, setPriceTerms] = useState('CFR LAT KRABANG');
  const [vesselFlightNo, setVesselFlightNo] = useState('MOGRAL 119W');
  const [portOfLoadingId, setPortOfLoadingId] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('COCHIN, INDIA');
  const [portOfDischargeId, setPortOfDischargeId] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('LAEM CHABANG');
  const [finalDestinationId, setFinalDestinationId] = useState('');
  const [finalDestination, setFinalDestination] = useState('LAT KRABANG, THAILAND');
  const [currency, setCurrency] = useState<SalesCurrency>('USD');
  const [exchangeRate, setExchangeRate] = useState('84.50');
  const [remarks, setRemarks] = useState('');

  // --- Section 4: Cargo & Packaging Summary ---
  const [commodityDescription, setCommodityDescription] = useState(
    '2600 CARTONS OF FROZEN INDIAN MACKEREL - A GRADE & B GRADE- DS'
  );
  const [packingDescription, setPackingDescription] = useState('1X10KG');
  const [scientificName, setScientificName] = useState('RASTRELLIGER KANAGURTA');
  const [shippingMarks, setShippingMarks] = useState('MERIT D.S');
  const [containerNo, setContainerNo] = useState('ONEU90399086');
  const [sealNo, setSealNo] = useState('IN567892');
  const [grossWeightKg, setGrossWeightKg] = useState<number | ''>(27950);

  // --- Section 5: Line Items ---
  const [lines, setLines] = useState<LineItemDraft[]>([]);

  // --- Section 6: Factory, Statutory Declaration & Signatory ---
  const [amountInWordsCustom, setAmountInWordsCustom] = useState('');
  const [factoryNameAndAddress, setFactoryNameAndAddress] = useState(
    `${businessSettings.businessName || 'ABC Pvt. Ltd.'}, ${businessSettings.address || 'Ambattur Industrial Estate, Ambattur, Chennai, Tamil Nadu - 600094'}`
  );
  const [factoryApprovalNumber, setFactoryApprovalNumber] = useState('9085');
  const [billOfLadingNo, setBillOfLadingNo] = useState('');
  const [declarationText, setDeclarationText] = useState(
    'We certify that this invoice shows the actual price of the goods described and that all particulars are true and correct'
  );
  const [signatoryCompany, setSignatoryCompany] = useState(`For ${businessSettings.businessName || 'RELISH FOODS'}`);
  const [signatoryDesignation, setSignatoryDesignation] = useState('Partner');
  const [signatureDate, setSignatureDate] = useState(today);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auto-generate invoice sequential number & pre-select defaults
  useEffect(() => {
    const nextSeq = String(salesInvoices.length + 1).padStart(4, '0');
    const autoInvNo = `EXP-${currentYear}-${nextSeq}`;
    setInvoiceNo(autoInvNo);
    setExporterRef(autoInvNo);

    // Default exporter details from businessSettings
    if (businessSettings.businessName) {
      setExporterName(businessSettings.businessName);
      setSignatoryCompany(`For ${businessSettings.businessName}`);
    }
    if (businessSettings.address) {
      setExporterAddress(businessSettings.address);
      setFactoryNameAndAddress(`${businessSettings.businessName || 'ABC Pvt. Ltd.'}, ${businessSettings.address}`);
    }

    // Pre-select Indian port of loading if available
    const indianPort = ports.find((p) => p.country.toLowerCase() === 'india' && p.active) || ports[0];
    if (indianPort && !portOfLoadingId) {
      setPortOfLoadingId(indianPort.id);
      setPortOfLoading(`${indianPort.name.toUpperCase()}, ${indianPort.country.toUpperCase()}`);
    }

    // Pre-select foreign port
    const foreignPort = ports.find((p) => p.country.toLowerCase() !== 'india' && p.active) || ports[1] || ports[0];
    if (foreignPort && !portOfDischargeId) {
      setPortOfDischargeId(foreignPort.id);
      setPortOfDischarge(foreignPort.name.toUpperCase());
      setFinalDestinationId(foreignPort.id);
      setFinalDestination(`${foreignPort.name.toUpperCase()}, ${foreignPort.country.toUpperCase()}`);
      setCountryOfDestination(foreignPort.country.toUpperCase());
    }

    // Pre-populate sample lines if none
    if (lines.length === 0 && species.length > 0) {
      const defaultSpecies = species.find((s) => s.active) || species[0];
      setLines([
        {
          id: `line-${Date.now()}-1`,
          speciesId: defaultSpecies?.id || '',
          hsCode: defaultSpecies?.hsCode || '03061790',
          sizeId: sizes[0]?.id || '',
          countId: counts[0]?.id || '',
          productDescription: 'FROZEN INDIAN MACKEREL – A GRADE',
          gradeSize: '6/8',
          cartonsCount: 162,
          weightKg: 1620,
          ratePerKg: 2.13,
          fobValueCurrency: ''
        },
        {
          id: `line-${Date.now()}-2`,
          speciesId: defaultSpecies?.id || '',
          hsCode: defaultSpecies?.hsCode || '03061790',
          sizeId: sizes[0]?.id || '',
          countId: counts[0]?.id || '',
          productDescription: 'FROZEN INDIAN MACKEREL – A GRADE',
          gradeSize: '8/10',
          cartonsCount: 1948,
          weightKg: 19480,
          ratePerKg: 1.93,
          fobValueCurrency: ''
        },
        {
          id: `line-${Date.now()}-3`,
          speciesId: defaultSpecies?.id || '',
          hsCode: defaultSpecies?.hsCode || '03061790',
          sizeId: sizes[0]?.id || '',
          countId: counts[0]?.id || '',
          productDescription: 'FROZEN INDIAN MACKEREL – B GRADE- DS',
          gradeSize: '8/10',
          cartonsCount: 490,
          weightKg: 4900,
          ratePerKg: 1.53,
          fobValueCurrency: ''
        }
      ]);
    }
  }, [salesInvoices.length, currentYear, businessSettings]);

  // Handle Consignee selection
  const handleConsigneeChange = (cId: string) => {
    setConsigneeId(cId);
    const found = customers.find((c) => c.id === cId);
    if (found) {
      setConsigneeName(found.name);
      setConsigneeAddress(found.address || '');
      if (found.country) {
        setCountryOfDestination(found.country.toUpperCase());
      }
    }
  };

  // Handle Buyer selection
  const handleBuyerChange = (bId: string) => {
    setBuyerId(bId);
    if (!bId) {
      setBuyerName('N.A.');
      setBuyerAddress('');
    } else {
      const found = customers.find((c) => c.id === bId);
      if (found) {
        setBuyerName(found.name);
        setBuyerAddress(found.address || '');
      }
    }
  };

  // Handle Port of Loading selection
  const handlePortOfLoadingChange = (pId: string) => {
    setPortOfLoadingId(pId);
    const p = ports.find((item) => item.id === pId);
    if (p) {
      setPortOfLoading(`${p.name.toUpperCase()}, ${p.country.toUpperCase()}`);
    }
  };

  // Handle Port of Discharge selection
  const handlePortOfDischargeChange = (pId: string) => {
    setPortOfDischargeId(pId);
    const p = ports.find((item) => item.id === pId);
    if (p) {
      setPortOfDischarge(p.name.toUpperCase());
      if (!finalDestinationId) {
        setFinalDestinationId(p.id);
        setFinalDestination(`${p.name.toUpperCase()}, ${p.country.toUpperCase()}`);
      }
      if (!countryOfDestination) {
        setCountryOfDestination(p.country.toUpperCase());
      }
    }
  };

  // Handle Final Destination selection
  const handleFinalDestinationChange = (pId: string) => {
    setFinalDestinationId(pId);
    const p = ports.find((item) => item.id === pId);
    if (p) {
      setFinalDestination(`${p.name.toUpperCase()}, ${p.country.toUpperCase()}`);
      setCountryOfDestination(p.country.toUpperCase());
    }
  };

  // Handle Species selection for a line - auto-fills HS Code and trade name
  const handleSpeciesChange = (lineId: string, spId: string) => {
    const found = species.find((s) => s.id === spId);
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              speciesId: spId,
              hsCode: found?.hsCode || '03061790',
              productDescription: l.productDescription || `${found?.name.toUpperCase()} - ${found?.productForm?.toUpperCase() || 'GRADE A'}`
            }
          : l
      )
    );
    if (found?.scientificName && !scientificName) {
      setScientificName(found.scientificName.toUpperCase());
    }
  };

  // Handle Size change
  const handleSizeChange = (lineId: string, szId: string) => {
    const found = sizes.find((s) => s.id === szId);
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, sizeId: szId, gradeSize: found?.name || l.gradeSize } : l))
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
      productDescription: defaultSpecies ? `${defaultSpecies.name.toUpperCase()} - GRADE A` : 'SEAFOOD PRODUCT',
      gradeSize: sizes[0]?.name || '6/8',
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

  // Compute live Amount in Words
  const computedAmountInWords = amountInWordsCustom
    ? amountInWordsCustom
    : `${priceTerms.split(' ')[0].toUpperCase()} ${currency === 'USD' ? 'U.S. DOLLARS' : currency}: ${numberToWordsInternational(totalAmountCurrency)}`;

  // Construct current full invoice state for Word export or submission
  const getCurrentInvoiceDraft = () => {
    return {
      invoiceNo: invoiceNo.trim(),
      invoiceDate,
      consigneeId: consigneeId || 'consignee-temp',
      consigneeName: consigneeName || 'CONSIGNEE',
      consigneeAddress: consigneeAddress || '',
      buyerId: buyerId || undefined,
      buyerName: buyerName || 'N.A.',
      buyerAddress: buyerAddress || '',
      orderNo: orderNo.trim() || undefined,
      orderDate: orderDate || undefined,
      otherReferences: otherReferences.trim() || undefined,
      exporterName: exporterName.trim(),
      exporterAddress: exporterAddress.trim(),
      exporterRef: exporterRef.trim() || invoiceNo.trim(),
      countryOfOrigin: countryOfOrigin.trim(),
      countryOfDestination: countryOfDestination.trim(),
      preCarriageBy: preCarriageBy.trim(),
      placeOfReceipt: placeOfReceipt.trim(),
      termsOfPayment: termsOfPayment.trim(),
      priceTerms: priceTerms.trim(),
      vesselFlightNo: vesselFlightNo.trim(),
      portOfLoadingId: portOfLoadingId || 'pol-temp',
      portOfLoading: portOfLoading.trim(),
      portOfDischargeId: portOfDischargeId || 'pod-temp',
      portOfDischarge: portOfDischarge.trim(),
      finalDestinationId: finalDestinationId || portOfDischargeId || 'dest-temp',
      finalDestination: finalDestination.trim(),
      currency,
      exchangeRate: currentRate,
      remarks: remarks.trim() || undefined,
      commodityDescription: commodityDescription.trim(),
      packingDescription: packingDescription.trim(),
      scientificName: scientificName.trim(),
      shippingMarks: shippingMarks.trim(),
      containerNo: containerNo.trim(),
      sealNo: sealNo.trim(),
      netWeightKg: totalWeightKg,
      grossWeightKg: grossWeightKg !== '' ? Number(grossWeightKg) : Number((totalWeightKg * 1.075).toFixed(3)),
      amountInWords: computedAmountInWords,
      factoryNameAndAddress: factoryNameAndAddress.trim(),
      factoryApprovalNumber: factoryApprovalNumber.trim(),
      billOfLadingNo: billOfLadingNo.trim(),
      declarationText: declarationText.trim(),
      signatoryCompany: signatoryCompany.trim(),
      signatoryDesignation: signatoryDesignation.trim(),
      signatureDate: signatureDate || invoiceDate,
      totalCartons,
      totalWeightKg,
      totalAmountCurrency,
      totalFobValueCurrency,
      estimatedAmountINR,
      lineItems: lines.map((l) => ({
        id: l.id,
        speciesId: l.speciesId,
        hsCode: l.hsCode,
        sizeId: l.sizeId,
        countId: l.countId || undefined,
        productDescription: l.productDescription,
        gradeSize: l.gradeSize,
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
  };

  // Handler for Exporting to Word directly
  const handleExportWord = async () => {
    try {
      setIsExportingWord(true);
      const invoiceData = getCurrentInvoiceDraft();
      await exportInvoiceToWord(invoiceData, businessSettings);
      showToast('Word Document (.docx) generated with exact sample format!', 'success');
    } catch (err: any) {
      console.error('Word export error:', err);
      showToast(`Export failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Check if invoice number is duplicate
  const isDuplicateInvoiceNo =
    invoiceNo.trim() !== '' &&
    salesInvoices.some((inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === invoiceNo.trim().toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consigneeId && !consigneeName) {
      showToast('Validation Error: Please select or enter a Consignee / Customer.', 'error');
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
    const invoicePayload = getCurrentInvoiceDraft();

    const res = addSalesInvoice(invoicePayload as any);
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
    setExporterRef(`EXP-${currentYear}-${nextSeq}`);
    setOrderNo('');
    setRemarks('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto pb-28 animate-fade-in">
      {/* Header Block with prominent Export Word Button */}
      <PageHeader
        title="Commercial Export Invoice Entry"
        subtitle="Complete export particulars matching the official commercial invoice format. Edit and export directly to Word (.docx) with 100% exact alignment."
        breadcrumbs={['Sales', 'New Commercial Invoice']}
        secondaryActions={[
          {
            label: 'Preview Document',
            onClick: () => setIsPreviewOpen(true),
            icon: Eye
          },
          {
            label: isExportingWord ? 'Exporting Word...' : 'Export Word (.docx)',
            onClick: handleExportWord,
            icon: Download
          },
          {
            label: 'Reset Form',
            onClick: handleReset,
            icon: RotateCcw
          }
        ]}
      />

      {/* Duplicate Invoice Warning (non-blocking) */}
      {isDuplicateInvoiceNo && (
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Warning:</strong> An active invoice with number <strong>"{invoiceNo}"</strong> already exists in the system. You may proceed if this is an intentional revision, or modify the invoice number.
          </span>
        </div>
      )}

      {/* SECTION 1: EXPORTER & INVOICE IDENTIFICATION */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-rose-700" />
              1. Exporter / Shipper &amp; Document Identification
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Exporter legal entity, invoice references, PI order details and shipping bill references</p>
          </div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
            Row 1 - 3 Particulars
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* Left Column: Exporter Info */}
          <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-ink-900 uppercase block tracking-wider">
              Exporter / Shipper (Header Left)
            </span>
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Company / Exporter Name</label>
              <input
                type="text"
                value={exporterName}
                onChange={(e) => setExporterName(e.target.value)}
                placeholder="e.g. ABC Pvt. Ltd."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Exporter Address (Multi-line)</label>
              <textarea
                rows={3}
                value={exporterAddress}
                onChange={(e) => setExporterAddress(e.target.value)}
                placeholder="Ambattur Industrial Estate, Ambattur,&#10;Chennai, Tamil Nadu - 600094"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* Right Column: References */}
          <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-ink-900 uppercase block tracking-wider">
              Invoice &amp; Reference Codes (Header Right)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">
                  Invoice No. <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => {
                      setInvoiceNo(e.target.value.toUpperCase());
                      if (!exporterRef || exporterRef === invoiceNo) {
                        setExporterRef(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder="e.g. ABC/EXP/70/26-27"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:border-rose-400"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Exporter's Ref.</label>
                <input
                  type="text"
                  value={exporterRef}
                  onChange={(e) => setExporterRef(e.target.value)}
                  placeholder="Defaults to Invoice No."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Buyer's Order No. (PI No.)</label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="e.g. ABC/087/2026-27"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Buyer's Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 mb-1">Other References (SB No. &amp; Date)</label>
                <input
                  type="text"
                  value={otherReferences}
                  onChange={(e) => setOtherReferences(e.target.value)}
                  placeholder="e.g. SB NO. 7986542  DTD. 24.01.2026"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONSIGNEE & BUYER PARTICULARS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-rose-700" />
              2. Consignee &amp; Buyer (Row 4 - 5)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">International receiver destination and buyer commercial party</p>
          </div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
            Row 4 - 5 Particulars
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* Consignee */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">
                Consignee <span className="text-rose-600">*</span>
              </span>
              <select
                value={consigneeId}
                onChange={(e) => handleConsigneeChange(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none focus:border-rose-400"
              >
                <option value="">Quick select from Master...</option>
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
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Consignee Name</label>
              <input
                type="text"
                value={consigneeName}
                onChange={(e) => setConsigneeName(e.target.value)}
                placeholder="e.g. John Trading Co.,"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Consignee Address (Multi-line)</label>
              <textarea
                rows={3}
                value={consigneeAddress}
                onChange={(e) => setConsigneeAddress(e.target.value)}
                placeholder="498 MOO.8, T. TAIBAN&#10;A. MUANG SAMUTPRAKAN&#10;THAILAND  10280"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* Buyer */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">
                Buyer (if other than consignee)
              </span>
              <select
                value={buyerId}
                onChange={(e) => handleBuyerChange(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-medium outline-none focus:border-rose-400"
              >
                <option value="">N.A. (Same as Consignee)</option>
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
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Buyer Name</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="N.A."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Buyer Address (if applicable)</label>
              <textarea
                rows={3}
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Buyer corporate address (leave empty if N.A.)"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SHIPPING, LOGISTICS & TERMS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Anchor className="w-4 h-4 text-rose-700" />
              3. Shipment Routing, Ports &amp; Terms (Row 5 - 8)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Maritime logistics routing, delivery terms, payment conditions, and forex rate</p>
          </div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
            Row 5 - 8 Particulars
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Country of Origin</label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value.toUpperCase())}
              placeholder="INDIA"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Country of Final Destination</label>
            <input
              type="text"
              value={countryOfDestination}
              onChange={(e) => setCountryOfDestination(e.target.value.toUpperCase())}
              placeholder="e.g. THAILAND"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Pre-carriage By</label>
            <input
              type="text"
              value={preCarriageBy}
              onChange={(e) => setPreCarriageBy(e.target.value.toUpperCase())}
              placeholder="e.g. N.A. or BY ROAD"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Place of Receipt by Pre-carrier</label>
            <input
              type="text"
              value={placeOfReceipt}
              onChange={(e) => setPlaceOfReceipt(e.target.value.toUpperCase())}
              placeholder="e.g. N.A."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Vessel / Flight No.</label>
            <div className="relative">
              <Ship className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={vesselFlightNo}
                onChange={(e) => setVesselFlightNo(e.target.value.toUpperCase())}
                placeholder="e.g. MOGRAL 119W"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port of Loading (POL)
            </label>
            <div className="space-y-1">
              <input
                type="text"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value.toUpperCase())}
                placeholder="COCHIN, INDIA"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <select
                value={portOfLoadingId}
                onChange={(e) => handlePortOfLoadingChange(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] text-ink-500"
              >
                <option value="">Load from Port Master...</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Port of Discharge (POD)</label>
            <div className="space-y-1">
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value.toUpperCase())}
                placeholder="LAEM CHABANG"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <select
                value={portOfDischargeId}
                onChange={(e) => handlePortOfDischargeChange(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] text-ink-500"
              >
                <option value="">Load from Port Master...</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Final Destination</label>
            <div className="space-y-1">
              <input
                type="text"
                value={finalDestination}
                onChange={(e) => setFinalDestination(e.target.value.toUpperCase())}
                placeholder="LAT KRABANG, THAILAND"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <select
                value={finalDestinationId}
                onChange={(e) => handleFinalDestinationChange(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] text-ink-500"
              >
                <option value="">Load from Port Master...</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs pt-1">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Terms of Delivery and Payment (Row 6 Right)
            </label>
            <input
              type="text"
              value={termsOfPayment}
              onChange={(e) => setTermsOfPayment(e.target.value)}
              placeholder="e.g. 100% TT AFTER MAILING THE ORIGINAL DOCUMENTS"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Price Terms (Incoterm &amp; Port)</label>
            <input
              type="text"
              value={priceTerms}
              onChange={(e) => setPriceTerms(e.target.value.toUpperCase())}
              placeholder="e.g. CFR LAT KRABANG"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Invoice Currency</label>
            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SalesCurrency)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CAD">CAD - Canadian Dollar (C$)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="SGD">SGD - Singapore Dollar (S$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Booking Exchange Rate (INR / {currency})</label>
            <input
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g. 84.50"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Internal Reference / Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: CARGO DESCRIPTION & PACKING PARTICULARS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Ship className="w-4 h-4 text-rose-700" />
              4. Commodity Header &amp; Container Specifics (Row 10 &amp; 15)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Commodity title, packing type, scientific name, shipping marks, container and seal numbers</p>
          </div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
            Row 10 &amp; 15 Particulars
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-ink-700 mb-1">COMMODITY Title (Row 10)</label>
            <input
              type="text"
              value={commodityDescription}
              onChange={(e) => setCommodityDescription(e.target.value)}
              placeholder="e.g. 2600 CARTONS OF FROZEN INDIAN MACKEREL - A GRADE & B GRADE- DS"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">PACKING</label>
            <input
              type="text"
              value={packingDescription}
              onChange={(e) => setPackingDescription(e.target.value)}
              placeholder="e.g. 1X10KG"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">SCIENTIFIC NAME</label>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value.toUpperCase())}
              placeholder="e.g. RASTRELLIGER KANAGURTA"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold italic text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">SHIPPING MARK</label>
            <input
              type="text"
              value={shippingMarks}
              onChange={(e) => setShippingMarks(e.target.value.toUpperCase())}
              placeholder="e.g. MERIT D.S"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Container Number (Row 15)</label>
            <input
              type="text"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
              placeholder="e.g. ONEU90399086"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Seal Number (Row 15)</label>
            <input
              type="text"
              value={sealNo}
              onChange={(e) => setSealNo(e.target.value.toUpperCase())}
              placeholder="e.g. IN567892"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Gross Weight (Kg)</label>
            <input
              type="number"
              step="0.001"
              value={grossWeightKg}
              onChange={(e) => setGrossWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g. 27950.000"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: LINE ITEMS & CARGO BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-700" />
              5. Product Lines &amp; Cargo Breakdown ({lines.length} lines)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Description of Goods, Grade/Size, No. of Cartons, Quantity in Kgs, Rate and Line Amounts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
              Rows 11 - 14
            </span>
            <button
              type="button"
              onClick={handleAddLine}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Product Line</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Description of Goods</th>
                <th className="py-2.5 px-3 min-w-[130px]">Grade / Size</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">No. of Cartons</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Quantity (Kgs)</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Rate ({currency}/Kg)</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Amount ({currency})</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">FOB Val</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {computedLines.map((l, idx) => (
                <tr key={l.id} className="hover:bg-rose-50/20">
                  <td className="py-2.5 px-3 text-ink-500 font-bold">{idx + 1}</td>

                  {/* Description of Goods */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={l.productDescription}
                        onChange={(e) => updateLine(l.id, 'productDescription', e.target.value)}
                        placeholder="e.g. FROZEN INDIAN MACKEREL – A GRADE"
                        required
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-rose-400"
                      />
                      <div className="flex items-center gap-1.5">
                        <select
                          value={l.speciesId}
                          onChange={(e) => handleSpeciesChange(l.id, e.target.value)}
                          className="flex-1 min-w-0 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-ink-500"
                        >
                          <option value="">Select Master species...</option>
                          {species.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name} {sp.hsCode ? `[HSN: ${sp.hsCode}]` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5" title="Harmonized System Code (HSN/SAC)">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">HSN:</span>
                          <input
                            type="text"
                            value={l.hsCode}
                            onChange={(e) => updateLine(l.id, 'hsCode', e.target.value)}
                            placeholder="03061790"
                            maxLength={12}
                            className="w-16 bg-transparent text-[10px] font-mono font-bold text-ink-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Grade / Size */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={l.gradeSize}
                        onChange={(e) => updateLine(l.id, 'gradeSize', e.target.value)}
                        placeholder="e.g. 6/8"
                        required
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-rose-400"
                      />
                      <select
                        value={l.sizeId}
                        onChange={(e) => handleSizeChange(l.id, e.target.value)}
                        className="w-full px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-ink-500"
                      >
                        <option value="">Select Master size...</option>
                        {sizes.map((sz) => (
                          <option key={sz.id} value={sz.id}>
                            {sz.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Cartons */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={l.cartonsCount}
                      onChange={(e) => updateLine(l.id, 'cartonsCount', e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-semibold text-xs outline-none focus:border-rose-400"
                    />
                  </td>

                  {/* Net Weight (Kg) */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={l.weightKg}
                      onChange={(e) => updateLine(l.id, 'weightKg', e.target.value)}
                      placeholder="0.000"
                      required
                      className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-bold text-xs outline-none focus:border-rose-400"
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
                      className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right font-bold text-xs outline-none focus:border-rose-400"
                    />
                  </td>

                  {/* Calculated Amount */}
                  <td className="py-2 px-3 text-right font-extrabold text-ink-900 tabular-nums">
                    {l.computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* FOB Value */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={l.fobValueCurrency !== '' ? l.fobValueCurrency : ''}
                      onChange={(e) => updateLine(l.id, 'fobValueCurrency', e.target.value)}
                      placeholder={String(l.computedAmount)}
                      className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-right text-xs outline-none focus:border-rose-400 font-semibold"
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
            <tfoot>
              <tr className="bg-rose-50/50 font-bold border-t border-gray-200 text-ink-900">
                <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-rose-800">
                  TOTAL (Row 14)
                </td>
                <td className="py-2.5 px-3 text-right">{totalCartons}</td>
                <td className="py-2.5 px-3 text-right">{totalWeightKg.toFixed(3)} Kgs</td>
                <td className="py-2.5 px-3 text-right">-</td>
                <td className="py-2.5 px-3 text-right text-rose-950 font-black text-sm">
                  {currency} {totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right">{totalFobValueCurrency.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 6: AMOUNT IN WORDS, FACTORY & SIGNATORY */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              6. Words, Factory Details &amp; Signatory Block (Rows 16 - 18)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Amount chargeable in words, factory approval number, B/L number, statutory declaration and official stamp</p>
          </div>
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
            Rows 16 - 18 Particulars
          </span>
        </div>

        {/* Amount in Words */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-ink-700">
              Amount Chargeable in Words (Row 16)
            </label>
            <button
              type="button"
              onClick={() => setAmountInWordsCustom('')}
              className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Reset to Auto-generated Words
            </button>
          </div>
          <input
            type="text"
            value={amountInWordsCustom || computedAmountInWords}
            onChange={(e) => setAmountInWordsCustom(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs pt-1">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              PROCESSED &amp; PACKED BY (Row 17)
            </label>
            <input
              type="text"
              value={factoryNameAndAddress}
              onChange={(e) => setFactoryNameAndAddress(e.target.value)}
              placeholder="e.g. ABC Pvt. Ltd., Ambattur Industrial Estate, Ambattur, Chennai, Tamil Nadu - 600094"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">APPROVAL NUMBER OF THE FACTORY</label>
            <input
              type="text"
              value={factoryApprovalNumber}
              onChange={(e) => setFactoryApprovalNumber(e.target.value)}
              placeholder="e.g. 9085"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs pt-1">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">BILL OF LADING NUMBER</label>
            <input
              type="text"
              value={billOfLadingNo}
              onChange={(e) => setBillOfLadingNo(e.target.value)}
              placeholder="e.g. WHLCOCH260199 (leave blank if pending)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Declaration Statement (Row 18)</label>
            <input
              type="text"
              value={declarationText}
              onChange={(e) => setDeclarationText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        {/* Signatory & Stamp Image Toggle */}
        <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
          <span className="text-[11px] font-bold text-ink-900 uppercase block tracking-wider">
            Signatory Block &amp; Official Seal
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Signatory Entity</label>
              <input
                type="text"
                value={signatoryCompany}
                onChange={(e) => setSignatoryCompany(e.target.value)}
                placeholder="For RELISH FOODS"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Designation</label>
              <input
                type="text"
                value={signatoryDesignation}
                onChange={(e) => setSignatoryDesignation(e.target.value)}
                placeholder="Partner / Director / Authorised Signatory"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Signature Date</label>
              <input
                type="date"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-xs outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <Eye className="w-3.5 h-3.5 text-rose-700" />
              <span>Preview Word Document</span>
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExportingWord}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingWord ? 'Exporting Word...' : 'Download Word Document (.docx)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Sticky Save Bar with live calculated metrics */}
      <StickySaveBar
        primaryLabel={isSubmitting ? 'Saving Invoice...' : 'Save Commercial Invoice'}
        secondaryLabel="Reset Form"
        onSecondary={handleReset}
        isSubmitting={isSubmitting}
        metrics={[
          {
            label: 'Total Cartons',
            value: `${totalCartons} ctn`
          },
          {
            label: 'Total Weight',
            value: formatKg(totalWeightKg)
          },
          {
            label: `Total FOB (${currency})`,
            value: `${currency} ${totalFobValueCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          },
          {
            label: `Total (${currency})`,
            value: `${currency} ${totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          },
          {
            label: 'Est. INR Realization',
            value: formatINR(estimatedAmountINR),
            highlight: true
          }
        ]}
      />
      {/* Export Word Replica Preview Modal */}
      <ExportInvoicePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoice={getCurrentInvoiceDraft()}
        settings={businessSettings}
      />
    </form>
  );
};
