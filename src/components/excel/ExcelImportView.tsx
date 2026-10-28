import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  ImportEntityType,
  parseExcelWorkbook,
  downloadExcelTemplate,
  exportDataToExcel
} from '../../utils/excelImport';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Receipt,
  Users,
  Fish,
  MapPin,
  Building2,
  DollarSign,
  Database,
  HelpCircle
} from 'lucide-react';

interface ImportSummary {
  added: number;
  updated?: number;
  errors: string[];
  createdSuppliers?: number;
  createdSpecies?: number;
  createdLocations?: number;
}

export const ExcelImportView: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const {
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    expenseTypes,
    purchases,
    bulkImportSuppliers,
    bulkImportSpecies,
    bulkImportGrades,
    bulkImportSizes,
    bulkImportCounts,
    bulkImportLocations,
    bulkImportBankAccounts,
    bulkImportExpenseTypes,
    bulkImportPurchases
  } = useData();
  const { showToast } = useToast();

  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('purchases');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheetsData, setSheetsData] = useState<{ name: string; rows: Record<string, any>[] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Configuration options
  const [autoCreateMaster, setAutoCreateMaster] = useState(true);
  const [updateExistingMaster, setUpdateExistingMaster] = useState(true);

  // Status & Results
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityOptions: { id: ImportEntityType; label: string; icon: any; desc: string }[] = [
    {
      id: 'purchases',
      label: 'Purchase Transactions',
      icon: Receipt,
      desc: 'Import daily purchase sheets, landing bills, rates & direct landing expenses (Ice, Transport, Dalali, Labour, Other Expenses)'
    },
    {
      id: 'suppliers',
      label: 'Suppliers & Boat Owners',
      icon: Users,
      desc: 'Import vendor registry, contact, credit days & bank accounts'
    },
    {
      id: 'species',
      label: 'Species & Products',
      icon: Fish,
      desc: 'Import seafood species list and categories'
    },
    {
      id: 'grades',
      label: 'Quality Grades',
      icon: Layers,
      desc: 'Import trade gradings (Grade A, B, Export)'
    },
    {
      id: 'sizes',
      label: 'Physical Sizes',
      icon: Database,
      desc: 'Import fish/product sizes (e.g. Small, Medium, Large, Extra Large)'
    },
    {
      id: 'counts',
      label: 'Piece Counts / Pcs',
      icon: Database,
      desc: 'Import count gradings per Kg (e.g. 10/20, 20/30, 41/50, 100+)'
    },
    {
      id: 'locations',
      label: 'Landing Centres & Harbours',
      icon: MapPin,
      desc: 'Import harbours, wharves, jetties and districts'
    },
    {
      id: 'bank-accounts',
      label: 'Bank & Cash Accounts',
      icon: Building2,
      desc: 'Import accounts for supplier payment reconciliation'
    },
    {
      id: 'expense-types',
      label: 'Recurring Expense Types',
      icon: DollarSign,
      desc: 'Import expense categories (Ice, Transport, Dalali, Labour, Other Expenses)'
    },
    {
      id: 'multi-sheet',
      label: 'Multi-Sheet Complete Workbook',
      icon: FileSpreadsheet,
      desc: 'Upload 1 Excel workbook with multiple sheets at once'
    }
  ];

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setImportSummary(null);

    try {
      const { sheets } = await parseExcelWorkbook(file);
      setSheetsData(sheets);
      setActiveSheetIndex(0);

      // Intelligent Auto-Detection of Sheet / Entity
      if (sheets.length > 1) {
        const names = sheets.map((s) => s.name.toLowerCase().trim());
        const hasSupp = names.some((n) => n.includes('supplier'));
        const hasSpec = names.some((n) => n.includes('specie') || n.includes('product'));
        const hasPur = names.some((n) => n.includes('purchase'));
        if ((hasSupp && hasSpec) || (hasSupp && hasPur) || (hasSpec && hasPur)) {
          setSelectedEntity('multi-sheet');
          showToast('Detected multi-sheet workbook. Automatically set to Multi-Sheet Workbook.', 'info');
        }
      } else if (sheets.length === 1) {
        const sheet = sheets[0];
        const sName = sheet.name.toLowerCase();
        const fRow = sheet.rows[0] || {};
        const colKeys = Object.keys(fRow).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

        if (sName.includes('supplier') || (colKeys.includes('suppliername') && !colKeys.includes('weightkg') && !colKeys.includes('weight'))) {
          setSelectedEntity('suppliers');
          showToast('Detected Supplier master sheet. Category switched to Suppliers & Boat Owners.', 'info');
        } else if (sName.includes('specie') || sName.includes('product') || (colKeys.includes('speciesname') && !colKeys.includes('weightkg'))) {
          setSelectedEntity('species');
          showToast('Detected Species master sheet. Category switched to Species & Products.', 'info');
        } else if (sName.includes('location') || sName.includes('harbour') || (colKeys.includes('locationname') && !colKeys.includes('weightkg'))) {
          setSelectedEntity('locations');
          showToast('Detected Landing Centre sheet. Category switched to Landing Centres & Harbours.', 'info');
        } else if (sName.includes('grade')) {
          setSelectedEntity('grades');
          showToast('Detected Grades sheet. Category switched to Quality Grades.', 'info');
        } else if (sName.includes('count') || (colKeys.includes('countname') && !colKeys.includes('weightkg'))) {
          setSelectedEntity('counts');
          showToast('Detected Piece Counts sheet. Category switched to Piece Counts / Pcs.', 'info');
        } else if (sName.includes('size')) {
          setSelectedEntity('sizes');
          showToast('Detected Physical Sizes sheet. Category switched to Physical Sizes.', 'info');
        } else if (sName.includes('purchase') || colKeys.includes('weightkg') || colKeys.includes('weight')) {
          setSelectedEntity('purchases');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error reading Excel file', 'error');
      setSelectedFile(null);
      setSheetsData([]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const activeRows = sheetsData[activeSheetIndex]?.rows || [];

  const handleExecuteImport = () => {
    if (!sheetsData.length) return;
    setIsProcessing(true);

    try {
      if (selectedEntity === 'multi-sheet') {
        // Multi-sheet workbook import: match sheet names
        let totalPurchasesAdded = 0;
        let totalSuppliersAdded = 0;
        let totalSpeciesAdded = 0;
        let totalLocationsAdded = 0;
        const allErrors: string[] = [];

        sheetsData.forEach((sheet) => {
          const sheetNameNorm = sheet.name.toLowerCase().trim();
          if (sheetNameNorm.includes('supplier')) {
            const res = bulkImportSuppliers(sheet.rows, updateExistingMaster);
            totalSuppliersAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('specie') || sheetNameNorm.includes('product')) {
            const res = bulkImportSpecies(sheet.rows);
            totalSpeciesAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('location') || sheetNameNorm.includes('harbour')) {
            const res = bulkImportLocations(sheet.rows);
            totalLocationsAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('grade')) {
            bulkImportGrades(sheet.rows);
          } else if (sheetNameNorm.includes('count')) {
            bulkImportCounts(sheet.rows);
          } else if (sheetNameNorm.includes('size')) {
            bulkImportSizes(sheet.rows);
          } else if (sheetNameNorm.includes('purchase')) {
            const res = bulkImportPurchases(sheet.rows, autoCreateMaster);
            totalPurchasesAdded += res.added;
            allErrors.push(...res.errors);
          }
        });

        setImportSummary({
          added: totalPurchasesAdded + totalSuppliersAdded + totalSpeciesAdded + totalLocationsAdded,
          createdSuppliers: totalSuppliersAdded,
          createdSpecies: totalSpeciesAdded,
          createdLocations: totalLocationsAdded,
          errors: allErrors
        });
      } else if (selectedEntity === 'purchases') {
        const res = bulkImportPurchases(activeRows, autoCreateMaster);
        setImportSummary({
          added: res.added,
          errors: res.errors,
          createdSuppliers: res.createdSuppliers,
          createdSpecies: res.createdSpecies,
          createdLocations: res.createdLocations
        });
      } else if (selectedEntity === 'suppliers') {
        const res = bulkImportSuppliers(activeRows, updateExistingMaster);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'species') {
        const res = bulkImportSpecies(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'grades') {
        const res = bulkImportGrades(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'sizes') {
        const res = bulkImportSizes(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'counts') {
        const res = bulkImportCounts(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'locations') {
        const res = bulkImportLocations(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'bank-accounts') {
        const res = bulkImportBankAccounts(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'expense-types') {
        const res = bulkImportExpenseTypes(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      }

      showToast('Import completed. Check summary below for details.', 'success');
    } catch (e: any) {
      showToast(`Import error: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCurrent = () => {
    if (purchases.length === 0 && suppliers.length === 0) {
      showToast('No data in system yet to export.', 'warning');
      return;
    }

    const purchasesExport = purchases.map((p) => {
      const supp = suppliers.find((s) => s.id === p.supplierId);
      const sp = species.find((s) => s.id === p.speciesId);
      const loc = locations.find((l) => l.id === p.locationId);
      const grd = grades.find((g) => g.id === p.gradeId);
      const sz = sizes.find((s) => s.id === p.sizeId);
      const cnt = counts.find((c) => c.id === p.countId);

      return {
        'Purchase ID': p.purchaseId,
        'Date (DD-MM-YYYY)': p.purchaseDate ? p.purchaseDate.split('-').reverse().join('-') : '',
        'Supplier Code': supp?.code || '',
        'Supplier Name': supp?.name || '',
        'Landing Location': loc?.name || '',
        'Species': sp?.name || '',
        'Grade': grd?.name || '',
        'Physical Size': p.isDualSize && p.secondarySizeId
          ? `${sz?.name || ''} & ${sizes.find((s) => s.id === p.secondarySizeId)?.name || ''}`
          : (sz?.name || ''),
        'Piece Count': cnt?.name || '',
        'Weight (Kg)': p.weightKg,
        'Yield Weight (Kg)': p.yieldWeightKg ?? '',
        'Yield %': p.yieldPct ? `${p.yieldPct}%` : (p.yieldWeightKg && p.weightKg ? `${((p.yieldWeightKg / p.weightKg) * 100).toFixed(1)}%` : ''),
        'Rate/Kg': p.ratePerKg,
        'Purchase Value': p.purchaseValue,
        'Damage Weight (Kg)': p.damageWeightKg,
        'Damage Rate': p.damageRatePerKg,
        'Damage Amount': p.damageAmount,
        'Gross Value': p.grossPurchaseValue,
        'Fish Purchase Total (INR)': p.grossPurchaseValue,
        ...expenseTypes
          .filter((e) => e.active)
          .reduce((acc, exp) => {
            acc[`${exp.name} (INR)`] = p.expenseBreakdown?.[exp.id] || 0;
            return acc;
          }, {} as Record<string, number>),
        'Total Expenses': p.totalExpenses,
        'Total Purchase Value (including landing costs)': p.totalCost,
        'Total Cost': p.totalCost,
        'Effective Rate/Kg': p.effectiveRatePerKg,
        'Amount Paid': p.amountPaid,
        'Balance Payable': p.balancePayable,
        'Due Date': p.dueDate,
        'Payment Status': p.paymentStatus,
        'Invoice No': p.invoiceNo,
        'Batch No': p.batchNo || '',
        'Remarks': p.remarks
      };
    });

    const suppliersExport = suppliers.map((s) => ({
      'Supplier Code': s.code,
      'Supplier Name': s.name,
      'Type': s.type,
      'Contact Person': s.contactPerson,
      'Phone': s.phone,
      'Email': s.email,
      'District': s.district,
      'State': s.state,
      'GSTIN': s.gstin,
      'PAN': s.pan,
      'Bank Name': s.bankName,
      'Bank Account No': s.bankAccount,
      'Bank IFSC': s.bankIfsc,
      'Credit Days': s.creditDays,
      'Opening Balance': s.openingBalance,
      'Active': s.active ? 'Yes' : 'No'
    }));

    exportDataToExcel('Seafood_Data_Backup.xlsx', [
      { sheetName: 'Purchases', data: purchasesExport },
      { sheetName: 'Suppliers', data: suppliersExport }
    ]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-ink-900">Excel Data Import &amp; Migration</h2>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Import existing seafood purchasing sheets, boat registers, or master lists directly from{' '}
            <strong className="text-ink-700 font-semibold">.xlsx, .xls, or .csv</strong> files.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportCurrent}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-ink-700 text-xs font-semibold rounded-xl border border-gray-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Current Data
          </button>
        </div>
      </div>

      {/* Step 1: Select Category */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Step 1: Select What You Want to Import
          </h3>
          <button
            onClick={() => downloadExcelTemplate(selectedEntity, expenseTypes)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Excel Template
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entityOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedEntity === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedEntity(opt.id);
                  setImportSummary(null);
                  setSelectedFile(null);
                  setSheetsData([]);
                }}
                className={`p-3.5 text-left rounded-xl border transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected ? 'bg-rose-600 text-white' : 'bg-gray-100 text-ink-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      isSelected ? 'text-rose-900' : 'text-ink-900'
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5 leading-tight">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Upload File Box */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Step 2: Upload Your Excel File
          </h3>
          {selectedFile && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setSheetsData([]);
                setImportSummary(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Choose Different File
            </button>
          )}
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-rose-500 bg-rose-50/60 scale-[1.005]'
              : selectedFile
              ? 'border-emerald-300 bg-emerald-50/30'
              : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 mb-3">
            <Upload className="w-6 h-6" />
          </div>

          {selectedFile ? (
            <div>
              <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {selectedFile.name}
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB &bull;{' '}
                {sheetsData.length} sheet{sheetsData.length > 1 ? 's' : ''} detected
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-ink-900">
                Click to browse or drag and drop your Excel file here
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) spreadsheets
              </p>
            </div>
          )}
        </div>

        {/* Options & Configuration */}
        {selectedEntity === 'purchases' && (
          <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="autoCreateMaster"
              checked={autoCreateMaster}
              onChange={(e) => setAutoCreateMaster(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="autoCreateMaster" className="text-xs text-ink-800 cursor-pointer">
              <strong>Auto-create missing master data:</strong> If an imported purchase contains a
              supplier, species, or harbour landing centre not yet in the master database,
              automatically register it rather than throwing an error.
            </label>
          </div>
        )}

        {(selectedEntity === 'suppliers' || selectedEntity === 'species') && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="updateExistingMaster"
              checked={updateExistingMaster}
              onChange={(e) => setUpdateExistingMaster(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="updateExistingMaster" className="text-xs text-ink-800 cursor-pointer">
              <strong>Update existing records:</strong> If a record with the same Code or Name already
              exists in the database, update its details with the new data from Excel.
            </label>
          </div>
        )}
      </div>

      {/* Step 3: Preview Data & Execute */}
      {selectedFile && sheetsData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Step 3: Preview &amp; Confirm Import
              </h3>
              <p className="text-xs text-ink-600 mt-0.5">
                Found <strong className="text-ink-900">{activeRows.length} rows</strong> in sheet{' '}
                <strong className="text-rose-700">"{sheetsData[activeSheetIndex]?.name}"</strong>
              </p>
            </div>

            {/* If workbook has multiple sheets, allow switching */}
            {sheetsData.length > 1 && (
              <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <span className="text-[11px] font-bold text-ink-500 px-2">Sheet:</span>
                {sheetsData.map((sheet, idx) => (
                  <button
                    key={sheet.name}
                    onClick={() => setActiveSheetIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      activeSheetIndex === idx
                        ? 'bg-white shadow-xs text-rose-700 border border-gray-200'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    {sheet.name} ({sheet.rows.length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table Preview */}
          {activeRows.length > 0 ? (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-600 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">#</th>
                    {Object.keys(activeRows[0] || {}).map((col) => (
                      <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeRows.slice(0, 8).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-rose-50/20">
                      <td className="py-2 px-3 text-ink-400 font-mono text-[10px]">{rIdx + 1}</td>
                      {Object.keys(activeRows[0] || {}).map((col) => (
                        <td key={col} className="py-2 px-3 text-ink-800 whitespace-nowrap">
                          {String(row[col] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeRows.length > 8 && (
                <div className="p-2 text-center text-[11px] text-ink-400 bg-gray-50 border-t border-gray-100">
                  + {activeRows.length - 8} additional rows will be imported
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-ink-500 bg-gray-50 rounded-xl">
              This sheet appears to be empty.
            </div>
          )}

          {/* Import Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
            <div className="text-xs text-ink-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Ready to import {activeRows.length} records into your database.
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || activeRows.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing records...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Data Into System Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import Summary Results Modal / Banner */}
      {importSummary && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-900">Import Completed Successfully</h3>
              <p className="text-xs text-ink-500">
                Your Excel data has been processed and saved with full referential integrity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                Records Added
              </span>
              <span className="text-lg font-black text-emerald-700">{importSummary.added}</span>
            </div>

            {importSummary.updated !== undefined && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">
                  Records Updated
                </span>
                <span className="text-lg font-black text-blue-700">{importSummary.updated}</span>
              </div>
            )}

            {importSummary.createdSuppliers !== undefined && importSummary.createdSuppliers > 0 && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">
                  Auto-Created Suppliers
                </span>
                <span className="text-lg font-black text-purple-700">
                  {importSummary.createdSuppliers}
                </span>
              </div>
            )}

            {importSummary.createdSpecies !== undefined && importSummary.createdSpecies > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">
                  Auto-Created Species
                </span>
                <span className="text-lg font-black text-amber-700">
                  {importSummary.createdSpecies}
                </span>
              </div>
            )}
          </div>

          {importSummary.errors.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                Row Warnings / Skipped Entries ({importSummary.errors.length})
              </div>
              <ul className="text-xs text-amber-800 list-disc list-inside space-y-1">
                {importSummary.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('purchases')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  View Purchases Register
                </button>
                <button
                  onClick={() => onNavigate('master-data')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                >
                  <Database className="w-3.5 h-3.5" />
                  View Master Data
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                >
                  Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Helpful Tips Card */}
      <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-100 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-ink-700">
          <div className="font-bold text-ink-900">Tips for seamless Excel importing:</div>
          <ul className="list-disc list-inside space-y-1 text-ink-600">
            <li>
              Column header matching is smart and case-insensitive (e.g.{' '}
              <code>"Weight"</code>, <code>"Weight Kg"</code>, <code>"Qty"</code>, and{' '}
              <code>"Quantity"</code> are all recognized automatically).
            </li>
            <li>
              Date format: <code>DD-MM-YYYY</code> (e.g. <code>18-10-2026</code>) is standard;{' '}
              <code>DD/MM/YYYY</code>, <code>YYYY-MM-DD</code>, and native Excel date cells are all recognized automatically.
            </li>
            <li>
              Need the exact layout? Click <strong>"Download Sample Excel Template"</strong> above to
              get a pre-populated Excel file you can fill and re-upload.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
