import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SalesCurrency, Species, Size } from '../../types';
import { formatKg, deriveCommodityTitle, deriveScientificName, deriveHsnCode } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { StickySaveBar } from '../common/StickySaveBar';
import { exportInvoiceToWord, numberToWordsInternational } from '../../utils/exportWordInvoice';
import { ExportInvoicePreviewModal } from './ExportInvoicePreviewModal';
import { ProductCombobox } from './ProductCombobox';
import { SizeCombobox } from './SizeCombobox';
import { CustomerCombobox } from './CustomerCombobox';
import { PortCombobox } from './PortCombobox';
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
  ShieldAlert,
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
}

export interface SalesInvoiceEntryFormProps {
  onSuccess?: () => void;
  editingInvoiceId?: string | null;
  onCancelEdit?: () => void;
}

export const SalesInvoiceEntryForm: React.FC<SalesInvoiceEntryFormProps> = ({
  onSuccess,
  editingInvoiceId,
  onCancelEdit
}) => {
  const { customers, ports, species, salesSizes, salesInvoices, businessSettings, addSalesInvoice, updateSalesInvoice } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const invoiceToEdit = editingInvoiceId ? salesInvoices.find((i) => i.id === editingInvoiceId) : null;
  const isEditing = Boolean(invoiceToEdit);

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Audit reason state for editing previous invoice
  const [editReason, setEditReason] = useState('');

  // --- Section 1: Exporter & Document Identification ---
  const [exporterName, setExporterName] = useState(businessSettings.businessName || '');
  const [exporterAddress, setExporterAddress] = useState(businessSettings.address || '');
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
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');

  // --- Section 3: Shipping, Logistics & Valuation ---
  const [countryOfOrigin, setCountryOfOrigin] = useState('INDIA');
  const [countryOfDestination, setCountryOfDestination] = useState('');
  const [preCarriageBy, setPreCarriageBy] = useState('');
  const [placeOfReceipt, setPlaceOfReceipt] = useState('');
  const [termsOfPayment, setTermsOfPayment] = useState('');
  const [priceTerms, setPriceTerms] = useState('');
  const [vesselFlightNo, setVesselFlightNo] = useState('');
  const [portOfLoadingId, setPortOfLoadingId] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfDischargeId, setPortOfDischargeId] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');
  const [finalDestinationId, setFinalDestinationId] = useState('');
  const [finalDestination, setFinalDestination] = useState('');
  const [currency, setCurrency] = useState<SalesCurrency>('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [advanceReceived, setAdvanceReceived] = useState('');
  const [advanceReceivedDate, setAdvanceReceivedDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // --- Section 4: Cargo & Packaging Summary ---
  const [commodityDescription, setCommodityDescription] = useState('');
  const [isCommodityManual, setIsCommodityManual] = useState(false);
  const [packingDescription, setPackingDescription] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [isScientificManual, setIsScientificManual] = useState(false);
  const [hsnCode, setHsnCode] = useState('');
  const [isHsnManual, setIsHsnManual] = useState(false);
  const [shippingMarks, setShippingMarks] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [sealNo, setSealNo] = useState('');
  const [grossWeightKg, setGrossWeightKg] = useState<number | ''>('');

  // --- Section 5: Line Items ---
  // Helper to create a clean, blank line item (never defaulting to Vannamei Shrimps)
  const createBlankLine = (index = 0): LineItemDraft => ({
    id: `line-${Date.now()}-${index}`,
    speciesId: '',
    hsCode: '',
    sizeId: '',
    countId: '',
    productDescription: '',
    gradeSize: '',
    cartonsCount: '',
    weightKg: '',
    ratePerKg: ''
  });

  const [lines, setLines] = useState<LineItemDraft[]>([
    {
      id: 'line-init-1',
      speciesId: '',
      hsCode: '',
      sizeId: '',
      countId: '',
      productDescription: '',
      gradeSize: '',
      cartonsCount: '',
      weightKg: '',
      ratePerKg: ''
    }
  ]);

  // --- Section 5B: Commercial FOB Valuation (Invoice-Level Single Item) ---
  const [totalFobValueINR, setTotalFobValueINR] = useState<number | ''>('');
  const [totalFobValueCurrencyInput, setTotalFobValueCurrencyInput] = useState<number | ''>('');

  // --- Section 6: Factory, Statutory Declaration & Signatory ---
  const [amountInWordsCustom, setAmountInWordsCustom] = useState('');
  const [factoryNameAndAddress, setFactoryNameAndAddress] = useState(
    businessSettings.businessName && businessSettings.address ? `${businessSettings.businessName}, ${businessSettings.address}` : ''
  );
  const [factoryApprovalNumber, setFactoryApprovalNumber] = useState('');
  const [billOfLadingNo, setBillOfLadingNo] = useState('');
  const [declarationText, setDeclarationText] = useState(
    'We certify that this invoice shows the actual price of the goods described and that all particulars are true and correct'
  );
  const [signatoryCompany, setSignatoryCompany] = useState(
    businessSettings.businessName ? `For ${businessSettings.businessName}` : ''
  );
  const [signatoryDesignation, setSignatoryDesignation] = useState('');
  const [signatureDate, setSignatureDate] = useState(today);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auto-generate invoice sequential number & pre-select defaults for new invoice
  useEffect(() => {
    if (editingInvoiceId) return;
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
      setFactoryNameAndAddress(businessSettings.businessName && businessSettings.address ? `${businessSettings.businessName}, ${businessSettings.address}` : '');
    }
  }, [salesInvoices.length, currentYear, businessSettings, editingInvoiceId]);

  // Load invoice data when editing a previous invoice
  useEffect(() => {
    if (!invoiceToEdit) return;
    setInvoiceNo(invoiceToEdit.invoiceNo);
    setInvoiceDate(invoiceToEdit.invoiceDate || today);
    setExporterName(invoiceToEdit.exporterName || businessSettings.businessName || '');
    setExporterAddress(invoiceToEdit.exporterAddress || businessSettings.address || '');
    setExporterRef(invoiceToEdit.exporterRef || invoiceToEdit.invoiceNo);
    setOrderNo(invoiceToEdit.orderNo || '');
    setOrderDate(invoiceToEdit.orderDate || invoiceToEdit.invoiceDate || today);
    setOtherReferences(invoiceToEdit.otherReferences || '');

    setConsigneeId(invoiceToEdit.consigneeId || '');
    setConsigneeName(invoiceToEdit.consigneeName || '');
    setConsigneeAddress(invoiceToEdit.consigneeAddress || '');
    setBuyerId(invoiceToEdit.buyerId || '');
    setBuyerName(invoiceToEdit.buyerName || '');
    setBuyerAddress(invoiceToEdit.buyerAddress || '');

    setCountryOfOrigin(invoiceToEdit.countryOfOrigin || 'INDIA');
    setCountryOfDestination(invoiceToEdit.countryOfDestination || '');
    setPreCarriageBy(invoiceToEdit.preCarriageBy || '');
    setPlaceOfReceipt(invoiceToEdit.placeOfReceipt || '');
    setTermsOfPayment(invoiceToEdit.termsOfPayment || '');
    setPriceTerms(invoiceToEdit.priceTerms || '');
    setVesselFlightNo(invoiceToEdit.vesselFlightNo || '');
    setPortOfLoadingId(invoiceToEdit.portOfLoadingId || '');
    setPortOfLoading(invoiceToEdit.portOfLoading || '');
    setPortOfDischargeId(invoiceToEdit.portOfDischargeId || '');
    setPortOfDischarge(invoiceToEdit.portOfDischarge || '');
    setFinalDestinationId(invoiceToEdit.finalDestinationId || '');
    setFinalDestination(invoiceToEdit.finalDestination || '');
    setCurrency(invoiceToEdit.currency || 'USD');
    setExchangeRate(
      invoiceToEdit.bankPreDeterminedExchangeRate !== undefined && invoiceToEdit.bankPreDeterminedExchangeRate !== null
        ? String(invoiceToEdit.bankPreDeterminedExchangeRate)
        : (invoiceToEdit.exchangeRate ? String(invoiceToEdit.exchangeRate) : '')
    );
    setAdvanceReceived(invoiceToEdit.advanceReceivedCurrency ? String(invoiceToEdit.advanceReceivedCurrency) : '');
    setAdvanceReceivedDate(invoiceToEdit.advanceReceivedDate || '');
    setRemarks(invoiceToEdit.remarks || '');

    setCommodityDescription(invoiceToEdit.commodityDescription || '');
    setIsCommodityManual(Boolean(invoiceToEdit.commodityDescription));
    setPackingDescription(invoiceToEdit.packingDescription || '');
    setScientificName(invoiceToEdit.scientificName || '');
    setIsScientificManual(Boolean(invoiceToEdit.scientificName));
    setHsnCode(invoiceToEdit.hsnCode || '');
    setIsHsnManual(Boolean(invoiceToEdit.hsnCode));
    setShippingMarks(invoiceToEdit.shippingMarks || '');
    setContainerNo(invoiceToEdit.containerNo || '');
    setSealNo(invoiceToEdit.sealNo || '');
    setGrossWeightKg(invoiceToEdit.grossWeightKg !== undefined ? invoiceToEdit.grossWeightKg : '');

    if (invoiceToEdit.lineItems && invoiceToEdit.lineItems.length > 0) {
      setLines(
        invoiceToEdit.lineItems.map((li, idx) => ({
          id: li.id || `line-${Date.now()}-${idx}`,
          speciesId: li.speciesId || '',
          hsCode: li.hsCode || '',
          sizeId: li.sizeId || '',
          countId: li.countId || '',
          productDescription: li.productDescription || '',
          gradeSize: li.gradeSize || '',
          cartonsCount: li.cartonsCount !== undefined ? li.cartonsCount : '',
          weightKg: li.weightKg !== undefined ? li.weightKg : '',
          ratePerKg: li.ratePerKg !== undefined ? li.ratePerKg : ''
        }))
      );
    }

    setTotalFobValueINR(invoiceToEdit.totalFobValueINR !== undefined ? invoiceToEdit.totalFobValueINR : '');
    setTotalFobValueCurrencyInput(invoiceToEdit.totalFobValueCurrency !== undefined ? invoiceToEdit.totalFobValueCurrency : '');

    setFactoryNameAndAddress(
      invoiceToEdit.factoryNameAndAddress ||
        (businessSettings.businessName && businessSettings.address ? `${businessSettings.businessName}, ${businessSettings.address}` : '')
    );
    setFactoryApprovalNumber(invoiceToEdit.factoryApprovalNumber || '');
    setBillOfLadingNo(invoiceToEdit.billOfLadingNo || '');
    setDeclarationText(
      invoiceToEdit.declarationText ||
        'We certify that this invoice shows the actual price of the goods described and that all particulars are true and correct'
    );
    setSignatoryCompany(
      invoiceToEdit.signatoryCompany || (businessSettings.businessName ? `For ${businessSettings.businessName}` : '')
    );
    setSignatoryDesignation(invoiceToEdit.signatoryDesignation || '');
    setSignatureDate(invoiceToEdit.signatureDate || today);
    setEditReason('');
  }, [invoiceToEdit, today, businessSettings]);

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

  // Handle Species selection for a line - auto-fills HS Code, trade name, commodity title & scientific name
  const handleSpeciesChange = (lineId: string, sp: Species | null) => {
    let nextLines: LineItemDraft[] = [];
    if (!sp) {
      nextLines = lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              speciesId: '',
              hsCode: '',
              productDescription: ''
            }
          : l
      );
    } else {
      nextLines = lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              speciesId: sp.id,
              hsCode: sp.hsCode || l.hsCode || '',
              productDescription: l.productDescription.trim() ? l.productDescription : sp.name.toUpperCase()
            }
          : l
      );
    }

    setLines(nextLines);

    // Automatically derive commodity title, scientific name & HSN code
    if (!isCommodityManual || !commodityDescription.trim()) {
      setCommodityDescription(deriveCommodityTitle(nextLines, species));
    }
    if (!isScientificManual || !scientificName.trim()) {
      setScientificName(deriveScientificName(nextLines, species));
    }
    if (!isHsnManual || !hsnCode.trim()) {
      setHsnCode(deriveHsnCode(nextLines, species));
    }
  };

  // Handle Size change
  const handleSizeChange = (lineId: string, sz: Size | null) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              sizeId: sz ? sz.id : '',
              gradeSize: sz?.name ? sz.name : (sz === null ? '' : l.gradeSize)
            }
          : l
      )
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, createBlankLine(prev.length)]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (lines.length <= 1) {
      showToast('At least one product line item is required.', 'warning');
      return;
    }
    const nextLines = lines.filter((l) => l.id !== lineId);
    setLines(nextLines);
    if (!isCommodityManual || !commodityDescription.trim()) {
      setCommodityDescription(deriveCommodityTitle(nextLines, species));
    }
    if (!isScientificManual || !scientificName.trim()) {
      setScientificName(deriveScientificName(nextLines, species));
    }
    if (!isHsnManual || !hsnCode.trim()) {
      setHsnCode(deriveHsnCode(nextLines, species));
    }
  };

  const updateLine = (lineId: string, field: keyof LineItemDraft, val: any) => {
    const nextLines = lines.map((l) => (l.id === lineId ? { ...l, [field]: val } : l));
    setLines(nextLines);

    if (field === 'cartonsCount' || field === 'productDescription') {
      if (!isCommodityManual || !commodityDescription.trim()) {
        setCommodityDescription(deriveCommodityTitle(nextLines, species));
      }
    }
    if (field === 'hsCode') {
      if (!isHsnManual || !hsnCode.trim()) {
        setHsnCode(deriveHsnCode(nextLines, species));
      }
    }
  };

  // Live Server-Style Totals Calculation
  const computedLines = lines.map((l) => {
    const w = parseFloat(String(l.weightKg)) || 0;
    const r = parseFloat(String(l.ratePerKg)) || 0;
    const amt = Number((w * r).toFixed(2));
    return {
      ...l,
      computedAmount: amt
    };
  });

  const totalCartons = lines.reduce((s, l) => s + (parseInt(String(l.cartonsCount)) || 0), 0);
  const totalWeightKg = Number(lines.reduce((s, l) => s + (parseFloat(String(l.weightKg)) || 0), 0).toFixed(2));
  const totalAmountCurrency = Number(computedLines.reduce((s, l) => s + l.computedAmount, 0).toFixed(2));
  const parsedRate = exchangeRate.trim() !== '' ? parseFloat(exchangeRate) : undefined;
  const currentRate = parsedRate !== undefined && !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : undefined;
  const estimatedAmountINR = currentRate ? Number((totalAmountCurrency * currentRate).toFixed(2)) : 0;

  // Invoice-Level Commercial FOB Valuation (Single Item)
  const finalFobUSD = totalFobValueCurrencyInput !== ''
    ? (parseFloat(String(totalFobValueCurrencyInput)) || 0)
    : totalAmountCurrency;

  const finalFobINR = totalFobValueINR !== ''
    ? (parseFloat(String(totalFobValueINR)) || 0)
    : (currentRate ? Number((finalFobUSD * currentRate).toFixed(2)) : 0);

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
      exchangeRate: currentRate || 0,
      bankPreDeterminedExchangeRate: currentRate,
      advanceReceivedCurrency: parseFloat(advanceReceived) > 0 ? parseFloat(advanceReceived) : undefined,
      advanceReceivedDate: parseFloat(advanceReceived) > 0 ? (advanceReceivedDate || invoiceDate) : undefined,
      remarks: remarks.trim() || undefined,
      commodityDescription: commodityDescription.trim(),
      packingDescription: packingDescription.trim(),
      scientificName: scientificName.trim(),
      hsnCode: hsnCode.trim() || undefined,
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
      totalFobValueCurrency: finalFobUSD,
      totalFobValueINR: finalFobINR,
      estimatedAmountINR,
      lineItems: lines.map((l) => {
        const w = parseFloat(String(l.weightKg)) || 0;
        const r = parseFloat(String(l.ratePerKg)) || 0;
        const lineAmt = Number((w * r).toFixed(2));
        const ratio = totalAmountCurrency > 0 ? (lineAmt / totalAmountCurrency) : (lines.length > 0 ? 1 / lines.length : 1);
        return {
          id: l.id,
          speciesId: l.speciesId,
          hsCode: l.hsCode,
          sizeId: l.sizeId,
          countId: l.countId || undefined,
          productDescription: l.productDescription,
          gradeSize: l.gradeSize,
          cartonsCount: parseInt(String(l.cartonsCount)) || 0,
          weightKg: w,
          ratePerKg: r,
          amountCurrency: lineAmt,
          fobValueCurrency: Number((finalFobUSD * ratio).toFixed(2)),
          fobValueINR: Number((finalFobINR * ratio).toFixed(2))
        };
      })
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
    !isEditing &&
    invoiceNo.trim() !== '' &&
    salesInvoices.some((inv) => !inv.isVoided && inv.invoiceNo.toLowerCase() === invoiceNo.trim().toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && invoiceToEdit) {
      if (currentUser.role !== 'admin') {
        showToast('Unauthorized: Only Admin accounts can edit previous invoices.', 'error');
        return;
      }
      if (!editReason.trim()) {
        showToast('Mandatory: Please provide a reason for editing this invoice.', 'error');
        return;
      }
    }

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

    if (isEditing && invoiceToEdit) {
      const res = updateSalesInvoice(invoiceToEdit.id, invoicePayload as any, editReason.trim());
      setIsSubmitting(false);
      if (res.success) {
        if (onSuccess) {
          onSuccess();
        }
      }
      return;
    }

    const res = addSalesInvoice(invoicePayload as any);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleReset = () => {
    if (isEditing) {
      if (onCancelEdit) onCancelEdit();
      return;
    }
    const nextSeq = String(salesInvoices.length + 1).padStart(4, '0');
    setInvoiceNo(`EXP-${currentYear}-${nextSeq}`);
    setInvoiceDate(today);
    setExporterRef(`EXP-${currentYear}-${nextSeq}`);
    setOrderNo('');
    setRemarks('');
    setExchangeRate('');
    setCommodityDescription('');
    setIsCommodityManual(false);
    setScientificName('');
    setIsScientificManual(false);
    setHsnCode('');
    setIsHsnManual(false);
    setTotalFobValueINR('');
    setTotalFobValueCurrencyInput('');
    setLines([createBlankLine(0)]);
  };

  // Guard: If editing a previous invoice, non-admins are blocked
  if (isEditing && currentUser.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm my-8">
        <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-ink-900">Admin Authority Required</h3>
        <p className="text-xs text-ink-600 leading-relaxed">
          Only System Administrator accounts have authority to edit previously issued commercial invoices. Your current role is <strong>{currentUser.role.replace('_', ' ').toUpperCase()}</strong>.
        </p>
        {onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Return to Invoices List
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto pb-28 animate-fade-in">
      {/* Header Block with prominent Export Word Button */}
      <PageHeader
        title={isEditing ? `Edit Commercial Invoice — ${invoiceToEdit?.invoiceNo}` : 'Commercial Export Invoice Entry'}
        subtitle={
          isEditing
            ? `Admin Authority Mode • Modify existing commercial invoice with mandatory surveillance audit reason`
            : 'Complete export particulars matching the official commercial invoice format. Edit and export directly to Word (.docx) with 100% exact alignment.'
        }
        breadcrumbs={isEditing ? ['Sales', 'Invoices', `Edit ${invoiceToEdit?.invoiceNo}`] : ['Sales', 'New Commercial Invoice']}
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
          ...(isEditing && onCancelEdit
            ? [
                {
                  label: 'Cancel Edit',
                  onClick: onCancelEdit,
                  icon: RotateCcw
                }
              ]
            : [
                {
                  label: 'Reset Form',
                  onClick: handleReset,
                  icon: RotateCcw
                }
              ])
        ]}
      />

      {/* Admin Edit Mode Banner & Mandatory Audit Reason */}
      {isEditing && invoiceToEdit && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                    Admin Authority Mode
                  </span>
                  <span className="text-sm font-bold text-ink-900">
                    Modifying Previous Invoice: <span className="font-mono text-rose-700 font-extrabold">{invoiceToEdit.invoiceNo}</span>
                  </span>
                </div>
                <p className="text-xs text-ink-600 mt-0.5">
                  Logged in as <strong>{currentUser.name}</strong> ({currentUser.email} • {currentUser.role.toUpperCase()}). All modifications are recorded in the surveillance audit log.
                </p>
              </div>
            </div>
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-ink-700 text-xs font-bold rounded-xl border border-gray-300 transition shrink-0"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="p-4 bg-rose-50/70 border-2 border-rose-300 rounded-2xl shadow-xs">
            <label className="block text-xs font-black text-rose-950 mb-1">
              Audit Reason for Editing Previous Invoice <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="e.g. Corrected consignee delivery address and adjusted cartons per final shipping advice"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
            />
            <p className="text-[11px] text-rose-700 mt-1.5 flex items-center gap-1.5 font-medium">
              <span>* Mandatory field: As an administrator, you must provide a reason to modify previous commercial invoices.</span>
            </p>
          </div>
        </div>
      )}

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider shrink-0">
                Consignee <span className="text-rose-600">*</span>
              </span>
              <CustomerCombobox
                value={consigneeId}
                customerList={customers.filter((c) => c.active)}
                onChange={(c) => handleConsigneeChange(c ? c.id : '')}
                placeholder="Quick select from Customer Master..."
              />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider shrink-0">
                Buyer (if other than consignee)
              </span>
              <CustomerCombobox
                value={buyerId}
                customerList={customers.filter((c) => c.active)}
                onChange={(c) => handleBuyerChange(c ? c.id : '')}
                placeholder="Select Buyer..."
                allowNoneOption
                noneOptionLabel="N.A. (Same as Consignee)"
              />
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
            <div className="space-y-1.5">
              <input
                type="text"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value.toUpperCase())}
                placeholder="COCHIN, INDIA"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <PortCombobox
                value={portOfLoadingId}
                portList={ports}
                onChange={(p) => handlePortOfLoadingChange(p ? p.id : '')}
                placeholder="Load from Port Master..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Port of Discharge (POD)</label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value.toUpperCase())}
                placeholder="LAEM CHABANG"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <PortCombobox
                value={portOfDischargeId}
                portList={ports}
                onChange={(p) => handlePortOfDischargeChange(p ? p.id : '')}
                placeholder="Load from Port Master..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Final Destination</label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={finalDestination}
                onChange={(e) => setFinalDestination(e.target.value.toUpperCase())}
                placeholder="LAT KRABANG, THAILAND"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
              />
              <PortCombobox
                value={finalDestinationId}
                portList={ports}
                onChange={(p) => handleFinalDestinationChange(p ? p.id : '')}
                placeholder="Load from Port Master..."
              />
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
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Pre-determined Bank Exchange Rate (INR / {currency}) <span className="text-ink-400 font-normal text-[10px]">(Optional)</span>
            </label>
            <input
              type="number"
              step="any"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g. 84.50 (Optional)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
            <span className="text-[10px] text-ink-500 mt-1 block">Optional agreed rate booked with bank for this invoice</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Advance Received ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={advanceReceived}
              onChange={(e) => setAdvanceReceived(e.target.value)}
              placeholder="Optional upfront deposit"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
            {parseFloat(advanceReceived) > 0 && (
              <div className="mt-1 p-1.5 bg-blue-50/90 rounded-lg border border-blue-200 text-[10px] text-blue-950 flex flex-col gap-0.5">
                <span className="font-semibold">
                  Advance: {currency} {parseFloat(advanceReceived).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({((parseFloat(advanceReceived) / (totalAmountCurrency || 1)) * 100).toFixed(1)}%)
                </span>
                <span className="font-bold text-rose-700">
                  Direct Outstanding: {currency} {Math.max(0, totalAmountCurrency - (parseFloat(advanceReceived) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Date of Receiving Advance</label>
            <input
              type="date"
              value={advanceReceivedDate}
              onChange={(e) => setAdvanceReceivedDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-ink-700">COMMODITY Title (Row 10)</label>
              <button
                type="button"
                onClick={() => {
                  setIsCommodityManual(false);
                  setCommodityDescription(deriveCommodityTitle(lines, species));
                }}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Auto-fill commodity title from entered items"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill from items
              </button>
            </div>
            <input
              type="text"
              value={commodityDescription}
              onChange={(e) => {
                setCommodityDescription(e.target.value);
                setIsCommodityManual(e.target.value.trim().length > 0);
              }}
              placeholder="e.g. 481 CARTONS FROZEN SQUID SEMI NEEDLE WHOLE-A GRADE & 1519 CARTONS FROZEN LOLIGO SQUID WHOLE-A GRADE"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-ink-700">SCIENTIFIC NAME</label>
              <button
                type="button"
                onClick={() => {
                  setIsScientificManual(false);
                  setScientificName(deriveScientificName(lines, species));
                }}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Fetch scientific names from product master"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill from master
              </button>
            </div>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => {
                setScientificName(e.target.value.toUpperCase());
                setIsScientificManual(e.target.value.trim().length > 0);
              }}
              placeholder="e.g. UROTEUTHIS DUVAUCELII"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold italic text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-ink-700">HSN / ITC (HS) CODE (Terms of Delivery & Payment)</label>
              <button
                type="button"
                onClick={() => {
                  setIsHsnManual(false);
                  setHsnCode(deriveHsnCode(lines, species));
                }}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Fetch HSN / ITC codes from line items & product master"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill from master
              </button>
            </div>
            <input
              type="text"
              value={hsnCode}
              onChange={(e) => {
                setHsnCode(e.target.value.toUpperCase());
                setIsHsnManual(e.target.value.trim().length > 0);
              }}
              placeholder="e.g. 03074310"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Net Weight (Kg) (Auto-computed)</label>
            <input
              type="text"
              value={totalWeightKg > 0 ? `${totalWeightKg.toFixed(3)} Kgs` : ''}
              readOnly
              placeholder="0.000 Kgs"
              className="w-full px-3 py-2 bg-gray-100/70 border border-gray-200 rounded-xl font-bold text-xs text-ink-700 outline-none"
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

        <div className="overflow-x-auto min-h-[380px] rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[320px]">Description of Goods</th>
                <th className="py-2.5 px-3 min-w-[180px]">Grade / Size</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">No. of Cartons</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Quantity (Kgs)</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Rate ({currency}/Kg)</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Amount ({currency})</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {computedLines.map((l, idx) => (
                <tr key={l.id} className="hover:bg-rose-50/20">
                  <td className="py-2.5 px-3 text-ink-500 font-bold">{idx + 1}</td>

                  {/* Description of Goods */}
                  <td className="py-2 px-3">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={l.productDescription}
                        onChange={(e) => updateLine(l.id, 'productDescription', e.target.value)}
                        placeholder="e.g. FROZEN RIBBONFISH B GRADE"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      />
                      <div className="flex items-center gap-1.5">
                        <ProductCombobox
                          value={l.speciesId}
                          speciesList={species}
                          onChange={(sp) => handleSpeciesChange(l.id, sp)}
                          placeholder="Search & select commercial product..."
                        />
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 shrink-0" title="Harmonized System Code (HSN/SAC)">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">HSN:</span>
                          <input
                            type="text"
                            value={l.hsCode}
                            onChange={(e) => updateLine(l.id, 'hsCode', e.target.value)}
                            placeholder="03038930"
                            maxLength={12}
                            className="w-20 bg-transparent text-[11px] font-mono font-bold text-ink-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Grade / Size */}
                  <td className="py-2 px-3">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={l.gradeSize}
                        onChange={(e) => updateLine(l.id, 'gradeSize', e.target.value)}
                        placeholder="e.g. 6/8"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      />
                      <SizeCombobox
                        value={l.sizeId}
                        sizeList={salesSizes}
                        onChange={(sz) => handleSizeChange(l.id, sz)}
                        placeholder="Select Grade / Size..."
                      />
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
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 5B: COMMERCIAL FOB VALUATION (INVOICE-LEVEL SINGLE ITEM) */}
      <div className="bg-gradient-to-br from-white to-rose-50/20 rounded-2xl border border-rose-100 p-6 shadow-xs space-y-5">
        <div className="border-b border-rose-100/60 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-700" />
              6. Commercial FOB Valuation (Invoice Total)
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Single invoice-level Free On Board (FOB) valuation required for shipping bills, export customs declaration, and bank realization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200">
              Commercial Export Valuation
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total FOB Value in INR (₹) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="block text-[11px] font-bold text-ink-800">
                  TOTAL FOB VALUE IN INR (₹) <span className="text-rose-600">*</span>
                </label>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-extrabold uppercase">
                  Shown in Invoice (Terms of Delivery & Payment)
                </span>
              </div>
              {currentRate && (
                <button
                  type="button"
                  onClick={() => {
                    const usd = totalFobValueCurrencyInput !== '' ? parseFloat(String(totalFobValueCurrencyInput)) || 0 : totalAmountCurrency;
                    const calculatedInr = Number((usd * currentRate).toFixed(2));
                    setTotalFobValueINR(calculatedInr);
                  }}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Auto-calculate INR FOB at current exchange rate"
                >
                  <Sparkles className="w-3 h-3" /> Convert at ₹{currentRate.toFixed(2)}
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalFobValueINR}
                onChange={(e) => {
                  setTotalFobValueINR(e.target.value === '' ? '' : parseFloat(e.target.value) || 0);
                }}
                placeholder={
                  currentRate
                    ? (finalFobUSD * currentRate).toFixed(2)
                    : 'Enter Total FOB Value in INR'
                }
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
              <span className="text-ink-500 font-medium">INR Formatted Valuation:</span>
              <span className="font-extrabold text-ink-900 font-mono">
                ₹ {finalFobINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-ink-400 leading-tight">
              Displayed under 'Terms of delivery and payment' in invoice preview and Word document for Indian Customs & DGFT declarations.
            </p>
          </div>

          {/* Total FOB Value in USD ($) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="block text-[11px] font-bold text-ink-800">
                  TOTAL FOB VALUE IN USD ($) <span className="text-rose-600">*</span>
                </label>
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-extrabold uppercase">
                  FOB Dashboard Only
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTotalFobValueCurrencyInput(totalAmountCurrency);
                }}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Match FOB Value to Invoice Amount"
              >
                <RotateCcw className="w-3 h-3" /> Match Invoice Total
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalFobValueCurrencyInput}
                onChange={(e) => {
                  setTotalFobValueCurrencyInput(e.target.value === '' ? '' : parseFloat(e.target.value) || 0);
                }}
                placeholder={totalAmountCurrency.toFixed(2)}
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
              <span className="text-ink-500 font-medium">FOB Dashboard USD Total:</span>
              <span className="font-extrabold text-emerald-700 font-mono">
                USD ${finalFobUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-ink-400 leading-tight">
              Tracked in FOB Dashboard for vessel profitability, currency metrics, and realization analysis. Excluded from commercial export invoice.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 7: AMOUNT IN WORDS, FACTORY & SIGNATORY */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              7. Words, Factory Details &amp; Signatory Block (Rows 16 - 18)
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
        primaryLabel={
          isSubmitting
            ? isEditing ? 'Saving Changes...' : 'Saving Invoice...'
            : isEditing ? 'Save Changes (Admin)' : 'Save Commercial Invoice'
        }
        secondaryLabel={isEditing ? 'Cancel Edit' : 'Reset Form'}
        onSecondaryClick={isEditing ? onCancelEdit : handleReset}
        onSecondary={isEditing ? onCancelEdit : handleReset}
        isSubmitting={isSubmitting}
        statusMessage={isEditing ? `Admin Mode: ${currentUser.name} • Mandatory reason required` : undefined}
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
            value: `${currency} ${finalFobUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          },
          {
            label: 'Total FOB (INR)',
            value: `₹ ${finalFobINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          },
          {
            label: `Total (${currency})`,
            value: `${currency} ${totalAmountCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          },
          {
            label: 'Forward Booking',
            value: exchangeRate ? `₹${exchangeRate} / ${currency}` : 'Optional / Not Booked',
            highlight: Boolean(exchangeRate)
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
