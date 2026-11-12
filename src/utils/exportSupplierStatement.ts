import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type {
  Supplier,
  Purchase,
  PaymentRecord,
  PurchaseReturn,
  Species,
  BankAccount,
  BusinessSettings
} from '../types/index.ts';
import { SAMPLE_DOCX_TEMPLATE_BASE64 } from './sampleDocxTemplateBase64.ts';
import { formatDDMMYYYY } from './exportWordInvoice.ts';

export interface SupplierLedgerStatementRow {
  id: string;
  date: string;
  formattedDate: string;
  type: 'PURCHASE' | 'PAYMENT' | 'RETURN';
  purchaseId: string;
  briefDetails: string;
  weightKg: number | null;
  purchaseRatePerKg: number | null;
  expenseRatePerKg: number | null; // Null (kept strictly blank) when there is no expense
  purchaseValue: number | null;
  damageAmount: number | null;
  expenseValue: number | null; // Null (kept strictly blank) when there is no expense
  debitAmount: number; // Total Purchase amount shown as Debit
  creditAmount: number; // Payment / Return amount shown as Credit
  runningBalance: number;
}

export interface SupplierLedgerStatementResult {
  rows: SupplierLedgerStatementRow[];
  openingBalance: number;
  totalWeightKg: number;
  totalPurchaseValue: number;
  totalExpenseValue: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
}

export interface BuildSupplierLedgerParams {
  supplier?: Supplier;
  purchases: Purchase[];
  payments: PaymentRecord[];
  purchaseReturns?: PurchaseReturn[];
  species?: Species[];
  bankAccounts?: BankAccount[];
  startDate?: string;
  endDate?: string;
}

