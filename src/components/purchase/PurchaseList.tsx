import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Purchase } from '../../types';
import { formatINR, formatKg, computePurchaseFields } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { generateTallyPurchaseXML } from '../../utils/tallyExport';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Search,
  Download,
  FileCode,
  Eye,
  Pencil,
  Trash2,
  Ban,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  PlusCircle,
  X
} from 'lucide-react';

interface PurchaseListProps {
  onNavigate?: (tab: any) => void;
  onSelectForReturn?: (purchaseId: string) => void;
}

export const PurchaseList: React.FC<PurchaseListProps> = ({ onNavigate, onSelectForReturn }) => {
  const {
    purchases,
    purchaseReturns,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    expenseTypes,
    updatePurchase,
    voidPurchase,
    deletePurchasePermanently,
    businessSettings
  } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Modals
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [voidModalTarget, setVoidModalTarget] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [deleteModalTarget, setDeleteModalTarget] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editForm, setEditForm] = useState({
    purchaseDate: '',
    supplierId: '',
    locationId: '',
    invoiceNo: '',
    batchNo: '',
    speciesId: '',
    gradeId: '',
    sizeId: '',
    secondarySizeId: '',
    isDualSize: false,
    countId: '',
    boxesCount: 0,
    weightKg: 0,
    ratePerKg: 0,
    yieldWeightKg: 0,
    damageWeightKg: 0,
    damageRatePerKg: 0,
    expenseBreakdown: {} as Record<string, number>,
    remarks: '',
    editReason: ''
  });

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((c) => [c.id, c]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const expenseTypeMap = new Map(expenseTypes.map((e) => [e.id, e]));

  // Filtered List
  const filteredPurchases = purchases.filter((p) => {
    if (!showVoided && p.isVoided) return false;
    if (showVoided && !p.isVoided) return false;

    if (supplierFilter && p.supplierId !== supplierFilter) return false;
    if (speciesFilter && p.speciesId !== speciesFilter) return false;
    if (statusFilter && p.paymentStatus !== statusFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = p.purchaseId.toLowerCase().includes(q);
      const matchInvoice = p.invoiceNo?.toLowerCase().includes(q);
      const matchBatch = p.batchNo?.toLowerCase().includes(q);
      const matchSupplier = supplierMap.get(p.supplierId)?.name.toLowerCase().includes(q);
      const matchSpecies = speciesMap.get(p.speciesId)?.name.toLowerCase().includes(q);
      const secSzName = p.secondarySizeId ? sizeMap.get(p.secondarySizeId)?.name.toLowerCase() : '';
      const matchSize = sizeMap.get(p.sizeId)?.name.toLowerCase().includes(q) || secSzName?.includes(q);
      const matchRemarks = p.remarks?.toLowerCase().includes(q);
      return matchId || matchInvoice || matchBatch || matchSupplier || matchSpecies || matchSize || matchRemarks;
    }

    return true;
  });

  const handleVoidConfirm = () => {
    if (!voidModalTarget || !voidReason.trim()) return;
    const res = voidPurchase(voidModalTarget.id, voidReason.trim());
    if (res.success) {
      setVoidModalTarget(null);
      setVoidReason('');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModalTarget) return;
    const res = deletePurchasePermanently(deleteModalTarget.id);
    if (res.success) {
      setDeleteModalTarget(null);
    }
  };

  const handleStartEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setEditForm({
      purchaseDate: p.purchaseDate,
      supplierId: p.supplierId,
      locationId: p.locationId,
      invoiceNo: p.invoiceNo || '',
      batchNo: p.batchNo || '',
      speciesId: p.speciesId,
      gradeId: p.gradeId || '',
      sizeId: p.sizeId || '',
      secondarySizeId: p.secondarySizeId || '',
      isDualSize: Boolean(p.isDualSize && p.secondarySizeId),
      countId: p.countId || '',
      boxesCount: p.boxesCount || 0,
      weightKg: p.weightKg || 0,
      ratePerKg: p.ratePerKg || 0,
      yieldWeightKg: p.yieldWeightKg || 0,
      damageWeightKg: p.damageWeightKg || 0,
      damageRatePerKg: p.damageRatePerKg || 0,
      expenseBreakdown: { ...(p.expenseBreakdown || {}) },
      remarks: p.remarks || '',
      editReason: ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    if (!editForm.editReason.trim()) return;

    if (editForm.isDualSize) {
      if (!editForm.sizeId || !editForm.secondarySizeId) {
        showToast('Please select both Primary and Secondary sizes for dual-size lots.', 'error');
        return;
      }
      if (editForm.sizeId === editForm.secondarySizeId) {
        showToast('Primary and Secondary sizes must be different.', 'error');
        return;
      }
      if (!editForm.remarks.trim()) {
        showToast('Remarks are required for dual-size entries to document that the total weight encompasses both sizes.', 'error');
        return;
      }
    }

    const res = updatePurchase(
      editingPurchase.id,
      {
        purchaseDate: editForm.purchaseDate,
        supplierId: editForm.supplierId,
        locationId: editForm.locationId,
        invoiceNo: editForm.invoiceNo,
        batchNo: editForm.batchNo.trim() || undefined,
        speciesId: editForm.speciesId,
        gradeId: editForm.gradeId,
        sizeId: editForm.sizeId,
        secondarySizeId: editForm.isDualSize ? editForm.secondarySizeId : undefined,
        isDualSize: editForm.isDualSize,
        countId: editForm.countId,
        boxesCount: Number(editForm.boxesCount) || 0,
        weightKg: Number(editForm.weightKg) || 0,
        ratePerKg: Number(editForm.ratePerKg) || 0,
        yieldWeightKg: editForm.yieldWeightKg > 0 ? Number(editForm.yieldWeightKg) : undefined,
        damageWeightKg: Number(editForm.damageWeightKg) || 0,
        damageRatePerKg: Number(editForm.damageRatePerKg) || 0,
        expenseBreakdown: editForm.expenseBreakdown,
        remarks: editForm.remarks
      },
      editForm.editReason.trim()
    );

    if (res.success) {
      setEditingPurchase(null);
    }
  };

  const activeExpenseTypes = expenseTypes.filter((e) => e.active);
  const editSupplier = suppliers.find((s) => s.id === editForm.supplierId);
  const editDerived = computePurchaseFields({
    weightKg: Number(editForm.weightKg) || 0,
    ratePerKg: Number(editForm.ratePerKg) || 0,
    damageWeightKg: Number(editForm.damageWeightKg) || 0,
    damageRatePerKg: Number(editForm.damageRatePerKg) || 0,
    expenseBreakdown: editForm.expenseBreakdown,
    amountPaid: editingPurchase?.amountPaid || 0,
    purchaseDate: editForm.purchaseDate,
    supplier: editSupplier,
    yieldWeightKg: editForm.yieldWeightKg > 0 ? Number(editForm.yieldWeightKg) : undefined
  });

  const handleExportCSV = () => {
    const exportData = filteredPurchases.map((p) => ({
      PurchaseID: p.purchaseId,
      Date: p.purchaseDate,
      FY: p.financialYear,
      Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
      HarbourLocation: locationMap.get(p.locationId)?.name || 'N/A',
      InvoiceNo: p.invoiceNo || 'N/A',
      BatchNo: p.batchNo || 'None',
      Species: speciesMap.get(p.speciesId)?.name || 'N/A',
      Grade: gradeMap.get(p.gradeId)?.name || 'N/A',
      Size: p.isDualSize && p.secondarySizeId
        ? `${sizeMap.get(p.sizeId)?.name || 'N/A'} & ${sizeMap.get(p.secondarySizeId)?.name || 'N/A'} (Dual Size)`
        : (sizeMap.get(p.sizeId)?.name || 'N/A'),
      Count: countMap.get(p.countId)?.name || 'N/A',
      WeightKg: p.weightKg,
      YieldWeightKg: p.yieldWeightKg !== undefined ? p.yieldWeightKg : '',
      YieldPct: p.yieldPct !== undefined ? `${p.yieldPct}%` : '',
      RatePerKg: p.ratePerKg,
      PurchaseValue: p.purchaseValue,
      DamageAmount: p.damageAmount,
      TotalExpenses: p.totalExpenses,
      TotalCost: p.totalCost,
      EffectiveRate: p.effectiveRatePerKg,
      AmountPaid: p.amountPaid,
      BalancePayable: p.balancePayable,
      DueDate: p.dueDate,
      PaymentStatus: p.paymentStatus,
      IsVoided: p.isVoided ? 'Yes' : 'No',
      CreatedBy: p.createdBy
    }));

    const csvStr = convertToCSV(exportData, [
      { key: 'PurchaseID', label: 'Purchase ID' },
      { key: 'Date', label: 'Purchase Date' },
      { key: 'FY', label: 'Financial Year' },
      { key: 'Supplier', label: 'Supplier Name' },
      { key: 'HarbourLocation', label: 'Landing Centre' },
      { key: 'InvoiceNo', label: 'Invoice No' },
      { key: 'BatchNo', label: 'Batch No' },
      { key: 'Species', label: 'Species' },
      { key: 'Grade', label: 'Grade' },
      { key: 'Size', label: 'Physical Size' },
      { key: 'Count', label: 'Piece Count' },
      { key: 'WeightKg', label: 'Weight (Kg)' },
      { key: 'YieldWeightKg', label: 'Yield Weight (Kg)' },
      { key: 'YieldPct', label: 'Yield %' },
      { key: 'RatePerKg', label: 'Rate (INR/Kg)' },
      { key: 'PurchaseValue', label: 'Purchase Value' },
      { key: 'DamageAmount', label: 'Damage Deductions' },
      { key: 'TotalExpenses', label: 'Total Expenses' },
      { key: 'TotalCost', label: 'Final Total Cost' },
      { key: 'EffectiveRate', label: 'Effective Rate/Kg' },
      { key: 'AmountPaid', label: 'Amount Paid' },
      { key: 'BalancePayable', label: 'Balance Payable' },
      { key: 'DueDate', label: 'Due Date' },
      { key: 'PaymentStatus', label: 'Payment Status' },
      { key: 'IsVoided', label: 'Voided' },
      { key: 'CreatedBy', label: 'Entered By' }
    ]);

    downloadFile(csvStr, `Seafood_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportTallyXML = () => {
    const xml = generateTallyPurchaseXML(filteredPurchases, suppliers, businessSettings.businessName);
    downloadFile(xml, `Tally_Purchase_Import_${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
  };

  const selectedSupplierObj = suppliers.find((s) => s.id === supplierFilter);
  const selectedSpeciesObj = species.find((sp) => sp.id === speciesFilter);
  const hasActiveFilters = Boolean(searchTerm || supplierFilter || speciesFilter || statusFilter || showVoided);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSupplierFilter('');
    setSpeciesFilter('');
    setStatusFilter('');
    setShowVoided(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* FIGMA-STYLE HEADLINE-FIRST HEADER */}
      <PageHeader
        title="Purchase transactions"
        description="Audit, search, verify and export raw seafood harbour landing records."
        badge={`${filteredPurchases.length} Records`}
        primaryAction={
          onNavigate && permissions.canCreateEditPurchases
            ? {
                label: 'New harbour purchase',
                icon: PlusCircle,
                onClick: () => onNavigate('purchase-entry')
              }
            : undefined
        }
        secondaryActions={[
          ...(onNavigate
            ? [
                {
                  label: 'Import Excel',
                  icon: FileSpreadsheet,
                  onClick: () => onNavigate('excel-import')
                }
              ]
            : []),
          {
            label: 'Export CSV',
            icon: Download,
            onClick: handleExportCSV
          },
          {
            label: 'Tally XML',
            icon: FileCode,
            onClick: handleExportTallyXML
          }
        ]}
      />

      {/* STICKY FILTER BAR WITH REMOVABLE FILTER CHIPS */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, Supplier, Species, Invoice, Batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
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
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
            >
              <option value="">All Species</option>
              {species.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
            >
              <option value="">All Payment Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Fully Paid">Fully Paid</option>
            </select>

            <button
              onClick={() => setShowVoided(!showVoided)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                showVoided
                  ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                  : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {showVoided ? 'Showing Voided' : 'Active Only'}
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Removable Active Filter Chips */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-ink-500">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Search: &quot;{searchTerm}&quot;</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSupplierObj && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Supplier: {selectedSupplierObj.name}</span>
                <button onClick={() => setSupplierFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSpeciesObj && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Species: {selectedSpeciesObj.name}</span>
                <button onClick={() => setSpeciesFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span>Status: {statusFilter}</span>
                <button onClick={() => setStatusFilter('')} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {showVoided && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                <span>Showing: Voided Records</span>
                <button onClick={() => setShowVoided(false)} className="hover:text-rose-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-4">Purchase ID</th>
                <th className="py-3 px-4">Date &amp; FY</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Species, Size &amp; Count</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Yield</th>
                <th className="py-3 px-4 text-right">Rate / Kg</th>
                <th className="py-3 px-4 text-right">Landed Cost</th>
                <th className="py-3 px-4 text-right">Eff. Rate</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-ink-900">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-ink-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const supp = supplierMap.get(p.supplierId);
                  const spec = speciesMap.get(p.speciesId);
                  const sz = sizeMap.get(p.sizeId);
                  const cnt = countMap.get(p.countId);
                  const lotReturns = (purchaseReturns || []).filter((r) => !r.isVoided && r.purchaseId === p.id);
                  const totalReturnedKg = lotReturns.reduce((s, r) => s + r.returnedWeightKg, 0);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-rose-50/40 transition-colors ${p.isVoided ? 'bg-gray-50/60 opacity-60' : ''}`}
                    >
                      <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {p.purchaseId}
                          {p.batchNo && (
                            <span title={`Shared Batch: ${p.batchNo}`}>
                              <Layers className="w-3.5 h-3.5 text-amber-600" />
                            </span>
                          )}
                        </div>
                        {p.invoiceNo && <div className="text-[10px] text-ink-500 font-normal">Inv: {p.invoiceNo}</div>}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold">{p.purchaseDate}</div>
                        <div className="text-[10px] text-ink-500">{p.financialYear}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-900 line-clamp-1">{supp?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-ink-500 capitalize">{supp?.type?.replace('_', ' ')}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-900 line-clamp-1">{spec?.name || 'Species'}</div>
                        <div className="text-[10px] text-ink-500">
                          {p.isDualSize && p.secondarySizeId ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-rose-800">
                                Sizes: {sz?.name || 'N/A'} &amp; {sizeMap.get(p.secondarySizeId)?.name || 'N/A'}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Dual Size
                              </span>
                              {cnt?.name && <span>· Count: {cnt.name}</span>}
                            </div>
                          ) : (
                            [sz?.name ? `Size: ${sz.name}` : '', cnt?.name ? `Count: ${cnt.name}` : ''].filter(Boolean).join(' · ') || 'Standard'
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        <div>{formatKg(p.weightKg)}</div>
                        {totalReturnedKg > 0 && (
                          <div className="text-[10px] text-amber-700 font-bold" title={`Returned: ${formatKg(totalReturnedKg)}`}>
                            Ret: {formatKg(totalReturnedKg)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {p.yieldWeightKg ? (
                          <div>
                            <span className="font-bold text-emerald-800">{formatKg(p.yieldWeightKg)}</span>
                            <div className="text-[10px] text-emerald-600 font-bold">
                              {p.yieldPct ? `${p.yieldPct.toFixed(1)}%` : `${((p.yieldWeightKg / p.weightKg) * 100).toFixed(1)}%`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-light">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        ₹{p.ratePerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-rose-900 whitespace-nowrap">
                        {formatINR(p.totalCost)}
                      </td>

                      <td className="py-3 px-4 text-right text-ink-700 whitespace-nowrap">
                        ₹{p.effectiveRatePerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'Fully Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                        {p.balancePayable > 0 && (
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            Due: {formatINR(p.balancePayable)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Modal */}
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Inspect complete details & audit metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action: Junior Accountant, Master Accountant, Admin */}
                          {!p.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit purchase record (Junior/Master Accountant, Admin)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Record Return Action */}
                          {!p.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => {
                                if (onSelectForReturn) {
                                  onSelectForReturn(p.id);
                                } else if (onNavigate) {
                                  onNavigate('purchase-returns');
                                }
                              }}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-amber-700 hover:bg-amber-50 transition"
                              title="Record purchase return / debit note against this purchase"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Void Action: Master Accountant or Admin */}
                          {!p.isVoided && permissions.canVoid && (
                            <button
                              onClick={() => setVoidModalTarget(p)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                              title="Soft delete / void with mandatory reason"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Permanent Delete: OWNER/ADMIN EXCLUSIVE */}
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteModalTarget(p)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition"
                              title="Permanent purge (Owner/Admin only)"
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

      {/* DETAIL MODAL */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase Transaction: ${selectedPurchase?.purchaseId}`}
        subtitle="Complete procurement audit inspection and breakdown"
        maxWidth="max-w-3xl"
      >
        {selectedPurchase && (
          <div className="space-y-6 text-xs">
            {selectedPurchase.isVoided && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium">
                <strong>VOIDED TRANSACTION:</strong> {selectedPurchase.voidReason} (by {selectedPurchase.voidedBy} on {new Date(selectedPurchase.voidedAt || '').toLocaleString()})
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-ink-500 block">Purchase Date</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.purchaseDate}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Financial Year</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.financialYear}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Invoice / Bill</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.invoiceNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Batch Pool</span>
                <span className="font-bold text-rose-700 text-sm">{selectedPurchase.batchNo || 'Single Product'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Supplier & Harbour</h4>
                <div>
                  <strong>Supplier:</strong> {supplierMap.get(selectedPurchase.supplierId)?.name}
                </div>
                <div>
                  <strong>Harbour Landing:</strong> {locationMap.get(selectedPurchase.locationId)?.name}
                </div>
                <div>
                  <strong>Payment Terms:</strong> {supplierMap.get(selectedPurchase.supplierId)?.paymentTerms}
                </div>
                <div>
                  <strong>Calculated Due Date:</strong> {selectedPurchase.dueDate}
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Product Specification</h4>
                <div>
                  <strong>Species:</strong> {speciesMap.get(selectedPurchase.speciesId)?.name}
                </div>
                <div>
                  <strong>Grade:</strong> {gradeMap.get(selectedPurchase.gradeId)?.name || 'Standard'}
                </div>
                <div>
                  <strong>Physical Size:</strong>{' '}
                  {selectedPurchase.isDualSize && selectedPurchase.secondarySizeId ? (
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-rose-900">
                        {sizeMap.get(selectedPurchase.sizeId)?.name || 'N/A'} &amp; {sizeMap.get(selectedPurchase.secondarySizeId)?.name || 'N/A'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Combined Dual-Size Lot ({formatKg(selectedPurchase.weightKg)} Total)
                      </span>
                    </span>
                  ) : (
                    sizeMap.get(selectedPurchase.sizeId)?.name || 'N/A'
                  )}
                </div>
                <div>
                  <strong>Piece Count:</strong> {countMap.get(selectedPurchase.countId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Total Boxes:</strong> {selectedPurchase.boxesCount}
                </div>
              </div>
            </div>

            {/* Financial Valuation Breakdown */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Cost & Expenses Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-ink-500 block">Weight</span>
                  <span className="font-bold text-ink-900">{formatKg(selectedPurchase.weightKg)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Rate / Kg</span>
                  <span className="font-bold text-ink-900">₹{selectedPurchase.ratePerKg.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Base Purchase Value</span>
                  <span className="font-bold text-ink-900">{formatINR(selectedPurchase.purchaseValue)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Damage Deduction</span>
                  <span className="font-bold text-rose-700">-{formatINR(selectedPurchase.damageAmount)}</span>
                </div>
              </div>

              {/* Dynamic Expense Breakdown */}
              <div className="pt-2 border-t border-gray-200">
                <span className="text-xs font-semibold text-ink-700 block mb-1">
                  Landing Expense Heads {selectedPurchase.isBatchAllocated ? '(Proportionally Allocated)' : ''}:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selectedPurchase.expenseBreakdown || {}).map(([expId, val]) => (
                    <div key={expId} className="p-2 bg-white rounded-lg border border-gray-200 text-xs">
                      <span className="text-ink-500 block">{expenseTypeMap.get(expId)?.name || expId}</span>
                      <span className="font-bold text-ink-900">{formatINR(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs font-bold">
                <span>Final Total Cost: <span className="text-rose-700 text-sm">{formatINR(selectedPurchase.totalCost)}</span></span>
                <span>Effective Rate/Kg: <span className="text-ink-900">₹{selectedPurchase.effectiveRatePerKg.toFixed(2)} / Kg</span></span>
                <span>Balance Payable: <span className="text-rose-800">{formatINR(selectedPurchase.balancePayable)}</span></span>
              </div>
            </div>

            {/* Yield & Processing Recovery Card */}
            {selectedPurchase.yieldWeightKg ? (
              <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Processing Yield &amp; Recovery Analysis
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedPurchase.yieldPct
                      ? `${selectedPurchase.yieldPct.toFixed(2)}% Recovery`
                      : `${((selectedPurchase.yieldWeightKg / selectedPurchase.weightKg) * 100).toFixed(2)}% Recovery`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Raw Landed Weight</span>
                    <span className="font-bold text-ink-900 text-sm">{formatKg(selectedPurchase.weightKg)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Finished Yield Weight</span>
                    <span className="font-bold text-emerald-800 text-sm">{formatKg(selectedPurchase.yieldWeightKg)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Processing / Peeling Loss</span>
                    <span className="font-bold text-rose-700 text-sm">
                      {formatKg(Math.max(0, selectedPurchase.weightKg - selectedPurchase.yieldWeightKg))}
                      <span className="text-[10px] font-normal text-rose-600 ml-1">
                        ({(
                          (Math.max(0, selectedPurchase.weightKg - selectedPurchase.yieldWeightKg) /
                            selectedPurchase.weightKg) *
                          100
                        ).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Finished Yield Cost / Kg</span>
                    <span className="font-bold text-emerald-900 text-sm">
                      ₹{(selectedPurchase.totalCost / selectedPurchase.yieldWeightKg).toFixed(2)} / Kg
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Attached Photo of Weighment Slip / Boat ID */}
            {selectedPurchase.photoUrl && (
              <div className="p-4 border border-gray-200 rounded-xl space-y-2 bg-gray-50/30">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">
                  Attached Weighment Slip / Boat ID Photo
                </h4>
                <div className="max-w-md rounded-xl overflow-hidden border border-gray-200 bg-white p-1 shadow-2xs">
                  <img
                    src={selectedPurchase.photoUrl}
                    alt={`Weighment Slip for ${selectedPurchase.purchaseId}`}
                    className="w-full max-h-72 object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Dual-Size Combined Lot Banner */}
            {selectedPurchase.isDualSize && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase shrink-0 mt-0.5">Dual-Size Combined Entry</span>
                <div>
                  <strong>Combined Catch Lot:</strong> Recorded with single total weight of <strong>{formatKg(selectedPurchase.weightKg)}</strong> covering both sizes without individual weight distinction.
                  {selectedPurchase.remarks && (
                    <div className="mt-1 font-normal text-rose-950">
                      <strong>Required Remarks:</strong> &ldquo;{selectedPurchase.remarks}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Returns & Debit Notes Section */}
            {(() => {
              const lotReturns = (purchaseReturns || []).filter(
                (r) => !r.isVoided && r.purchaseId === selectedPurchase.id
              );
              const totalReturnedKg = lotReturns.reduce((s, r) => s + r.returnedWeightKg, 0);
              const totalReturnedVal = lotReturns.reduce((s, r) => s + r.returnedValue, 0);

              return (
                <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      <span>Purchase Returns &amp; Debit Notes Issued ({lotReturns.length})</span>
                    </span>
                    <span>
                      {formatKg(totalReturnedKg)} Returned · {formatINR(totalReturnedVal)} Credited
                    </span>
                  </div>

                  {lotReturns.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {lotReturns.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 bg-white rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-rose-700">{r.returnNo}</span> ·{' '}
                            <span className="text-ink-500">{r.returnDate}</span> ·{' '}
                            <span className="text-ink-800 font-medium">{r.reason}</span>
                          </div>
                          <div className="font-bold text-amber-900">
                            {formatKg(r.returnedWeightKg)} @ ₹{r.ratePerKg} = {formatINR(r.returnedValue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-500 italic">
                      No purchase returns have been recorded for this transaction yet.
                    </p>
                  )}

                  {!selectedPurchase.isVoided && permissions.canCreateEditPurchases && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          const pId = selectedPurchase.id;
                          setSelectedPurchase(null);
                          if (onSelectForReturn) {
                            onSelectForReturn(pId);
                          } else if (onNavigate) {
                            onNavigate('purchase-returns');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Record Return / Debit Note for This Lot</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Audit & Staff Metadata */}
            <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-ink-500 space-y-1">
              <div>Created By: <strong>{selectedPurchase.createdBy}</strong> at {new Date(selectedPurchase.createdAt).toLocaleString()}</div>
              {selectedPurchase.updatedBy && (
                <div>Last Updated By: <strong>{selectedPurchase.updatedBy}</strong> at {new Date(selectedPurchase.updatedAt).toLocaleString()}</div>
              )}
              {selectedPurchase.remarks && <div>Remarks: {selectedPurchase.remarks}</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* VOID CONFIRMATION MODAL */}
      <Modal
        isOpen={!!voidModalTarget}
        onClose={() => setVoidModalTarget(null)}
        title={`Void Transaction: ${voidModalTarget?.purchaseId}`}
        subtitle="Soft delete. Record remains recoverable with an explicit audit note."
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            You are about to void purchase <strong>{voidModalTarget?.purchaseId}</strong>. The transaction will be marked inactive and deducted from supplier payables, but will remain visible in audit logs.
          </p>

          <div>
            <label className="block font-semibold text-ink-900 mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Inadvertent duplicate entry at harbour, lot returned to boat owner due to spoilage"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setVoidModalTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVoidConfirm}
              disabled={!voidReason.trim()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 transition"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </Modal>

      {/* PERMANENT PURGE CONFIRMATION MODAL (OWNER/ADMIN EXCLUSIVE) */}
      <Modal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        title="CRITICAL: Permanent Purge Record"
        subtitle="Owner / Admin Exclusive Authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong>Irreversible Action:</strong> This will completely remove purchase{' '}
              <strong>{deleteModalTarget?.purchaseId}</strong> from the database. This action is permanently logged to your surveillance audit log.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModalTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Abort
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT PURCHASE MODAL */}
      <Modal
        isOpen={!!editingPurchase}
        onClose={() => setEditingPurchase(null)}
        title={`Edit Transaction: ${editingPurchase?.purchaseId}`}
        subtitle="Modify weighment, pricing, lot, or landing expenses with audit compliance reason"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Date</label>
              <input
                type="date"
                value={editForm.purchaseDate}
                onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Supplier</label>
              <select
                value={editForm.supplierId}
                onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Harbour / Location</label>
              <select
                value={editForm.locationId}
                onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.harbourCentre})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Invoice / Weighment Slip #</label>
              <input
                type="text"
                value={editForm.invoiceNo}
                onChange={(e) => setEditForm({ ...editForm, invoiceNo: e.target.value })}
                placeholder="e.g. INV-1049"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Batch / Lot # (Optional)</label>
              <input
                type="text"
                value={editForm.batchNo}
                onChange={(e) => setEditForm({ ...editForm, batchNo: e.target.value })}
                placeholder="e.g. BATCH-2026-04"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
          </div>

          {/* Dual Size Option */}
          <div className="flex items-center justify-between p-2.5 bg-rose-50/60 border border-rose-200 rounded-xl">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editForm.isDualSize}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEditForm({
                    ...editForm,
                    isDualSize: checked,
                    secondarySizeId: checked ? editForm.secondarySizeId : ''
                  });
                }}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-rose-900">
                Two Sizes in Single Item (Combined Total Kg)
              </span>
            </label>
            {editForm.isDualSize && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                Combined Weight Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Species</label>
              <select
                value={editForm.speciesId}
                onChange={(e) => setEditForm({ ...editForm, speciesId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name} ({sp.scientificName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Grade</label>
              <select
                value={editForm.gradeId}
                onChange={(e) => setEditForm({ ...editForm, gradeId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            {!editForm.isDualSize ? (
              <div>
                <label className="block font-semibold text-ink-700 mb-1">Physical Size</label>
                <select
                  value={editForm.sizeId}
                  onChange={(e) => setEditForm({ ...editForm, sizeId: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                >
                  <option value="">None / Standard</option>
                  {sizes.map((sz) => (
                    <option key={sz.id} value={sz.id}>{sz.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-rose-900 mb-1">Primary Size *</label>
                  <select
                    value={editForm.sizeId}
                    onChange={(e) => setEditForm({ ...editForm, sizeId: e.target.value })}
                    required
                    className="w-full p-2 bg-rose-50/50 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                  >
                    <option value="">-- Size 1 (e.g. 6/10) --</option>
                    {sizes.map((sz) => (
                      <option key={sz.id} value={sz.id}>{sz.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-rose-900 mb-1">Secondary Size *</label>
                  <select
                    value={editForm.secondarySizeId}
                    onChange={(e) => setEditForm({ ...editForm, secondarySizeId: e.target.value })}
                    required
                    className="w-full p-2 bg-rose-50/50 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                  >
                    <option value="">-- Size 2 (e.g. 10/20) --</option>
                    {sizes
                      .filter((sz) => sz.id !== editForm.sizeId)
                      .map((sz) => (
                        <option key={sz.id} value={sz.id}>{sz.name}</option>
                      ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Piece Count</label>
              <select
                value={editForm.countId}
                onChange={(e) => setEditForm({ ...editForm, countId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {counts.map((cnt) => (
                  <option key={cnt.id} value={cnt.id}>{cnt.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Boxes / Crates Count</label>
              <input
                type="number"
                min="0"
                value={editForm.boxesCount || ''}
                onChange={(e) => setEditForm({ ...editForm, boxesCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Weight (Kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.weightKg || ''}
                onChange={(e) => setEditForm({ ...editForm, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Rate / Kg (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.ratePerKg || ''}
                onChange={(e) => setEditForm({ ...editForm, ratePerKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none font-bold"
                required
              />
            </div>
          </div>

          {/* Processing Yield Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 items-center">
            <div>
              <label className="block font-semibold text-emerald-950 mb-1">Finished Yield Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 2400.00"
                value={editForm.yieldWeightKg || ''}
                onChange={(e) => setEditForm({ ...editForm, yieldWeightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 outline-none font-bold text-emerald-950"
              />
            </div>
            <div>
              <span className="block text-[11px] text-gray-500 uppercase font-semibold">Yield Recovery %</span>
              <span className="font-bold text-emerald-800 text-sm">
                {editForm.weightKg > 0 && editForm.yieldWeightKg > 0
                  ? `${((editForm.yieldWeightKg / editForm.weightKg) * 100).toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-gray-500 uppercase font-semibold">Finished Yield Cost / Kg</span>
              <span className="font-bold text-ink-900 text-sm">
                {editForm.yieldWeightKg > 0 && editDerived.totalCost > 0
                  ? `₹${(editDerived.totalCost / editForm.yieldWeightKg).toFixed(2)} / Kg`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
            <div>
              <label className="block font-semibold text-amber-900 mb-1">Damage / Rejection Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.damageWeightKg || ''}
                onChange={(e) => setEditForm({ ...editForm, damageWeightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-amber-900 mb-1">Damage Rate / Kg (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.damageRatePerKg || ''}
                onChange={(e) => setEditForm({ ...editForm, damageRatePerKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-600 outline-none"
              />
            </div>
          </div>

          {/* Dynamic Landing Expenses */}
          {activeExpenseTypes.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block font-bold text-ink-900 mb-2">Landing & Logistics Expenses (₹)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeExpenseTypes.map((et) => (
                  <div key={et.id}>
                    <span className="block text-[11px] font-medium text-ink-600 truncate">{et.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editForm.expenseBreakdown[et.id] || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditForm({
                          ...editForm,
                          expenseBreakdown: {
                            ...editForm.expenseBreakdown,
                            [et.id]: val
                          }
                        });
                      }}
                      className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-rose-600 outline-none mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Summary Pill */}
          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] text-ink-500 font-semibold uppercase">Purchase Value</div>
              <div className="font-bold text-ink-900">{formatINR(editDerived.purchaseValue)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-500 font-semibold uppercase">Total Expenses</div>
              <div className="font-bold text-ink-900">{formatINR(editDerived.totalExpenses)}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-800 font-semibold uppercase">Total Cost</div>
              <div className="font-bold text-rose-900">{formatINR(editDerived.totalCost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-800 font-semibold uppercase">Eff. Rate/Kg</div>
              <div className="font-bold text-rose-900">₹{editDerived.effectiveRatePerKg.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${editForm.isDualSize ? 'text-rose-900 font-bold' : 'text-ink-700'}`}>
              Remarks {editForm.isDualSize ? <span className="text-rose-600 font-bold">* (Required for Dual-Size entries)</span> : null}
            </label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              required={editForm.isDualSize}
              placeholder={editForm.isDualSize ? "e.g. 2000 kg total of both 6/10 and 10/20 size" : "e.g. Weighment calibrated at boat discharge"}
              className={`w-full p-2 rounded-xl focus:bg-white focus:border-rose-600 outline-none ${
                editForm.isDualSize && !editForm.remarks.trim()
                  ? 'bg-rose-50/60 border-2 border-rose-400 text-rose-950 placeholder-rose-400'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <label className="block font-bold text-rose-900 mb-1">
              Reason for Edit <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Corrected weight after second scale check, updated ice charges"
              value={editForm.editReason}
              onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
              className="w-full p-2.5 bg-rose-50/30 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
            <p className="text-[10px] text-ink-500 mt-1">This explanation will be permanently recorded in the system audit trail.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingPurchase(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editForm.editReason.trim() || editForm.weightKg <= 0 || editForm.ratePerKg <= 0}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
