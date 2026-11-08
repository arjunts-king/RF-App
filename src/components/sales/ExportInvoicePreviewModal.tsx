import React from 'react';
import { SalesInvoice, BusinessSettings, Customer, PortMaster } from '../../types';
import { exportInvoiceToWord, formatDDMMYYYY, numberToWordsInternational } from '../../utils/exportWordInvoice';
import { Download, Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface ExportInvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Partial<SalesInvoice> | null;
  settings?: BusinessSettings;
  customers?: Customer[];
  ports?: PortMaster[];
}

export const ExportInvoicePreviewModal: React.FC<ExportInvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  customers,
  ports
}) => {
  if (!isOpen || !invoice) return null;

  const foundConsignee = customers?.find((c) => c.id === invoice.consigneeId);
  const foundBuyer = customers?.find((c) => c.id === invoice.buyerId);
  const foundPol = ports?.find((p) => p.id === invoice.portOfLoadingId);
  const foundPod = ports?.find((p) => p.id === invoice.portOfDischargeId);
  const foundDest = ports?.find((p) => p.id === invoice.finalDestinationId);

  const exporterName = invoice.exporterName || settings?.businessName || '';
  const exporterAddress = invoice.exporterAddress || settings?.address || '';
  const invoiceNo = invoice.invoiceNo || '';
  const invoiceDate = invoice.invoiceDate || '';
  const exporterRef = invoice.exporterRef || invoice.internalInvoiceNo || (invoice.salesOrderNo && invoice.salesOrderNo !== invoiceNo ? invoice.salesOrderNo : '') || invoiceNo;
  const orderNo = invoice.orderNo || '';
  const orderDate = invoice.orderDate || '';
  const otherReferences = invoice.otherReferences || '';

  const rawConsigneeName = invoice.consigneeName || foundConsignee?.name || '';
  const consigneeName = rawConsigneeName !== 'John Trading Co.,' ? rawConsigneeName : '';
  const rawConsigneeAddress = invoice.consigneeAddress || foundConsignee?.address || '';
  const consigneeAddress = !rawConsigneeAddress.includes('Bangkok 10110') ? rawConsigneeAddress : '';

  const rawBuyerName = invoice.buyerName || foundBuyer?.name || '';
  const buyerName = rawBuyerName !== 'ABC Pvt. Ltd.' ? rawBuyerName : '';
  const rawBuyerAddress = invoice.buyerAddress || foundBuyer?.address || '';
  const buyerAddress = rawBuyerAddress !== 'Bangkok, Thailand' ? rawBuyerAddress : '';

  const countryOfOrigin = invoice.countryOfOrigin || 'India';
  const countryOfDestination = invoice.countryOfDestination || foundConsignee?.country || foundPod?.country || '';
  const preCarriageBy = invoice.preCarriageBy || '';
  const placeOfReceipt = invoice.placeOfReceipt || '';
  const termsOfPayment = invoice.termsOfPayment || 'Net 45';
  const priceTerms = invoice.priceTerms || 'FOB Cochin';
  const vesselFlightNo = invoice.vesselFlightNo && invoice.vesselFlightNo !== 'MOGRAL 119W' ? invoice.vesselFlightNo : '';
  const portOfLoading = invoice.portOfLoading || (foundPol ? `${foundPol.name}, ${foundPol.country}` : 'Cochin Port, India');
  const portOfDischarge = invoice.portOfDischarge || (foundPod ? `${foundPod.name}, ${foundPod.country}` : '');
  const finalDestination = invoice.finalDestination || (foundDest ? `${foundDest.name}, ${foundDest.country}` : '');
  const currency = invoice.currency || 'USD';

  const commodityDescription = invoice.commodityDescription && invoice.commodityDescription !== 'FROZEN SEAFOOD' ? invoice.commodityDescription : '';
  const packingDescription = invoice.packingDescription && invoice.packingDescription !== '1X10KG' ? invoice.packingDescription : '';
  const scientificName = invoice.scientificName && invoice.scientificName !== 'RASTRELLIGER KANAGURTA' ? invoice.scientificName : '';
  const shippingMarks = invoice.shippingMarks && invoice.shippingMarks !== 'MERIT D.S' ? invoice.shippingMarks : '';
  const containerNo = invoice.containerNo && invoice.containerNo !== 'ONEU90399086' ? invoice.containerNo : '';
  const sealNo = invoice.sealNo && invoice.sealNo !== 'IN567892' ? invoice.sealNo : '';

  const lineItems = invoice.lineItems || [];
  const totalCartons = invoice.totalCartons !== undefined
    ? invoice.totalCartons
    : lineItems.reduce((acc, l) => acc + (l.cartonsCount || 0), 0);
  const totalWeightKg = invoice.totalWeightKg !== undefined
    ? invoice.totalWeightKg
    : lineItems.reduce((acc, l) => acc + (l.weightKg || 0), 0);
  const totalAmountCurrency = invoice.totalAmountCurrency !== undefined
    ? invoice.totalAmountCurrency
    : lineItems.reduce((acc, l) => acc + (l.amountCurrency || (l.weightKg || 0) * (l.ratePerKg || 0)), 0);

  const netWeightKg = invoice.netWeightKg !== undefined ? invoice.netWeightKg : totalWeightKg;
  const grossWeightKg = invoice.grossWeightKg !== undefined ? invoice.grossWeightKg : '';

  const priceTermsPrefix = priceTerms ? priceTerms.split(' ')[0].toUpperCase() : '';
  const defaultAmountWords = totalAmountCurrency > 0
    ? `${priceTermsPrefix ? priceTermsPrefix + ' ' : ''}${currency === 'USD' ? 'U.S. DOLLARS' : currency}: ${numberToWordsInternational(totalAmountCurrency)}`
    : '';
  const amountInWords = invoice.amountInWords || defaultAmountWords;

  const factoryNameAndAddress = invoice.factoryNameAndAddress || (exporterName ? `${exporterName}${exporterAddress ? ', ' + exporterAddress.replace(/\n/g, ', ') : ''}` : '');
  const factoryApprovalNumber = invoice.factoryApprovalNumber || '';
  const billOfLadingNo = invoice.billOfLadingNo || '';
  const declarationText = invoice.declarationText || (invoice.id ? 'We certify that this invoice shows the actual price of the goods described and that all particulars are true and correct' : '');
  const signatoryCompany = invoice.signatoryCompany || (settings?.businessName ? `For ${settings.businessName}` : '');
  const signatoryDesignation = invoice.signatoryDesignation || '';
  const signatureDate = invoice.signatureDate || invoiceDate;

  const handleDownload = async () => {
    try {
      await exportInvoiceToWord(invoice, settings);
    } catch (err: any) {
      alert(`Export error: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-ink-900/40 fixed inset-0" onClick={onClose} />

      <div className="relative bg-neutral-100 rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none print:bg-white print:my-0 print:border-none">
        {/* Top Control Toolbar (Hidden in print) */}
        <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-ink-900">Word Document Replica Preview</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Exact Sample Alignment
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                Invoice No: <strong>{invoiceNo}</strong> · Previewing layout before downloading .docx
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Word (.docx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-ink-400 hover:text-ink-700 hover:bg-gray-100 rounded-xl transition"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container Body */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-neutral-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Simulated A4 Sheet */}
          <div className="max-w-[850px] mx-auto bg-white p-6 sm:p-10 shadow-xl rounded-sm border border-gray-300 font-serif text-[11px] leading-tight text-black print:p-0 print:shadow-none print:border-none print:max-w-none">
            {/* INVOICE Title */}
            <div className="text-center font-bold text-sm tracking-widest uppercase mb-3 text-black">
              INVOICE
            </div>

            {/* Master Table replicating word/document.xml */}
            <table className="w-full border-collapse border border-black text-[11px] text-black">
              <tbody>
                {/* ROW 1: Exporter (left) & Invoice No / Exporter's Ref (right) */}
                <tr>
                  <td rowSpan={3} className="border border-black p-2 align-top w-[52%]">
                    <div className="font-bold">Exporter/Shipper</div>
                    <div className="font-bold mt-2 text-xs">{exporterName}</div>
                    <div className="font-bold whitespace-pre-line text-[11px] mt-0.5">{exporterAddress}</div>
                  </td>
                  <td colSpan={2} className="border border-black p-1.5 align-top w-[48%]">
                    <div className="font-bold flex justify-between text-[10px]">
                      <span>Invoice No.&amp; Date</span>
                      <span>Exporter’s Ref.</span>
                    </div>
                    <div className="font-bold mt-1 text-[11px]">
                      {invoiceNo} DTD. {formatDDMMYYYY(invoiceDate)}
                      {exporterRef && exporterRef !== invoiceNo ? `   ${exporterRef}` : ''}
                    </div>
                  </td>
                </tr>

                {/* ROW 2: Buyer's Order No. & Date */}
                <tr>
                  <td colSpan={2} className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Buyer’s Order No.&amp; Date</div>
                    <div className="font-bold mt-0.5 text-[11px]">
                      {orderNo ? (orderNo.toUpperCase().startsWith('PI') ? '' : 'PI NO: ') + orderNo : ''}
                      {orderDate ? ` DTD. ${formatDDMMYYYY(orderDate)}` : ''}
                    </div>
                  </td>
                </tr>

                {/* ROW 3: Other References */}
                <tr>
                  <td colSpan={2} className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Other References(s)</div>
                    <div className="font-bold mt-0.5 text-[11px]">{otherReferences}</div>
                  </td>
                </tr>

                {/* ROW 4: Consignee & Buyer */}
                <tr>
                  <td rowSpan={2} className="border border-black p-2 align-top">
                    <div className="font-bold">Consignee</div>
                    <div className="font-bold mt-1.5 text-xs">{consigneeName}</div>
                    <div className="font-bold whitespace-pre-line text-[11px] mt-0.5">{consigneeAddress}</div>
                  </td>
                  <td colSpan={2} className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Buyer (if other than consignee)</div>
                    <div className="font-bold mt-1 text-[11px]">{buyerName}</div>
                    {buyerAddress && <div className="font-bold whitespace-pre-line text-[11px] mt-0.5">{buyerAddress}</div>}
                  </td>
                </tr>

                {/* ROW 5: Origin & Final Destination */}
                <tr>
                  <td className="border border-black p-1.5 align-top w-[24%]">
                    <div className="font-bold text-[10px]">Country of Origin of Goods</div>
                    <div className="font-bold text-center mt-1 text-[11px]">{countryOfOrigin}</div>
                  </td>
                  <td className="border border-black p-1.5 align-top w-[24%]">
                    <div className="font-bold text-[10px]">Country of final Destination</div>
                    <div className="font-bold text-center mt-1 text-[11px]">{countryOfDestination}</div>
                  </td>
                </tr>

                {/* ROW 6: Pre-carriage by, Place of receipt, Terms */}
                <tr>
                  <td className="border border-black p-1.5 align-top w-[24%]">
                    <div className="font-bold text-[10px]">Pre-carriage by</div>
                    <div className="font-bold mt-0.5 text-[11px]">{preCarriageBy}</div>
                  </td>
                  <td className="border border-black p-1.5 align-top w-[28%]">
                    <div className="font-bold text-[10px]">Place of Receipt by Pre-carriage</div>
                    <div className="font-bold mt-0.5 text-[11px]">{placeOfReceipt}</div>
                  </td>
                  <td rowSpan={3} className="border border-black p-2 align-top w-[48%]">
                    <div className="font-bold text-[10px]">Terms of delivery and payment</div>
                    <div className="font-bold mt-1 text-[11px] leading-snug">{termsOfPayment}</div>
                  </td>
                </tr>

                {/* ROW 7: Vessel & Port of Loading */}
                <tr>
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Vessel/Flight No.</div>
                    <div className="font-bold mt-0.5 text-[11px]">{vesselFlightNo}</div>
                  </td>
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Port of Loading</div>
                    <div className="font-bold mt-0.5 text-[11px]">{portOfLoading}</div>
                  </td>
                </tr>

                {/* ROW 8: Port of Discharge & Final Destination */}
                <tr>
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Port of Discharge</div>
                    <div className="font-bold mt-0.5 text-[11px]">{portOfDischarge}</div>
                  </td>
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold text-[10px]">Final Destination</div>
                    <div className="font-bold mt-0.5 text-[11px]">{finalDestination}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CARGO & COMMODITY LINE ITEMS TABLE */}
            <table className="w-full border-collapse border-l border-r border-b border-black text-[11px] text-black">
              <thead>
                {/* ROW 9: Column Headers */}
                <tr className="border-t border-b border-black">
                  <th className="border-r border-black p-1.5 font-bold text-center w-[62%]" colSpan={2}>
                    <div>Marks &amp; Nos. &nbsp;&nbsp;&nbsp;&nbsp; No. &amp; Kind of pkg &nbsp;&nbsp;&nbsp;&nbsp; Description of Goods</div>
                    <div className="mt-0.5">Container No.</div>
                  </th>
                  <th className="border-r border-black p-1.5 font-bold text-center w-[11%]">
                    Quantity
                  </th>
                  <th className="border-r border-black p-1.5 font-bold text-center w-[12%]">
                    Rate
                  </th>
                  <th className="p-1.5 font-bold text-center w-[15%]">
                    Amount
                  </th>
                </tr>

                {/* ROW 10: Commodity, Packing, Marks & Terms Header */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 align-top font-bold text-[11px] space-y-0.5" colSpan={2}>
                    <div>COMMODITY: {commodityDescription}</div>
                    <div>PACKING: {packingDescription}</div>
                    <div>SCIENTIFIC NAME: {scientificName}</div>
                    <div>SHIPPING MARK: {shippingMarks}</div>
                  </td>
                  <td className="border-r border-black p-1.5 align-top text-center font-bold">
                    IN KGS
                  </td>
                  <td className="border-r border-black p-1.5 align-top text-center font-bold text-[10px]">
                    {priceTermsPrefix}/{currency}<br />PER KGS
                  </td>
                  <td className="p-1.5 align-top text-center font-bold text-[10px]">
                    {currency}/{priceTermsPrefix}<br />{finalDestination || portOfDischarge}
                  </td>
                </tr>

                {/* ROW 11: Subheaders */}
                <tr className="border-b border-black font-bold">
                  <td className="border-r border-black p-1 text-center w-[35%]">
                    GRADE/SIZE
                  </td>
                  <td className="border-r border-black p-1 text-center w-[27%]">
                    NO. OF CARTONS
                  </td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="p-1"></td>
                </tr>
              </thead>

              <tbody>
                {/* ROW 12+: Dynamic Line Items */}
                {lineItems.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-black/40 font-bold">
                    <td className="border-r border-black p-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase">{item.productDescription}</span>
                        <span className="text-center min-w-[50px]">{item.gradeSize}</span>
                      </div>
                    </td>
                    <td className="border-r border-black p-1.5 text-center">
                      {item.cartonsCount}
                    </td>
                    <td className="border-r border-black p-1.5 text-right tabular-nums">
                      {typeof item.weightKg === 'number' ? item.weightKg.toFixed(3) : item.weightKg}
                    </td>
                    <td className="border-r border-black p-1.5 text-right tabular-nums">
                      {typeof item.ratePerKg === 'number' ? item.ratePerKg.toFixed(2) : item.ratePerKg}
                    </td>
                    <td className="p-1.5 text-right tabular-nums">
                      {typeof item.amountCurrency === 'number'
                        ? item.amountCurrency.toFixed(2)
                        : (Number(item.weightKg) * Number(item.ratePerKg)).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* ROW 14: TOTAL Row */}
                <tr className="border-t-2 border-b border-black font-bold">
                  <td className="border-r border-black p-1.5 text-center tracking-wider">
                    TOTAL
                  </td>
                  <td className="border-r border-black p-1.5 text-center tabular-nums">
                    {totalCartons}
                  </td>
                  <td className="border-r border-black p-1.5 text-right tabular-nums">
                    {totalWeightKg.toFixed(3)}
                  </td>
                  <td className="border-r border-black p-1.5 text-center"></td>
                  <td className="p-1.5 text-right tabular-nums text-xs">
                    {totalAmountCurrency.toFixed(2)}
                  </td>
                </tr>

                {/* ROW 15: Container / Seal & Weights */}
                <tr className="border-b border-black font-bold text-[11px]">
                  <td colSpan={4} className="border-r border-black p-2 align-top">
                    <div className="flex justify-between">
                      <span>Container Number : &nbsp;{containerNo}</span>
                      <span>Seal Number : &nbsp;{sealNo}</span>
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span>Net weight: Kgs &nbsp;&nbsp;&nbsp;: &nbsp;{typeof netWeightKg === 'number' && netWeightKg > 0 ? netWeightKg.toFixed(3) : (netWeightKg || '')}</span>
                      <span>Gross weight Kgs : &nbsp;{typeof grossWeightKg === 'number' && grossWeightKg > 0 ? grossWeightKg.toFixed(3) : (grossWeightKg || '')}</span>
                    </div>
                  </td>
                  <td></td>
                </tr>

                {/* ROW 16: Amount in Words */}
                <tr className="border-b border-black font-bold text-[11px]">
                  <td colSpan={4} className="border-r border-black p-2 align-top">
                    <div>Amount chargeable (in words): &nbsp;{amountInWords}</div>
                  </td>
                  <td></td>
                </tr>

                {/* ROW 17: Processed & Packed by, Approval number, BL number */}
                <tr className="border-b border-black font-bold text-[11px]">
                  <td colSpan={5} className="p-2 align-top space-y-1">
                    <div>PROCESSED &amp; PACKED BY: &nbsp;{factoryNameAndAddress}</div>
                    <div className="flex justify-between pt-0.5">
                      <span>APPROVAL NUMBER OF THE FACTORY : &nbsp;{factoryApprovalNumber}</span>
                      <span>BILL OF LADING NUMBER: &nbsp;{billOfLadingNo}</span>
                    </div>
                  </td>
                </tr>

                {/* ROW 18: Declaration & Signature Block */}
                <tr className="font-bold text-[11px]">
                  <td colSpan={2} className="border-r border-black p-2 align-top w-[62%]">
                    <div className="text-[10px] leading-normal pt-2">
                      <span className="font-bold">Declaration:</span> &nbsp;
                      <span>{declarationText}</span>
                    </div>
                  </td>
                  <td colSpan={3} className="p-2 align-top text-center w-[38%] space-y-2">
                    <div className="text-xs pt-1">{signatoryCompany}</div>
                    <div className="h-10"></div>
                    <div className="text-xs">{formatDDMMYYYY(signatureDate)}</div>
                    <div className="text-[10px] border-t border-black/30 pt-0.5 inline-block px-4">
                      Signature &amp; Date ({signatoryDesignation})
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
