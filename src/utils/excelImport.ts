import * as XLSX from 'xlsx';
import { ExpenseType } from '../types';

export type ImportEntityType =
  | 'multi-sheet'
  | 'purchases'
  | 'suppliers'
  | 'species'
  | 'grades'
  | 'sizes'
  | 'locations'
  | 'bank-accounts'
  | 'expense-types';

/**
 * Normalizes string keys for flexible column matching (e.g. "Rate/Kg" -> "ratekg", "Supplier Name" -> "suppliername")
 */
export function normalizeKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the first value in an object whose key matches one of the candidate normalized keys.
 * Supports exact normalized matching as well as fuzzy substring matching (e.g. "Supplier Name *" -> matches "suppliername").
 */
export function getFlexibleValue(row: Record<string, any>, candidateKeys: string[]): any {
  if (!row || typeof row !== 'object') return undefined;
  const normalizedCandidateKeys = candidateKeys.map(normalizeKey);

  // 1. Exact match on normalized key
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (normalizedCandidateKeys.includes(norm) && val !== undefined && val !== null && String(val).trim() !== '') {
      return typeof val === 'string' ? val.trim() : val;
    }
  }

  // 2. Substring / Prefix match (e.g. "Supplier Name (Required)" matches "suppliername")
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeKey(key);
    for (const cand of normalizedCandidateKeys) {
      if (cand.length >= 4 && (norm.includes(cand) || cand.includes(norm))) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return typeof val === 'string' ? val.trim() : val;
        }
      }
    }
  }

  return undefined;
}

/**
 * Formats JS Date or Excel serial date into YYYY-MM-DD
 */
export function formatExcelDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.toISOString().split('T')[0];
  }

  const str = String(rawDate).trim();
  // Check if standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Fallback to Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Reads an Excel (.xlsx, .xls, .csv) file and returns sheet names & row arrays.
 */
