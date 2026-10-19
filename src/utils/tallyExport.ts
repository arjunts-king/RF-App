import { Purchase, Supplier } from '../types';

/**
 * Generates Tally-compatible XML for Purchase Vouchers
 */
export function generateTallyPurchaseXML(
  purchases: Purchase[],
  suppliers: Supplier[],
  companyName: string = 'Coastal Marine Traders'
): string {
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const voucherNodes = purchases
    .filter((p) => !p.isVoided)
    .map((p) => {
      const supplier = supplierMap.get(p.supplierId);
      const supplierName = supplier?.name || 'Unknown Supplier';
      const formattedDate = p.purchaseDate.replace(/-/g, '');

      return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${formattedDate}</DATE>
        <REFERENCEDATE>${formattedDate}</REFERENCEDATE>
        <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${p.purchaseId}</VOUCHERNUMBER>
        <REFERENCE>${p.invoiceNo || p.purchaseId}</REFERENCE>
        <PARTYLEDGERNAME>${supplierName}</PARTYLEDGERNAME>
        <NARRATION>Seafood Purchase: Invoice ${p.invoiceNo || 'N/A'}, Weight: ${p.weightKg}Kg @ ₹${p.ratePerKg}/Kg. Remarks: ${p.remarks || 'None'}</NARRATION>
        
        <!-- Credit to Supplier Account for Total Cost -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${supplierName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${p.totalCost.toFixed(2)}</AMOUNT>
          <BILLALLOCATIONS.LIST>
            <NAME>${p.invoiceNo || p.purchaseId}</NAME>
            <BILLTYPE>New Ref</BILLTYPE>
            <AMOUNT>${p.totalCost.toFixed(2)}</AMOUNT>
          </BILLALLOCATIONS.LIST>
        </ALLLEDGERENTRIES.LIST>

        <!-- Debit to Raw Material Purchase Account -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Raw Seafood Purchases</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${p.grossPurchaseValue.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        ${
          p.totalExpenses > 0
            ? `
        <!-- Debit to Direct Purchase Landing Expenses Account -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Landing &amp; Procurement Expenses</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${p.totalExpenses.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ''
        }
      </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${voucherNodes}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
