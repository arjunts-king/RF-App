import * as XLSX from 'xlsx';
import type {
  SalesInvoice,
  SalesInvoiceLine,
  Customer,
  PortMaster,
  Species,
  Size,
  Count,
  BusinessSettings
} from '../types/index.ts';
import { convertToCSV, downloadFile } from './exportUtils.ts';

export interface ExportSalesInvoicesParams {
  invoices: SalesInvoice[];
  customers?: Customer[];
  ports?: PortMaster[];
  species?: Species[];
  sizes?: Size[];
  counts?: Count[];
  businessSettings?: BusinessSettings;
  filenamePrefix?: string;
}

export interface DetailedSalesInvoiceExportRow {
  // 1. Invoice Identification
  invoiceNo: string;
  invoiceDate: string;
  financialYear: string;
  salesOrderNo: string;
  orderDate: string;
  buyerOrderRef: string;
  exporterRef: string;
  internalInvoiceNo: string;
  otherReferences: string;

  // 2. Customer / Buyer / Consignee
  consigneeName: string;
  consigneeCountry: string;
  consigneeAddress: string;
  buyerName: string;
  buyerCountry: string;
  buyerAddress: string;

  // 3. Transport & Shipment Logistics
  countryOfOrigin: string;
  countryOfDestination: string;
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  preCarriageBy: string;
  placeOfReceipt: string;
  vesselFlightNo: string;
  containerNo: string;
  sealNo: string;
  billOfLadingNo: string;
  shippingMarks: string;

  // 4. Product Line-Item Particulars (Every Product & Product-wise Price)
  itemIndex: number;
  productName: string;
  productDescription: string;
  gradeSize: string;
  pieceCount: string;
  hsCode: string;
  cartonsCount: number;
  weightKg: number;
  currency: string;
  ratePerKg: number; // Product-wise Price
  lineAmountCurrency: number;
  exchangeRate: number;
  lineAmountINR: number;
  lineFobValueCurrency: number;
  lineFobValueINR: number;
  linePurchaseValueCurrency: number | string;
  linePurchaseValueINR: number | string;
  lineGrossProfitCurrency: number | string;
  lineGrossProfitINR: number | string;

  // 5. Commercial Terms & Master Commodity
  priceTerms: string;
  paymentTerms: string;
  commodityDescription: string;
  packingDescription: string;
  scientificName: string;
  invoiceHsnCode: string;

  // 6. Invoice Grand Totals
  invoiceTotalCartons: number;
  invoiceNetWeightKg: number;
  invoiceGrossWeightKg: number;
  invoiceTotalAmountCurrency: number;
  invoiceTotalAmountINR: number;
  invoiceTotalFobCurrency: number;
  invoiceTotalFobINR: number;
  invoiceTotalPurchaseUSD: number;
  invoiceTotalPurchaseINR: number;
  invoiceGrossProfitUSD: number;
  invoiceGrossProfitINR: number;
  invoiceProfitMarginPct: number;

  // 7. Exporter & Plant Details
  exporterName: string;
  exporterAddress: string;
  factoryNameAndAddress: string;
  factoryApprovalNumber: string;
  chinaRegistrationNumber: string;

  // 8. Bank Remittance & Realization Settlement
  bankExchangeRate: number;
  advanceTermsUSD: number | string;
  advanceReceivedUSD: number;
  advanceReceivedDate: string;
  advanceReceivedINR: number | string;
  advanceBankRef: string;
  advanceExchangeRate: number | string;
  advanceShortfallUSD: number | string;
  balanceTermsUSD: number | string;
  balanceReceivedUSD: number;
  balanceReceivedDate: string;
  balanceReceivedINR: number | string;
  balanceBankRef: string;
  balanceExchangeRate: number | string;
  balanceShortfallUSD: number | string;
  totalShortfallUSD: number | string;
  totalRealizedUSD: number;
  totalRealizedINR: number;
  balanceRealizationUSD: number;
  realizationStatus: string;
  lastRealizationDate: string;
  averageRealizedExchangeRate: number | string;

  // 9. Status & Remarks
  isVoided: string;
  voidReason: string;
  remarks: string;
}

