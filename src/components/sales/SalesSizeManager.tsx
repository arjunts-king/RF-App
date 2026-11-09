import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Size } from '../../types';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Scale,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';

export const SalesSizeManager: React.FC = () => {
  const {
    salesSizes,
    addSalesSize,
    updateSalesSize,
    deleteSalesSize,
    toggleSalesSizeActive,
    syncSalesSizesFromPurchase,
    salesInvoices
  } = useData();

  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Size | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  // Filtered list
  const filteredSizes = salesSizes.filter((sz) => {
    if (statusFilter === 'active' && !sz.active) return false;
    if (statusFilter === 'inactive' && sz.active) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = sz.name.toLowerCase().includes(q);
      const matchCode = (sz.code || '').toLowerCase().includes(q);
      const matchDesc = (sz.description || '').toLowerCase().includes(q);
      return matchName || matchCode || matchDesc;
    }
    return true;
  });

  const activeCount = salesSizes.filter((s) => s.active).length;
  const inactiveCount = salesSizes.length - activeCount;

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextSeq = String(salesSizes.length + 1).padStart(3, '0');
    setCode(`SZ-${nextSeq}`);
    setName('');
    setDescription('');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sz: Size) => {
    setEditingId(sz.id);
    setCode(sz.code || '');
    setName(sz.name);
    setDescription(sz.description || '');
    setActive(sz.active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Validation Error: Grade / Size Name is required.', 'error');
      return;
    }

    const cleanCode = code.trim().toUpperCase() || `SZ-${String(salesSizes.length + 1).padStart(3, '0')}`;
    const cleanName = name.trim();
    const cleanDesc = description.trim() || `Grade / Size ${cleanName}`;

    if (editingId) {
      updateSalesSize(editingId, {
        code: cleanCode,
        name: cleanName,
        description: cleanDesc,
        active
      });
    } else {
      addSalesSize({
        code: cleanCode,
        name: cleanName,
        description: cleanDesc,
        active
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSalesSize(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Bulk Selection Helpers & Actions
  const allFilteredSelected =
    filteredSizes.length > 0 && filteredSizes.every((sz) => selectedIds.includes(sz.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSizes.map((sz) => sz.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = () => {
    let successCount = 0;
    let failCount = 0;

    selectedIds.forEach((id) => {
      const res = deleteSalesSize(id);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);

    if (successCount > 0 && failCount === 0) {
      showToast(`Successfully deleted ${successCount} commercial size(s).`, 'success');
    } else if (successCount > 0 && failCount > 0) {
      showToast(
        `Deleted ${successCount} size(s). ${failCount} size(s) could not be deleted because they are referenced in invoices.`,
        'warning'
      );
    }
  };

  const handleBulkToggleActive = (targetActive: boolean) => {
    selectedIds.forEach((id) => {
      const current = salesSizes.find((s) => s.id === id);
      if (current && current.active !== targetActive) {
        toggleSalesSizeActive(id);
      }
    });
    setSelectedIds([]);
    showToast(`Updated active status for ${selectedIds.length} commercial size(s).`, 'success');
  };

  const handleExportCSV = () => {
    const dataToExport = filteredSizes.map((sz) => ({
      Code: sz.code,
      Name: sz.name,
      Description: sz.description,
      Status: sz.active ? 'Active' : 'Inactive'
    }));

    const csv = convertToCSV(dataToExport, [
      { key: 'Code', label: 'Size Code' },
      { key: 'Name', label: 'Grade / Size Name' },
      { key: 'Description', label: 'Description / Specifications' },
      { key: 'Status', label: 'Active Status' }
    ]);
    downloadFile(csv, `commercial_sizes_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Exported commercial sizes to CSV.', 'success');
  };

  // Check if a size is referenced in sales invoices
  const isSizeInUse = (sizeId: string): boolean => {
    return salesInvoices.some(
      (inv) => !inv.isVoided && inv.lineItems?.some((l) => l.sizeId === sizeId)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commercial Grade & Size Master"
        subtitle="Independent sales size and packaging grade master for export invoices. Add, edit, search, and manage export carton grade sizes distinctly from purchase raw sizes."
        breadcrumbs={['Sales', 'Commercial Masters', 'Grade & Size Master']}
        primaryAction={
          permissions.canManageSalesMasterData || permissions.canManageMasterData
            ? {
                label: 'Add Commercial Size',
                onClick: handleOpenAdd,
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Import from Purchase Sizes',
            onClick: () => syncSalesSizesFromPurchase(),
            icon: RotateCcw
          },
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider block mb-1">
              Total Commercial Sizes
            </span>
            <div className="text-2xl font-black text-ink-900">{salesSizes.length}</div>
            <p className="text-[11px] text-ink-400 mt-0.5">Distinct from purchase catalog</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              Active for Invoicing
            </span>
            <div className="text-2xl font-black text-emerald-900">{activeCount}</div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Available in invoice selection</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Archived / Inactive
            </span>
            <div className="text-2xl font-black text-gray-700">{inactiveCount}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Hidden from invoice dropdowns</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-1 w-full md:w-auto gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search size name, code, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 hover:text-ink-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-rose-600 text-white shadow-xs' : 'text-ink-600 hover:bg-gray-100'
                }`}
              >
                All ({salesSizes.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'active' ? 'bg-rose-600 text-white shadow-xs' : 'text-ink-600 hover:bg-gray-100'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'inactive' ? 'bg-rose-600 text-white shadow-xs' : 'text-ink-600 hover:bg-gray-100'
                }`}
              >
                Archived ({inactiveCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-ink-500 font-medium">
            Showing <span className="font-bold text-ink-800">{filteredSizes.length}</span> of {salesSizes.length} sizes
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 flex items-center justify-between animate-fade-in text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-rose-900 bg-rose-200/80 px-2.5 py-1 rounded-lg">
                {selectedIds.length} size{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-rose-700 hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkToggleActive(true)}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-lg hover:bg-rose-100 font-semibold transition-colors"
              >
                Activate Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggleActive(false)}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-lg hover:bg-rose-100 font-semibold transition-colors"
              >
                Deactivate Selected
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bulk Delete
              </button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-bold uppercase text-ink-500 tracking-wider">
                <th className="p-3 pl-6 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-400"
                  />
                </th>
                <th className="py-3 px-4">Size Code</th>
                <th className="py-3 px-4">Commercial Grade / Size Name</th>
                <th className="py-3 px-4">Description / Specification</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSizes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-400">
                    <Scale className="w-8 h-8 mx-auto text-ink-300 mb-2 opacity-50" />
                    <p className="font-medium">No commercial sizes found matching criteria.</p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" /> Add First Size
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSizes.map((sz) => {
                  const isSelected = selectedIds.includes(sz.id);
                  const inUse = isSizeInUse(sz.id);

                  return (
                    <tr
                      key={sz.id}
                      className={`hover:bg-rose-50/20 transition-colors ${
                        isSelected ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="p-3 pl-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(sz.id)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-400"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          {sz.code || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink-900 text-sm">
                        {sz.name}
                      </td>
                      <td className="py-3 px-4 text-ink-600 font-medium max-w-md truncate">
                        {sz.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSalesSizeActive(sz.id)}
                          title="Click to toggle active status"
                          className="cursor-pointer"
                        >
                          <StatusBadge status={sz.active ? 'Active' : 'Inactive'} />
                        </button>
                      </td>
                      <td className="py-3 px-6 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sz)}
                          className="p-1.5 hover:bg-gray-100 text-ink-600 rounded-lg transition-colors inline-flex items-center"
                          title="Edit Size"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sz)}
                          className={`p-1.5 rounded-lg transition-colors inline-flex items-center ${
                            inUse
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                          title={
                            inUse
                              ? 'Cannot delete: Referenced in sales invoices (Deactivate instead)'
                              : 'Delete Size'
                          }
                          disabled={inUse}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Size Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Commercial Grade / Size' : 'Add Commercial Grade / Size'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Size Code <span className="text-ink-400 font-normal">(e.g. 71-90, SZ-001)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 71-90"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Grade / Size Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 71/90, U/3, 3/6, 100/200, WHOLE-A GRADE"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-rose-400"
            />
            <p className="text-[10px] text-ink-400 mt-1">
              This name appears in invoice line item comboboxes and exported Word documentation.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Description / Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grade / Count 71/90 for IQF or Blast Frozen export cartons"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activeToggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-400"
            />
            <label htmlFor="activeToggle" className="font-bold text-ink-800 cursor-pointer">
              Active (Visible in Commercial Invoice Entry dropdowns)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-ink-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-xs"
            >
              {editingId ? 'Save Changes' : 'Create Size'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Commercial Size"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 bg-red-50 text-red-900 rounded-xl border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this commercial size?</p>
              <p className="text-[11px] mt-0.5 text-red-700">
                Size: <span className="font-bold">{deleteTarget?.name}</span> ({deleteTarget?.code})
              </p>
            </div>
          </div>
          <p className="text-ink-500">
            This action will permanently delete this size from the Sales Size Master. If it is already referenced in any existing commercial invoices, deletion will be blocked to protect data integrity.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-gray-200 text-ink-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-xs"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Bulk Delete Commercial Sizes"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 bg-red-50 text-red-900 rounded-xl border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Permanently delete {selectedIds.length} selected commercial size(s)?
              </p>
              <p className="text-[11px] mt-0.5 text-red-700">
                Sizes referenced in commercial sales invoices will automatically be skipped.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-ink-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-xs"
            >
              Confirm Bulk Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
