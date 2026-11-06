import JSZip from 'jszip';
import { SalesInvoice, BusinessSettings } from '../types';
import { SAMPLE_DOCX_TEMPLATE_BASE64 } from './sampleDocxTemplateBase64';

function escapeXml(str: unknown): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{2}[.-]\d{2}[.-]\d{4}$/.test(dateStr)) return dateStr.replace(/-/g, '.');
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  return `${day}.${mon}.${yr}`;
}

export function numberToWordsInternational(amount: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function numToWords(n: number): string {
    if (n === 0) return 'ZERO';
    function helper(num: number): string {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 !== 0 ? ' ' + helper(num % 100) : '');
      if (num < 1000000) {
        return helper(Math.floor(num / 1000)) + ' THOUSAND' + (num % 1000 !== 0 ? ' ' + helper(num % 1000) : '');
      }
      if (num < 1000000000) {
        return helper(Math.floor(num / 1000000)) + ' MILLION' + (num % 1000000 !== 0 ? ' ' + helper(num % 1000000) : '');
      }
      return helper(Math.floor(num / 1000000000)) + ' BILLION' + (num % 1000000000 !== 0 ? ' ' + helper(num % 1000000000) : '');
    }
    return helper(n);
  }

  const rounded = Math.round(amount * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  let words = numToWords(intPart);
  if (decPart > 0) {
    words += ' AND ' + numToWords(decPart) + ' CENTS';
  }
  return words + ' ONLY';
}

function randId(): string {
  return Math.floor(Math.random() * 0xFFFFFF + 0x100000).toString(16).toUpperCase();
}