export const DETAILED_SALES_INVOICE_COLUMNS: { key: keyof DetailedSalesInvoiceExportRow; label: string }[] = [
  // Invoice Identification
  { key: 'invoiceNo', label: 'Commercial Invoice No' },
  { key: 'invoiceDate', label: 'Invoice Date' },
  { key: 'financialYear', label: 'Financial Year' },
  { key: 'salesOrderNo', label: 'Sales Order No' },
  { key: 'orderDate', label: 'Sales Order Date' },
  { key: 'buyerOrderRef', label: 'Buyer Order / PO Ref' },
  { key: 'exporterRef', label: 'Exporter Reference' },
  { key: 'internalInvoiceNo', label: 'Internal Invoice No' },
  { key: 'otherReferences', label: 'Other References' },

  // Customer / Consignee / Buyer
  { key: 'consigneeName', label: 'Consignee / Customer Name' },
  { key: 'consigneeCountry', label: 'Consignee Country' },
  { key: 'consigneeAddress', label: 'Consignee Address' },
  { key: 'buyerName', label: 'Buyer Name' },
  { key: 'buyerCountry', label: 'Buyer Country' },
  { key: 'buyerAddress', label: 'Buyer Address' },

  // Transport & Logistics
  { key: 'countryOfOrigin', label: 'Country of Origin' },
  { key: 'countryOfDestination', label: 'Country of Destination' },
  { key: 'portOfLoading', label: 'Port of Loading (POL)' },
  { key: 'portOfDischarge', label: 'Port of Discharge (POD)' },
  { key: 'finalDestination', label: 'Final Destination' },
  { key: 'vesselFlightNo', label: 'Vessel / Flight No' },
  { key: 'containerNo', label: 'Container No' },
  { key: 'sealNo', label: 'Seal No' },
  { key: 'billOfLadingNo', label: 'Bill of Lading (BL) No' },
  { key: 'shippingMarks', label: 'Shipping Marks' },
  { key: 'preCarriageBy', label: 'Pre-Carriage By' },
  { key: 'placeOfReceipt', label: 'Place of Receipt' },

  // Product Line-Item Particulars
  { key: 'itemIndex', label: 'Item #' },
  { key: 'productName', label: 'Product / Species' },
  { key: 'productDescription', label: 'Product Description' },
  { key: 'gradeSize', label: 'Grade / Size' },
  { key: 'pieceCount', label: 'Piece Count' },
  { key: 'hsCode', label: 'HSN / ITC Code' },
  { key: 'cartonsCount', label: 'Cartons' },
  { key: 'weightKg', label: 'Net Weight (Kg)' },
  { key: 'currency', label: 'Currency' },
  { key: 'ratePerKg', label: 'Product-wise Rate / Kg' },
  { key: 'lineAmountCurrency', label: 'Line Sales Value (Foreign Currency)' },
  { key: 'exchangeRate', label: 'Exchange Rate (Estimated)' },
  { key: 'lineAmountINR', label: 'Line Sales Value (INR)' },
  { key: 'lineFobValueCurrency', label: 'Line FOB Value (Foreign Currency)' },
  { key: 'lineFobValueINR', label: 'Line FOB Value (INR)' },
  { key: 'linePurchaseValueCurrency', label: 'Line Purchase Value (USD)' },
  { key: 'linePurchaseValueINR', label: 'Line Purchase Value (INR)' },
  { key: 'lineGrossProfitCurrency', label: 'Line Gross Profit (USD)' },
  { key: 'lineGrossProfitINR', label: 'Line Gross Profit (INR)' },

  // Master Specs & Terms
  { key: 'priceTerms', label: 'Price Terms (e.g. FOB)' },
  { key: 'paymentTerms', label: 'Payment Terms' },
  { key: 'commodityDescription', label: 'Declared Commodity' },
  { key: 'packingDescription', label: 'Packing Description' },
  { key: 'scientificName', label: 'Scientific Name' },
  { key: 'invoiceHsnCode', label: 'Invoice HSN Code' },

  // Invoice Totals
  { key: 'invoiceTotalCartons', label: 'Invoice Total Cartons' },
  { key: 'invoiceNetWeightKg', label: 'Invoice Total Net Weight (Kg)' },
  { key: 'invoiceGrossWeightKg', label: 'Invoice Total Gross Weight (Kg)' },
  { key: 'invoiceTotalAmountCurrency', label: 'Invoice Total Sales Value (Foreign Currency)' },
  { key: 'invoiceTotalAmountINR', label: 'Invoice Total Sales Value (INR)' },
  { key: 'invoiceTotalFobCurrency', label: 'Invoice Total FOB Value (Foreign Currency)' },
  { key: 'invoiceTotalFobINR', label: 'Invoice Total FOB Value (INR)' },
  { key: 'invoiceTotalPurchaseUSD', label: 'Invoice Total Purchase Cost (USD)' },
  { key: 'invoiceTotalPurchaseINR', label: 'Invoice Total Purchase Cost (INR)' },
  { key: 'invoiceGrossProfitUSD', label: 'Invoice Gross Export Profit (USD)' },
  { key: 'invoiceGrossProfitINR', label: 'Invoice Gross Export Profit (INR)' },
  { key: 'invoiceProfitMarginPct', label: 'Gross Margin %' },

  // Exporter & Plant Details
  { key: 'exporterName', label: 'Exporter Name' },
  { key: 'exporterAddress', label: 'Exporter Address' },
  { key: 'factoryNameAndAddress', label: 'Factory Name & Address' },
  { key: 'factoryApprovalNumber', label: 'EIA Approval Number' },
  { key: 'chinaRegistrationNumber', label: 'GACC / China Reg No' },

  // Bank Remittance & Realization Settlement
  { key: 'bankExchangeRate', label: 'Exchange Rate (Pre-determined with Bank)' },
  { key: 'advanceTermsUSD', label: 'Advance Contract Terms (USD)' },
  { key: 'advanceReceivedUSD', label: 'Advance Received (USD)' },
  { key: 'advanceReceivedDate', label: 'Advance Received Date' },
  { key: 'advanceReceivedINR', label: 'Advance Received (INR)' },
  { key: 'advanceBankRef', label: 'Advance Bank Ref / FIRC' },
  { key: 'advanceExchangeRate', label: 'Advance Forward Exchange Rate' },
  { key: 'advanceShortfallUSD', label: 'Advance Shortfall (USD)' },
  { key: 'balanceTermsUSD', label: 'Balance Contract Terms (USD)' },
  { key: 'balanceReceivedUSD', label: 'Balance Received (USD)' },
  { key: 'balanceReceivedDate', label: 'Balance Received Date' },
  { key: 'balanceReceivedINR', label: 'Balance Received (INR)' },
  { key: 'balanceBankRef', label: 'Balance Bank Ref / FIRC' },
  { key: 'balanceExchangeRate', label: 'Balance Forward Exchange Rate' },
  { key: 'balanceShortfallUSD', label: 'Balance Shortfall (USD)' },
  { key: 'totalShortfallUSD', label: 'Total Realization Shortfall (USD)' },
  { key: 'totalRealizedUSD', label: 'Total Realized (USD)' },
  { key: 'totalRealizedINR', label: 'Total Realized (INR)' },
  { key: 'balanceRealizationUSD', label: 'Balance Realization Outstanding (USD)' },
  { key: 'realizationStatus', label: 'Realization Status' },
  { key: 'lastRealizationDate', label: 'Last Realization Date' },
  { key: 'averageRealizedExchangeRate', label: 'Average Realized Exchange Rate' },

  // Audit
  { key: 'isVoided', label: 'Voided' },
  { key: 'voidReason', label: 'Void Reason' },
  { key: 'remarks', label: 'Remarks / Notes' }
];