function formatINRNum(num: number): string {
  return '₹' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeXml(str: unknown): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function randId(): string {
  return Math.floor(Math.random() * 0xffffff + 0x100000).toString(16).toUpperCase();
}

export function buildSupplierLedgerStatement(
  params: BuildSupplierLedgerParams
): SupplierLedgerStatementResult {
  const {
    supplier,
    purchases,
    payments,
    purchaseReturns = [],
    species = [],
    bankAccounts = [],
    startDate,
    endDate
  } = params;

  const supplierId = supplier?.id || '';
  const speciesMap = new Map(species.map((s) => [s.id, s]));
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]));

  const supplierPurchases = supplierId
    ? purchases.filter((p) => p.supplierId === supplierId && !p.isVoided)
    : [];

  const supplierPayments = supplierId
    ? payments.filter((pay) => pay.supplierId === supplierId && !pay.isVoided)
    : [];

  const supplierReturns = supplierId
    ? purchaseReturns.filter(
        (ret) => ret.supplierId === supplierId && !ret.isVoided && ret.adjustSupplierPayable !== false
      )
    : [];

  const directPurchasePayments = supplierPurchases
    .filter((p) => (p.amountPaid || 0) > 0)
    .map((p) => ({
      id: `dir-pay-${p.id}`,
      paymentNo: `PAY-DIR-${p.purchaseId}`,
      paymentDate: p.paymentDate || p.purchaseDate,
      amount: Number(p.amountPaid || 0),
      paidFromAccountId: p.paidFromAccountId || '',
      paymentMode: 'Direct Purchase Payment',
      notes: `Direct Payment (${p.invoiceNo || p.purchaseId})`
    }));

  interface RawEvent {
    date: string;
    type: 'PURCHASE' | 'PAYMENT' | 'RETURN';
    purchaseId: string;
    briefDetails: string;
    weightKg: number | null;
    purchaseRatePerKg: number | null;
    expenseRatePerKg: number | null;
    purchaseValue: number | null;
    damageAmount: number | null;
    expenseValue: number | null;
    debit: number;
    credit: number;
  }

  const rawEvents: RawEvent[] = [];

  supplierPurchases.forEach((p) => {
    const weightKg = Number(p.weightKg || 0);
    const ratePerKg = Number(p.ratePerKg || 0);
    const rawPurchaseVal = p.purchaseValue !== undefined ? Number(p.purchaseValue) : Number((weightKg * ratePerKg).toFixed(2));
    const damageAmt = Number(p.damageAmount || 0);
    const netPurchaseValue =
      p.grossPurchaseValue !== undefined
        ? Number(p.grossPurchaseValue)
        : Number(Math.max(0, rawPurchaseVal - damageAmt).toFixed(2));
    const expenseValNum = Number(p.totalExpenses || 0);
    const hasExpense = expenseValNum > 0;
    const expenseRate =
      hasExpense && weightKg > 0 ? Number((expenseValNum / weightKg).toFixed(2)) : null;
    const totalPurchaseAmount =
      p.totalCost !== undefined
        ? Number(p.totalCost)
        : Number((netPurchaseValue + expenseValNum).toFixed(2));

    const specName = speciesMap.get(p.speciesId)?.name;
    const detailParts: string[] = [];
    if (specName) detailParts.push(specName);
    if (p.invoiceNo) detailParts.push(`Inv: ${p.invoiceNo}`);
    if (damageAmt > 0) detailParts.push(`After Dmg: -${formatINRNum(damageAmt)}`);
    const briefDetails = detailParts.length > 0 ? detailParts.join(' · ') : 'Harbour Purchase';

    rawEvents.push({
      date: p.purchaseDate,
      type: 'PURCHASE',
      purchaseId: p.purchaseId,
      briefDetails,
      weightKg,
      purchaseRatePerKg: ratePerKg,
      expenseRatePerKg: expenseRate,
      purchaseValue: netPurchaseValue,
      damageAmount: damageAmt > 0 ? damageAmt : null,
      expenseValue: hasExpense ? Number(expenseValNum.toFixed(2)) : null,
      debit: totalPurchaseAmount,
      credit: 0
    });
  });

  supplierPayments.forEach((pay) => {
    const bank = bankMap.get(pay.paidFromAccountId)?.name || 'Bank';
    const refText = pay.referenceNo ? ` · Ref: ${pay.referenceNo}` : '';
    rawEvents.push({
      date: pay.paymentDate,
      type: 'PAYMENT',
      purchaseId: pay.paymentNo,
      briefDetails: `Payment: ${pay.paymentMode} via ${bank}${refText}`,
      weightKg: null,
      purchaseRatePerKg: null,
      expenseRatePerKg: null,
      purchaseValue: null,
      damageAmount: null,
      expenseValue: null,
      debit: 0,
      credit: Number(pay.amount || 0)
    });
  });

  directPurchasePayments.forEach((dirPay) => {
    const bank = bankMap.get(dirPay.paidFromAccountId)?.name || 'Harbour Float';
    rawEvents.push({
      date: dirPay.paymentDate,
      type: 'PAYMENT',
      purchaseId: dirPay.paymentNo,
      briefDetails: `${dirPay.notes} via ${bank}`,
      weightKg: null,
      purchaseRatePerKg: null,
      expenseRatePerKg: null,
      purchaseValue: null,
      damageAmount: null,
      expenseValue: null,
      debit: 0,
      credit: dirPay.amount
    });
  });

  supplierReturns.forEach((ret) => {
    const spec = ret.speciesId ? speciesMap.get(ret.speciesId) : undefined;
    const specName = spec?.name || 'Seafood';
    const linkedInfo = ret.purchaseRefNo ? ` (Ref: ${ret.purchaseRefNo})` : '';
    rawEvents.push({
      date: ret.returnDate,
      type: 'RETURN',
      purchaseId: ret.returnNo,
      briefDetails: `Debit Note (${ret.reason}): ${ret.returnedWeightKg}Kg ${specName} @ ₹${ret.ratePerKg}/Kg${linkedInfo}`,
      weightKg: null,
      purchaseRatePerKg: null,
      expenseRatePerKg: null,
      purchaseValue: null,
      damageAmount: null,
      expenseValue: null,
      debit: 0,
      credit: Number(ret.returnedValue || 0)
    });
  });

  // Sort chronologically by date; on same date show purchases before returns/payments
  const typeRank: Record<RawEvent['type'], number> = { PURCHASE: 0, RETURN: 1, PAYMENT: 2 };
  rawEvents.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return typeRank[a.type] - typeRank[b.type];
  });

  const filteredEvents = rawEvents.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  const openingBalance = Number((supplier?.openingBalance || 0).toFixed(2));
  let running = openingBalance;

  const rows: SupplierLedgerStatementRow[] = filteredEvents.map((e, idx) => {
    running = running + e.debit - e.credit;
    return {
      id: `led-${idx}`,
      date: e.date,
      formattedDate: formatDDMMYYYY(e.date) || e.date,
      type: e.type,
      purchaseId: e.purchaseId,
      briefDetails: e.briefDetails,
      weightKg: e.weightKg,
      purchaseRatePerKg: e.purchaseRatePerKg,
      expenseRatePerKg: e.expenseRatePerKg,
      purchaseValue: e.purchaseValue,
      damageAmount: e.damageAmount,
      expenseValue: e.expenseValue,
      debitAmount: Number(e.debit.toFixed(2)),
      creditAmount: Number(e.credit.toFixed(2)),
      runningBalance: Number(running.toFixed(2))
    };
  });

  const totalWeightKg = Number(rows.reduce((s, r) => s + (r.weightKg || 0), 0).toFixed(2));
  const totalPurchaseValue = Number(rows.reduce((s, r) => s + (r.purchaseValue || 0), 0).toFixed(2));
  const totalExpenseValue = Number(rows.reduce((s, r) => s + (r.expenseValue || 0), 0).toFixed(2));
  const totalDebits = Number(rows.reduce((s, r) => s + r.debitAmount, 0).toFixed(2));
  const totalCredits = Number(rows.reduce((s, r) => s + r.creditAmount, 0).toFixed(2));
  const closingBalance = Number((openingBalance + totalDebits - totalCredits).toFixed(2));

  return {
    rows,
    openingBalance,
    totalWeightKg,
    totalPurchaseValue,
    totalExpenseValue,
    totalDebits,
    totalCredits,
    closingBalance
  };
}

