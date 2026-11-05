import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../common/PageHeader';
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
  Factory,
  Boxes,
  TrendingUp,
  FileText,
  Anchor
} from 'lucide-react';

interface ImportSummary {
  added: number;
  updated?: number;
  errors: string[];
  createdSuppliers?: number;
  createdSpecies?: number;
  createdLocations?: number;
  createdCustomers?: number;
  createdPorts?: number;
  createdSlabTypes?: number;
}

export type ModuleCategory = 'purchase' | 'production' | 'sales';

export const ExcelImportView: React.FC<{
  onNavigate?: (tab: any) => void;
  defaultModule?: ModuleCategory;
}> = ({ onNavigate, defaultModule = 'purchase' }) => {
  const {
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    expenseTypes,
    slabTypes,
    customers,
    ports,
    purchases,
    processingEntries,
    salesInvoices,
    bulkImportSuppliers,
    bulkImportSpecies,
    bulkImportGrades,
    bulkImportSizes,
    bulkImportCounts,
    bulkImportLocations,
    bulkImportBankAccounts,
    bulkImportExpenseTypes,
    bulkImportPurchases,
    bulkImportSlabTypes,
    bulkImportCustomers,
    bulkImportPorts,
    bulkImportProcessingEntries,
    bulkImportSalesInvoices
  } = useData();
  const { showToast } = useToast();

  const [selectedModule, setSelectedModule] = useState<ModuleCategory>(defaultModule);

  // Synchronize when defaultModule prop changes
  useEffect(() => {
    setSelectedModule(defaultModule);
    if (defaultModule === 'production') {
      setSelectedEntity('processing-entries');
    } else if (defaultModule === 'sales') {
      setSelectedEntity('sales-invoices');
    } else {
      setSelectedEntity('purchases');
    }
  }, [defaultModule]);

  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>(
    defaultModule === 'production'
      ? 'processing-entries'
      : defaultModule === 'sales'
      ? 'sales-invoices'
      : 'purchases'
  );
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

  // Entity definitions partitioned by module
  const purchaseEntities: { id: ImportEntityType; label: string; icon: any; desc: string }[] = [
    {
      id: 'purchases',
      label: 'Purchase Transactions',
      icon: Receipt,
      desc: 'Daily harbour purchase sheets, landing bills, rates, weighments & direct landing expenses'
    },
    {
      id: 'suppliers',
      label: 'Suppliers & Boat Owners',
      icon: Users,
      desc: 'Vendor registry, contact persons, credit days & bank accounts'
    },
    {
      id: 'species',
      label: 'Species & Products',
      icon: Fish,
      desc: 'Seafood species catalog, scientific names & categories'
    },
    {
      id: 'grades',
      label: 'Quality Grades',
      icon: Layers,
      desc: 'Quality gradings (Grade A Export, Grade B Market, Reject)'
    },
    {
      id: 'sizes',
      label: 'Physical Sizes',
      icon: Database,
      desc: 'Fish and crustacean sizes (Small, Medium, Large, Extra Large)'
    },
    {
      id: 'counts',
      label: 'Piece Counts / Pcs',
      icon: Database,
      desc: 'Count gradings per Kg (16/20, 21/25, 31/40, 100+)'
    },
    {
      id: 'locations',
      label: 'Landing Centres & Harbours',
      icon: MapPin,
      desc: 'Harbours, wharves, jetties and coastal districts'
    },
    {
      id: 'bank-accounts',
      label: 'Bank & Cash Accounts',
      icon: Building2,
      desc: 'Harbour operating accounts for supplier disbursements'
    },
    {
      id: 'expense-types',
      label: 'Recurring Expense Types',
      icon: DollarSign,
      desc: 'Direct landing expenses (Ice, Transport, Dalali, Labour, Other Expenses)'
    },
    {
      id: 'multi-sheet',
      label: 'Multi-Sheet Complete Workbook',
      icon: FileSpreadsheet,
      desc: 'Upload 1 complete workbook with Purchases, Suppliers, Species & Masters'
    }
  ];

  const productionEntities: { id: ImportEntityType; label: string; icon: any; desc: string }[] = [
    {
      id: 'processing-entries',
      label: 'Daily Processing & Plant Entries',
      icon: Factory,
      desc: 'Shift-wise factory throughput, supplier lots, processed weight, rejection & slab variance'
    },
    {
      id: 'slab-types',
      label: 'Slab Types Master',
      icon: Boxes,
      desc: 'Standard block freezing specifications (2.0 Kg Standard Block, 1.8 Kg Export Slab)'
    },
    {
      id: 'species',
      label: 'Species & Raw Materials',
      icon: Fish,
      desc: 'Factory raw material varieties, processing yield form & classifications'
    },
    {
      id: 'grades',
      label: 'Quality Grades',
      icon: Layers,
      desc: 'Factory grading standards (Export Grade A, Processing Grade B)'
    },
    {
      id: 'sizes',
      label: 'Physical Sizes',
      icon: Database,
      desc: 'Product sizing specifications for packing lines'
    },
    {
      id: 'counts',
      label: 'Piece Counts',
      icon: Database,
      desc: 'Piece count per Kg specifications for shrimp processing'
    },
    {
      id: 'production-multi-sheet',
      label: 'Multi-Sheet Production Workbook',
      icon: FileSpreadsheet,
      desc: 'Complete workbook containing Processing Entries, Slab Types & Species sheets'
    }
  ];

  const salesEntities: { id: ImportEntityType; label: string; icon: any; desc: string }[] = [
    {
      id: 'sales-invoices',
      label: 'Export Performance & Invoices',
      icon: FileText,
      desc: 'Export performance register, total sales value in USD, and FOB values in both USD and Indian rupees'
    },
    {
      id: 'customers',
      label: 'Consignees & Foreign Buyers',
      icon: Users,
      desc: 'Overseas buyer profiles, tax IDs, destination countries & bank wire info'
    },
    {
      id: 'ports',
      label: 'Port Master (POL & POD)',
      icon: Anchor,
      desc: 'Ports of loading, transshipment hubs, discharge ports & destinations'
    },
    {
      id: 'species',
      label: 'Product Master',
      icon: Fish,
      desc: 'Export-ready commercial products, purchase species link & customs HSN codes'
    },
    {
      id: 'sizes',
      label: 'Export Finished Sizes',
      icon: Database,
      desc: 'Commercial packaging size classifications'
    },
    {
      id: 'sales-multi-sheet',
      label: 'Multi-Sheet Export Workbook',
      icon: FileSpreadsheet,
      desc: 'Complete export workbook with Sales Invoices, Buyers & Ports sheets'
    }
  ];

  const currentEntityOptions =
    selectedModule === 'production'
      ? productionEntities
      : selectedModule === 'sales'
      ? salesEntities
      : purchaseEntities;

  const handleModuleSwitch = (mod: ModuleCategory) => {
    setSelectedModule(mod);
    setImportSummary(null);
    setSelectedFile(null);
    setSheetsData([]);
    if (mod === 'production') {
      setSelectedEntity('processing-entries');
    } else if (mod === 'sales') {
      setSelectedEntity('sales-invoices');
    } else {
      setSelectedEntity('purchases');
    }
  };

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setImportSummary(null);

    try {
      const { sheets } = await parseExcelWorkbook(file);
      setSheetsData(sheets);
      setActiveSheetIndex(0);

      // Intelligent Auto-Detection of Sheet / Entity across Modules
      if (sheets.length > 1) {
        const names = sheets.map((s) => s.name.toLowerCase().trim());
        const hasSupp = names.some((n) => n.includes('supplier'));
        const hasSpec = names.some((n) => n.includes('specie') || n.includes('product'));
        const hasPur = names.some((n) => n.includes('purchase'));
        const hasProc = names.some((n) => n.includes('process') || n.includes('production'));
        const hasSlab = names.some((n) => n.includes('slab'));
        const hasInv = names.some((n) => n.includes('invoice') || n.includes('export') || n.includes('sales'));
        const hasCust = names.some((n) => n.includes('customer') || n.includes('buyer'));
        const hasPort = names.some((n) => n.includes('port'));

        if (hasProc || hasSlab) {
          setSelectedModule('production');
          setSelectedEntity('production-multi-sheet');
          showToast('Detected Production multi-sheet workbook. Switched to Production Module.', 'info');
        } else if (hasInv || (hasCust && hasPort)) {
          setSelectedModule('sales');
          setSelectedEntity('sales-multi-sheet');
          showToast('Detected Sales & Export multi-sheet workbook. Switched to Sales Module.', 'info');
        } else if ((hasSupp && hasSpec) || (hasSupp && hasPur) || (hasSpec && hasPur)) {
          setSelectedModule('purchase');
          setSelectedEntity('multi-sheet');
          showToast('Detected Purchase multi-sheet workbook. Switched to Purchase Module.', 'info');
        }
      } else if (sheets.length === 1) {
        const sheet = sheets[0];
        const sName = sheet.name.toLowerCase();
        const fRow = sheet.rows[0] || {};
        const colKeys = Object.keys(fRow).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

        // Production Detection
        if (
          sName.includes('process') ||
          sName.includes('production') ||
          colKeys.includes('slabscount') ||
          colKeys.includes('processedweightkg') ||
          colKeys.includes('processedweight') ||
          colKeys.includes('supplierboxid') ||
          colKeys.includes('standardslabweightkg')
        ) {
          setSelectedModule('production');
          setSelectedEntity('processing-entries');
          showToast('Detected Production daily processing log sheet.', 'info');
        } else if (sName.includes('slab') || (colKeys.includes('standardweightkg') && !colKeys.includes('rateperkg'))) {
          setSelectedModule('production');
          setSelectedEntity('slab-types');
          showToast('Detected Slab Types master sheet.', 'info');
        }
        // Sales & Export Detection
        else if (
          sName.includes('export') ||
          sName.includes('sales') ||
          colKeys.includes('portofloading') ||
          colKeys.includes('portofdischarge') ||
          colKeys.includes('fobvaluecurrency') ||
          colKeys.includes('fobvalue') ||
          colKeys.includes('consignee') ||
          colKeys.includes('cartonscount')
        ) {
          setSelectedModule('sales');
          setSelectedEntity('sales-invoices');
          showToast('Detected Commercial Export Invoices sheet.', 'info');
        } else if (sName.includes('customer') || sName.includes('buyer') || colKeys.includes('customercode') || colKeys.includes('taxid')) {
          setSelectedModule('sales');
          setSelectedEntity('customers');
          showToast('Detected Consignees & Buyers master sheet.', 'info');
        } else if (sName.includes('port') || colKeys.includes('portcode') || colKeys.includes('portname')) {
          setSelectedModule('sales');
          setSelectedEntity('ports');
          showToast('Detected Port Master sheet.', 'info');
        }
        // Purchase Detection
        else if (sName.includes('supplier') || (colKeys.includes('suppliername') && !colKeys.includes('weightkg') && !colKeys.includes('weight'))) {
          setSelectedModule('purchase');
          setSelectedEntity('suppliers');
          showToast('Detected Supplier master sheet.', 'info');
        } else if (sName.includes('specie') || sName.includes('product') || (colKeys.includes('speciesname') && !colKeys.includes('weightkg'))) {
          setSelectedEntity('species');
          showToast('Detected Species catalog sheet.', 'info');
        } else if (sName.includes('location') || sName.includes('harbour') || (colKeys.includes('locationname') && !colKeys.includes('weightkg'))) {
          setSelectedModule('purchase');
          setSelectedEntity('locations');
          showToast('Detected Landing Centre sheet.', 'info');
        } else if (sName.includes('purchase') || colKeys.includes('rateperkg') || colKeys.includes('effectivecost')) {
          setSelectedModule('purchase');
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
      } else if (selectedEntity === 'production-multi-sheet') {
        let totalEntriesAdded = 0;
        let totalSlabsAdded = 0;
        let totalSpeciesAdded = 0;
        const allErrors: string[] = [];

        sheetsData.forEach((sheet) => {
          const sheetNameNorm = sheet.name.toLowerCase().trim();
          if (sheetNameNorm.includes('process') || sheetNameNorm.includes('production') || sheetNameNorm.includes('daily')) {
            const res = bulkImportProcessingEntries(sheet.rows, autoCreateMaster);
            totalEntriesAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('slab')) {
            const res = bulkImportSlabTypes(sheet.rows);
            totalSlabsAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('specie') || sheetNameNorm.includes('product')) {
            const res = bulkImportSpecies(sheet.rows);
            totalSpeciesAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('grade')) {
            bulkImportGrades(sheet.rows);
          } else if (sheetNameNorm.includes('size')) {
            bulkImportSizes(sheet.rows);
          }
        });

        setImportSummary({
          added: totalEntriesAdded + totalSlabsAdded + totalSpeciesAdded,
          createdSlabTypes: totalSlabsAdded,
          createdSpecies: totalSpeciesAdded,
          errors: allErrors
        });
      } else if (selectedEntity === 'sales-multi-sheet') {
        let totalInvoicesAdded = 0;
        let totalCustomersAdded = 0;
        let totalPortsAdded = 0;
        let totalSpeciesAdded = 0;
        const allErrors: string[] = [];

        sheetsData.forEach((sheet) => {
          const sheetNameNorm = sheet.name.toLowerCase().trim();
          if (sheetNameNorm.includes('invoice') || sheetNameNorm.includes('export') || sheetNameNorm.includes('sales')) {
            const res = bulkImportSalesInvoices(sheet.rows, autoCreateMaster);
            totalInvoicesAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('customer') || sheetNameNorm.includes('buyer')) {
            const res = bulkImportCustomers(sheet.rows);
            totalCustomersAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('port')) {
            const res = bulkImportPorts(sheet.rows);
            totalPortsAdded += res.added;
            allErrors.push(...res.errors);
          } else if (sheetNameNorm.includes('specie') || sheetNameNorm.includes('product')) {
            const res = bulkImportSpecies(sheet.rows);
            totalSpeciesAdded += res.added;
            allErrors.push(...res.errors);
          }
        });

        setImportSummary({
          added: totalInvoicesAdded + totalCustomersAdded + totalPortsAdded + totalSpeciesAdded,
          createdCustomers: totalCustomersAdded,
          createdPorts: totalPortsAdded,
          createdSpecies: totalSpeciesAdded,
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
      } else if (selectedEntity === 'processing-entries') {
        const res = bulkImportProcessingEntries(activeRows, autoCreateMaster);
        setImportSummary({
          added: res.added,
          errors: res.errors,
          createdSuppliers: res.createdSuppliers,
          createdSpecies: res.createdSpecies,
          createdSlabTypes: res.createdSlabTypes
        });
      } else if (selectedEntity === 'slab-types') {
        const res = bulkImportSlabTypes(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'sales-invoices') {
        const res = bulkImportSalesInvoices(activeRows, autoCreateMaster);
        setImportSummary({
          added: res.added,
          errors: res.errors,
          createdCustomers: res.createdCustomers,
          createdPorts: res.createdPorts,
          createdSpecies: res.createdSpecies
        });
      } else if (selectedEntity === 'customers') {
        const res = bulkImportCustomers(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
        });
      } else if (selectedEntity === 'ports') {
        const res = bulkImportPorts(activeRows);
        setImportSummary({
          added: res.added,
          updated: res.updated,
          errors: res.errors
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
    if (selectedModule === 'production') {
      if (processingEntries.length === 0 && slabTypes.length === 0) {
        showToast('No production data in system yet to export.', 'warning');
        return;
      }

      const procExport = processingEntries.map((e) => {
        const supp = suppliers.find((s) => s.id === e.supplierId);
        const sp = species.find((s) => s.id === e.speciesId);
        const grd = grades.find((g) => g.id === e.gradeId);
        const sz = sizes.find((s) => s.id === e.sizeId);
        const cnt = counts.find((c) => c.id === e.countId);
        const slb = slabTypes.find((st) => st.id === e.slabTypeId);

        return {
          'Entry No': e.entryNo,
          'Processing Date': e.processingDate,
          'Shift': e.shift,
          'Supplier': supp?.name || '',
          'Species': sp?.name || '',
          'Grade': grd?.name || '',
          'Size': sz?.name || '',
          'Count': cnt?.name || '',
          'Supplier Box ID': e.supplierBoxId,
          'Slab Type': slb?.name || '',
          'Standard Weight (Kg)': e.standardSlabWeightKg,
          'Slabs Count': e.slabsCount,
          'Processed Weight (Kg)': e.processedWeightKg,
          'Expected Weight (Kg)': e.expectedWeightKg,
          'Variance (Kg)': e.varianceWeightKg,
          'Variance %': `${e.variancePct}%`,
          'Status': e.hasSlabVariance ? 'Variance Exceeded' : 'Within Tolerance',
          'Rejection Weight (Kg)': e.rejectionWeightKg,
          'Operator': e.operator,
          'Remarks': e.remarks
        };
      });

      const slabExport = slabTypes.map((st) => ({
        'Code': st.code,
        'Slab Type Name': st.name,
        'Standard Weight (Kg)': st.standardWeightKg,
        'Unit': st.unit,
        'Product Applicability': st.productApplicability,
        'Active': st.active ? 'Yes' : 'No'
      }));

      exportDataToExcel(`Production_Data_Export_${new Date().toISOString().split('T')[0]}`, [
        { sheetName: 'DailyProcessing', data: procExport },
        { sheetName: 'SlabTypes', data: slabExport }
      ]);
      showToast('Exported production logs and slab types to Excel.', 'success');
      return;
    }

    if (selectedModule === 'sales') {
      if (salesInvoices.length === 0 && customers.length === 0) {
        showToast('No sales data in system yet to export.', 'warning');
        return;
      }

      const invExport = salesInvoices.map((inv) => {
        const cust = customers.find((c) => c.id === inv.consigneeId);
        const pol = ports.find((p) => p.id === inv.portOfLoadingId);
        const pod = ports.find((p) => p.id === inv.portOfDischargeId);
        const dest = ports.find((p) => p.id === inv.finalDestinationId);

        return {
          'Invoice No': inv.invoiceNo,
          'Invoice Date': inv.invoiceDate,
          'Customer / Consignee': cust?.name || '',
          'Destination Country': cust?.country || '',
          'Order No': inv.orderNo || '',
          'Port of Loading': pol?.name || '',
          'Port of Discharge': pod?.name || '',
          'Final Destination': dest?.name || '',
          'Currency': inv.currency,
          'Exchange Rate': inv.exchangeRate,
          'Bank Pre-determined Exchange Rate': inv.bankPreDeterminedExchangeRate || inv.exchangeRate,
          'Total Cartons': inv.totalCartons,
          'Total Net Weight (Kg)': inv.totalWeightKg,
          'Total Amount': inv.totalAmountCurrency,
          'Total FOB Value': inv.totalFobValueCurrency,
          'Estimated INR Value': inv.estimatedAmountINR,
          'Advance Received': inv.advanceReceivedCurrency || 0,
          'Date of Receiving Advance': inv.advanceReceivedDate || '',
          'Balance Payment Amount': inv.balancePaymentAmountCurrency || 0,
          'Date of Receiving Balance Payment': inv.balancePaymentDate || '',
          'Realized Currency': inv.totalRealizedCurrency,
          'Balance Currency': inv.balanceRealizationCurrency,
          'Realization Status': inv.realizationStatus,
          'Remarks': inv.remarks || ''
        };
      });

      const linesExport: any[] = [];
      salesInvoices.forEach((inv) => {
        inv.lineItems.forEach((l, idx) => {
          const sp = species.find((s) => s.id === l.speciesId);
          const sz = sizes.find((s) => s.id === l.sizeId);
          const cnt = counts.find((c) => c.id === l.countId);

          linesExport.push({
            'Invoice No': inv.invoiceNo,
            'Line #': idx + 1,
            'Species / Product': sp?.name || '',
            'HS Code': l.hsCode,
            'Size': sz?.name || '',
            'Count': cnt?.name || '',
            'Cartons': l.cartonsCount,
            'Net Weight (Kg)': l.weightKg,
            'Rate per Kg': l.ratePerKg,
            'Line Amount': l.amountCurrency,
            'FOB Value': l.fobValueCurrency
          });
        });
      });

      const custExport = customers.map((c) => ({
        'Customer Code': c.code,
        'Name': c.name,
        'Country': c.country,
        'Contact Person': c.contactPerson,
        'Phone': c.phone,
        'Email': c.email,
        'Tax ID': c.taxId,
        'Address': c.address,
        'Bank Details / SWIFT': c.bankDetails
      }));

      const portExport = ports.map((p) => ({
        'Port Code': p.code,
        'Port Name': p.name,
        'Country': p.country
      }));

      exportDataToExcel(`Sales_Export_Data_${new Date().toISOString().split('T')[0]}`, [
        { sheetName: 'SalesInvoices', data: invExport },
        { sheetName: 'LineItems', data: linesExport },
        { sheetName: 'Customers', data: custExport },
        { sheetName: 'Ports', data: portExport }
      ]);
      showToast('Exported sales invoices, customers and ports to Excel.', 'success');
      return;
    }

    // Default: Purchase Module Export
    if (purchases.length === 0 && suppliers.length === 0) {
      showToast('No purchase data in system yet to export.', 'warning');
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
        'Batch Yield Weight (Kg)': p.batchYieldWeightKg ?? '',
        'Batch Yield %': p.batchYieldPct ? `${p.batchYieldPct}%` : '',
        'Batch Yield Allocated': p.isBatchYieldAllocated ? 'Yes' : 'No',
        'Remarks': p.remarks
      };
    });

    const suppliersExport = suppliers.map((s) => ({
      'Supplier Code': s.code,
      'Name': s.name,
      'Type': s.type,
      'Contact Person': s.contactPerson,
      'Phone': s.phone,
      'Email': s.email,
      'Address': s.address,
      'District': s.district,
      'State': s.state,
      'GSTIN': s.gstin || '',
      'PAN': s.pan || '',
      'Bank Name': s.bankName,
      'Account No': s.bankAccount,
      'IFSC': s.bankIfsc,
      'Payment Terms': s.paymentTerms,
      'Credit Days': s.creditDays,
      'Opening Balance': s.openingBalance
    }));

    exportDataToExcel(`Seafood_Procurement_Backup_${new Date().toISOString().split('T')[0]}`, [
      { sheetName: 'Purchases', data: purchasesExport },
      { sheetName: 'Suppliers', data: suppliersExport }
    ]);
    showToast('Exported purchase register and suppliers to Excel.', 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Figma Make Standard Page Header */}
      <PageHeader
        title={
          selectedModule === 'production'
            ? 'Production bulk import & factory migration engine'
            : selectedModule === 'sales'
            ? 'Commercial export sales import & migration engine'
            : 'Excel bulk import & migration engine'
        }
        subtitle={
          selectedModule === 'production'
            ? 'Bulk upload factory processing shifts, lot tracking, standard slab freezing records, and yield variances with automatic tolerance verification.'
            : selectedModule === 'sales'
            ? 'Import commercial export invoices, container line items, foreign buyer profiles, and shipping discharge ports with automatic currency exchange rate mapping.'
            : 'Zero-dependency spreadsheet import for historical procurement entries, vendor ledgers, and master reference catalogs with intelligent column auto-mapping.'
        }
        breadcrumbs={[
          selectedModule === 'production' ? 'Production' : selectedModule === 'sales' ? 'Sales' : 'Settings',
          'Excel Migration'
        ]}
        primaryAction={{
          label: `Backup ${selectedModule === 'production' ? 'production' : selectedModule === 'sales' ? 'sales' : 'purchase'} data`,
          icon: Download,
          onClick: handleExportCurrent
        }}
        secondaryAction={{
          label: 'Sample template',
          icon: FileSpreadsheet,
          onClick: () => downloadExcelTemplate(selectedEntity, expenseTypes)
        }}
      />

      {/* Module Workspace Switcher Tabs */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl">
          <button
            onClick={() => handleModuleSwitch('purchase')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedModule === 'purchase'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Purchase Module</span>
          </button>
          <button
            onClick={() => handleModuleSwitch('production')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedModule === 'production'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>Production Module</span>
          </button>
          <button
            onClick={() => handleModuleSwitch('sales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedModule === 'sales'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Sales & Export Module</span>
          </button>
        </div>

        <div className="text-xs text-ink-500 font-medium px-2">
          Workspace: <strong className="text-ink-900 capitalize">{selectedModule} Data Migration</strong>
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
          {currentEntityOptions.map((opt) => {
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

      {/* Step 2: Upload File */}
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
        {(selectedEntity === 'purchases' || selectedEntity === 'processing-entries' || selectedEntity === 'sales-invoices') && (
          <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="autoCreateMaster"
              checked={autoCreateMaster}
              onChange={(e) => setAutoCreateMaster(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="autoCreateMaster" className="text-xs text-ink-800 cursor-pointer">
              <strong>Auto-create missing master data:</strong> If an imported record contains a
              {selectedModule === 'production'
                ? ' supplier, species, or slab type'
                : selectedModule === 'sales'
                ? ' buyer / customer, species, or shipping port'
                : ' supplier, species, or harbour landing centre'}{' '}
              not yet registered in the system, automatically register it rather than throwing an error.
            </label>
          </div>
        )}

        {(selectedEntity === 'suppliers' || selectedEntity === 'species' || selectedEntity === 'customers' || selectedEntity === 'ports' || selectedEntity === 'slab-types') && (
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
                  {activeRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-mono text-[11px] text-ink-400">{idx + 1}</td>
                      {Object.keys(activeRows[0] || {}).map((col) => (
                        <td key={col} className="py-2 px-3 whitespace-nowrap text-ink-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeRows.length > 10 && (
                <div className="p-2.5 text-center text-xs text-ink-500 bg-gray-50 border-t border-gray-100">
                  Showing first 10 rows of {activeRows.length} total rows in this sheet
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-ink-500 bg-gray-50 rounded-xl">
              This sheet appears to be empty or does not contain recognizable tabular rows.
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-ink-500">
              Target Entity:{' '}
              <strong className="text-ink-900">
                {currentEntityOptions.find((e) => e.id === selectedEntity)?.label || selectedEntity}
              </strong>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || activeRows.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                isProcessing || activeRows.length === 0
                  ? 'bg-gray-200 text-ink-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing &amp; Validating...
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

            {importSummary.createdCustomers !== undefined && importSummary.createdCustomers > 0 && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                  Auto-Created Buyers
                </span>
                <span className="text-lg font-black text-indigo-700">
                  {importSummary.createdCustomers}
                </span>
              </div>
            )}

            {importSummary.createdPorts !== undefined && importSummary.createdPorts > 0 && (
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-teal-800 uppercase block">
                  Auto-Created Ports
                </span>
                <span className="text-lg font-black text-teal-700">
                  {importSummary.createdPorts}
                </span>
              </div>
            )}

            {importSummary.createdSlabTypes !== undefined && importSummary.createdSlabTypes > 0 && (
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                <span className="text-[10px] font-bold text-sky-800 uppercase block">
                  Auto-Created Slab Types
                </span>
                <span className="text-lg font-black text-sky-700">
                  {importSummary.createdSlabTypes}
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
                {selectedModule === 'production' ? (
                  <>
                    <button
                      onClick={() => onNavigate('processing-log')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      View Processing Records &amp; Lots
                    </button>
                    <button
                      onClick={() => onNavigate('slab-types')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      View Slab Types
                    </button>
                    <button
                      onClick={() => onNavigate('prod-dashboard')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                    >
                      Production Dashboard
                    </button>
                  </>
                ) : selectedModule === 'sales' ? (
                  <>
                    <button
                      onClick={() => onNavigate('invoices')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Invoices &amp; Shipments
                    </button>
                    <button
                      onClick={() => onNavigate('customers')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                    >
                      <Users className="w-3.5 h-3.5" />
                      View Buyers &amp; Consignees
                    </button>
                    <button
                      onClick={() => onNavigate('sales-dashboard')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 text-xs font-semibold rounded-xl transition"
                    >
                      Commercial Dashboard
                    </button>
                  </>
                ) : (
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