/**
 * Builds flattened rows for detailed export containing all line items and all invoice particulars.
 */
export function buildDetailedSalesInvoiceRows(params: ExportSalesInvoicesParams): DetailedSalesInvoiceExportRow[] {
  const {
    invoices,
    customers = [],
    ports = [],
    species = [],
    sizes = [],
    counts = [],
    businessSettings
  } = params;

  const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
  const portMap = new Map<string, PortMaster>(ports.map((p) => [p.id, p]));
  const speciesMap = new Map<string, Species>(species.map((s) => [s.id, s]));
  const sizeMap = new Map<string, Size>(sizes.map((s) => [s.id, s]));
  const countMap = new Map<string, Count>(counts.map((c) => [c.id, c]));

  const rows: DetailedSalesInvoiceExportRow[] = [];

  for (const inv of invoices) {
    const consignee = customerMap.get(inv.consigneeId);
    const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
    const pol = portMap.get(inv.portOfLoadingId);
    const pod = portMap.get(inv.portOfDischargeId);
    const finalDest = portMap.get(inv.finalDestinationId);

    const consigneeName = consignee?.name || inv.consigneeName || '';
    const consigneeCountry = consignee?.country || inv.countryOfDestination || '';
    const consigneeAddress = inv.consigneeAddress || consignee?.address || '';
    const buyerName = buyer?.name || inv.buyerName || consigneeName;
    const buyerCountry = buyer?.country || consigneeCountry;
    const buyerAddress = inv.buyerAddress || buyer?.address || '';

    const polName = pol?.name || inv.portOfLoading || '';
    const podName = pod?.name || inv.portOfDischarge || '';
    const finalDestName = finalDest?.name || inv.finalDestination || podName;

    const rate = inv.exchangeRate || 1;
    const estimatedINR = inv.estimatedAmountINR || Number(((inv.totalAmountCurrency || 0) * rate).toFixed(2));
    const totalFobINR = inv.totalFobValueINR || Number(((inv.totalFobValueCurrency || 0) * rate).toFixed(2));
    const totalPurUSD = inv.totalPurchaseValueCurrency || 0;
    const totalPurINR = inv.totalPurchaseValueINR || (totalPurUSD > 0 ? Number((totalPurUSD * rate).toFixed(2)) : 0);
    const grossProfitUSD = inv.grossProfitCurrency || (totalPurUSD > 0 ? Number(((inv.totalFobValueCurrency || 0) - totalPurUSD).toFixed(2)) : 0);
    const grossProfitINR = inv.grossProfitINR || (totalPurINR > 0 ? Number((totalFobINR - totalPurINR).toFixed(2)) : 0);
    const invoiceProfitMarginPct = inv.profitMarginPct || (inv.totalFobValueCurrency > 0 && totalPurUSD > 0 ? Number((((inv.totalFobValueCurrency - totalPurUSD) / inv.totalFobValueCurrency) * 100).toFixed(2)) : 0);

    const bankRate = inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 0;

    const expName = inv.exporterName || businessSettings?.businessName || '';
    const expAddr = inv.exporterAddress || businessSettings?.address || '';

    const lines = inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems : null;

    if (lines && lines.length > 0) {
      lines.forEach((line: SalesInvoiceLine, idx: number) => {
        const sp = speciesMap.get(line.speciesId);
        const sz = sizeMap.get(line.sizeId);
        const ct = line.countId ? countMap.get(line.countId) : undefined;

        const productName = sp?.name || line.productDescription || inv.commodityDescription || 'Export Fish';
        const productDesc = line.productDescription || sp?.name || inv.commodityDescription || '';
        const gradeSize = line.gradeSize || sz?.name || '';
        const pieceCount = ct?.name || '';
        const hsCode = line.hsCode || sp?.hsCode || inv.hsnCode || '';
        const cartons = line.cartonsCount || 0;
        const weightKg = line.weightKg || 0;
        const ratePerKg = line.ratePerKg || 0;
        const lineAmount = line.amountCurrency !== undefined ? line.amountCurrency : Number((weightKg * ratePerKg).toFixed(2));
        const lineAmountINR = Number((lineAmount * rate).toFixed(2));

        const lineFobCurrency = line.fobValueCurrency !== undefined ? line.fobValueCurrency : lineAmount;
        const lineFobINR = line.fobValueINR !== undefined ? line.fobValueINR : Number((lineFobCurrency * rate).toFixed(2));

        const linePurUSD = line.purchaseValueCurrency !== undefined ? line.purchaseValueCurrency : '';
        const linePurINR = line.purchaseValueINR !== undefined ? line.purchaseValueINR : (typeof linePurUSD === 'number' ? Number((linePurUSD * rate).toFixed(2)) : '');
        const lineProfitUSD = typeof linePurUSD === 'number' && linePurUSD > 0 ? Number((lineFobCurrency - linePurUSD).toFixed(2)) : '';
        const lineProfitINR = typeof linePurINR === 'number' && linePurINR > 0 ? Number((lineFobINR - linePurINR).toFixed(2)) : '';

        rows.push({
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          financialYear: inv.financialYear || '',
          salesOrderNo: inv.salesOrderNo || '',
          orderDate: inv.orderDate || '',
          buyerOrderRef: inv.orderNo && inv.orderNo !== inv.salesOrderNo ? inv.orderNo : (inv.orderNo || ''),
          exporterRef: inv.exporterRef || '',
          internalInvoiceNo: inv.internalInvoiceNo || '',
          otherReferences: inv.otherReferences || '',

          consigneeName,
          consigneeCountry,
          consigneeAddress,
          buyerName,
          buyerCountry,
          buyerAddress,

          countryOfOrigin: inv.countryOfOrigin || 'INDIA',
          countryOfDestination: consigneeCountry,
          portOfLoading: polName,
          portOfDischarge: podName,
          finalDestination: finalDestName,
          preCarriageBy: inv.preCarriageBy || '',
          placeOfReceipt: inv.placeOfReceipt || '',
          vesselFlightNo: inv.vesselFlightNo || '',
          containerNo: inv.containerNo || '',
          sealNo: inv.sealNo || '',
          billOfLadingNo: inv.billOfLadingNo || '',
          shippingMarks: inv.shippingMarks || '',

          itemIndex: idx + 1,
          productName,
          productDescription: productDesc,
          gradeSize,
          pieceCount,
          hsCode,
          cartonsCount: cartons,
          weightKg,
          currency: inv.currency,
          ratePerKg,
          lineAmountCurrency: lineAmount,
          exchangeRate: inv.exchangeRate,
          lineAmountINR,
          lineFobValueCurrency: lineFobCurrency,
          lineFobValueINR: lineFobINR,
          linePurchaseValueCurrency: linePurUSD,
          linePurchaseValueINR: linePurINR,
          lineGrossProfitCurrency: lineProfitUSD,
          lineGrossProfitINR: lineProfitINR,

          priceTerms: inv.priceTerms || 'FOB',
          paymentTerms: inv.termsOfPayment || '',
          commodityDescription: inv.commodityDescription || '',
          packingDescription: inv.packingDescription || '',
          scientificName: inv.scientificName || '',
          invoiceHsnCode: inv.hsnCode || '',

          invoiceTotalCartons: inv.totalCartons || 0,
          invoiceNetWeightKg: inv.totalWeightKg || inv.netWeightKg || 0,
          invoiceGrossWeightKg: inv.grossWeightKg || 0,
          invoiceTotalAmountCurrency: inv.totalAmountCurrency || 0,
          invoiceTotalAmountINR: estimatedINR,
          invoiceTotalFobCurrency: inv.totalFobValueCurrency || 0,
          invoiceTotalFobINR: totalFobINR,
          invoiceTotalPurchaseUSD: totalPurUSD,
          invoiceTotalPurchaseINR: totalPurINR,
          invoiceGrossProfitUSD: grossProfitUSD,
          invoiceGrossProfitINR: grossProfitINR,
          invoiceProfitMarginPct,

          exporterName: expName,
          exporterAddress: expAddr,
          factoryNameAndAddress: inv.factoryNameAndAddress || '',
          factoryApprovalNumber: inv.factoryApprovalNumber || '',
          chinaRegistrationNumber: inv.chinaRegistrationNumber || '',

          bankExchangeRate: bankRate,
          advanceTermsUSD: inv.advanceTermsUSD !== undefined ? inv.advanceTermsUSD : '',
          advanceReceivedUSD: inv.advanceReceivedCurrency || 0,
          advanceReceivedDate: inv.advanceReceivedDate || '',
          advanceReceivedINR: inv.advanceReceivedINR !== undefined ? inv.advanceReceivedINR : (inv.advanceReceivedCurrency && bankRate ? Number((inv.advanceReceivedCurrency * bankRate).toFixed(2)) : ''),
          advanceBankRef: inv.advanceBankRef || '',
          advanceExchangeRate: inv.advanceExchangeRate || '',
          advanceShortfallUSD: inv.advanceShortfallUSD !== undefined ? inv.advanceShortfallUSD : '',
          balanceTermsUSD: inv.balanceActualPriceUSD !== undefined ? inv.balanceActualPriceUSD : '',
          balanceReceivedUSD: inv.balancePaymentAmountCurrency || 0,
          balanceReceivedDate: inv.balancePaymentDate || '',
          balanceReceivedINR: inv.balancePaymentINR !== undefined ? inv.balancePaymentINR : (inv.balancePaymentAmountCurrency && bankRate ? Number((inv.balancePaymentAmountCurrency * bankRate).toFixed(2)) : ''),
          balanceBankRef: inv.balanceBankRef || '',
          balanceExchangeRate: inv.balanceExchangeRate || '',
          balanceShortfallUSD: inv.balanceShortfallUSD !== undefined ? inv.balanceShortfallUSD : '',
          totalShortfallUSD: inv.totalShortfallUSD !== undefined ? inv.totalShortfallUSD : '',
          totalRealizedUSD: inv.totalRealizedCurrency || 0,
          totalRealizedINR: inv.totalRealizedINR || 0,
          balanceRealizationUSD: inv.balanceRealizationCurrency || 0,
          realizationStatus: inv.realizationStatus || 'Not Realized',
          lastRealizationDate: inv.lastRealizationDate || '',
          averageRealizedExchangeRate: inv.averageRealizedExchangeRate || '',

          isVoided: inv.isVoided ? 'Yes' : 'No',
          voidReason: inv.voidReason || '',
          remarks: inv.remarks || ''
        });
      });
    } else {
      // Invoices with 0 line items (edge case or freshly created)
      const weightKg = inv.totalWeightKg || inv.netWeightKg || 0;
      const ratePerKg = weightKg > 0 ? Number(((inv.totalAmountCurrency || 0) / weightKg).toFixed(2)) : 0;
      const lineAmount = inv.totalAmountCurrency || 0;
      const lineAmountINR = estimatedINR;
      const lineFobCurrency = inv.totalFobValueCurrency || 0;
      const lineFobINR = totalFobINR;

      rows.push({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        financialYear: inv.financialYear || '',
        salesOrderNo: inv.salesOrderNo || '',
        orderDate: inv.orderDate || '',
        buyerOrderRef: inv.orderNo && inv.orderNo !== inv.salesOrderNo ? inv.orderNo : (inv.orderNo || ''),
        exporterRef: inv.exporterRef || '',
        internalInvoiceNo: inv.internalInvoiceNo || '',
        otherReferences: inv.otherReferences || '',

        consigneeName,
        consigneeCountry,
        consigneeAddress,
        buyerName,
        buyerCountry,
        buyerAddress,

        countryOfOrigin: inv.countryOfOrigin || 'INDIA',
        countryOfDestination: consigneeCountry,
        portOfLoading: polName,
        portOfDischarge: podName,
        finalDestination: finalDestName,
        preCarriageBy: inv.preCarriageBy || '',
        placeOfReceipt: inv.placeOfReceipt || '',
        vesselFlightNo: inv.vesselFlightNo || '',
        containerNo: inv.containerNo || '',
        sealNo: inv.sealNo || '',
        billOfLadingNo: inv.billOfLadingNo || '',
        shippingMarks: inv.shippingMarks || '',

        itemIndex: 1,
        productName: inv.commodityDescription || 'Export Fish',
        productDescription: inv.commodityDescription || '',
        gradeSize: '-',
        pieceCount: '-',
        hsCode: inv.hsnCode || '',
        cartonsCount: inv.totalCartons || 0,
        weightKg,
        currency: inv.currency,
        ratePerKg,
        lineAmountCurrency: lineAmount,
        exchangeRate: inv.exchangeRate,
        lineAmountINR,
        lineFobValueCurrency: lineFobCurrency,
        lineFobValueINR: lineFobINR,
        linePurchaseValueCurrency: totalPurUSD || '',
        linePurchaseValueINR: totalPurINR || '',
        lineGrossProfitCurrency: grossProfitUSD || '',
        lineGrossProfitINR: grossProfitINR || '',

        priceTerms: inv.priceTerms || 'FOB',
        paymentTerms: inv.termsOfPayment || '',
        commodityDescription: inv.commodityDescription || '',
        packingDescription: inv.packingDescription || '',
        scientificName: inv.scientificName || '',
        invoiceHsnCode: inv.hsnCode || '',

        invoiceTotalCartons: inv.totalCartons || 0,
        invoiceNetWeightKg: weightKg,
        invoiceGrossWeightKg: inv.grossWeightKg || 0,
        invoiceTotalAmountCurrency: lineAmount,
        invoiceTotalAmountINR: estimatedINR,
        invoiceTotalFobCurrency: lineFobCurrency,
        invoiceTotalFobINR: totalFobINR,
        invoiceTotalPurchaseUSD: totalPurUSD,
        invoiceTotalPurchaseINR: totalPurINR,
        invoiceGrossProfitUSD: grossProfitUSD,
        invoiceGrossProfitINR: grossProfitINR,
        invoiceProfitMarginPct,

        exporterName: expName,
        exporterAddress: expAddr,
        factoryNameAndAddress: inv.factoryNameAndAddress || '',
        factoryApprovalNumber: inv.factoryApprovalNumber || '',
        chinaRegistrationNumber: inv.chinaRegistrationNumber || '',

        bankExchangeRate: bankRate,
        advanceTermsUSD: inv.advanceTermsUSD !== undefined ? inv.advanceTermsUSD : '',
        advanceReceivedUSD: inv.advanceReceivedCurrency || 0,
        advanceReceivedDate: inv.advanceReceivedDate || '',
        advanceReceivedINR: inv.advanceReceivedINR !== undefined ? inv.advanceReceivedINR : '',
        advanceBankRef: inv.advanceBankRef || '',
        advanceExchangeRate: inv.advanceExchangeRate || '',
        advanceShortfallUSD: inv.advanceShortfallUSD !== undefined ? inv.advanceShortfallUSD : '',
        balanceTermsUSD: inv.balanceActualPriceUSD !== undefined ? inv.balanceActualPriceUSD : '',
        balanceReceivedUSD: inv.balancePaymentAmountCurrency || 0,
        balanceReceivedDate: inv.balancePaymentDate || '',
        balanceReceivedINR: inv.balancePaymentINR !== undefined ? inv.balancePaymentINR : '',
        balanceBankRef: inv.balanceBankRef || '',
        balanceExchangeRate: inv.balanceExchangeRate || '',
        balanceShortfallUSD: inv.balanceShortfallUSD !== undefined ? inv.balanceShortfallUSD : '',
        totalShortfallUSD: inv.totalShortfallUSD !== undefined ? inv.totalShortfallUSD : '',
        totalRealizedUSD: inv.totalRealizedCurrency || 0,
        totalRealizedINR: inv.totalRealizedINR || 0,
        balanceRealizationUSD: inv.balanceRealizationCurrency || 0,
        realizationStatus: inv.realizationStatus || 'Not Realized',
        lastRealizationDate: inv.lastRealizationDate || '',
        averageRealizedExchangeRate: inv.averageRealizedExchangeRate || '',

        isVoided: inv.isVoided ? 'Yes' : 'No',
        voidReason: inv.voidReason || '',
        remarks: inv.remarks || ''
      });
    }
  }

  return rows;
}