export function buildInvoiceTableXml(inv: Partial<SalesInvoice>, settings?: BusinessSettings): string {
  const lineItems = inv.lineItems || [];

  const lineRowsXml = lineItems.map(item => {
    const desc = escapeXml(item.productDescription || '');
    const size = escapeXml(item.gradeSize || '');
    const cartons = item.cartonsCount !== undefined && item.cartonsCount !== null ? String(item.cartonsCount) : '';
    const weight = typeof item.weightKg === 'number' ? item.weightKg.toFixed(3) : String(item.weightKg || '');
    const rate = typeof item.ratePerKg === 'number' ? item.ratePerKg.toFixed(2) : String(item.ratePerKg || '');
    const amount = typeof item.amountCurrency === 'number' ? item.amountCurrency.toFixed(2) : String(item.amountCurrency || '');

    return `
    <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
      <w:trPr><w:trHeight w:val="695"/></w:trPr>
      <w:tc>
        <w:tcPr><w:tcW w:w="1584" w:type="dxa"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:rPr><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${desc}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="1584" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:ind w:left="526"/><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${size}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="2337" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${cartons}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${weight}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="1060" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${rate}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
          <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${amount}</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>`;
  }).join('');

  // Exporter
  const exporterName = inv.exporterName || settings?.businessName || '';
  const exporterAddress = inv.exporterAddress || settings?.address || '';
  const expLines = exporterAddress.split('\n').filter(Boolean);
  const expAddrRuns = expLines.map((line, idx) => `<w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>${idx > 0 || exporterName ? '<w:br/>' : ''}<w:t>${escapeXml(line.trim())}</w:t></w:r>`).join('');

  // Consignee
  const rawConsigneeName = inv.consigneeName || '';
  const consigneeName = rawConsigneeName !== 'John Trading Co.,' ? rawConsigneeName : '';
  const rawConsigneeAddress = inv.consigneeAddress || '';
  const consigneeAddress = !rawConsigneeAddress.includes('Bangkok 10110') ? rawConsigneeAddress : '';
  const consAddrLines = consigneeAddress.split('\n').filter(Boolean);
  const consAddrParagraphs = consAddrLines.map(line => `
    <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
      <w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(line.trim())}</w:t></w:r>
    </w:p>
  `).join('');

  // Buyer
  const rawBuyerName = inv.buyerName || '';
  const buyerName = rawBuyerName !== 'ABC Pvt. Ltd.' ? rawBuyerName : '';
  const rawBuyerAddress = inv.buyerAddress || '';
  const buyerAddress = rawBuyerAddress !== 'Bangkok, Thailand' ? rawBuyerAddress : '';
  const buyerAddrLines = buyerAddress.split('\n').filter(Boolean);
  const buyerAddrParagraphs = buyerAddrLines.map(line => `
    <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
      <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(line.trim())}</w:t></w:r>
    </w:p>
  `).join('');

  const vesselFlightNo = (inv.vesselFlightNo && inv.vesselFlightNo !== 'MOGRAL 119W') ? inv.vesselFlightNo : '';
  const containerNo = (inv.containerNo && inv.containerNo !== 'ONEU90399086') ? inv.containerNo : '';
  const sealNo = (inv.sealNo && inv.sealNo !== 'IN567892') ? inv.sealNo : '';
  const scientificName = (inv.scientificName && inv.scientificName !== 'RASTRELLIGER KANAGURTA') ? inv.scientificName : '';
  const shippingMarks = (inv.shippingMarks && inv.shippingMarks !== 'MERIT D.S') ? inv.shippingMarks : '';
  const commodityDescription = (inv.commodityDescription && inv.commodityDescription !== 'FROZEN SEAFOOD') ? inv.commodityDescription : '';
  const packingDescription = (inv.packingDescription && inv.packingDescription !== '1X10KG') ? inv.packingDescription : '';

  const totalCartons = inv.totalCartons !== undefined ? inv.totalCartons : lineItems.reduce((acc, l) => acc + (l.cartonsCount || 0), 0);
  const totalWeight = inv.totalWeightKg !== undefined ? inv.totalWeightKg : lineItems.reduce((acc, l) => acc + (l.weightKg || 0), 0);
  const totalAmount = inv.totalAmountCurrency !== undefined ? inv.totalAmountCurrency : lineItems.reduce((acc, l) => acc + (l.amountCurrency || 0), 0);
  const netWeight = inv.netWeightKg !== undefined ? inv.netWeightKg : totalWeight;
  const grossWeight = inv.grossWeightKg !== undefined ? inv.grossWeightKg : '';

  const priceTermsPrefix = inv.priceTerms ? (inv.priceTerms.split(' ')[0].toUpperCase() + ' ') : '';
  const currencyName = inv.currency === 'EUR' ? 'EUROS' : (inv.currency === 'GBP' ? 'BRITISH POUNDS' : 'U.S. DOLLARS');
  const defaultAmountWords = totalAmount > 0 ? `${priceTermsPrefix}${currencyName}: ${numberToWordsInternational(totalAmount)}` : '';
  const finalAmountWords = inv.amountInWords || defaultAmountWords;

  const signatoryCompany = inv.signatoryCompany || (settings?.businessName ? `For ${settings.businessName}` : '');
  const signatoryDesignation = inv.signatoryDesignation || '';
  const signatureDate = inv.signatureDate || inv.invoiceDate;

  return `
  <!-- Row 1: Exporter & Invoice No -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="510"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4596" w:type="dxa"/><w:gridSpan w:val="4"/><w:vMerge w:val="restart"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Exporter/Shipper</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRPr="00197130" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(exporterName)}</w:t></w:r>
        ${expAddrRuns}
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRPr="00197130" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Invoice No.&amp; Date         Exporter’s Ref.</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.invoiceNo || '')} DTD. ${formatDDMMYYYY(inv.invoiceDate)}</w:t></w:r>
        ${inv.exporterRef && inv.exporterRef !== inv.invoiceNo ? `<w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">   ${escapeXml(inv.exporterRef)}</w:t></w:r>` : ''}
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 2: Buyer Order No -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="315"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4596" w:type="dxa"/><w:gridSpan w:val="4"/><w:vMerge/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRPr="00197130" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Buyer’s Order No.&amp; Date</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${inv.orderNo ? (inv.orderNo.toUpperCase().startsWith('PI') ? '' : 'PI NO: ') + escapeXml(inv.orderNo) : ''}${inv.orderDate ? ' DTD. ' + formatDDMMYYYY(inv.orderDate) : ''}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 3: Other References -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="315"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4596" w:type="dxa"/><w:gridSpan w:val="4"/><w:vMerge/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRPr="00197130" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Other References(s)</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(inv.otherReferences || '')}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 4: Consignee & Buyer -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="566"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4596" w:type="dxa"/><w:gridSpan w:val="4"/><w:vMerge w:val="restart"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve"> Consignee</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(consigneeName)}</w:t></w:r>
      </w:p>
      ${consAddrParagraphs}
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Buyer (if other than consignee)</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(buyerName)}</w:t></w:r>
      </w:p>
      ${buyerAddrParagraphs}
    </w:tc>
  </w:tr>

  <!-- Row 5: Origin & Destination -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="325"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4596" w:type="dxa"/><w:gridSpan w:val="4"/><w:vMerge/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2080" w:type="dxa"/><w:gridSpan w:val="4"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Country of Origin of Goods</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.countryOfOrigin || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2216" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Country of final Destination</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.countryOfDestination || '')}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 6: Pre-carriage & Terms -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:tc>
      <w:tcPr><w:tcW w:w="1980" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Pre-carriage by</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.preCarriageBy || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2616" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Place of Receipt by Pre-carriage</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.placeOfReceipt || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/><w:vMerge w:val="restart"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Terms of delivery and payment</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.termsOfPayment || '')}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 7: Vessel & Loading -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:tc>
      <w:tcPr><w:tcW w:w="1980" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Vessel/Flight No.</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(vesselFlightNo)}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2616" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Port of Loading</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.portOfLoading || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/><w:vMerge/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 8: Port of Discharge & Final Destination -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:tc>
      <w:tcPr><w:tcW w:w="1980" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Port of Discharge</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(inv.portOfDischarge || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2616" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Final Destination</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(inv.finalDestination || '')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4296" w:type="dxa"/><w:gridSpan w:val="6"/><w:vMerge/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 9: Table Header -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:tc>
      <w:tcPr><w:tcW w:w="5505" w:type="dxa"/><w:gridSpan w:val="5"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Marks &amp; Nos.     No. &amp; Kind of  pkg     Description of Goods </w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Container No.</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Quantity</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1060" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Rate</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Amount</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 10: Commodity, Packing, Marks & Price Term Headers -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="810"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="5505" w:type="dxa"/><w:gridSpan w:val="5"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>COMMODITY: ${escapeXml(commodityDescription)}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>PACKING: ${escapeXml(packingDescription)}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>SCIENTIFIC NAME: ${escapeXml(scientificName)}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>SHIPPING MARK: ${escapeXml(shippingMarks)}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>IN KGS</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1060" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${inv.priceTerms ? escapeXml(inv.priceTerms.split(' ')[0]) : ''}${inv.priceTerms && inv.currency ? '/' : ''}${inv.currency || ''}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>PER  KGS</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${inv.currency || ''}${inv.priceTerms && inv.currency ? '/' : ''}${inv.priceTerms ? escapeXml(inv.priceTerms.split(' ')[0]) : ''}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.finalDestination || inv.portOfDischarge || '')}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 11: Sub Header (Grade/Size, Cartons) -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="435"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="3168" w:type="dxa"/><w:gridSpan w:val="3"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:ind w:left="1440"/><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>GRADE/SIZE</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2337" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>NO. OF CARTONS</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1060" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Line Item Rows -->
  ${lineRowsXml}

  <!-- Total Row -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="507"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="3168" w:type="dxa"/><w:gridSpan w:val="3"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:ind w:left="1440"/><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>TOTAL</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2337" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${totalCartons}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${totalWeight.toFixed(3)}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1060" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${totalAmount.toFixed(2)}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 15: Container / Seal / Net Weight / Gross Weight -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="343"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="7555" w:type="dxa"/><w:gridSpan w:val="9"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Container Number :  ${escapeXml(containerNo)}</w:t></w:r>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">      Seal Number :  ${escapeXml(sealNo)}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Net weight: Kgs    :  ${netWeight ? (typeof netWeight === 'number' ? netWeight.toFixed(3) : netWeight) : ''}</w:t></w:r>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">                                              Gross weight Kgs :  ${grossWeight ? (typeof grossWeight === 'number' ? grossWeight.toFixed(3) : grossWeight) : ''}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 16: Amount in Words -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="435"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="7555" w:type="dxa"/><w:gridSpan w:val="9"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">Amount chargeable (in words): </w:t></w:r>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(finalAmountWords)}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1337" w:type="dxa"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 17: Processed & Packed by, Factory Approval, BL Number -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="819"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="8892" w:type="dxa"/><w:gridSpan w:val="10"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">PROCESSED &amp; PACKED BY:  ${escapeXml(inv.factoryNameAndAddress || (exporterName + (exporterAddress ? ', ' + exporterAddress.replace(/\n/g, ', ') : '')))}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">APPROVAL NUMBER OF THE FACTORY : ${escapeXml(inv.factoryApprovalNumber || '')}</w:t></w:r>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">     BILL OF LADING NUMBER: ${escapeXml(inv.billOfLadingNo || '')}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>

  <!-- Row 18: Declaration & Signature Block -->
  <w:tr w:rsidR="00687369" w:rsidRPr="00197130" w14:paraId="${randId()}" w14:textId="77777777" w:rsidTr="005F79C3">
    <w:trPr><w:trHeight w:val="630"/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="5535" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Declaration:  </w:t></w:r>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(inv.declarationText || 'We certify that this invoice shows the actual price of the goods described and that all particulars are true and correct')}</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="3357" w:type="dxa"/><w:gridSpan w:val="4"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">          </w:t></w:r>
        ${signatoryCompany ? `<w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(signatoryCompany)}</w:t></w:r>` : ''}
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${formatDDMMYYYY(signatureDate)}</w:t></w:r>
      </w:p>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369" w:rsidRPr="00AA1D6A" w:rsidRDefault="00687369" w:rsidP="005F79C3">
        <w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr>
        <w:r w:rsidRPr="0073267B"><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>Signature &amp; Date${signatoryDesignation ? ' (' + escapeXml(signatoryDesignation) + ')' : ''}</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
  `;
}

export async function exportInvoiceToWord(invoice: Partial<SalesInvoice>, settings?: BusinessSettings): Promise<void> {
  const zip = await JSZip.loadAsync(SAMPLE_DOCX_TEMPLATE_BASE64, { base64: true });
  const origXml = await zip.file('word/document.xml')?.async('string');

  if (!origXml) {
    throw new Error('Invalid template: word/document.xml not found.');
  }

  const firstRow = origXml.indexOf('<w:tr');
  const lastRow = origXml.lastIndexOf('</w:tr>') + 7;

  if (firstRow === -1 || lastRow <= firstRow) {
    throw new Error('Unable to locate table row boundaries in template document.');
  }

  const headerXml = origXml.substring(0, firstRow);
  const footerXml = origXml.substring(lastRow);

  const tableRowsXml = buildInvoiceTableXml(invoice, settings);
  const newDocumentXml = headerXml + tableRowsXml + footerXml;

  zip.file('word/document.xml', newDocumentXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });

  const safeFilename = (invoice.invoiceNo || 'Export_Invoice')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim() + '.docx';

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
