import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import { SpeciesHead, Species } from '../../types';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Layers,
  Fish,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Download,
  Filter,
  Check,
  ArrowRight,
  AlertCircle,
  Tag,
  Boxes,
  Sparkles,
  Link as LinkIcon,
  X
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Fish',
  'Shrimp / Prawns',
  'Cephalopods (Squid / Cuttlefish / Octopus)',
  'Crabs & Lobsters',
  'Other Marine Products'
];

interface SpeciesHeadManagerProps {
  onNavigate?: (tab: string) => void;
}

export const SpeciesHeadManager: React.FC<SpeciesHeadManagerProps> = ({ onNavigate }) => {
  const {
    speciesHeads,
    species,
    addSpeciesHead,
    updateSpeciesHead,
    deleteSpeciesHead,
    toggleSpeciesHeadActive,
    integrateProductsIntoSpeciesHead
  } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<SpeciesHead | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formScientificName, setFormScientificName] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[1]);
  const [formDescription, setFormDescription] = useState('');
  const [formSelectedProductIds, setFormSelectedProductIds] = useState<string[]>([]);

  // Integration Modal State
  const [integrationModalHead, setIntegrationModalHead] = useState<SpeciesHead | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [integrationFilter, setIntegrationFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<SpeciesHead | null>(null);

  // Grouped products per species head
  const productsByHeadId = useMemo(() => {
    const map = new Map<string, Species[]>();
    species.forEach((sp) => {
      if (sp.speciesHeadId) {
        const existing = map.get(sp.speciesHeadId) || [];
        existing.push(sp);
        map.set(sp.speciesHeadId, existing);
      }
    });
    return map;
  }, [species]);

  // Unassigned products
  const unassignedProducts = useMemo(() => {
    return species.filter((sp) => !sp.speciesHeadId);
  }, [species]);

  // Filtered Heads
  const filteredHeads = useMemo(() => {
    return speciesHeads.filter((head) => {
      if (categoryFilter !== 'All Categories' && head.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !head.active) return false;
      if (statusFilter === 'inactive' && head.active) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = head.name.toLowerCase().includes(q);
        const matchCode = head.code.toLowerCase().includes(q);
        const matchSci = head.scientificName?.toLowerCase().includes(q);
        const matchDesc = head.description?.toLowerCase().includes(q);
        // Also match if any integrated product contains search query
        const linkedProds = productsByHeadId.get(head.id) || [];
        const matchProd = linkedProds.some((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        return matchName || matchCode || matchSci || matchDesc || matchProd;
      }
      return true;
    });
  }, [speciesHeads, categoryFilter, statusFilter, searchTerm, productsByHeadId]);

  // Top Statistics
  const totalHeads = speciesHeads.length;
  const totalProducts = species.length;
  const integratedProductsCount = species.filter((sp) => Boolean(sp.speciesHeadId)).length;
  const unassignedCount = unassignedProducts.length;

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingHead(null);
    setFormCode(`SH-${String(speciesHeads.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormScientificName('');
    setFormCategory('Fish');
    setFormDescription('');
    setFormSelectedProductIds([]);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (head: SpeciesHead) => {
    setEditingHead(head);
    setFormCode(head.code);
    setFormName(head.name);
    setFormScientificName(head.scientificName || '');
    setFormCategory(head.category || 'Fish');
    setFormDescription(head.description || '');
    const currentLinked = (productsByHeadId.get(head.id) || []).map((p) => p.id);
    setFormSelectedProductIds(currentLinked);
    setIsFormModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a species head name (e.g. Ribbonfish).', 'error');
      return;
    }

    if (editingHead) {
      updateSpeciesHead(editingHead.id, {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        scientificName: formScientificName.trim(),
        category: formCategory,
        description: formDescription.trim()
      });
      // Also update linked products if edited from this modal
      integrateProductsIntoSpeciesHead(editingHead.id, formSelectedProductIds);
    } else {
      addSpeciesHead({
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        scientificName: formScientificName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        active: true
      });
      // Link selected products if any were picked during creation
      if (formSelectedProductIds.length > 0) {
        // Find newly added head
        setTimeout(() => {
          const created = speciesHeads.find(
            (h) => h.code.toUpperCase() === formCode.trim().toUpperCase() || h.name.toLowerCase() === formName.trim().toLowerCase()
          );
          if (created) {
            integrateProductsIntoSpeciesHead(created.id, formSelectedProductIds);
          }
        }, 100);
      }
    }

    setIsFormModalOpen(false);
  };

  // Open Integration Modal
  const handleOpenIntegration = (head: SpeciesHead) => {
    setIntegrationModalHead(head);
    setIntegrationSearch('');
    setIntegrationFilter('all');
    const currentlyLinked = (productsByHeadId.get(head.id) || []).map((p) => p.id);
    setSelectedProductIds(currentlyLinked);
  };

  // Save Integration Modal
  const handleSaveIntegration = () => {
    if (!integrationModalHead) return;
    integrateProductsIntoSpeciesHead(integrationModalHead.id, selectedProductIds);
    setIntegrationModalHead(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSpeciesHead(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = filteredHeads.map((head) => {
      const prods = productsByHeadId.get(head.id) || [];
      return {
        HeadCode: head.code,
        HeadName: head.name,
        ScientificName: head.scientificName || '',
        Category: head.category,
        Description: head.description || '',
        IntegratedProductsCount: prods.length,
        IntegratedProducts: prods.map((p) => p.name).join('; '),
        Status: head.active ? 'Active' : 'Inactive'
      };
    });

    const csv = convertToCSV(data, [
      { key: 'HeadCode', label: 'Head Code' },
      { key: 'HeadName', label: 'Species Head Name' },
      { key: 'ScientificName', label: 'Scientific Name' },
      { key: 'Category', label: 'Category' },
      { key: 'Description', label: 'Description' },
      { key: 'IntegratedProductsCount', label: 'No. of Products' },
      { key: 'IntegratedProducts', label: 'Integrated Product Catalog' },
      { key: 'Status', label: 'Status' }
    ]);

    downloadFile(csv, `Species_Heads_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Species head master"
        subtitle="Group and integrate commercial export products (e.g. Frozen Ribbonfish A Grade, B Grade, C Grade) into a common Species Head (e.g. Ribbonfish) for consolidated commercial analytics."
        breadcrumbs={['Commercial Sales', 'Species Heads']}
        primaryAction={
          permissions.canManageSalesMasterData || permissions.canManageMasterData
            ? {
                label: 'Add Species Head',
                onClick: handleOpenAdd,
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download
          },
          ...(onNavigate
            ? [
                {
                  label: 'View Product Master',
                  onClick: () => onNavigate('species'),
                  icon: Fish
                }
              ]
            : [])
        ]}
      />

      {/* Top Bento KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard
          label="Total Species Heads"
          value={totalHeads}
          caption="Active grouping heads"
          variant="success"
          icon={Layers}
        />
        <BentoCard
          label="Integrated Products"
          value={`${integratedProductsCount} of ${totalProducts}`}
          caption={`${Math.round((integratedProductsCount / (totalProducts || 1)) * 100)}% commercial catalog coverage`}
          icon={Fish}
        />
        <BentoCard
          label="Unassigned Products"
          value={unassignedCount}
          caption={
            unassignedCount === 0
              ? 'All products assigned to a species head'
              : `${unassignedCount} product(s) pending integration`
          }
          variant={unassignedCount === 0 ? 'success' : 'warning'}
          icon={AlertCircle}
        />
        <BentoCard
          label="Primary Common Heads"
          value="Ribbonfish & Mackerel"
          caption="Top volume species in sales catalog"
          icon={Boxes}
        />
      </div>

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Species Head (e.g. Ribbonfish) or product name..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ink-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ink-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'cards' ? 'bg-white shadow-xs text-rose-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Card View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-white shadow-xs text-rose-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Unassigned Warning Strip */}
      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {unassignedCount} Commercial Product(s) Not Integrated under Any Species Head
              </h4>
              <p className="text-[11px] text-amber-700">
                Products without a species head cannot be aggregated in species-level commercial reports.
              </p>
            </div>
          </div>
          {filteredHeads.length > 0 && (
            <button
              onClick={() => handleOpenIntegration(filteredHeads[0])}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Integrate Products</span>
            </button>
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHeads.map((head) => {
            const linkedProducts = productsByHeadId.get(head.id) || [];
            const isRibbonfish = head.name.toLowerCase().includes('ribbon');

            return (
              <div
                key={head.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  isRibbonfish ? 'border-rose-200 ring-2 ring-rose-500/10' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isRibbonfish
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        <Fish className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-ink-900 leading-tight">
                            {head.name}
                          </h3>
                          {isRibbonfish && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                              Core Head
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {head.code} · <span className="font-sans font-medium text-gray-600">{head.category}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSpeciesHeadActive(head.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                        head.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      title="Toggle active status"
                    >
                      {head.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Scientific Name & Description */}
                  {head.scientificName && (
                    <div className="text-xs text-gray-600 italic flex items-center gap-1.5 bg-gray-50/80 px-2.5 py-1.5 rounded-xl border border-gray-100">
                      <Tag className="w-3 h-3 text-gray-400 not-italic shrink-0" />
                      <span className="truncate">{head.scientificName}</span>
                    </div>
                  )}

                  {head.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {head.description}
                    </p>
                  )}

                  {/* Integrated Products Section */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-rose-600" />
                        Integrated Products ({linkedProducts.length})
                      </span>
                      <button
                        onClick={() => handleOpenIntegration(head)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    </div>

                    {linkedProducts.length === 0 ? (
                      <div className="p-3 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400">No products integrated yet.</p>
                        <button
                          onClick={() => handleOpenIntegration(head)}
                          className="mt-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Integrate products into {head.name}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {linkedProducts.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-rose-50 text-ink-800 hover:text-rose-800 border border-gray-200 hover:border-rose-200 transition"
                            title={`${p.code}: ${p.name}`}
                          >
                            <span className="truncate max-w-[170px]">{p.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-gray-50/70 border-t border-gray-100 rounded-b-2xl flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenIntegration(head)}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-gray-200 hover:border-rose-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Integrate Products ({linkedProducts.length})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(head)}
                      className="p-1.5 text-gray-500 hover:text-ink-900 hover:bg-gray-200 rounded-lg transition"
                      title="Edit Species Head"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {permissions.canPermanentlyDelete && (
                      <button
                        onClick={() => setDeleteTarget(head)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Species Head"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Species Head Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Scientific Name</th>
                  <th className="py-3 px-4">Integrated Products</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHeads.map((head) => {
                  const prods = productsByHeadId.get(head.id) || [];
                  return (
                    <tr key={head.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-ink-900">{head.code}</td>
                      <td className="py-3 px-4 font-bold text-ink-900">
                        <div className="flex items-center gap-2">
                          <Fish className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{head.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{head.category}</td>
                      <td className="py-3 px-4 text-gray-500 italic">{head.scientificName || '—'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOpenIntegration(head)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>{prods.length} Products</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSpeciesHeadActive(head.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            head.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {head.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenIntegration(head)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Integrate Products"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(head)}
                            className="p-1.5 text-gray-500 hover:text-ink-900 hover:bg-gray-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteTarget(head)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTEGRATE PRODUCTS MODAL                                                  */}
      {/* ========================================================================= */}
      {integrationModalHead && (
        <Modal
          isOpen={Boolean(integrationModalHead)}
          onClose={() => setIntegrationModalHead(null)}
          title={`Integrate Products under "${integrationModalHead.name}"`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Modal Explanation Banner */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">
                  Group commercial products under common head &ldquo;{integrationModalHead.name}&rdquo;
                </p>
                <p className="text-rose-700 leading-relaxed">
                  For example: integrate <em>Frozen Ribbonfish A Grade</em>, <em>Frozen Ribbonfish B Grade</em>, and <em>Frozen Ribbonfish C Grade</em> under the common species head <strong>Ribbonfish</strong>. All selected products will be tagged with this head for grouped exports, analytics, and invoicing.
                </p>
              </div>
            </div>

            {/* Product Selector Filter & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={integrationSearch}
                  onChange={(e) => setIntegrationSearch(e.target.value)}
                  placeholder="Filter products by code, name, form..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={integrationFilter}
                  onChange={(e) => setIntegrationFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-ink-700 focus:outline-none"
                >
                  <option value="all">All Products</option>
                  <option value="assigned">Currently in this Head</option>
                  <option value="unassigned">Unassigned Only</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    // Select all visible matching products
                    const matchingIds = species
                      .filter((sp) => {
                        if (integrationFilter === 'assigned' && sp.speciesHeadId !== integrationModalHead.id) return false;
                        if (integrationFilter === 'unassigned' && sp.speciesHeadId) return false;
                        if (integrationSearch) {
                          const q = integrationSearch.toLowerCase();
                          return sp.name.toLowerCase().includes(q) || sp.code.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map((p) => p.id);
                    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...matchingIds])));
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-bold text-ink-700 transition"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Products Checklist List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-gray-100">
              {species
                .filter((sp) => {
                  if (integrationFilter === 'assigned' && sp.speciesHeadId !== integrationModalHead.id) return false;
                  if (integrationFilter === 'unassigned' && sp.speciesHeadId) return false;
                  if (integrationSearch) {
                    const q = integrationSearch.toLowerCase();
                    return sp.name.toLowerCase().includes(q) || sp.code.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((sp) => {
                  const isChecked = selectedProductIds.includes(sp.id);
                  const isCurrentlyInThisHead = sp.speciesHeadId === integrationModalHead.id;
                  const isCurrentlyInOtherHead = sp.speciesHeadId && sp.speciesHeadId !== integrationModalHead.id;

                  return (
                    <label
                      key={sp.id}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isChecked ? 'bg-rose-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds((prev) => [...prev, sp.id]);
                            } else {
                              setSelectedProductIds((prev) => prev.filter((id) => id !== sp.id));
                            }
                          }}
                          className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-500">{sp.code}</span>
                            <span className="text-xs font-bold text-ink-900 truncate">{sp.name}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {sp.category} · {sp.productForm || 'Standard'} {sp.hsCode ? `· HSN ${sp.hsCode}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Head Assignment Status Chip */}
                      <div className="shrink-0">
                        {isCurrentlyInThisHead ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> In this Head
                          </span>
                        ) : isCurrentlyInOtherHead ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            In {sp.speciesHeadName || 'Other Head'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs font-bold text-ink-700">
                {selectedProductIds.length} product(s) selected for &ldquo;{integrationModalHead.name}&rdquo;
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIntegrationModalHead(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-ink-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIntegration}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Integration</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT SPECIES HEAD MODAL                                             */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingHead ? 'Edit Species Head' : 'Add New Species Head'}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveHead} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Head Code</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="e.g. SH-011"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  {CATEGORIES.slice(1).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">
                Species Head Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Ribbonfish, Indian Mackerel, Squid, Tuna"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Common grouping head name under which related product grades will be consolidated.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Scientific / Latin Name</label>
              <input
                type="text"
                value={formScientificName}
                onChange={(e) => setFormScientificName(e.target.value)}
                placeholder="e.g. Lepturacanthus Savala, Rastrelliger kanagurta"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium italic focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Description / Notes</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional commercial notes or export grade coverage details..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-ink-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {editingHead ? 'Save Changes' : 'Register Species Head'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete Species Head"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Are you sure you want to delete &ldquo;{deleteTarget.name}&rdquo;?</p>
                <p className="text-rose-600 mt-1">
                  {(productsByHeadId.get(deleteTarget.id) || []).length} commercial products are currently integrated under this head. Deleting this head will safely unlink those products back to unassigned status without deleting the products themselves.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-ink-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