/**
 * Auto calculate column width objects for SheetJS
 */
function calculateColWidths(aoa: any[][]): { wch: number }[] {
  if (!aoa || aoa.length === 0) return [];
  const maxCols = Math.max(...aoa.map((row) => row.length));
  const widths: number[] = new Array(maxCols).fill(10);

  for (const row of aoa) {
    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      const len = cellVal !== null && cellVal !== undefined ? String(cellVal).length : 0;
      if (len > widths[c]) {
        widths[c] = Math.min(len + 3, 45);
      }
    }
  }

  return widths.map((w) => ({ wch: Math.max(w, 12) }));
}

/**
 * Builds Summary Sheet data (one row per commercial invoice)
 */
function buildInvoicesSummarySheetData(invoices: SalesInvoice[], customers: Customer[], ports: PortMaster[]): any[][] {
  const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
  const portMap = new Map<string, PortMaster>(ports.map((p) => [p.id, p]));

  const headers = [
    'Commercial Invoice No',
    'Invoice Date',
    'Financial Year',
    'Sales Order No',
    'Sales Order Date',
    'Buyer Order / PO Ref',
    'Exporter Reference',
    'Internal Invoice No',
    'Consignee Name',
    'Consignee Country',
    'Buyer Name',
    'Country of Origin',
    'Destination Country',
    'Port of Loading (POL)',
    'Port of Discharge (POD)',
    'Final Destination',
    'Vessel / Flight No',
    'Container No',
    'Seal No',
    'Bill of Lading No',
    'Terms of Payment',
    'Price Terms',
    'Currency',
    'Exchange Rate (Estimated)',
    'Total Cartons',
    'Total Net Weight (Kg)',
    'Total Gross Weight (Kg)',
    'Total Invoice Amount (Currency)',
    'Total Invoice Amount (INR)',
    'Total FOB Value (Currency)',
    'Total FOB Value (INR)',
    'Total Purchase Cost (USD)',
    'Total Purchase Cost (INR)',
    'Gross Export Profit (USD)',
    'Gross Export Profit (INR)',
    'Gross Margin %',
    'Bank Exchange Rate',
    'Advance Received (USD)',
    'Advance Received Date',
    'Advance Received (INR)',
    'Advance Bank Ref',
    'Balance Received (USD)',
    'Balance Received Date',
    'Balance Received (INR)',
    'Balance Bank Ref',
    'Total Realized (USD)',
    'Total Realized (INR)',
    'Balance Realization Outstanding (USD)',
    'Realization Status',
    'Last Realization Date',
    'Voided',
    'Remarks / Notes'
  ];

  const rows = invoices.map((inv) => {
    const consignee = customerMap.get(inv.consigneeId);
    const buyer = inv.buyerId ? customerMap.get(inv.buyerId) : consignee;
    const pol = portMap.get(inv.portOfLoadingId);
    const pod = portMap.get(inv.portOfDischargeId);
    const finalDest = portMap.get(inv.finalDestinationId);

    const rate = inv.exchangeRate || 1;
    const totalAmountINR = inv.estimatedAmountINR || Number(((inv.totalAmountCurrency || 0) * rate).toFixed(2));
    const totalFobINR = inv.totalFobValueINR || Number(((inv.totalFobValueCurrency || 0) * rate).toFixed(2));
    const totalPurUSD = inv.totalPurchaseValueCurrency || 0;
    const totalPurINR = inv.totalPurchaseValueINR || (totalPurUSD > 0 ? Number((totalPurUSD * rate).toFixed(2)) : 0);
    const profitUSD = inv.grossProfitCurrency || (totalPurUSD > 0 ? Number(((inv.totalFobValueCurrency || 0) - totalPurUSD).toFixed(2)) : 0);
    const profitINR = inv.grossProfitINR || (totalPurINR > 0 ? Number((totalFobINR - totalPurINR).toFixed(2)) : 0);
    const margin = inv.profitMarginPct || (inv.totalFobValueCurrency > 0 && totalPurUSD > 0 ? Number((((inv.totalFobValueCurrency - totalPurUSD) / inv.totalFobValueCurrency) * 100).toFixed(2)) : 0);

    return [
      inv.invoiceNo,
      inv.invoiceDate,
      inv.financialYear || '',
      inv.salesOrderNo || '',
      inv.orderDate || '',
      inv.orderNo || '',
      inv.exporterRef || '',
      inv.internalInvoiceNo || '',
      consignee?.name || inv.consigneeName || '',
      consignee?.country || inv.countryOfDestination || '',
      buyer?.name || inv.buyerName || consignee?.name || '',
      inv.countryOfOrigin || 'INDIA',
      inv.countryOfDestination || consignee?.country || '',
      pol?.name || inv.portOfLoading || '',
      pod?.name || inv.portOfDischarge || '',
      finalDest?.name || inv.finalDestination || pod?.name || '',
      inv.vesselFlightNo || '',
      inv.containerNo || '',
      inv.sealNo || '',
      inv.billOfLadingNo || '',
      inv.termsOfPayment || '',
      inv.priceTerms || 'FOB',
      inv.currency,
      inv.exchangeRate,
      inv.totalCartons || 0,
      inv.totalWeightKg || inv.netWeightKg || 0,
      inv.grossWeightKg || 0,
      inv.totalAmountCurrency || 0,
      totalAmountINR,
      inv.totalFobValueCurrency || 0,
      totalFobINR,
      totalPurUSD,
      totalPurINR,
      profitUSD,
      profitINR,
      margin,
      inv.bankPreDeterminedExchangeRate || inv.exchangeRate || 0,
      inv.advanceReceivedCurrency || 0,
      inv.advanceReceivedDate || '',
      inv.advanceReceivedINR || '',
      inv.advanceBankRef || '',
      inv.balancePaymentAmountCurrency || 0,
      inv.balancePaymentDate || '',
      inv.balancePaymentINR || '',
      inv.balanceBankRef || '',
      inv.totalRealizedCurrency || 0,
      inv.totalRealizedINR || 0,
      inv.balanceRealizationCurrency || 0,
      inv.realizationStatus || 'Not Realized',
      inv.lastRealizationDate || '',
      inv.isVoided ? 'Yes' : 'No',
      inv.remarks || ''
    ];
  });

  return [headers, ...rows];
}