export async function parseExcelWorkbook(file: File): Promise<{
  sheets: { name: string; rows: Record<string, any>[] }[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const sheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          return { name, rows };
        });

        resolve({ sheets });
      } catch (err) {
        reject(new Error('Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv document.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading encountered an error.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates and triggers instant download of pre-formatted Excel templates.
 */
export function downloadExcelTemplate(type: ImportEntityType, expenseTypes?: ExpenseType[]): void {
  const wb = XLSX.utils.book_new();

  if (type === 'suppliers') {
    const data = [
      {
        'Supplier Code': 'SUP-001',
        'Supplier Name': 'Kochi Sea Harvesters',
        'Type (boat_owner / auctioneer / trader / farm)': 'boat_owner',
        'Contact Person': 'P. Anthony',
        'Phone': '+91 98470 12345',
        'Email': 'anthony@kochisea.com',
        'Address': 'Wharf Rd, Vypeen',
        'District': 'Ernakulam',
        'State': 'Kerala',
        'GSTIN': '32AABCK1234F1Z5',
        'PAN': 'AABCK1234F',
        'Bank Name': 'State Bank of India',
        'Bank Account No': '30982245100',
        'Bank IFSC': 'SBIN0000861',
        'Credit Days': 7,
        'Opening Balance': 0
      },
      {
        'Supplier Code': 'SUP-002',
        'Supplier Name': 'Malabar Coast Fisheries',
        'Type (boat_owner / auctioneer / trader / farm)': 'trader',
        'Contact Person': 'K. Suresh',
        'Phone': '+91 94460 54321',
        'Email': 'suresh@malabarfish.com',
        'Address': 'Harbour Road',
        'District': 'Kozhikode',
        'State': 'Kerala',
        'GSTIN': '32BCDK5678M1Z2',
        'PAN': 'BCDK5678M',
        'Bank Name': 'Federal Bank',
        'Bank Account No': '10450200001234',
        'Bank IFSC': 'FDRL0001045',
        'Credit Days': 15,
        'Opening Balance': 15000
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    XLSX.writeFile(wb, 'Suppliers_Import_Template.xlsx');
    return;
  }

  if (type === 'species') {
    const data = [
      { 'Code': 'VAN', 'Name': 'Vannamei Shrimp', 'Scientific Name': 'Litopenaeus vannamei', 'Category': 'Shrimp' },
      { 'Code': 'YFT', 'Name': 'Yellowfin Tuna', 'Scientific Name': 'Thunnus albacares', 'Category': 'Tuna' },
      { 'Code': 'SQD', 'Name': 'Indian Squid', 'Scientific Name': 'Uroteuthis duvaucelii', 'Category': 'Cephalopod' },
      { 'Code': 'POM', 'Name': 'Silver Pomfret', 'Scientific Name': 'Pampus argenteus', 'Category': 'White Fish' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Species');
    XLSX.writeFile(wb, 'Species_Import_Template.xlsx');
    return;
  }

  if (type === 'grades') {
    const data = [
      { 'Code': 'GR-A', 'Grade Name': 'Grade A (Export Premium)', 'Applies To Species Code or Name': 'Vannamei Shrimp', 'Description': 'Fresh, clear shell, export grade' },
      { 'Code': 'GR-B', 'Grade Name': 'Grade B (Standard Market)', 'Applies To Species Code or Name': 'All', 'Description': 'Standard domestic wholesale' },
      { 'Code': 'REJ', 'Grade Name': 'Reject / Soft Shell', 'Applies To Species Code or Name': 'All', 'Description': 'Damaged or sub-standard lot' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Grades');
    XLSX.writeFile(wb, 'Grades_Import_Template.xlsx');
    return;
  }

  if (type === 'sizes') {
    const data = [
      { 'Code': 'SZ-1020', 'Size Count': '10/20 count', 'Description': '10 to 20 pcs per Kg' },
      { 'Code': 'SZ-2030', 'Size Count': '20/30 count', 'Description': '20 to 30 pcs per Kg' },
      { 'Code': 'SZ-3040', 'Size Count': '30/40 count', 'Description': '30 to 40 pcs per Kg' },
      { 'Code': 'SZ-5060', 'Size Count': '50/60 count', 'Description': '50 to 60 pcs per Kg' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sizes');
    XLSX.writeFile(wb, 'Sizes_Import_Template.xlsx');
    return;
  }

  if (type === 'locations') {
    const data = [
      { 'Code': 'LOC-MNB', 'Location Name': 'Munambam Harbour', 'District': 'Ernakulam', 'State': 'Kerala', 'Harbour / Wharf': 'North Jetty' },
      { 'Code': 'LOC-THP', 'Location Name': 'Thoppumpady Fishery Harbour', 'District': 'Ernakulam', 'State': 'Kerala', 'Harbour / Wharf': 'Berth 2' },
      { 'Code': 'LOC-BAY', 'Location Name': 'Beypore Port Jetty', 'District': 'Kozhikode', 'State': 'Kerala', 'Harbour / Wharf': 'Main Wharf' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Locations');
    XLSX.writeFile(wb, 'Locations_Import_Template.xlsx');
    return;
  }

  if (type === 'bank-accounts') {
    const data = [
      { 'Code': 'ACC-SBI', 'Account Name': 'SBI Current Harbour Op', 'Bank Name': 'State Bank of India', 'Account Type': 'Current', 'Opening Balance': 250000 },
      { 'Code': 'ACC-CSH', 'Account Name': 'Landing Jetty Petty Cash', 'Bank Name': 'Cash in Hand', 'Account Type': 'Cash', 'Opening Balance': 45000 }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'BankAccounts');
    XLSX.writeFile(wb, 'Bank_Accounts_Template.xlsx');
    return;
  }

  if (type === 'expense-types') {
    const data = [
      { 'Code': 'EXP-ICE', 'Expense Name': 'Crushed Ice Block', 'Category': 'Landing' },
      { 'Code': 'EXP-TRN', 'Expense Name': 'Vehicle Transport & Rent', 'Category': 'Logistics' },
      { 'Code': 'EXP-LBR', 'Expense Name': 'Wharf Unloading Labour', 'Category': 'Labour' },
      { 'Code': 'EXP-COM', 'Expense Name': 'Auctioneer Commission', 'Category': 'Statutory' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'ExpenseTypes');
    XLSX.writeFile(wb, 'Expense_Types_Template.xlsx');
    return;
  }

  if (type === 'purchases') {
    // Collect all direct landing expenses from registered master data or standard presets
    const activeExpenses: { name: string; category?: string }[] =
      expenseTypes && expenseTypes.filter((e) => e.active).length > 0
        ? expenseTypes.filter((e) => e.active)
        : [
            { name: 'Ice & Crushed Flake', category: 'Preservation' },
            { name: 'Vehicle Rent / Transport', category: 'Logistics' },
            { name: 'Commission & Dalali', category: 'Brokerage' },
            { name: 'Loading / Unloading Labour', category: 'Handling' }
          ];

    const row1: Record<string, any> = {
      'Purchase Date (YYYY-MM-DD)': '2026-10-18',
      'Supplier Code or Name': 'Kochi Sea Harvesters',
      'Location Code or Name': 'Munambam Harbour',
      'Species Code or Name': 'Vannamei Shrimp',
      'Grade Code or Name': 'Grade A',
      'Size Count': '20/30',
      'Weight (Kg)': 450.5,
      'Rate per Kg (INR)': 380,
      'No of Boxes': 15,
      'Damage Weight (Kg)': 10,
      'Damage Rate per Kg': 120
    };

    // Integrate all direct landing expenses displayed in the harbour purchase entry form
    const sampleAmounts1 = [1200, 2500, 1500, 800, 500, 350, 200];
    activeExpenses.forEach((exp, idx) => {
      row1[`${exp.name} (INR)`] = sampleAmounts1[idx % sampleAmounts1.length];
    });

    row1['Amount Paid Now (INR)'] = 50000;
    row1['Invoice / Bill No'] = 'INV-2026-88';
    row1['Batch No'] = 'BATCH-OCT-01';
    row1['Remarks'] = 'Prime morning landing';

    const row2: Record<string, any> = {
      'Purchase Date (YYYY-MM-DD)': '2026-10-19',
      'Supplier Code or Name': 'Malabar Coast Fisheries',
      'Location Code or Name': 'Beypore Port Jetty',
      'Species Code or Name': 'Yellowfin Tuna',
      'Grade Code or Name': 'Grade A',
      'Size Count': '',
      'Weight (Kg)': 820,
      'Rate per Kg (INR)': 260,
      'No of Boxes': 20,
      'Damage Weight (Kg)': 0,
      'Damage Rate per Kg': 0
    };

    const sampleAmounts2 = [2000, 3000, 2000, 1000, 750, 400, 300];
    activeExpenses.forEach((exp, idx) => {
      row2[`${exp.name} (INR)`] = sampleAmounts2[idx % sampleAmounts2.length];
    });

    row2['Amount Paid Now (INR)'] = 0;
    row2['Invoice / Bill No'] = 'BILL-904';
    row2['Batch No'] = '';
    row2['Remarks'] = 'Export grade tuna';

    const ws = XLSX.utils.json_to_sheet([row1, row2]);
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, 'Purchase_Transactions_Template.xlsx');
    return;
  }

  // Multi-sheet Complete Workbook
  if (type === 'multi-sheet') {
    // 1. Suppliers Sheet
    const suppliersData = [
      { 'Supplier Code': 'SUP-001', 'Supplier Name': 'Kochi Sea Harvesters', 'Type': 'boat_owner', 'Contact Person': 'P. Anthony', 'Phone': '+91 98470 12345', 'District': 'Ernakulam', 'State': 'Kerala', 'Credit Days': 7, 'Opening Balance': 0 },
      { 'Supplier Code': 'SUP-002', 'Supplier Name': 'Malabar Coast Fisheries', 'Type': 'trader', 'Contact Person': 'K. Suresh', 'Phone': '+91 94460 54321', 'District': 'Kozhikode', 'State': 'Kerala', 'Credit Days': 15, 'Opening Balance': 15000 }
    ];
    const wsSupp = XLSX.utils.json_to_sheet(suppliersData);
    XLSX.utils.book_append_sheet(wb, wsSupp, 'Suppliers');

    // 2. Species Sheet
    const speciesData = [
      { 'Code': 'VAN', 'Name': 'Vannamei Shrimp', 'Scientific Name': 'Litopenaeus vannamei', 'Category': 'Shrimp' },
      { 'Code': 'YFT', 'Name': 'Yellowfin Tuna', 'Scientific Name': 'Thunnus albacares', 'Category': 'Tuna' },
      { 'Code': 'SQD', 'Name': 'Indian Squid', 'Scientific Name': 'Uroteuthis duvaucelii', 'Category': 'Cephalopod' }
    ];
    const wsSpec = XLSX.utils.json_to_sheet(speciesData);
    XLSX.utils.book_append_sheet(wb, wsSpec, 'Species');

    // 3. Locations Sheet
    const locationsData = [
      { 'Code': 'LOC-MNB', 'Location Name': 'Munambam Harbour', 'District': 'Ernakulam', 'State': 'Kerala', 'Harbour / Wharf': 'North Jetty' },
      { 'Code': 'LOC-BAY', 'Location Name': 'Beypore Port Jetty', 'District': 'Kozhikode', 'State': 'Kerala', 'Harbour / Wharf': 'Main Wharf' }
    ];
    const wsLoc = XLSX.utils.json_to_sheet(locationsData);
    XLSX.utils.book_append_sheet(wb, wsLoc, 'Locations');

    // 4. Grades Sheet
    const gradesData = [
      { 'Code': 'GR-A', 'Grade Name': 'Grade A', 'Description': 'Export Grade' },
      { 'Code': 'GR-B', 'Grade Name': 'Grade B', 'Description': 'Domestic Wholesale' }
    ];
    const wsGrd = XLSX.utils.json_to_sheet(gradesData);
    XLSX.utils.book_append_sheet(wb, wsGrd, 'Grades');

    // 5. Sizes Sheet
    const sizesData = [
      { 'Code': 'SZ-1020', 'Size Count': '10/20 count', 'Description': 'Large' },
      { 'Code': 'SZ-2030', 'Size Count': '20/30 count', 'Description': 'Medium' },
      { 'Code': 'SZ-3040', 'Size Count': '30/40 count', 'Description': 'Standard' }
    ];
    const wsSz = XLSX.utils.json_to_sheet(sizesData);
    XLSX.utils.book_append_sheet(wb, wsSz, 'Sizes');

    // 6. Purchases Sheet with all direct landing expenses
    const activeExpenses: { name: string; category?: string }[] =
      expenseTypes && expenseTypes.filter((e) => e.active).length > 0
        ? expenseTypes.filter((e) => e.active)
        : [
            { name: 'Ice & Crushed Flake', category: 'Preservation' },
            { name: 'Vehicle Rent / Transport', category: 'Logistics' },
            { name: 'Commission & Dalali', category: 'Brokerage' },
            { name: 'Loading / Unloading Labour', category: 'Handling' }
          ];

    const purchasesRow: Record<string, any> = {
      'Purchase Date': '2026-10-18',
      'Supplier Name': 'Kochi Sea Harvesters',
      'Location Name': 'Munambam Harbour',
      'Species Name': 'Vannamei Shrimp',
      'Grade Name': 'Grade A',
      'Size Count': '20/30 count',
      'Weight (Kg)': 450.5,
      'Rate per Kg': 380,
      'No of Boxes': 15,
      'Damage Weight': 10,
      'Damage Rate': 120
    };

    const sampleAmountsMulti = [1200, 2500, 1500, 800, 500];
    activeExpenses.forEach((exp, idx) => {
      purchasesRow[`${exp.name} (INR)`] = sampleAmountsMulti[idx % sampleAmountsMulti.length];
    });

    purchasesRow['Amount Paid'] = 50000;
    purchasesRow['Invoice No'] = 'INV-2026-88';
    purchasesRow['Batch No'] = 'BATCH-01';
    purchasesRow['Remarks'] = 'Prime shrimp landing';

    const wsPur = XLSX.utils.json_to_sheet([purchasesRow]);
    XLSX.utils.book_append_sheet(wb, wsPur, 'Purchases');

    XLSX.writeFile(wb, 'Complete_Seafood_System_Template.xlsx');
  }
}

/**
 * Triggers instant export of current data to Excel.
 */
export function exportDataToExcel(
  filename: string,
  sheets: { sheetName: string; data: Record<string, any>[] }[]
): void {
  const wb = XLSX.utils.book_new();
  for (const { sheetName, data } of sheets) {
    const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ Message: 'No records available.' }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel max sheet name is 31 chars
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
