import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { Species } from '../../types';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Fish,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  Hash
} from 'lucide-react';

const CATEGORIES = [
  'Shrimp / Prawns',
  'Fish',
  'Cephalopods (Squid / Cuttlefish / Octopus)',
  'Crabs & Lobsters',
  'Other Marine Products'
];

const PRODUCT_FORMS = [
  'Headless Shell-On (HLSO)',
  'Head-On Shell-On (HOSO)',
  'Peeled & Deveined (PD)',
  'Peeled & Undeveined (PUD)',
  'Peeled Deveined Tail-On (PDTO)',
  'Butterflied',
  'Fillets / Loins',
  'Steaks',
  'Whole Round',
  'Gilled & Gutted (GG)',
  'Tubes / Rings'
];

const PROCESSING_TYPES = [
  'Block Frozen',
  'Individually Quick Frozen (IQF)',
  'Semi-IQF',
  'Blast Frozen',
  'Fresh Chilled (Air-freight)',
  'Cooked & Frozen'
];

export const CommercialSpeciesManager: React.FC = () => {
  const { species, addSpecies, updateSpecies, deleteSpecies, toggleSpeciesActive } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Species | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [productForm, setProductForm] = useState(PRODUCT_FORMS[0]);
  const [processingType, setProcessingType] = useState(PROCESSING_TYPES[0]);
  const [hsCode, setHsCode] = useState('');

  const filteredSpecies = species.filter((sp) => {
    if (categoryFilter && sp.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = sp.name.toLowerCase().includes(q);
      const matchCode = sp.code.toLowerCase().includes(q);
      const matchSci = sp.scientificName?.toLowerCase().includes(q);
      const matchHs = sp.hsCode?.toLowerCase().includes(q);
      const matchForm = sp.productForm?.toLowerCase().includes(q);
      return matchName || matchCode || matchSci || matchHs || matchForm;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`SPE-${String(species.length + 1).padStart(3, '0')}`);
    setName('');
    setScientificName('');
    setCategory(CATEGORIES[0]);
    setProductForm(PRODUCT_FORMS[0]);
    setProcessingType(PROCESSING_TYPES[0]);
    setHsCode('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sp: Species) => {
    setEditingId(sp.id);
    setCode(sp.code);
    setName(sp.name);
    setScientificName(sp.scientificName || '');
    setCategory(sp.category || CATEGORIES[0]);
    setProductForm(sp.productForm || PRODUCT_FORMS[0]);
    setProcessingType(sp.processingType || PROCESSING_TYPES[0]);
    setHsCode(sp.hsCode || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      scientificName: scientificName.trim(),
      category: category.trim(),
      productForm: productForm.trim(),
      processingType: processingType.trim(),
      hsCode: hsCode.trim(),
      active: true
    };

    if (editingId) {
      updateSpecies(editingId, payload);
      showToast('Updated commercial product & species details.', 'success');
    } else {
      addSpecies(payload);
      showToast('Registered new commercial product & species.', 'success');
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSpecies(deleteTarget.id);
    showToast(`Deleted ${deleteTarget.name}.`, 'success');
    setDeleteTarget(null);
  };

  // Bulk Selection Helpers & Actions
  const allFilteredSelected =
    filteredSpecies.length > 0 &&
    filteredSpecies.every((sp) => selectedIds.includes(sp.id));
  const someFilteredSelected =
    filteredSpecies.some((sp) => selectedIds.includes(sp.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredSpecies.map((sp) => sp.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredSpecies.map((sp) => sp.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkExportCSV = () => {
    const targetSpecies = selectedIds.length > 0
      ? filteredSpecies.filter((sp) => selectedIds.includes(sp.id))
      : filteredSpecies;
    if (targetSpecies.length === 0) return;

    const data = targetSpecies.map((sp) => ({
      Code: sp.code,
      CommercialName: sp.name,
      ScientificName: sp.scientificName || '',
      Category: sp.category,
      ProductForm: sp.productForm || 'Standard',
      ProcessingType: sp.processingType || 'Block Frozen',
      HSNCode: sp.hsCode || '',
      Status: sp.active ? 'Active' : 'Inactive'
    }));

    const csv = convertToCSV(data, [
      { key: 'Code', label: 'Product Code' },
      { key: 'CommercialName', label: 'Commercial Name' },
      { key: 'ScientificName', label: 'Scientific Name' },
      { key: 'Category', label: 'Category' },
      { key: 'ProductForm', label: 'Product Form' },
      { key: 'ProcessingType', label: 'Processing Type' },
      { key: 'HSNCode', label: 'HSN Code' },
      { key: 'Status', label: 'Status' }
    ]);

    downloadFile(csv, `Commercial_Species_Selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleBulkToggleActive = () => {
    let count = 0;
    for (const id of selectedIds) {
      toggleSpeciesActive(id);
      count++;
    }
    showToast(`Updated status for ${count} species records.`, 'success');
    setSelectedIds([]);
  };

  const handleBulkConfirmDelete = () => {
    let count = 0;
    for (const id of selectedIds) {
      deleteSpecies(id);
      count++;
    }
    showToast(`Deleted ${count} species records.`, 'success');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Commercial product & species master"
        subtitle="Manage export seafood species, product packaging forms, processing methods, and customs HSN classification codes."
        breadcrumbs={['Commercial Sales', 'Species & Product Master']}
        primaryAction={
          permissions.canManageSalesMasterData || permissions.canManageMasterData
            ? {
                label: 'Add New Product / Species',
                onClick: handleOpenAdd,
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Export CSV',
            onClick: handleBulkExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search by commercial name, code, HSN, form, scientific name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Categories ({species.length})</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-ink-500 font-medium">
          Showing <strong>{filteredSpecies.length}</strong> of {species.length} registered commercial products
        </span>
      </div>

      {/* Species Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
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
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Commercial Name</th>
                <th className="py-3 px-4">Scientific Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Product Form</th>
                <th className="py-3 px-4">Processing Type</th>
                <th className="py-3 px-4">HSN Code</th>
                <th className="py-3 px-4 text-center">Status</th>
                {(permissions.canManageSalesMasterData || permissions.canManageMasterData) && (
                  <th className="py-3 px-4 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredSpecies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-500">
                    <Fish className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    No commercial products match your criteria.
                  </td>
                </tr>
              ) : (
                filteredSpecies.map((sp) => {
                  const isSelected = selectedIds.includes(sp.id);
                  return (
                    <tr
                      key={sp.id}
                      className={`hover:bg-rose-50/20 transition-colors ${
                        isSelected ? 'bg-rose-50/70 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(sp.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {sp.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink-900">{sp.name}</td>
                      <td className="py-3 px-4 italic text-ink-500">{sp.scientificName || '—'}</td>
                      <td className="py-3 px-4 text-ink-700">{sp.category}</td>
                      <td className="py-3 px-4 text-ink-700 font-medium">{sp.productForm || 'Standard'}</td>
                      <td className="py-3 px-4 text-ink-700 font-medium">{sp.processingType || 'Block Frozen'}</td>
                      <td className="py-3 px-4">
                        {sp.hsCode ? (
                          <span className="font-mono text-[11px] font-bold bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                            <Hash className="w-3 h-3 text-amber-600" />
                            {sp.hsCode}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSpeciesActive(sp.id)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition ${
                            sp.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {sp.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      {(permissions.canManageSalesMasterData || permissions.canManageMasterData) && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(sp)}
                              title="Edit Species & HSN Code"
                              className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {permissions.canPermanentlyDelete && (
                              <button
                                onClick={() => setDeleteTarget(sp)}
                                title="Delete Species"
                                className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

          <button
            onClick={handleBulkToggleActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 transition"
          >
            <span>Toggle Status</span>
          </button>

          {(permissions.canManageSalesMasterData || permissions.canPermanentlyDelete) && (
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

      {/* Add / Edit Species Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Commercial Product & Species' : 'Register New Commercial Product & Species'}
        subtitle="Maintain commercial trade names, HSN codes, product forms and blast/block freezing types"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Product Code <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SPE-001"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Commercial Trade Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vannamei White Shrimp / Tiger Shrimp"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Scientific Name (Latin)</label>
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="e.g. Litopenaeus vannamei"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl italic outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Product Form</label>
              <select
                value={productForm}
                onChange={(e) => setProductForm(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 font-medium"
              >
                {PRODUCT_FORMS.map((pf) => (
                  <option key={pf} value={pf}>
                    {pf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Processing Type</label>
              <select
                value={processingType}
                onChange={(e) => setProcessingType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 font-medium"
              >
                {PROCESSING_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
            <label className="block text-[11px] font-bold text-rose-950 mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-rose-700" />
              <span>Harmonized System (HSN) Code (Customs / Trade Tariff)</span>
            </label>
            <input
              type="text"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="e.g. 03061790 (Shrimp/Prawn Frozen), 03038990 (Tuna Frozen), 03048900"
              className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl font-mono text-xs font-bold text-rose-900 outline-none focus:border-rose-600 placeholder-rose-300"
            />
            <p className="text-[10px] text-rose-800 mt-1">
              Required on commercial export invoices, shipping bills, certificate of origin, and e-invoicing declarations.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              {editingId ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete Product — ${deleteTarget?.name}`}
        subtitle="Permanent purge from species repository"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}).
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title={`Delete ${selectedIds.length} Species / Product Records`}
        subtitle="Permanent purge from species master"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete <strong>{selectedIds.length}</strong> selected species records.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Delete Selected
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