/**
 * Builds Excel workbook data rows with the requested Supplier Ledger Statement columns.
 * Expense rate/kg and Expense value remain strictly blank ('') when there is no expense.
 */
export function buildSupplierLedgerExcelSheetData(
  statement: SupplierLedgerStatementResult,
  supplier?: Supplier,
  businessSettings?: BusinessSettings,
  startDate?: string,
  endDate?: string
): (string | number)[][] {
  const companyName = businessSettings?.businessName || 'Coastal Marine Traders';
  const periodLabel =
    startDate || endDate
      ? `${startDate ? formatDDMMYYYY(startDate) : 'Beginning'} to ${endDate ? formatDDMMYYYY(endDate) : 'Date'}`
      : 'All Dates';

  const sheetData: (string | number)[][] = [
    [companyName.toUpperCase()],
    ['SUPPLIER ACCOUNT LEDGER STATEMENT'],
    [
      'Supplier:',
      supplier ? `${supplier.name} (${supplier.code})` : 'N/A',
      'Period:',
      periodLabel,
      'Generated:',
      formatDDMMYYYY(new Date().toISOString().split('T')[0])
    ],
    [],
    [
      'Purchase ID / Voucher Ref',
      'Date',
      'Details',
      'Weight (Kg)',
      'Purchase Rate / Kg (INR)',
      'Expense Rate / Kg (INR)',
      'Purchase Value (INR)',
      'Expense Value (INR)',
      'Debit - Total Purchase (INR)',
      'Credit - Payment (INR)',
      'Running Balance (INR)'
    ],
    [
      '',
      startDate ? formatDDMMYYYY(startDate) : 'Opening',
      'Opening Balance Brought Forward',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      statement.openingBalance
    ]
  ];

  statement.rows.forEach((row) => {
    sheetData.push([
      row.purchaseId,
      row.formattedDate,
      row.briefDetails,
      row.weightKg !== null ? row.weightKg : '',
      row.purchaseRatePerKg !== null ? row.purchaseRatePerKg : '',
      row.expenseRatePerKg !== null ? row.expenseRatePerKg : '',
      row.purchaseValue !== null ? row.purchaseValue : '',
      row.expenseValue !== null ? row.expenseValue : '',
      row.debitAmount > 0 ? row.debitAmount : '',
      row.creditAmount > 0 ? row.creditAmount : '',
      row.runningBalance
    ]);
  });

  sheetData.push([
    'TOTALS',
    '',
    'Totals & Net Closing Payable Balance',
    statement.totalWeightKg > 0 ? statement.totalWeightKg : '',
    '',
    '',
    statement.totalPurchaseValue > 0 ? statement.totalPurchaseValue : '',
    statement.totalExpenseValue > 0 ? statement.totalExpenseValue : '',
    statement.totalDebits,
    statement.totalCredits,
    statement.closingBalance
  ]);

  return sheetData;
}

