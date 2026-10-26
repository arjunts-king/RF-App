import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DailyProcessingEntry } from '../../types';
import { formatKg } from '../../utils/calculations';
import { Modal } from '../common/Modal';
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
  Plus
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [varianceOnlyFilter, setVarianceOnlyFilter] = useState(false);
  const [showVoided, setShowVoided] = useState(false);

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

  // Filtered List
  const filteredEntries = processingEntries.filter((p) => {
    if (!showVoided && p.isVoided) return false;
    if (showVoided && !p.isVoided) return false;

    if (supplierFilter && p.supplierId !== supplierFilter) return false;
    if (speciesFilter && p.speciesId !== speciesFilter) return false;
    if (shiftFilter && p.shift !== shiftFilter) return false;
    if (varianceOnlyFilter && !p.hasSlabVariance) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = p.entryNo.toLowerCase().includes(q);
      const matchBox = p.supplierBoxId?.toLowerCase().includes(q);
      const matchSupplier = supplierMap.get(p.supplierId)?.name.toLowerCase().includes(q);
      const matchSpecies = speciesMap.get(p.speciesId)?.name.toLowerCase().includes(q);
      const matchRemarks = p.remarks?.toLowerCase().includes(q);
      return matchNo || matchBox || matchSupplier || matchSpecies || matchRemarks;
    }

    return true;
  });

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

  const handleExportCSV = () => {
    const exportData = filteredEntries.map((p) => {
      const supp = supplierMap.get(p.supplierId);
      const spec = speciesMap.get(p.speciesId);
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
        Species: spec?.name || 'N/A',
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
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search entry #, box ID, supplier, species..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
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
            <option value="">All Products</option>
            {species.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
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
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
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
                  <td colSpan={9} className="py-12 text-center text-ink-500">
                    No production entries match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((p) => {
                  const supp = supplierMap.get(p.supplierId);
                  const spec = speciesMap.get(p.speciesId);
                  const grd = gradeMap.get(p.gradeId);
                  const sz = sizeMap.get(p.sizeId);
                  const cnt = countMap.get(p.countId || '');
                  const slb = slabTypeMap.get(p.slabTypeId);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-rose-50/40 transition-colors ${
                        p.isVoided ? 'bg-gray-50/60 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {p.entryNo}
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
                        <div className="font-semibold text-ink-900 line-clamp-1">{spec?.name || 'Product'}</div>
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

                      <td className="py-3 px-4 text-right font-extrabold text-ink-900 whitespace-nowrap">
                        {formatKg(p.processedWeightKg)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-rose-700 whitespace-nowrap">
                        {p.rejectionWeightKg > 0 ? formatKg(p.rejectionWeightKg) : '-'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.hasSlabVariance ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            title={`Expected ${p.expectedWeightKg} Kg vs Actual ${p.processedWeightKg} Kg (Diff: ${p.varianceWeightKg} Kg)`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{p.variancePct > 0 ? `+${p.variancePct}%` : `${p.variancePct}%`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                            className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Inspect complete details & audit metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Modal (if not voided) */}
                          {!p.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
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
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition"
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
      </div>

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
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedEntry.isVoided ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedEntry.isVoided ? 'Voided / Cancelled' : 'Active / Validated'}
                </span>
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
                  <strong>Product / Species:</strong> {speciesMap.get(selectedEntry.speciesId)?.name || 'N/A'}
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
              <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Packaging &amp; Weight Analysis</h4>
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
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
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
            <label className="block font-semibold text-ink-900 mb-1">
              Audit Edit Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Corrected scale weighment discrepancy after re-check"
              value={editForm.editReason}
              onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
              required
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="px-4 py-2 border rounded-xl text-ink-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editForm.editReason.trim()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
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
        subtitle="Soft delete. Record remains recoverable with an explicit audit note."
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            You are about to void record <strong>{voidModalTarget?.entryNo}</strong>. It will be excluded from monthly production summaries but will remain in audit logs.
          </p>

          <div>
            <label className="block font-semibold text-ink-900 mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Duplicate factory line entry, lots misidentified"
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
              <strong>Irreversible Action:</strong> This will completely remove production entry{' '}
              <strong>{deleteModalTarget?.entryNo}</strong> from the database. This action is permanently logged to the surveillance audit trail.
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
    </div>
  );
};
