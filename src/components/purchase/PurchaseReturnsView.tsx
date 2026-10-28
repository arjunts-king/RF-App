import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PurchaseReturn, PurchaseReturnReason, Purchase } from '../../types';
import { formatINR, formatKg } from '../../utils/calculations';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import {
  RotateCcw,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Ban,
  Download,
  AlertTriangle,
  Info,
  Layers,
  Scale,
  FileText
} from 'lucide-react';

const RETURN_REASONS: PurchaseReturnReason[] = [
  'Quality / Spoilage Rejection',
  'Excessive Soft / Black Shell',
  'Size / Count Mismatch',
  'Foreign Contamination / Odor',
  'Temperature Abuse During Transit',
  'Weighment / Scale Discrepancy',
  'Damaged Packaging / Crates',
  'Pricing Discrepancy',
  'Other'
];

interface PurchaseReturnsViewProps {
  onNavigate?: (tab: any) => void;
  preselectedPurchaseId?: string;
  onClearPreselectedPurchase?: () => void;
}

export const PurchaseReturnsView: React.FC<PurchaseReturnsViewProps> = ({
  onNavigate,
  preselectedPurchaseId,
  onClearPreselectedPurchase
}) => {
  const {
    purchaseReturns,
    purchases,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    addPurchaseReturn,
    updatePurchaseReturn,
    voidPurchaseReturn,
    deletePurchaseReturnPermanently
  } = useData();

  const { permissions } = useAuth();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [inspectReturn, setInspectReturn] = useState<PurchaseReturn | null>(null);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [voidModalTarget, setVoidModalTarget] = useState<PurchaseReturn | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [deleteModalTarget, setDeleteModalTarget] = useState<PurchaseReturn | null>(null);

  // Form State for creating / editing return
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formPurchaseId, setFormPurchaseId] = useState('');
  const [formReturnDate, setFormReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSpeciesId, setFormSpeciesId] = useState('');
  const [formGradeId, setFormGradeId] = useState('');
  const [formSizeId, setFormSizeId] = useState('');
  const [formSecondarySizeId, setFormSecondarySizeId] = useState('');
  const [formIsDualSize, setFormIsDualSize] = useState(false);
  const [formCountId, setFormCountId] = useState('');
  const [formBoxesCount, setFormBoxesCount] = useState<number | ''>('');
  const [formWeightKg, setFormWeightKg] = useState<number | ''>('');
  const [formRatePerKg, setFormRatePerKg] = useState<number | ''>('');
  const [formReason, setFormReason] = useState<PurchaseReturnReason | string>(RETURN_REASONS[0]);
  const [formDetailedReason, setFormDetailedReason] = useState('');
  const [formAdjustPayable, setFormAdjustPayable] = useState(true);
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formPurchaseRefNo, setFormPurchaseRefNo] = useState('');
  const [editReason, setEditReason] = useState('');

  // Pre-selection trigger when opened directly from a purchase transaction
  React.useEffect(() => {
    if (preselectedPurchaseId) {
      const targetPurchase = purchases.find((p) => p.id === preselectedPurchaseId);
      if (targetPurchase) {
        initFormFromPurchase(targetPurchase);
        setIsRecordModalOpen(true);
      }
      if (onClearPreselectedPurchase) {
        onClearPreselectedPurchase();
      }
    }
  }, [preselectedPurchaseId]);

  // Lookup maps for fast names
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((c) => [c.id, c]));

  // Calculate unreturned weight on a specific purchase
  const getRemainingReturnableKg = (targetPurchase: Purchase): number => {
    const priorReturnsKg = (purchaseReturns || [])
      .filter((r) => !r.isVoided && r.purchaseId === targetPurchase.id)
      .reduce((sum, r) => sum + r.returnedWeightKg, 0);
    return Math.max(0, Number((targetPurchase.weightKg - priorReturnsKg).toFixed(2)));
  };

  const initFormFromPurchase = (p: Purchase) => {
    setFormSupplierId(p.supplierId);
    setFormPurchaseId(p.id);
    setFormPurchaseRefNo(p.purchaseId);
    setFormInvoiceNo(p.invoiceNo || '');
    setFormSpeciesId(p.speciesId);
    setFormGradeId(p.gradeId || '');
    setFormSizeId(p.sizeId || '');
    setFormSecondarySizeId(p.secondarySizeId || '');
    setFormIsDualSize(Boolean(p.isDualSize));
    setFormCountId(p.countId || '');
    setFormRatePerKg(p.ratePerKg);
    const maxKg = getRemainingReturnableKg(p);
    setFormWeightKg(maxKg > 0 ? maxKg : '');
    setFormBoxesCount('');
    setFormReason(RETURN_REASONS[0]);
    setFormDetailedReason('');
    setFormAdjustPayable(true);
    setFormReturnDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenNewReturn = () => {
    setEditingReturn(null);
    setFormSupplierId(suppliers[0]?.id || '');
    setFormPurchaseId('');
    setFormPurchaseRefNo('');
    setFormInvoiceNo('');
    setFormSpeciesId(species[0]?.id || '');
    setFormGradeId('');
    setFormSizeId('');
    setFormSecondarySizeId('');
    setFormIsDualSize(false);
    setFormCountId('');
    setFormBoxesCount('');
    setFormWeightKg('');
    setFormRatePerKg('');
    setFormReason(RETURN_REASONS[0]);
    setFormDetailedReason('');
    setFormAdjustPayable(true);
    setFormReturnDate(new Date().toISOString().split('T')[0]);
    setIsRecordModalOpen(true);
  };

  const handleSupplierChange = (newSupId: string) => {
    setFormSupplierId(newSupId);
    setFormPurchaseId('');
    setFormPurchaseRefNo('');
    setFormInvoiceNo('');
  };

  const handlePurchaseSelect = (purchId: string) => {
    setFormPurchaseId(purchId);
    if (!purchId) {
      setFormPurchaseRefNo('');
      setFormInvoiceNo('');
      return;
    }
    const target = purchases.find((p) => p.id === purchId);
    if (target) {
      setFormPurchaseRefNo(target.purchaseId);
      setFormInvoiceNo(target.invoiceNo || '');
      setFormSpeciesId(target.speciesId);
      setFormGradeId(target.gradeId || '');
      setFormSizeId(target.sizeId || '');
      setFormSecondarySizeId(target.secondarySizeId || '');
      setFormIsDualSize(Boolean(target.isDualSize));
      setFormCountId(target.countId || '');
      setFormRatePerKg(target.ratePerKg);
      const remainingKg = getRemainingReturnableKg(target);
      setFormWeightKg(remainingKg > 0 ? remainingKg : '');
    }
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();

    const weight = Number(formWeightKg);
    const rate = Number(formRatePerKg);

    if (!formSupplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (!formSpeciesId) {
      alert('Please select a species / product.');
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid returned weight in Kg (> 0).');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid rate per Kg (>= 0).');
      return;
    }

    if (editingReturn) {
      const res = updatePurchaseReturn(
        editingReturn.id,
        {
          supplierId: formSupplierId,
          purchaseId: formPurchaseId || undefined,
          purchaseRefNo: formPurchaseRefNo || undefined,
          invoiceNo: formInvoiceNo || undefined,
          returnDate: formReturnDate,
          speciesId: formSpeciesId,
          gradeId: formGradeId || undefined,
          sizeId: formSizeId || undefined,
          secondarySizeId: formIsDualSize && formSecondarySizeId ? formSecondarySizeId : undefined,
          isDualSize: formIsDualSize && Boolean(formSecondarySizeId),
          countId: formCountId || undefined,
          boxesCount: formBoxesCount ? Number(formBoxesCount) : undefined,
          returnedWeightKg: weight,
          ratePerKg: rate,
          reason: formReason,
          detailedReason: formDetailedReason || undefined,
          adjustSupplierPayable: formAdjustPayable
        },
        editReason || 'Updated return specifications'
      );
      if (res.success) {
        setIsRecordModalOpen(false);
        setEditingReturn(null);
      }
    } else {
      const res = addPurchaseReturn({
        returnDate: formReturnDate,
        financialYear: '',
        supplierId: formSupplierId,
        purchaseId: formPurchaseId || undefined,
        purchaseRefNo: formPurchaseRefNo || undefined,
        invoiceNo: formInvoiceNo || undefined,
        speciesId: formSpeciesId,
        gradeId: formGradeId || undefined,
        sizeId: formSizeId || undefined,
        secondarySizeId: formIsDualSize && formSecondarySizeId ? formSecondarySizeId : undefined,
        isDualSize: formIsDualSize && Boolean(formSecondarySizeId),
        countId: formCountId || undefined,
        boxesCount: formBoxesCount ? Number(formBoxesCount) : undefined,
        returnedWeightKg: weight,
        ratePerKg: rate,
        returnedValue: 0,
        reason: formReason,
        detailedReason: formDetailedReason || undefined,
        adjustSupplierPayable: formAdjustPayable
      });
      if (res.success) {
        setIsRecordModalOpen(false);
      }
    }
  };

  const handleStartEdit = (ret: PurchaseReturn) => {
    setEditingReturn(ret);
    setFormSupplierId(ret.supplierId);
    setFormPurchaseId(ret.purchaseId || '');
    setFormPurchaseRefNo(ret.purchaseRefNo || '');
    setFormInvoiceNo(ret.invoiceNo || '');
    setFormReturnDate(ret.returnDate);
    setFormSpeciesId(ret.speciesId);
    setFormGradeId(ret.gradeId || '');
    setFormSizeId(ret.sizeId || '');
    setFormSecondarySizeId(ret.secondarySizeId || '');
    setFormIsDualSize(Boolean(ret.isDualSize));
    setFormCountId(ret.countId || '');
    setFormBoxesCount(ret.boxesCount || '');
    setFormWeightKg(ret.returnedWeightKg);
    setFormRatePerKg(ret.ratePerKg);
    setFormReason(ret.reason);
    setFormDetailedReason(ret.detailedReason || '');
    setFormAdjustPayable(ret.adjustSupplierPayable !== false);
    setEditReason('');
    setIsRecordModalOpen(true);
  };

  const handleConfirmVoid = () => {
    if (!voidModalTarget || !voidReason.trim()) return;
    voidPurchaseReturn(voidModalTarget.id, voidReason);
    setVoidModalTarget(null);
    setVoidReason('');
  };

  const handleConfirmDelete = () => {
    if (!deleteModalTarget) return;
    deletePurchaseReturnPermanently(deleteModalTarget.id);
    setDeleteModalTarget(null);
  };

  // Filtered dataset
  const filteredReturns = (purchaseReturns || []).filter((r) => {
    if (!showVoided && r.isVoided) return false;
    if (supplierFilter && r.supplierId !== supplierFilter) return false;
    if (reasonFilter && r.reason !== reasonFilter) return false;
    if (startDate && r.returnDate < startDate) return false;
    if (endDate && r.returnDate > endDate) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sup = supplierMap.get(r.supplierId)?.name.toLowerCase() || '';
      const sp = speciesMap.get(r.speciesId)?.name.toLowerCase() || '';
      const retNo = r.returnNo.toLowerCase();
      const ref = (r.purchaseRefNo || '').toLowerCase();
      const inv = (r.invoiceNo || '').toLowerCase();
      const reason = r.reason.toLowerCase();
      return (
        retNo.includes(q) ||
        sup.includes(q) ||
        sp.includes(q) ||
        ref.includes(q) ||
        inv.includes(q) ||
        reason.includes(q)
      );
    }
    return true;
  });

  // KPI Calculations
  const activeReturns = (purchaseReturns || []).filter((r) => !r.isVoided);
  const totalReturnNotes = activeReturns.length;
  const totalReturnedWeightKg = activeReturns.reduce((s, r) => s + r.returnedWeightKg, 0);
  const totalDebitValue = activeReturns.reduce((s, r) => s + r.returnedValue, 0);
  const uniqueSuppliersCount = new Set(activeReturns.map((r) => r.supplierId)).size;

  // Available purchases for selected supplier in modal
  const eligiblePurchases = purchases.filter(
    (p) => !p.isVoided && (!formSupplierId || p.supplierId === formSupplierId)
  );

  const selectedPurchaseForModal = formPurchaseId
    ? purchases.find((p) => p.id === formPurchaseId)
    : undefined;

  const currentAvailableWeight = selectedPurchaseForModal
    ? getRemainingReturnableKg(selectedPurchaseForModal)
    : undefined;

  const calculatedFormTotal =
    typeof formWeightKg === 'number' && typeof formRatePerKg === 'number' && formWeightKg > 0 && formRatePerKg >= 0
      ? Number((formWeightKg * formRatePerKg).toFixed(2))
      : 0;

  const handleExportCSV = () => {
    const csvData = filteredReturns.map((r) => ({
      returnNo: r.returnNo,
      returnDate: r.returnDate,
      financialYear: r.financialYear,
      supplierCode: supplierMap.get(r.supplierId)?.code || '',
      supplierName: supplierMap.get(r.supplierId)?.name || '',
      purchaseRefNo: r.purchaseRefNo || 'Unlinked',
      invoiceNo: r.invoiceNo || 'N/A',
      species: speciesMap.get(r.speciesId)?.name || '',
      grade: gradeMap.get(r.gradeId || '')?.name || 'N/A',
      size: sizeMap.get(r.sizeId || '')?.name || 'N/A',
      dualSize: r.isDualSize && r.secondarySizeId ? sizeMap.get(r.secondarySizeId)?.name || '' : '',
      count: countMap.get(r.countId || '')?.name || 'N/A',
      returnedWeightKg: r.returnedWeightKg,
      ratePerKg: r.ratePerKg,
      returnedValue: r.returnedValue,
      boxesCount: r.boxesCount || 0,
      reason: r.reason,
      detailedReason: r.detailedReason || '',
      adjustSupplierPayable: r.adjustSupplierPayable ? 'YES' : 'NO',
      status: r.isVoided ? 'VOIDED' : 'ACTIVE',
      voidReason: r.voidReason || '',
      createdBy: r.createdBy,
      createdAt: r.createdAt
    }));

    const csvStr = convertToCSV(csvData, [
      { key: 'returnNo', label: 'Debit Note / Return No' },
      { key: 'returnDate', label: 'Date' },
      { key: 'financialYear', label: 'Financial Year' },
      { key: 'supplierCode', label: 'Supplier Code' },
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'purchaseRefNo', label: 'Linked Purchase ID' },
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'species', label: 'Species / Product' },
      { key: 'grade', label: 'Grade' },
      { key: 'size', label: 'Primary Size' },
      { key: 'dualSize', label: 'Secondary Size' },
      { key: 'count', label: 'Count' },
      { key: 'returnedWeightKg', label: 'Returned Weight (Kg)' },
      { key: 'ratePerKg', label: 'Rate (INR/Kg)' },
      { key: 'returnedValue', label: 'Debit Note Amount (INR)' },
      { key: 'boxesCount', label: 'Boxes / Crates' },
      { key: 'reason', label: 'Return Reason' },
      { key: 'detailedReason', label: 'Detailed Remarks' },
      { key: 'adjustSupplierPayable', label: 'Adjusted in Ledger' },
      { key: 'status', label: 'Status' },
      { key: 'voidReason', label: 'Void Reason' }
    ]);

    downloadFile(csvStr, `Purchase_Returns_Debit_Notes_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-ink-900 tracking-tight">
                Purchase Returns &amp; Debit Notes
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Record goods returned to suppliers, issue supplier debit notes, and automatically reduce payable ledger balances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('purchases')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition shadow-2xs"
              title="Return to Purchase Transactions"
            >
              <span>Purchases List</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition shadow-2xs"
            title="Export filtered purchase returns to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canCreateEditPurchases && (
            <button
              onClick={handleOpenNewReturn}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Purchase Return</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Debit Notes</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-ink-900">{totalReturnNotes}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">Active return vouchers</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Returned Weight</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">{formatKg(totalReturnedWeightKg)}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">Total seafood returned</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Total Debit Value</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{formatINR(totalDebitValue)}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">Supplier payables credited</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Parties Returned</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-ink-900">{uniqueSuppliersCount}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">Suppliers with active debit notes</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search return #, supplier, species, ref, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:border-rose-600 outline-none transition"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Reasons</option>
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-medium px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              title="From Date"
            />
            <span className="text-xs text-ink-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-medium px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              title="To Date"
            />
          </div>
        </div>

        <button
          onClick={() => setShowVoided(!showVoided)}
          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
            showVoided
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {showVoided ? 'Showing Voided' : 'Active Only'}
        </button>
      </div>

      {/* Returns Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-4">Return / Debit Note</th>
                <th className="py-3 px-4">Date &amp; FY</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Species &amp; Specs</th>
                <th className="py-3 px-4 text-right">Returned Weight</th>
                <th className="py-3 px-4 text-right">Return Rate</th>
                <th className="py-3 px-4 text-right">Debit Note Value</th>
                <th className="py-3 px-4">Reason &amp; Linked Ref</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-ink-900">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-500">
                    No purchase return records match the criteria.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => {
                  const supp = supplierMap.get(r.supplierId);
                  const spec = speciesMap.get(r.speciesId);
                  const sz = sizeMap.get(r.sizeId || '');
                  const cnt = countMap.get(r.countId || '');

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-rose-50/40 transition-colors ${
                        r.isVoided ? 'bg-gray-50/60 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-800">{r.returnNo}</span>
                          {r.adjustSupplierPayable !== false && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                              title="Credited into supplier payable ledger"
                            >
                              Dr. Note
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-ink-700">
                        <div>{r.returnDate}</div>
                        <div className="text-[10px] text-ink-400">FY {r.financialYear}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-ink-900">{supp?.name || 'Unknown Supplier'}</div>
                        <div className="text-[10px] text-ink-500 font-mono">{supp?.code}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-ink-900">{spec?.name || 'Seafood'}</div>
                        <div className="text-[10px] text-ink-500 mt-0.5">
                          {r.isDualSize && r.secondarySizeId ? (
                            <span className="font-semibold text-rose-700">
                              Sizes: {sz?.name || 'N/A'} &amp; {sizeMap.get(r.secondarySizeId)?.name || 'N/A'}
                            </span>
                          ) : (
                            [sz?.name ? `Size: ${sz.name}` : '', cnt?.name ? `Count: ${cnt.name}` : '']
                              .filter(Boolean)
                              .join(' · ') || 'Standard'
                          )}
                          {r.boxesCount ? ` · ${r.boxesCount} Boxes` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap text-amber-800">
                        {formatKg(r.returnedWeightKg)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        ₹{r.ratePerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatINR(r.returnedValue)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-ink-900 max-w-[200px] truncate" title={r.reason}>
                          {r.reason}
                        </div>
                        {r.purchaseRefNo && (
                          <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                            Purch: {r.purchaseRefNo}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {r.isVoided ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                            Voided
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Inspect Detail */}
                          <button
                            onClick={() => setInspectReturn(r)}
                            className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Inspect return & audit details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action */}
                          {!r.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit return voucher"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Void Action */}
                          {!r.isVoided && permissions.canVoid && (
                            <button
                              onClick={() => setVoidModalTarget(r)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                              title="Void return note (Master Accountant/Admin)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Action (Admin Only) */}
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteModalTarget(r)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition"
                              title="Permanently purge (Owner/Admin only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD / EDIT PURCHASE RETURN MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={editingReturn ? `Edit Purchase Return: ${editingReturn.returnNo}` : 'Record Purchase Return / Debit Note'}
        subtitle="Specify return weight, reason, and supplier debit note adjustment"
      >
        <form onSubmit={handleSaveReturn} className="space-y-4 text-xs font-medium text-ink-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Select */}
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Supplier / Party <span className="text-rose-600">*</span>
              </label>
              <select
                value={formSupplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                disabled={!!editingReturn}
                required
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Purchase Voucher */}
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Linked Purchase Voucher <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <select
                value={formPurchaseId}
                onChange={(e) => handlePurchaseSelect(e.target.value)}
                disabled={!!editingReturn}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">None / Standalone Return</option>
                {eligiblePurchases.map((p) => {
                  const sp = speciesMap.get(p.speciesId)?.name;
                  const availKg = getRemainingReturnableKg(p);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.purchaseId} · {p.purchaseDate} · {sp} ({formatKg(p.weightKg)}) - {availKg}Kg avail
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Linked Purchase Banner */}
          {selectedPurchaseForModal && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Linked to Purchase <strong>{selectedPurchaseForModal.purchaseId}</strong>: Original weight{' '}
                  <strong>{formatKg(selectedPurchaseForModal.weightKg)}</strong> @ ₹{selectedPurchaseForModal.ratePerKg}/Kg.
                </span>
              </div>
              <span className="font-bold text-rose-800">
                Max Returnable: {formatKg(currentAvailableWeight || 0)}
              </span>
            </div>
          )}

          {/* Species, Grade, Size, Count */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Species / Product <span className="text-rose-600">*</span>
              </label>
              <select
                value={formSpeciesId}
                onChange={(e) => setFormSpeciesId(e.target.value)}
                required
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">Select Species...</option>
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">Grade</label>
              <select
                value={formGradeId}
                onChange={(e) => setFormGradeId(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">Primary Size</label>
              <select
                value={formSizeId}
                onChange={(e) => setFormSizeId(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">Count</label>
              <select
                value={formCountId}
                onChange={(e) => setFormCountId(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                <option value="">None / Count</option>
                {counts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dual Size Row */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-800">
              <input
                type="checkbox"
                checked={formIsDualSize}
                onChange={(e) => setFormIsDualSize(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
              />
              <span>Dual-Size Lot (Combined single catch with two sizes)</span>
            </label>

            {formIsDualSize && (
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">Secondary Size</label>
                  <select
                    value={formSecondarySizeId}
                    onChange={(e) => setFormSecondarySizeId(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
                  >
                    <option value="">Select Secondary Size...</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center text-[11px] text-ink-500 italic">
                  Note: Total returned weight will apply across both sizes as reported.
                </div>
              </div>
            )}
          </div>

          {/* Quantities, Rate, Date, Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Returned Weight (Kg) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentAvailableWeight !== undefined ? currentAvailableWeight : undefined}
                value={formWeightKg}
                onChange={(e) => setFormWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="e.g. 150.00"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-ink-900 focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Rate / Kg (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formRatePerKg}
                onChange={(e) => setFormRatePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="e.g. 280.00"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-ink-900 focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Return Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={formReturnDate}
                onChange={(e) => setFormReturnDate(e.target.value)}
                required
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">Boxes / Crates Count</label>
              <input
                type="number"
                min="0"
                value={formBoxesCount}
                onChange={(e) => setFormBoxesCount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optional"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>
          </div>

          {/* Reason and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Return Reason <span className="text-rose-600">*</span>
              </label>
              <select
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                required
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Invoice / Reference (Optional)
              </label>
              <input
                type="text"
                value={formInvoiceNo}
                onChange={(e) => setFormInvoiceNo(e.target.value)}
                placeholder="Supplier Invoice No"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
              Detailed Reason / Inspector Remarks
            </label>
            <textarea
              rows={2}
              value={formDetailedReason}
              onChange={(e) => setFormDetailedReason(e.target.value)}
              placeholder="State temperature readings, physical inspection notes, or discrepancies..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
            />
          </div>

          {/* Debit Note Total & Ledger Checkbox */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                Total Debit Note Value (Credit to Buyer / Reduction from Supplier Payable)
              </span>
              <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                {formatINR(calculatedFormTotal)}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
              <input
                type="checkbox"
                checked={formAdjustPayable}
                onChange={(e) => setFormAdjustPayable(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <span>Automatically reduce supplier balance in ledger</span>
            </label>
          </div>

          {editingReturn && (
            <div>
              <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
                Audit Reason for Edit <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                required
                placeholder="State reason for editing this return record..."
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-ink-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs"
            >
              {editingReturn ? 'Update Return Record' : 'Record Purchase Return'}
            </button>
          </div>
        </form>
      </Modal>

      {/* INSPECT DETAIL MODAL */}
      <Modal
        isOpen={!!inspectReturn}
        onClose={() => setInspectReturn(null)}
        title={`Purchase Return: ${inspectReturn?.returnNo}`}
        subtitle="Debit Note voucher specification and audit breakdown"
      >
        {inspectReturn && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-ink-500 block uppercase font-bold text-[10px]">Return Date</span>
                <span className="font-semibold text-ink-900 mt-0.5 block">{inspectReturn.returnDate}</span>
                <span className="text-[10px] text-ink-400">FY {inspectReturn.financialYear}</span>
              </div>
              <div>
                <span className="text-ink-500 block uppercase font-bold text-[10px]">Supplier</span>
                <span className="font-semibold text-ink-900 mt-0.5 block">
                  {supplierMap.get(inspectReturn.supplierId)?.name}
                </span>
                <span className="text-[10px] text-ink-400">
                  {supplierMap.get(inspectReturn.supplierId)?.code}
                </span>
              </div>
              <div>
                <span className="text-ink-500 block uppercase font-bold text-[10px]">Linked Purchase Ref</span>
                <span className="font-semibold text-rose-700 mt-0.5 block">
                  {inspectReturn.purchaseRefNo || 'Standalone'}
                </span>
                <span className="text-[10px] text-ink-400">Inv: {inspectReturn.invoiceNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-ink-500 block uppercase font-bold text-[10px]">Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                    inspectReturn.isVoided
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {inspectReturn.isVoided ? 'Voided' : 'Active Debit Note'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
              <h3 className="font-bold text-ink-900 text-xs uppercase tracking-wider text-rose-700">
                Returned Merchandise Particulars
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-ink-500 text-[10px] block">Product / Species</span>
                  <span className="font-bold text-ink-900">{speciesMap.get(inspectReturn.speciesId)?.name}</span>
                </div>
                <div>
                  <span className="text-ink-500 text-[10px] block">Grade</span>
                  <span className="font-medium text-ink-900">
                    {gradeMap.get(inspectReturn.gradeId || '')?.name || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-500 text-[10px] block">Size</span>
                  <span className="font-medium text-ink-900">
                    {inspectReturn.isDualSize && inspectReturn.secondarySizeId
                      ? `${sizeMap.get(inspectReturn.sizeId || '')?.name || 'N/A'} & ${
                          sizeMap.get(inspectReturn.secondarySizeId)?.name || 'N/A'
                        } (Dual)`
                      : sizeMap.get(inspectReturn.sizeId || '')?.name || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-500 text-[10px] block">Count</span>
                  <span className="font-medium text-ink-900">
                    {countMap.get(inspectReturn.countId || '')?.name || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <span className="text-ink-500 text-[10px] block">Returned Weight</span>
                  <span className="text-sm font-black text-amber-800">
                    {formatKg(inspectReturn.returnedWeightKg)}
                  </span>
                </div>
                <div>
                  <span className="text-ink-500 text-[10px] block">Rate / Kg</span>
                  <span className="text-sm font-semibold text-ink-900">
                    ₹{inspectReturn.ratePerKg.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-ink-500 text-[10px] block">Debit Note Total</span>
                  <span className="text-sm font-black text-emerald-700">
                    {formatINR(inspectReturn.returnedValue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-ink-500 text-[10px] font-bold uppercase block">Reason &amp; Remarks:</span>
              <p className="font-semibold text-ink-900 mt-1">{inspectReturn.reason}</p>
              {inspectReturn.detailedReason && (
                <p className="text-ink-700 mt-1 whitespace-pre-wrap">{inspectReturn.detailedReason}</p>
              )}
            </div>

            {inspectReturn.isVoided && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <span className="font-bold block text-[11px] uppercase">Void Information</span>
                <p className="mt-0.5">
                  Voided by {inspectReturn.voidedBy} on {inspectReturn.voidedAt}
                </p>
                <p className="font-medium mt-1">Reason: {inspectReturn.voidReason}</p>
              </div>
            )}

            <div className="text-[11px] text-ink-500 border-t border-gray-100 pt-3 flex justify-between">
              <span>Created by: {inspectReturn.createdBy}</span>
              <span>{new Date(inspectReturn.createdAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* VOID RETURN MODAL */}
      <Modal
        isOpen={!!voidModalTarget}
        onClose={() => setVoidModalTarget(null)}
        title="Void Purchase Return Note"
        subtitle="Mandatory reason required for audit compliance"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Accounting Reverse Warning:</p>
              <p className="mt-0.5">
                Voiding Return Note <strong>{voidModalTarget?.returnNo}</strong> will reverse the credit of{' '}
                <strong>{formatINR(voidModalTarget?.returnedValue || 0)}</strong> from{' '}
                <strong>{supplierMap.get(voidModalTarget?.supplierId || '')?.name}</strong>'s ledger, restoring the
                payable balance.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 uppercase mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Return rejected by supplier, entered under incorrect supplier account..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setVoidModalTarget(null)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-ink-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!voidReason.trim()}
              onClick={handleConfirmVoid}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition"
            >
              Confirm Void &amp; Reverse Ledger
            </button>
          </div>
        </div>
      </Modal>

      {/* PERMANENT DELETE MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        title="Permanently Purge Return Record"
        subtitle="Owner / Admin exclusive action"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Permanent Deletion Warning:</p>
              <p className="mt-0.5">
                Are you sure you want to permanently purge Return <strong>{deleteModalTarget?.returnNo}</strong>?
                This action is irreversible and recorded in the Surveillance Audit Trail.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setDeleteModalTarget(null)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-ink-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition shadow-xs"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