/**
 * Builds Product Breakdown Sheet data aggregated by product and grade
 */
function buildProductSummarySheetData(detailedRows: DetailedSalesInvoiceExportRow[]): any[][] {
  const headers = [
    'Product / Species',
    'Grade / Size',
    'HSN / ITC Code',
    'Number of Invoices',
    'Total Cartons',
    'Total Net Weight (Kg)',
    'Weighted Average Rate / Kg (Foreign Currency)',
    'Total Sales Value (Foreign Currency)',
    'Total Sales Value (INR)',
    'Total FOB Value (Foreign Currency)',
    'Total FOB Value (INR)',
    'Total Purchase Cost (USD)',
    'Total Purchase Cost (INR)',
    'Gross Export Profit (USD)',
    'Gross Export Profit (INR)'
  ];

  interface AggregationItem {
    productName: string;
    gradeSize: string;
    hsCode: string;
    invoices: Set<string>;
    cartons: number;
    weightKg: number;
    salesValueCurrency: number;
    salesValueINR: number;
    fobValueCurrency: number;
    fobValueINR: number;
    purchaseValueUSD: number;
    purchaseValueINR: number;
  }

  const map = new Map<string, AggregationItem>();

  for (const r of detailedRows) {
    const key = `${r.productName}___${r.gradeSize}___${r.hsCode}`;
    if (!map.has(key)) {
      map.set(key, {
        productName: r.productName,
        gradeSize: r.gradeSize,
        hsCode: r.hsCode,
        invoices: new Set<string>(),
        cartons: 0,
        weightKg: 0,
        salesValueCurrency: 0,
        salesValueINR: 0,
        fobValueCurrency: 0,
        fobValueINR: 0,
        purchaseValueUSD: 0,
        purchaseValueINR: 0
      });
    }

    const item = map.get(key)!;
    item.invoices.add(r.invoiceNo);
    item.cartons += Number(r.cartonsCount) || 0;
    item.weightKg += Number(r.weightKg) || 0;
    item.salesValueCurrency += Number(r.lineAmountCurrency) || 0;
    item.salesValueINR += Number(r.lineAmountINR) || 0;
    item.fobValueCurrency += Number(r.lineFobValueCurrency) || 0;
    item.fobValueINR += Number(r.lineFobValueINR) || 0;
    if (typeof r.linePurchaseValueCurrency === 'number') {
      item.purchaseValueUSD += r.linePurchaseValueCurrency;
    }
    if (typeof r.linePurchaseValueINR === 'number') {
      item.purchaseValueINR += r.linePurchaseValueINR;
    }
  }

  const sortedItems = Array.from(map.values()).sort((a, b) => {
    if (a.productName !== b.productName) {
      return a.productName.localeCompare(b.productName);
    }
    return a.gradeSize.localeCompare(b.gradeSize);
  });

  const rows = sortedItems.map((item) => {
    const avgRate = item.weightKg > 0 ? Number((item.salesValueCurrency / item.weightKg).toFixed(2)) : 0;
    const profitUSD = item.purchaseValueUSD > 0 ? Number((item.fobValueCurrency - item.purchaseValueUSD).toFixed(2)) : '';
    const profitINR = item.purchaseValueINR > 0 ? Number((item.fobValueINR - item.purchaseValueINR).toFixed(2)) : '';

    return [
      item.productName,
      item.gradeSize || '-',
      item.hsCode || '-',
      item.invoices.size,
      item.cartons,
      Number(item.weightKg.toFixed(2)),
      avgRate,
      Number(item.salesValueCurrency.toFixed(2)),
      Number(item.salesValueINR.toFixed(2)),
      Number(item.fobValueCurrency.toFixed(2)),
      Number(item.fobValueINR.toFixed(2)),
      item.purchaseValueUSD > 0 ? Number(item.purchaseValueUSD.toFixed(2)) : '',
      item.purchaseValueINR > 0 ? Number(item.purchaseValueINR.toFixed(2)) : '',
      profitUSD,
      profitINR
    ];
  });

  return [headers, ...rows];
}

