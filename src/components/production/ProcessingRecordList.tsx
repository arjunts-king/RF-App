import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DailyProcessingEntry } from '../../types';
import { formatKg } from '../../utils/calculations';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { PaginationControls } from '../common/PaginationControls';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Plus,
  FileSpreadsheet
} from 'lucide-react';

export const ProcessingRecordList: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    processingEntries,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    slabTypes,
    updateProcessingEntry,
    voidProcessingEntry,
    deleteProcessingEntryPermanently
  } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [varianceOnlyFilter, setVarianceOnlyFilter] = useState(false);
  const [showVoided, setShowVoided] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkVoidModalOpen, setIsBulkVoidModalOpen] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modals
  const [selectedEntry, setSelectedEntry] = useState<DailyProcessingEntry | null>(null);
  const [voidModalTarget, setVoidModalTarget] = useState<DailyProcessingEntry | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [deleteModalTarget, setDeleteModalTarget] = useState<DailyProcessingEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DailyProcessingEntry | null>(null);
  const [editForm, setEditForm] = useState({
    processingDate: '',
    shift: '',
    supplierId: '',
    speciesId: '',
    gradeId: '',
    sizeId: '',
    countId: '',
    supplierBoxId: '',
    slabTypeId: '',
    slabsCount: 0,
    processedWeightKg: 0,
    rejectionWeightKg: 0,
    remarks: '',
    editReason: ''
  });

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((c) => [c.id, c]));
  const slabTypeMap = new Map(slabTypes.map((st) => [st.id, st]));

  // Production-only species resolver (isolated from sales export catalog names)
  const resolveProductionSpeciesName = (rawId: string): string => {
    if (!rawId) return 'N/A';
    const sp = speciesMap.get(rawId) || species.find((s) => s.id === rawId || s.code.toLowerCase() === rawId.toLowerCase() || s.name.toLowerCase() === rawId.toLowerCase());
    if (sp?.rawSpeciesName) return sp.rawSpeciesName.trim();
    if (sp?.name) return sp.name.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
    return rawId.replace(/^Frozen\s+/i, '').replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').trim();
  };

  // Strictly production-present species options for the filter dropdown
  const productionSpeciesOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; name: string }[] = [];
    processingEntries.forEach((p) => {
      const rawId = (p.speciesId || '').trim();
      if (!rawId) return;
      const cleanName = resolveProductionSpeciesName(rawId);
      const lower = cleanName.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        options.push({ id: rawId, name: cleanName });
      }
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [processingEntries, speciesMap, species]);

  // Filtered List
  const filteredEntries = processingEntries.filter((p) => {
    if (!showVoided && p.isVoided) return false;
    if (showVoided && !p.isVoided) return false;

    if (supplierFilter && p.supplierId !== supplierFilter) return false;
    if (speciesFilter) {
      const matchSpecies =
        p.speciesId === speciesFilter ||
        resolveProductionSpeciesName(p.speciesId).toLowerCase() === speciesFilter.toLowerCase() ||
        speciesMap.get(p.speciesId)?.id === speciesFilter ||
        species.find((s) => s.id === speciesFilter)?.code.toLowerCase() === p.speciesId.toLowerCase() ||
        species.find((s) => s.id === speciesFilter)?.name.toLowerCase() === p.speciesId.toLowerCase() ||
        species.find((s) => s.id === speciesFilter)?.rawSpeciesName?.toLowerCase() === p.speciesId.toLowerCase();
      if (!matchSpecies) return false;
    }
    if (shiftFilter && p.shift !== shiftFilter) return false;
    if (varianceOnlyFilter && !p.hasSlabVariance) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = p.entryNo.toLowerCase().includes(q);
      const matchBox = p.supplierBoxId?.toLowerCase().includes(q);
      const matchSupplier = supplierMap.get(p.supplierId)?.name.toLowerCase().includes(q);
      const matchSpecies = resolveProductionSpeciesName(p.speciesId).toLowerCase().includes(q) || speciesMap.get(p.speciesId)?.name.toLowerCase().includes(q);
      const matchRemarks = p.remarks?.toLowerCase().includes(q);
      return matchNo || matchBox || matchSupplier || matchSpecies || matchRemarks;
    }

    return true;
  });

  // Client-side pagination state for processing records
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, supplierFilter, speciesFilter, shiftFilter, varianceOnlyFilter, showVoided]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const handleStartEdit = (entry: DailyProcessingEntry) => {
    setEditingEntry(entry);
    setEditForm({
      processingDate: entry.processingDate,
      shift: entry.shift,
      supplierId: entry.supplierId,
      speciesId: entry.speciesId,
      gradeId: entry.gradeId,
      sizeId: entry.sizeId,
      countId: entry.countId || '',
      supplierBoxId: entry.supplierBoxId || '',
      slabTypeId: entry.slabTypeId,
      slabsCount: entry.slabsCount,
      processedWeightKg: entry.processedWeightKg,
      rejectionWeightKg: entry.rejectionWeightKg,
      remarks: entry.remarks || '',
      editReason: ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (!editForm.editReason.trim()) return;

    const res = updateProcessingEntry(
      editingEntry.id,
      {
        processingDate: editForm.processingDate,
        shift: editForm.shift,
        supplierId: editForm.supplierId,
        speciesId: editForm.speciesId,
        gradeId: editForm.gradeId,
        sizeId: editForm.sizeId,
        countId: editForm.countId,
        supplierBoxId: editForm.supplierBoxId,
        slabTypeId: editForm.slabTypeId,
        slabsCount: Number(editForm.slabsCount) || 0,
        processedWeightKg: Number(editForm.processedWeightKg) || 0,
        rejectionWeightKg: Number(editForm.rejectionWeightKg) || 0,
        remarks: editForm.remarks
      },
      editForm.editReason.trim()
    );

    if (res.success) {
      setEditingEntry(null);
    }
  };

  const handleVoidConfirm = () => {
    if (!voidModalTarget || !voidReason.trim()) return;
    const res = voidProcessingEntry(voidModalTarget.id, voidReason.trim());
    if (res.success) {
      setVoidModalTarget(null);
      setVoidReason('');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModalTarget) return;
    const res = deleteProcessingEntryPermanently(deleteModalTarget.id);
    if (res.success) {
      setDeleteModalTarget(null);
    }
  };

  // Bulk Selection Helpers & Actions
  const allFilteredSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((p) => selectedIds.includes(p.id));
  const someFilteredSelected =
    filteredEntries.some((p) => selectedIds.includes(p.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredEntries.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredEntries.map((p) => p.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkExportCSV = () => {
    const selectedEntries = filteredEntries.filter((p) => selectedIds.includes(p.id));
    if (selectedEntries.length === 0) return;
    const exportData = selectedEntries.map((p) => {
      const supp = supplierMap.get(p.supplierId);
      const grd = gradeMap.get(p.gradeId);
      const sz = sizeMap.get(p.sizeId);
      const cnt = countMap.get(p.countId || '');
      const slb = slabTypeMap.get(p.slabTypeId);

      return {
        EntryNo: p.entryNo,
        Date: p.processingDate,
        Shift: p.shift,
        Supplier: supp?.name || 'N/A',
        BoxID: p.supplierBoxId || 'None',
        Species: resolveProductionSpeciesName(p.speciesId),
        Grade: grd?.name || 'N/A',
        Size: sz?.name || 'N/A',
        Count: cnt?.name || 'N/A',
        SlabType: slb?.name || 'N/A',
        StdSlabWeight: p.standardSlabWeightKg,
        SlabsCount: p.slabsCount,
        ExpectedWeightKg: p.expectedWeightKg,
        ProcessedWeightKg: p.processedWeightKg,
        RejectionWeightKg: p.rejectionWeightKg,
        VarianceKg: p.varianceWeightKg,
        VariancePct: p.variancePct,
        HasVariance: p.hasSlabVariance ? 'Yes' : 'No',
        Operator: p.operator,
        Remarks: p.remarks || '',
        Voided: p.isVoided ? 'Yes' : 'No',
        VoidReason: p.voidReason || ''
      };
    });

    const csvStr = convertToCSV(exportData, [
      { key: 'EntryNo', label: 'Entry #' },
      { key: 'Date', label: 'Date' },
      { key: 'Shift', label: 'Shift' },
      { key: 'Supplier', label: 'Supplier' },
      { key: 'BoxID', label: 'Box ID' },
      { key: 'Species', label: 'Species' },
      { key: 'Grade', label: 'Grade' },
      { key: 'Size', label: 'Size' },
      { key: 'Count', label: 'Count' },
      { key: 'SlabType', label: 'Slab Type' },
      { key: 'StdSlabWeight', label: 'Std Slab Wt (Kg)' },
      { key: 'SlabsCount', label: 'Slabs Count' },
      { key: 'ExpectedWeightKg', label: 'Expected Wt (Kg)' },
      { key: 'ProcessedWeightKg', label: 'Actual Processed Wt (Kg)' },
      { key: 'RejectionWeightKg', label: 'Rejection Wt (Kg)' },
      { key: 'VarianceKg', label: 'Variance (Kg)' },
      { key: 'VariancePct', label: 'Variance %' },
      { key: 'HasVariance', label: 'Variance Alert' },
      { key: 'Operator', label: 'Operator' },
      { key: 'Remarks', label: 'Remarks' },
      { key: 'Voided', label: 'Voided' },
      { key: 'VoidReason', label: 'Void Reason' }
    ]);

    downloadFile(csvStr, `Daily_Processing_Selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleBulkConfirmVoid = () => {
    if (!bulkVoidReason.trim()) return;
    const targetEntries = processingEntries.filter((p) => selectedIds.includes(p.id) && !p.isVoided);
    let count = 0;
    for (const p of targetEntries) {
      const res = voidProcessingEntry(p.id, bulkVoidReason.trim());
      if (res.success) count++;
    }
    showToast(`Successfully voided ${count} daily processing records.`, 'success');
    setIsBulkVoidModalOpen(false);
    setBulkVoidReason('');
    setSelectedIds([]);
  };

  const handleBulkConfirmDelete = () => {
    let count = 0;
    for (const id of selectedIds) {
      const res = deleteProcessingEntryPermanently(id);
      if (res.success) count++;
    }
    showToast(`Permanently deleted ${count} daily processing records.`, 'success');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const exportData = filteredEntries.map((p) => {
      const supp = supplierMap.get(p.supplierId);
      const grd = gradeMap.get(p.gradeId);
      const sz = sizeMap.get(p.sizeId);
      const cnt = countMap.get(p.countId || '');
      const slb = slabTypeMap.get(p.slabTypeId);

      return {
        EntryNo: p.entryNo,
        Date: p.processingDate,
        Shift: p.shift,
        Supplier: supp?.name || 'N/A',
        BoxID: p.supplierBoxId || 'None',
        Species: resolveProductionSpeciesName(p.speciesId),
        Grade: grd?.name || 'N/A',
        Size: sz?.name || 'N/A',
        Count: cnt?.name || 'N/A',
        SlabType: slb?.name || 'N/A',
        StdSlabWeight: p.standardSlabWeightKg,
        SlabsCount: p.slabsCount,
        ExpectedWeightKg: p.expectedWeightKg,
        ProcessedWeightKg: p.processedWeightKg,
        RejectionWeightKg: p.rejectionWeightKg,
        VarianceKg: p.varianceWeightKg,
        VariancePct: p.variancePct,
        HasVariance: p.hasSlabVariance ? 'Yes' : 'No',
        Operator: p.operator,
        Remarks: p.remarks || '',
        Voided: p.isVoided ? 'Yes' : 'No',
        VoidReason: p.voidReason || ''
      };
    });

    const csvStr = convertToCSV(exportData, [
      { key: 'EntryNo', label: 'Entry No' },
      { key: 'Date', label: 'Processing Date' },
      { key: 'Shift', label: 'Shift' },
      { key: 'Supplier', label: 'Supplier' },
      { key: 'BoxID', label: 'Box ID' },
      { key: 'Species', label: 'Product / Species' },
      { key: 'Grade', label: 'Quality Grade' },
      { key: 'Size', label: 'Physical Size' },
      { key: 'Count', label: 'Piece Count' },
      { key: 'SlabType', label: 'Slab Type' },
      { key: 'StdSlabWeight', label: 'Std Slab Wt (Kg)' },
      { key: 'SlabsCount', label: 'No. of Slabs' },
      { key: 'ExpectedWeightKg', label: 'Expected Wt (Kg)' },
      { key: 'ProcessedWeightKg', label: 'Processed Wt (Kg)' },
      { key: 'RejectionWeightKg', label: 'Rejection Wt (Kg)' },
      { key: 'VarianceKg', label: 'Variance (Kg)' },
      { key: 'VariancePct', label: 'Variance %' },
      { key: 'HasVariance', label: 'Tolerance Flag' },
      { key: 'Operator', label: 'Operator' },
      { key: 'Remarks', label: 'Remarks' },
      { key: 'Voided', label: 'Voided' }
    ]);

    downloadFile(csvStr, `Production_Entries_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Daily processing log register"
        subtitle="Immutable trace of factory shift production logs, slab count tolerances, and rejection records."
        breadcrumbs={['Production', 'Processing Log']}
        primaryAction={
          onNavigate
            ? {
                label: 'New processing entry',
                onClick: () => onNavigate('daily-entry'),
                icon: Plus
              }
            : undefined
        }
        secondaryActions={[
          ...(onNavigate ? [{
            label: 'Import Excel',
            onClick: () => onNavigate('prod-excel-import'),
            icon: FileSpreadsheet
          }] : []),
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Search & Action Bar (Liquid Glass Surface) */}
      <div className="glass-surface-thin p-4 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search entry #, box ID, supplier, species..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
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
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Products</option>
            {productionSpeciesOptions.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Shifts</option>
            <option value="General Day Shift (08:00 - 17:00)">General Day</option>
            <option value="Morning Shift (06:00 - 14:00)">Morning Shift</option>
            <option value="Evening Shift (14:00 - 22:00)">Evening Shift</option>
            <option value="Night Shift (22:00 - 06:00)">Night Shift</option>
          </select>

          <button
            onClick={() => setVarianceOnlyFilter(!varianceOnlyFilter)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
              varianceOnlyFilter
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Variance Alerts</span>
          </button>

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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('daily-entry')}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-full shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 text-xs font-semibold border border-gray-200 rounded-xl transition shadow-xs"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                    title={allFilteredSelected ? 'Deselect all visible' : 'Select all visible'}
                  />
                </th>
                <th className="py-3 px-4">Entry # &amp; Shift</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier &amp; Box ID</th>
                <th className="py-3 px-4">Product, Grade &amp; Size</th>
                <th className="py-3 px-4">Slab Packaging</th>
                <th className="py-3 px-4 text-right">Processed (Kg)</th>
                <th className="py-3 px-4 text-right">Rejection (Kg)</th>
                <th className="py-3 px-4 text-center">Variance Audit</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-ink-900">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-500">
                    No production entries match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((p) => {
                  const supp = supplierMap.get(p.supplierId);
                  const grd = gradeMap.get(p.gradeId);
                  const sz = sizeMap.get(p.sizeId);
                  const cnt = countMap.get(p.countId || '');
                  const slb = slabTypeMap.get(p.slabTypeId);
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-rose-50/40 transition-colors ${
                        isSelected ? 'bg-rose-50/70 font-medium' : ''
                      } ${p.isVoided ? 'bg-gray-50/60 opacity-60' : ''}`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(p.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {p.entryNo}
                          {p.isVoided && <StatusBadge status="Voided" />}
                        </div>
                        <div className="text-[10px] text-ink-500 font-normal">
                          {p.shift.split(' ')[0]} Shift
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-ink-900">{p.processingDate}</div>
                        <div className="text-[10px] text-ink-500">{p.monthYear}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-900 line-clamp-1">{supp?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-ink-500">
                          Box: <strong>{p.supplierBoxId || 'None'}</strong>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-900 line-clamp-1">{resolveProductionSpeciesName(p.speciesId)}</div>
                        <div className="text-[10px] text-ink-500">
                          {grd?.name ? `Grade: ${grd.name}` : ''}
                          {[sz?.name ? `Size: ${sz.name}` : '', cnt?.name ? `Count: ${cnt.name}` : ''].filter(Boolean).length > 0
                            ? ` · ${[sz?.name ? `Size: ${sz.name}` : '', cnt?.name ? `Count: ${cnt.name}` : ''].filter(Boolean).join(' · ')}`
                            : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-ink-800">{slb?.name || 'Slab'}</div>
                        <div className="text-[10px] text-ink-500">
                          <strong>{p.slabsCount}</strong> slabs ({p.standardSlabWeightKg} Kg/slab)
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-ink-900 whitespace-nowrap tabular-nums">
                        {formatKg(p.processedWeightKg)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-rose-700 whitespace-nowrap tabular-nums">
                        {p.rejectionWeightKg > 0 ? formatKg(p.rejectionWeightKg) : '-'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.hasSlabVariance ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            title={`Expected ${p.expectedWeightKg} Kg vs Actual ${p.processedWeightKg} Kg (Diff: ${p.varianceWeightKg} Kg)`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{p.variancePct > 0 ? `+${p.variancePct}%` : `${p.variancePct}%`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Balanced</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Modal */}
                          <button
                            onClick={() => setSelectedEntry(p)}
                            className="p-1.5 rounded-lg text-ink-500 hover:text-rose-700 hover:bg-rose-50 transition"
                            title="Inspect complete details & audit metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Modal (if not voided) */}
                          {!p.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Edit record details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Soft-Delete / Void Modal */}
                          {!p.isVoided && permissions.canVoid && (
                            <button
                              onClick={() => {
                                setVoidModalTarget(p);
                                setVoidReason('');
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                              title="Void record (soft delete)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Permanent Hard Purge (Exclusive to Owner/Admin) */}
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteModalTarget(p)}
                              className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-50 transition"
                              title="Owner/Admin: Permanent hard delete"
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

        {/* Responsive Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredEntries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ink-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 text-xs font-semibold">
          <span className="flex items-center gap-2 pr-3 border-r border-white/20 font-bold text-white">
            <span className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-[11px] font-bold">
              {selectedIds.length}
            </span>
            <span>selected</span>
          </span>

          <button
            onClick={handleBulkExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canVoid && (
            <button
              onClick={() => {
                setBulkVoidReason('');
                setIsBulkVoidModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bulk Void</span>
            </button>
          )}

          {permissions.canPermanentlyDelete && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>
          )}

          <button
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            Deselect
          </button>
        </div>
      )}

      {/* DETAIL INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={`Processing Record: ${selectedEntry?.entryNo}`}
        subtitle={`Audit and inspection metadata recorded on ${selectedEntry?.processingDate}`}
        maxWidth="max-w-2xl"
      >
        {selectedEntry && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-rose-800 font-bold uppercase block">Processing Entry No.</span>
                <span className="text-base font-extrabold text-ink-900">{selectedEntry.entryNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-ink-500 font-bold uppercase block">Status</span>
                <StatusBadge status={selectedEntry.isVoided ? 'Voided' : 'Active'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50/40">
              <div className="space-y-2">
                <div>
                  <strong>Processing Date:</strong> {selectedEntry.processingDate}
                </div>
                <div>
                  <strong>Shift:</strong> {selectedEntry.shift}
                </div>
                <div>
                  <strong>Supplier:</strong> {supplierMap.get(selectedEntry.supplierId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Supplier Box / Lot ID:</strong> {selectedEntry.supplierBoxId || 'None'}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <strong>Product / Species:</strong> {resolveProductionSpeciesName(selectedEntry.speciesId)}
                </div>
                <div>
                  <strong>Quality Grade:</strong> {gradeMap.get(selectedEntry.gradeId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Physical Size:</strong> {sizeMap.get(selectedEntry.sizeId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Piece Count:</strong> {countMap.get(selectedEntry.countId || '')?.name || 'N/A'}
                </div>
              </div>
            </div>

            {/* Weighment & Variance Details */}
            <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
              <h4 className="font-bold uppercase text-[11px] text-rose-700">Packaging &amp; Weight Analysis</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <span className="text-ink-500 block text-[10px]">Slab Type</span>
                  <span className="font-bold text-ink-900">{slabTypeMap.get(selectedEntry.slabTypeId)?.name || 'N/A'}</span>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <span className="text-ink-500 block text-[10px]">No. of Slabs</span>
                  <span className="font-bold text-ink-900">{selectedEntry.slabsCount}</span>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <span className="text-ink-500 block text-[10px]">Standard Weight/Slab</span>
                  <span className="font-bold text-ink-900">{selectedEntry.standardSlabWeightKg} Kg</span>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <span className="text-ink-500 block text-[10px]">Expected Slab Weight</span>
                  <span className="font-bold text-ink-900">{selectedEntry.expectedWeightKg} Kg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <span className="text-ink-500 block">Actual Processed Weight</span>
                  <span className="font-bold text-base text-rose-700">{formatKg(selectedEntry.processedWeightKg)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Weight Variance</span>
                  <span className={`font-bold text-base ${selectedEntry.hasSlabVariance ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {selectedEntry.varianceWeightKg > 0 ? `+${selectedEntry.varianceWeightKg}` : selectedEntry.varianceWeightKg} Kg ({selectedEntry.variancePct}%)
                  </span>
                </div>
                <div>
                  <span className="text-ink-500 block">Rejection Weight</span>
                  <span className="font-bold text-base text-ink-900">{formatKg(selectedEntry.rejectionWeightKg)}</span>
                </div>
              </div>
            </div>

            {/* Audit & Staff Metadata */}
            <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-ink-500 space-y-1">
              <div>Operator: <strong>{selectedEntry.operator}</strong> · Entry Created: {new Date(selectedEntry.dataEntryDate).toLocaleString()}</div>
              <div>Created By: <strong>{selectedEntry.createdBy}</strong></div>
              {selectedEntry.updatedBy && <div>Last Updated By: <strong>{selectedEntry.updatedBy}</strong> at {new Date(selectedEntry.updatedAt).toLocaleString()}</div>}
              {selectedEntry.remarks && <div>Remarks: {selectedEntry.remarks}</div>}
              {selectedEntry.isVoided && (
                <div className="text-amber-800 font-semibold pt-1 border-t border-amber-200">
                  Void Reason: {selectedEntry.voidReason} (Voided by {selectedEntry.voidedBy} at {selectedEntry.voidedAt})
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title={`Edit Processing Record: ${editingEntry?.entryNo}`}
        subtitle="Modify weighment or lots with audit-compliant explanation"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Processing Date</label>
              <input
                type="date"
                value={editForm.processingDate}
                onChange={(e) => setEditForm({ ...editForm, processingDate: e.target.value })}
                required
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Shift</label>
              <select
                value={editForm.shift}
                onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              >
                <option value="General Day Shift (08:00 - 17:00)">General Day Shift (08:00 - 17:00)</option>
                <option value="Morning Shift (06:00 - 14:00)">Morning Shift (06:00 - 14:00)</option>
                <option value="Evening Shift (14:00 - 22:00)">Evening Shift (14:00 - 22:00)</option>
                <option value="Night Shift (22:00 - 06:00)">Night Shift (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Supplier</label>
              <select
                value={editForm.supplierId}
                onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Supplier Box ID</label>
              <input
                type="text"
                value={editForm.supplierBoxId}
                onChange={(e) => setEditForm({ ...editForm, supplierBoxId: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Product</label>
              <select
                value={editForm.speciesId}
                onChange={(e) => setEditForm({ ...editForm, speciesId: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              >
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>{resolveProductionSpeciesName(sp.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Grade</label>
              <select
                value={editForm.gradeId}
                onChange={(e) => setEditForm({ ...editForm, gradeId: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Slab Type</label>
              <select
                value={editForm.slabTypeId}
                onChange={(e) => setEditForm({ ...editForm, slabTypeId: e.target.value })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              >
                {slabTypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name} ({st.standardWeightKg} Kg)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">No. of Slabs</label>
              <input
                type="number"
                min="0"
                value={editForm.slabsCount}
                onChange={(e) => setEditForm({ ...editForm, slabsCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Processed Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.processedWeightKg}
                onChange={(e) => setEditForm({ ...editForm, processedWeightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Rejection Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.rejectionWeightKg}
                onChange={(e) => setEditForm({ ...editForm, rejectionWeightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Remarks</label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Audit Reason for Modification <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={editForm.editReason}
              onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
              placeholder="e.g. Corrected scale tare weight after recalibration"
              required
              className="w-full p-2 bg-gray-50 border rounded-xl outline-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full font-bold transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* VOID MODAL */}
      <Modal
        isOpen={!!voidModalTarget}
        onClose={() => setVoidModalTarget(null)}
        title={`Void Processing Record: ${voidModalTarget?.entryNo}`}
        subtitle="Audit-compliant cancellation of factory weighment entry"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            Voiding record <strong>{voidModalTarget?.entryNo}</strong> will deactivate its yield calculations from production dashboards while retaining an immutable surveillance trail.
          </p>
          <div>
            <label className="block font-bold text-ink-700 mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Shift operator keyed duplicate batch weighment..."
              className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setVoidModalTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleVoidConfirm}
              disabled={!voidReason.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-full font-bold transition"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL (OWNER / ADMIN ONLY) */}
      <Modal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        title={`Permanent Purge: ${deleteModalTarget?.entryNo}`}
        subtitle="Exclusive Owner / Admin permanent deletion authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently purge production record <strong>{deleteModalTarget?.entryNo}</strong>. This cannot be undone.
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteModalTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full font-bold transition"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>
      {/* BULK VOID MODAL */}
      <Modal
        isOpen={isBulkVoidModalOpen}
        onClose={() => setIsBulkVoidModalOpen(false)}
        title={`Bulk Void: ${selectedIds.length} Processing Records`}
        subtitle="Deactivate yield calculations for selected entries with recorded reason"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            You are about to void <strong>{selectedIds.length}</strong> selected production records. Their weighment will be excluded from production dashboards while preserved in audit logs.
          </p>
          <div>
            <label className="block font-bold text-ink-700 mb-1">
              Reason for Bulk Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              value={bulkVoidReason}
              onChange={(e) => setBulkVoidReason(e.target.value)}
              placeholder="e.g. Bulk shift correction, duplicate imports..."
              className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsBulkVoidModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirmVoid}
              disabled={!bulkVoidReason.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-full font-bold transition"
            >
              Confirm Bulk Void
            </button>
          </div>
        </div>
      </Modal>

      {/* BULK DELETE MODAL (OWNER / ADMIN ONLY) */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={`Permanent Purge: ${selectedIds.length} Records`}
        subtitle="Exclusive Owner / Admin permanent deletion authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently purge <strong>{selectedIds.length}</strong> production records. This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full font-bold transition"
            >
              Permanently Purge Selected
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