export function exportSupplierLedgerToExcel(
  statement: SupplierLedgerStatementResult,
  supplier?: Supplier,
  businessSettings?: BusinessSettings,
  startDate?: string,
  endDate?: string
): void {
  const aoa = buildSupplierLedgerExcelSheetData(statement, supplier, businessSettings, startDate, endDate);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 13 },
    { wch: 36 },
    { wch: 13 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Supplier Ledger');
  const safeSupplier = (supplier?.code || supplier?.name || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeSupplier}_Ledger_Statement_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function buildTextCell(
  widthDxa: number,
  fillHex: string,
  text: string,
  options?: {
    align?: 'left' | 'right' | 'center';
    bold?: boolean;
    italic?: boolean;
    colorHex?: string;
    sizeHalfPt?: number;
    subText?: string;
    subColorHex?: string;
  }
): string {
  const align = options?.align || 'left';
  const boldXml = options?.bold ? '<w:b/>' : '';
  const italicXml = options?.italic ? '<w:i/>' : '';
  const color = options?.colorHex || '0F172A';
  const sz = options?.sizeHalfPt || 15;
  const subXml = options?.subText
    ? `<w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
         <w:pPr><w:jc w:val="${align}"/><w:spacing w:before="0" w:after="0"/><w:rPr><w:color w:val="${options.subColorHex || '64748B'}"/><w:sz w:val="12"/><w:szCs w:val="12"/></w:rPr></w:pPr>
         <w:r><w:rPr><w:color w:val="${options.subColorHex || '64748B'}"/><w:sz w:val="12"/><w:szCs w:val="12"/></w:rPr><w:t>${escapeXml(options.subText)}</w:t></w:r>
       </w:p>`
    : '';

  return `
    <w:tc>
      <w:tcPr><w:tcW w:w="${widthDxa}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${fillHex}"/></w:tcPr>
      <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
        <w:pPr><w:jc w:val="${align}"/><w:spacing w:before="0" w:after="${options?.subText ? '20' : '0'}"/><w:rPr>${boldXml}${italicXml}<w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>
        <w:r><w:rPr>${boldXml}${italicXml}<w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r>
      </w:p>
      ${subXml}
    </w:tc>
  `;
}

export function buildSupplierLedgerWordTableXml(
  statement: SupplierLedgerStatementResult,
  supplier?: Supplier,
  businessSettings?: BusinessSettings,
  startDate?: string,
  endDate?: string
): string {
  const companyName = businessSettings?.businessName || 'Coastal Marine Traders';
  const companyAddr = [businessSettings?.address, businessSettings?.district, businessSettings?.state]
    .filter(Boolean)
    .join(', ') || 'Headquarters';
  const todayStr = formatDDMMYYYY(new Date().toISOString().split('T')[0]);
  const periodLabel =
    startDate || endDate
      ? `${startDate ? formatDDMMYYYY(startDate) : 'Start'} to ${endDate ? formatDDMMYYYY(endDate) : 'Today'}`
      : 'All Dates';

  // 10 columns summing strictly to 9026 dxa (matches template width)
  const W = [1280, 820, 740, 760, 740, 926, 840, 980, 960, 980];

  const headers = [
    { title: 'Purchase ID', align: 'left' as const },
    { title: 'Date', align: 'left' as const },
    { title: 'Weight (Kg)', align: 'right' as const },
    { title: 'Pur. Rate/Kg', align: 'right' as const },
    { title: 'Exp. Rate/Kg', align: 'right' as const },
    { title: 'Purchase Value', align: 'right' as const },
    { title: 'Expense Value', align: 'right' as const },
    { title: 'Debit (₹)', align: 'right' as const },
    { title: 'Credit (₹)', align: 'right' as const },
    { title: 'Balance (₹)', align: 'right' as const }
  ];

  const headerCellsXml = headers
    .map((h, i) =>
      buildTextCell(W[i], '0F172A', h.title, {
        align: h.align,
        bold: true,
        colorHex: 'FFFFFF',
        sizeHalfPt: 14
      })
    )
    .join('');

  const openingRowXml = `
    <w:tr w:rsidR="00687369">
      ${buildTextCell(W[0], 'FFF1F2', 'Opening', { bold: true, italic: true, colorHex: '881337', subText: 'Opening Balance B/F' })}
      ${buildTextCell(W[1], 'FFF1F2', startDate ? formatDDMMYYYY(startDate) : '—', { italic: true, colorHex: '64748B' })}
      ${buildTextCell(W[2], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[3], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[4], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[5], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[6], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[7], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[8], 'FFF1F2', '', { align: 'right' })}
      ${buildTextCell(W[9], 'FFF1F2', formatINRNum(statement.openingBalance), { align: 'right', bold: true, colorHex: '881337' })}
    </w:tr>
  `;

  const entryRowsXml = statement.rows
    .map((row, idx) => {
      const bg = row.type === 'RETURN' ? 'FFFBEB' : idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      const idColor = row.type === 'PURCHASE' ? '9F1239' : row.type === 'RETURN' ? 'B45309' : '065F46';

      return `
      <w:tr w:rsidR="00687369">
        ${buildTextCell(W[0], bg, row.purchaseId, { bold: true, colorHex: idColor, sizeHalfPt: 14, subText: row.briefDetails })}
        ${buildTextCell(W[1], bg, row.formattedDate, { sizeHalfPt: 14 })}
        ${buildTextCell(W[2], bg, row.weightKg !== null ? `${row.weightKg.toLocaleString('en-IN')} Kg` : '', { align: 'right', sizeHalfPt: 14 })}
        ${buildTextCell(W[3], bg, row.purchaseRatePerKg !== null ? formatINRNum(row.purchaseRatePerKg) : '', { align: 'right', sizeHalfPt: 14 })}
        ${buildTextCell(W[4], bg, row.expenseRatePerKg !== null ? formatINRNum(row.expenseRatePerKg) : '', { align: 'right', sizeHalfPt: 14 })}
        ${buildTextCell(W[5], bg, row.purchaseValue !== null ? formatINRNum(row.purchaseValue) : '', { align: 'right', sizeHalfPt: 14 })}
        ${buildTextCell(W[6], bg, row.expenseValue !== null ? formatINRNum(row.expenseValue) : '', { align: 'right', sizeHalfPt: 14 })}
        ${buildTextCell(W[7], bg, row.debitAmount > 0 ? formatINRNum(row.debitAmount) : '', { align: 'right', bold: true, colorHex: '9F1239', sizeHalfPt: 14 })}
        ${buildTextCell(W[8], bg, row.creditAmount > 0 ? formatINRNum(row.creditAmount) : '', { align: 'right', bold: true, colorHex: '047857', sizeHalfPt: 14 })}
        ${buildTextCell(W[9], bg, formatINRNum(row.runningBalance), { align: 'right', bold: true, colorHex: '0F172A', sizeHalfPt: 14 })}
      </w:tr>
      `;
    })
    .join('');

  const totalsRowXml = `
    <w:tr w:rsidR="00687369">
      ${buildTextCell(W[0], 'F1F5F9', 'TOTALS', { bold: true, colorHex: '0F172A', sizeHalfPt: 15, subText: 'Closing Net Balance' })}
      ${buildTextCell(W[1], 'F1F5F9', '', { bold: true })}
      ${buildTextCell(W[2], 'F1F5F9', statement.totalWeightKg > 0 ? `${statement.totalWeightKg.toLocaleString('en-IN')} Kg` : '', { align: 'right', bold: true, sizeHalfPt: 14 })}
      ${buildTextCell(W[3], 'F1F5F9', '', { align: 'right' })}
      ${buildTextCell(W[4], 'F1F5F9', '', { align: 'right' })}
      ${buildTextCell(W[5], 'F1F5F9', statement.totalPurchaseValue > 0 ? formatINRNum(statement.totalPurchaseValue) : '', { align: 'right', bold: true, sizeHalfPt: 14 })}
      ${buildTextCell(W[6], 'F1F5F9', statement.totalExpenseValue > 0 ? formatINRNum(statement.totalExpenseValue) : '', { align: 'right', bold: true, sizeHalfPt: 14 })}
      ${buildTextCell(W[7], 'F1F5F9', formatINRNum(statement.totalDebits), { align: 'right', bold: true, colorHex: '9F1239', sizeHalfPt: 15 })}
      ${buildTextCell(W[8], 'F1F5F9', formatINRNum(statement.totalCredits), { align: 'right', bold: true, colorHex: '047857', sizeHalfPt: 15 })}
      ${buildTextCell(W[9], 'FFF1F2', formatINRNum(statement.closingBalance), { align: 'right', bold: true, colorHex: '9F1239', sizeHalfPt: 15 })}
    </w:tr>
  `;

  return `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9026" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
        <w:left w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
        <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
        <w:right w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="80" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:left w:w="70" w:type="dxa"/>
        <w:right w:w="70" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>

    <!-- Header Banner Row -->
    <w:tr w:rsidR="00687369">
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="9026" w:type="dxa"/><w:gridSpan w:val="10"/>
          <w:shd w:val="clear" w:color="auto" w:fill="9F1239"/>
        </w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(companyName.toUpperCase())}</w:t></w:r>
        </w:p>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:jc w:val="center"/><w:rPr><w:color w:val="FFE4E6"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="FFE4E6"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>SUPPLIER STATEMENT OF ACCOUNT (${escapeXml(periodLabel)} · Generated: ${todayStr})</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>

    <!-- Company & Party Info Row -->
    <w:tr w:rsidR="00687369">
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="4340" w:type="dxa"/><w:gridSpan w:val="5"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
        </w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t>Supplier: ${escapeXml(supplier?.name || 'N/A')} (${escapeXml(supplier?.code || '')})</w:t></w:r>
        </w:p>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:rPr><w:color w:val="475569"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t>${escapeXml([supplier?.contactPerson, supplier?.phone, supplier?.address].filter(Boolean).join(' · ') || companyAddr)}</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="4686" w:type="dxa"/><w:gridSpan w:val="5"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
        </w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:jc w:val="right"/><w:rPr><w:b/><w:color w:val="9F1239"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr><w:t>Closing Net Payable: </w:t></w:r>
          <w:r><w:rPr><w:b/><w:color w:val="9F1239"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${escapeXml(formatINRNum(statement.closingBalance))}</w:t></w:r>
        </w:p>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:jc w:val="right"/><w:rPr><w:color w:val="475569"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t>GSTIN: ${escapeXml(supplier?.gstin || 'Unregistered')} · A/c: ${escapeXml(supplier?.bankAccount || 'N/A')} (${escapeXml(supplier?.bankIfsc || 'N/A')})</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>

    <!-- Table Headers -->
    <w:tr w:rsidR="00687369">
      <w:trPr><w:tblHeader/></w:trPr>
      ${headerCellsXml}
    </w:tr>

    ${openingRowXml}
    ${entryRowsXml}
    ${totalsRowXml}

    <!-- Signatory Row -->
    <w:tr w:rsidR="00687369">
      <w:tc>
        <w:tcPr><w:tcW w:w="4340" w:type="dxa"/><w:gridSpan w:val="5"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:rPr><w:color w:val="64748B"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr><w:t>Prepared By Accounts Dept · Authorized Signatory (${escapeXml(companyName)})</w:t></w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="4686" w:type="dxa"/><w:gridSpan w:val="5"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:tcPr>
        <w:p w14:paraId="${randId()}" w14:textId="77777777" w:rsidR="00687369">
          <w:pPr><w:jc w:val="right"/><w:rPr><w:color w:val="64748B"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr></w:pPr>
          <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr><w:t>Supplier Acknowledgement · Sign &amp; Stamp (${escapeXml(supplier?.name || 'Supplier')})</w:t></w:r>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
  `;
}

export async function exportSupplierLedgerToWord(
  statement: SupplierLedgerStatementResult,
  supplier?: Supplier,
  businessSettings?: BusinessSettings,
  startDate?: string,
  endDate?: string
): Promise<void> {
  const zip = await JSZip.loadAsync(SAMPLE_DOCX_TEMPLATE_BASE64, { base64: true });
  const origXml = await zip.file('word/document.xml')?.async('string');

  if (!origXml) {
    throw new Error('Invalid Word template: word/document.xml not found.');
  }

  const firstTable = origXml.indexOf('<w:tbl');
  const lastTable = origXml.lastIndexOf('</w:tbl>') + 8;

  if (firstTable === -1 || lastTable <= firstTable) {
    throw new Error('Unable to locate table boundaries in Word template document.');
  }

  let headerXml = origXml.substring(0, firstTable);
  headerXml = headerXml.replace(/<w:t>INVOICE<\/w:t>/g, '<w:t></w:t>');

  const footerXml = origXml.substring(lastTable);
  const tableXml = buildSupplierLedgerWordTableXml(statement, supplier, businessSettings, startDate, endDate);

  zip.file('word/document.xml', headerXml + tableXml + footerXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });

  const safeSupplier = (supplier?.code || supplier?.name || 'Supplier').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${safeSupplier}_Ledger_Statement_${new Date().toISOString().split('T')[0]}.docx`;

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
