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
  Hash,
  Layers
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

interface CommercialSpeciesManagerProps {
  onNavigate?: (tab: string) => void;
}

export const CommercialSpeciesManager: React.FC<CommercialSpeciesManagerProps> = ({ onNavigate }) => {
  const { species, speciesHeads, addSpecies, updateSpecies, deleteSpecies, toggleSpeciesActive } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [speciesHeadFilter, setSpeciesHeadFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Species | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkTargetHeadId, setBulkTargetHeadId] = useState('');

  // Form State for Commercial Product
  const [code, setCode] = useState('');
  const [name, setName] = useState(''); // Export Ready Name
  const [speciesHeadId, setSpeciesHeadId] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [productForm, setProductForm] = useState(PRODUCT_FORMS[0]);
  const [processingType, setProcessingType] = useState(PROCESSING_TYPES[0]);
  const [hsCode, setHsCode] = useState('');

  const filteredSpecies = species.filter((sp) => {
    if (categoryFilter && sp.category !== categoryFilter) return false;
    if (speciesHeadFilter) {
      if (speciesHeadFilter === '__unassigned__') {
        if (sp.speciesHeadId) return false;
      } else if (sp.speciesHeadId !== speciesHeadFilter && sp.speciesHeadName !== speciesHeadFilter) {
        return false;
      }
    }
    if (searchTerm.trim()) {
      const rawQ = searchTerm.trim().toLowerCase();
      const tokens = rawQ.split(/\s+/).filter(Boolean);
      const normQ = rawQ.replace(/[^a-z0-9]/g, '');

      // Direct species isolation guards:
      // If user is searching for a specific biological species, strictly isolate it and return immediately.
      const isMackerelSearch = tokens.some((t) => t.includes('mackerel') || t.includes('kanagurta'));
      if (isMackerelSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();
        const catLower = (sp.category || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('ribbon') || headLower.includes('ribbon') || rawLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') || rawLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') || rawLower.includes('shrimp') || catLower.includes('shrimp') ||
          nameLower.includes('prawn') || headLower.includes('prawn') || rawLower.includes('prawn') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') || catLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') || catLower.includes('octopus') ||
          nameLower.includes('poovalan') || headLower.includes('poovalan') || rawLower.includes('poovalan') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isMackerelProduct =
          nameLower.includes('mackerel') ||
          headLower.includes('mackerel') ||
          sciLower.includes('kanagurta') ||
          rawLower.includes('mackerel');
        if (!isMackerelProduct) return false;
        const extraTokens = tokens.filter((t) => t !== 'mackerel' && t !== 'kanagurta');
        if (extraTokens.length === 0) return true;
      }

      const isRibbonSearch = tokens.some((t) => t.includes('ribbon') || t.includes('savala') || t.includes('hairtail'));
      if (isRibbonSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') || rawLower.includes('mackerel') ||
          nameLower.includes('van') || headLower.includes('van') || rawLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') || rawLower.includes('shrimp') ||
          nameLower.includes('prawn') || headLower.includes('prawn') || rawLower.includes('prawn') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') ||
          nameLower.includes('poovalan') || headLower.includes('poovalan') || rawLower.includes('poovalan') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isRibbonProduct =
          nameLower.includes('ribbon') ||
          headLower.includes('ribbon') ||
          sciLower.includes('savala') ||
          rawLower.includes('ribbon') ||
          nameLower.includes('hairtail');
        return isRibbonProduct;
      }

      const isVannameiSearch = tokens.some((t) => t.includes('vannamei') || t.includes('vanamei'));
      if (isVannameiSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') || rawLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') || rawLower.includes('ribbon') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isVannameiProduct =
          nameLower.includes('van') ||
          headLower.includes('van') ||
          sciLower.includes('vannamei') ||
          rawLower.includes('van');
        return isVannameiProduct;
      }

      const isSquidSearch = tokens.some((t) => t.includes('squid') || t.includes('loligo') || t.includes('duvaucelii'));
      if (isSquidSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') ||
          nameLower.includes('octopus') || headLower.includes('octopus');
        if (isOtherSpecies) return false;

        const isSquidProduct =
          nameLower.includes('squid') ||
          nameLower.includes('loligo') ||
          headLower.includes('squid') ||
          sciLower.includes('duvaucelii') ||
          rawLower.includes('squid');
        return isSquidProduct;
      }

      const isOctopusSearch = tokens.some((t) => t.includes('octopus'));
      if (isOctopusSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') ||
          nameLower.includes('squid') || headLower.includes('squid');
        if (isOtherSpecies) return false;

        const isOctopusProduct =
          nameLower.includes('octopus') ||
          headLower.includes('octopus') ||
          sciLower.includes('octopus') ||
          sciLower.includes('vulgaris') ||
          rawLower.includes('octopus');
        return isOctopusProduct;
      }

      const searchCorpus = [
        sp.name,
        sp.code,
        sp.speciesHeadName,
        sp.rawSpeciesName,
        sp.scientificName,
        sp.category,
        sp.productForm,
        sp.processingType,
        sp.hsCode,
        (sp as any).description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const normCorpus = searchCorpus.replace(/[^a-z0-9]/g, '');

      const tokenMatches = (token: string) => {
        if (token.length === 1) {
          const wordRe = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return wordRe.test(sp.name || '') || wordRe.test(sp.code || '');
        }
        return searchCorpus.includes(token);
      };
      const allTokensMatch = tokens.every(tokenMatches);
      const normMatch = normQ.length >= 2 && normCorpus.includes(normQ);

      return allTokensMatch || normMatch;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`PRD-${String(species.length + 1).padStart(3, '0')}`);
    setName('');
    setSpeciesHeadId('');
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
    setSpeciesHeadId(sp.speciesHeadId || '');
    setScientificName(sp.scientificName || '');
    setCategory(sp.category || CATEGORIES[0]);
    setProductForm(sp.productForm || PRODUCT_FORMS[0]);
    setProcessingType(sp.processingType || PROCESSING_TYPES[0]);
    setHsCode(sp.hsCode || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an export-ready product name.', 'error');
      return;
    }

    const matchedHead = speciesHeads.find((h) => h.id === speciesHeadId);

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(), // Export Ready Product Name
      speciesHeadId: speciesHeadId || undefined,
      speciesHeadName: matchedHead ? matchedHead.name : undefined,
      scientificName: scientificName.trim(),
      category: category.trim(),
      productForm: productForm.trim(),
      processingType: processingType.trim(),
      hsCode: hsCode.trim(),
      active: true
    };

    if (editingId) {
      updateSpecies(editingId, payload);
      showToast('Updated commercial export product details.', 'success');
    } else {
      addSpecies(payload);
      showToast('Registered new commercial export product.', 'success');
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
      ProductName: sp.name,
      ScientificName: sp.scientificName || '',
      Category: sp.category,
      ProductForm: sp.productForm || 'Standard',
      ProcessingType: sp.processingType || 'Block Frozen',
      HSNCode: sp.hsCode || '',
      Status: sp.active ? 'Active' : 'Inactive'
    }));

    const csv = convertToCSV(data, [
      { key: 'Code', label: 'Product Code' },
      { key: 'ProductName', label: 'Product Name (Export Ready Name)' },
      { key: 'ScientificName', label: 'Scientific Name' },
      { key: 'Category', label: 'Category' },
      { key: 'ProductForm', label: 'Product Form' },
      { key: 'ProcessingType', label: 'Processing Type' },
      { key: 'HSNCode', label: 'HSN / HS Code' },
      { key: 'Status', label: 'Status' }
    ]);

    downloadFile(csv, `Commercial_Products_Selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleBulkToggleActive = () => {
    let count = 0;
    for (const id of selectedIds) {
      toggleSpeciesActive(id);
      count++;
    }
    showToast(`Updated status for ${count} product records.`, 'success');
    setSelectedIds([]);
  };

  const handleBulkConfirmDelete = () => {
    let count = 0;
    for (const id of selectedIds) {
      deleteSpecies(id);
      count++;
    }
    showToast(`Deleted ${count} product records.`, 'success');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
  };

  const handleBulkAssignSpeciesHead = () => {
    if (!bulkTargetHeadId) {
      showToast('Please select a species head to assign.', 'error');
      return;
    }
    const head = speciesHeads.find((h) => h.id === bulkTargetHeadId);
    const headName = head ? head.name : '';
    for (const id of selectedIds) {
      updateSpecies(id, { speciesHeadId: bulkTargetHeadId, speciesHeadName: headName });
    }
    showToast(`Assigned ${selectedIds.length} product(s) to species head "${headName}".`, 'success');
    setIsBulkAssignModalOpen(false);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Commercial product master"
        subtitle="Manage export-ready commercial seafood products, define product packaging forms, processing methods, customs HSN codes, and assign to common Species Heads."
        breadcrumbs={['Commercial Sales', 'Product Master']}
        primaryAction={
          permissions.canManageSalesMasterData || permissions.canManageMasterData
            ? {
                label: 'Add New Product',
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
          },
          ...(onNavigate
            ? [
                {
                  label: 'Manage Species Heads',
                  onClick: () => onNavigate('species-heads'),
                  icon: Layers
                }
              ]
            : [])
        ]}
      />

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search product name, code, HSN code, form..."
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
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={speciesHeadFilter}
            onChange={(e) => setSpeciesHeadFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition text-ink-800"
          >
            <option value="">All Species Heads</option>
            {speciesHeads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
            <option value="__unassigned__">(Unassigned Products)</option>
          </select>
        </div>

        <span className="text-xs text-ink-500 font-medium">
          Showing <strong>{filteredSpecies.length}</strong> of {species.length} registered export products
        </span>
      </div>

      {/* Bulk Action Strip */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 animate-slide-down">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-rose-950">
              {selectedIds.length} {selectedIds.length === 1 ? 'product selected' : 'products selected'} across views
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkToggleActive}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-800 hover:bg-rose-100/70 transition flex items-center gap-1.5"
            >
              Toggle Active Status
            </button>
            {(permissions.canManageSalesMasterData || permissions.canManageMasterData) && (
              <button
                onClick={() => {
                  setBulkTargetHeadId(speciesHeads[0]?.id || '');
                  setIsBulkAssignModalOpen(true);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-800 hover:bg-rose-100/70 transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Assign Species Head
              </button>
            )}
            <button
              onClick={handleBulkExportCSV}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-800 hover:bg-rose-100/70 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Selected ({selectedIds.length})
            </button>
            {(permissions.canManageSalesMasterData || permissions.canManageMasterData) && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold px-2.5 py-1.5 text-rose-700 hover:text-rose-950 transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
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
                <th className="py-3 px-4">Product Name (Export Ready Name)</th>
                <th className="py-3 px-4">Species Head</th>
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
                  <td colSpan={11} className="py-12 text-center text-ink-500">
                    <Fish className="w-8 h-8 mx-auto mb-2 text-ink-400" />
                    No commercial export products match your criteria.
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
                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-900 text-sm">{sp.name}</div>
                        {sp.productForm && (
                          <div className="text-[11px] text-ink-500 font-medium mt-0.5 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-ink-400" />
                            <span>{sp.productForm} · {sp.processingType || 'Block Frozen'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {sp.speciesHeadName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <Fish className="w-3 h-3 text-rose-500" />
                            {sp.speciesHeadName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
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
                              title="Edit product"
                              className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(sp)}
                              title="Delete product"
                              className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? `Edit Product — ${code}` : 'Register New Commercial Product'}
        subtitle="Export-ready commercial seafood product for foreign buyer invoices"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Product Name (Export Ready Name) */}
          <div>
            <label className="block text-[11px] font-bold text-ink-800 mb-1">
              Product Name (Export Ready Name) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frozen Raw Headless Shell-On Vannamei Shrimp / Yellowfin Tuna Steaks"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-ink-900 outline-none focus:border-rose-400"
            />
            <p className="text-[10px] text-ink-500 mt-1">
              Official export designation used on commercial shipping invoices, packing lists, and bill of lading.
            </p>
          </div>

          {/* Species Head (Common Grouping) */}
          <div>
            <label className="block text-[11px] font-bold text-ink-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5 text-rose-600" />
                <span>Species Head (Common Grouping)</span>
              </span>
              <span className="text-[10px] text-rose-600 font-semibold">e.g. Ribbonfish</span>
            </label>
            <select
              value={speciesHeadId}
              onChange={(e) => {
                const newHeadId = e.target.value;
                setSpeciesHeadId(newHeadId);
                const matched = speciesHeads.find((h) => h.id === newHeadId);
                if (matched) {
                  if (!scientificName && matched.scientificName) setScientificName(matched.scientificName);
                  if (category === CATEGORIES[0] && matched.category) setCategory(matched.category);
                }
              }}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-ink-900 outline-none focus:border-rose-400"
            >
              <option value="">-- None / Unassigned --</option>
              {speciesHeads.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.category})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-ink-500 mt-1">
              Integrate this product under a common Species Head (e.g. <em>Ribbonfish</em> for all Ribbonfish grades) for grouped commercial analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Product Code / SKU <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PRD-001"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono uppercase font-bold outline-none focus:border-rose-400"
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
              <label className="block text-[11px] font-bold text-ink-700 mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-amber-600" />
                <span>Customs HSN Code</span>
              </label>
              <input
                type="text"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="e.g. 03061790 (Shrimp), 03038990 (Fish)"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold text-ink-900 outline-none focus:border-rose-400"
              />
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
        subtitle="Permanent purge from commercial product repository"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete product <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}).
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
        title={`Bulk Delete (${selectedIds.length}) Selected Products`}
        subtitle="Permanent purge from commercial product master"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete <strong>{selectedIds.length}</strong> selected products. This action cannot be undone.
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
              Yes, Delete {selectedIds.length} Products
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Assign Species Head Modal */}
      <Modal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        title={`Assign Species Head to ${selectedIds.length} Products`}
        subtitle="Integrate selected commercial products into a common species head"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600 leading-relaxed">
            Select a common Species Head to integrate all <strong>{selectedIds.length}</strong> selected products into:
          </p>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Target Species Head</label>
            <select
              value={bulkTargetHeadId}
              onChange={(e) => setBulkTargetHeadId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-ink-900 outline-none focus:border-rose-400"
            >
              {speciesHeads.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsBulkAssignModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAssignSpeciesHead}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Assign to Species Head</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const CommercialProductManager = CommercialSpeciesManager;