/**
 * Export Sales Invoices to multi-sheet Microsoft Excel (.xlsx) file.
 * Includes:
 * 1. Detailed breakdown of every product line item & product-wise price + full invoice details
 * 2. Invoices summary sheet (one row per commercial invoice)
 * 3. Product & grade aggregated breakdown sheet
 */
export function exportSalesInvoicesToExcel(params: ExportSalesInvoicesParams): void {
  const {
    invoices,
    customers = [],
    ports = [],
    filenamePrefix = 'Sales_Invoices_Detailed'
  } = params;

  if (!invoices || invoices.length === 0) return;

  const detailedRows = buildDetailedSalesInvoiceRows(params);

  // 1. Sheet 1: Detailed Sales Invoices
  const detailedHeaders = DETAILED_SALES_INVOICE_COLUMNS.map((col) => col.label);
  const detailedDataRows = detailedRows.map((row) =>
    DETAILED_SALES_INVOICE_COLUMNS.map((col) => {
      const val = row[col.key];
      return val !== undefined && val !== null ? val : '';
    })
  );
  const detailedAoa = [detailedHeaders, ...detailedDataRows];
  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedAoa);
  wsDetailed['!cols'] = calculateColWidths(detailedAoa);

  // 2. Sheet 2: Invoices Summary
  const summaryAoa = buildInvoicesSummarySheetData(invoices, customers, ports);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = calculateColWidths(summaryAoa);

  // 3. Sheet 3: Product Breakdown Summary
  const productAoa = buildProductSummarySheetData(detailedRows);
  const wsProduct = XLSX.utils.aoa_to_sheet(productAoa);
  wsProduct['!cols'] = calculateColWidths(productAoa);

  // Build workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetailed, 'Sales Invoices (Detailed)');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Invoices Summary');
  XLSX.utils.book_append_sheet(wb, wsProduct, 'Product Breakdown Summary');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Export Sales Invoices to CSV formatted file containing all product lines and full invoice details.
 */
export function exportSalesInvoicesToCSV(params: ExportSalesInvoicesParams): void {
  const { invoices, filenamePrefix = 'Sales_Invoices_Detailed' } = params;

  if (!invoices || invoices.length === 0) return;

  const detailedRows = buildDetailedSalesInvoiceRows(params);
  const csvStr = convertToCSV(detailedRows, DETAILED_SALES_INVOICE_COLUMNS);

  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvStr, `${filenamePrefix}_${dateStr}.csv`);
}
