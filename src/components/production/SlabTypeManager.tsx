import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { SlabType } from '../../types';
import {
  Boxes,
  PlusCircle,
  Pencil,
  Trash2
} from 'lucide-react';

export const SlabTypeManager: React.FC = () => {
  const { slabTypes, addSlabType, updateSlabType, deleteSlabType, toggleSlabTypeActive } = useData();
  const { permissions } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlabType | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('2.0');
  const [unit, setUnit] = useState('Kg');
  const [productApp, setProductApp] = useState('All Products');

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`SLB-${String(slabTypes.length + 1).padStart(3, '0')}`);
    setName('');
    setWeight('2.0');
    setUnit('Kg');
    setProductApp('All Products');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (st: SlabType) => {
    setEditingId(st.id);
    setCode(st.code);
    setName(st.name);
    setWeight(String(st.standardWeightKg));
    setUnit(st.unit);
    setProductApp(st.productApplicability);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code,
      name,
      standardWeightKg: parseFloat(weight) || 2.0,
      unit,
      productApplicability: productApp,
      active: true
    };

    if (editingId) {
      updateSlabType(editingId, payload);
    } else {
      addSlabType(payload);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSlabType(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Production slab types master"
        subtitle="Define standard frozen slab sizes, master carton units, and target weights (Kg) used during packing."
        breadcrumbs={['Production', 'Slab Types Master']}
        primaryAction={
          permissions.canManageMasterData
            ? {
                label: 'Add New Slab Type',
                onClick: handleOpenAdd,
                icon: PlusCircle
              }
            : undefined
        }
      />

      {/* Grid of Slab Types */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        {slabTypes.length === 0 ? (
          <div className="py-12 text-center text-ink-500">
            <Boxes className="w-8 h-8 mx-auto mb-2 text-ink-400" />
            No slab types configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {slabTypes.map((st) => (
              <div
                key={st.id}
                className={`p-5 rounded-2xl border transition-all ${
                  st.active
                    ? 'bg-white border-gray-100 shadow-xs hover:border-rose-300'
                    : 'bg-gray-50/70 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      {st.code}
                    </span>
                    <h3 className="text-sm font-bold text-ink-900 mt-2">{st.name}</h3>
                  </div>

                  {permissions.canManageMasterData && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(st)}
                        title="Edit Slab Type"
                        className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {permissions.canPermanentlyDelete && (
                        <button
                          onClick={() => setDeleteTarget(st)}
                          title="Delete Slab Type"
                          className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-ink-700 pt-3 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Standard Net Weight:</span>
                    <span className="font-extrabold text-ink-900 tabular-nums">{st.standardWeightKg} {st.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Product Scope:</span>
                    <span className="font-semibold text-ink-800">{st.productApplicability}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-ink-400">Unit: {st.unit}</span>
                  {permissions.canManageMasterData ? (
                    <button
                      onClick={() => toggleSlabTypeActive(st.id)}
                      className="transition"
                    >
                      <StatusBadge status={st.active ? 'Active' : 'Inactive'} />
                    </button>
                  ) : (
                    <StatusBadge status={st.active ? 'Active' : 'Inactive'} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Slab Type Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Production Slab Type' : 'Create New Slab Type'}
        subtitle="Standardize factory frozen packaging dimensions and weights"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Slab Code <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SLB-001"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Slab Type Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2.0 Kg Standard Block"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Target Weight <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="2.0"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-400"
              >
                <option value="Kg">Kg (Kilograms)</option>
                <option value="Lbs">Lbs (Pounds)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Product Applicability</label>
            <input
              type="text"
              value={productApp}
              onChange={(e) => setProductApp(e.target.value)}
              placeholder="e.g. White Shrimp or All Products"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
            />
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
              {editingId ? 'Save Changes' : 'Create Slab Type'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete Slab Type — ${deleteTarget?.name}`}
        subtitle="Permanent purge from production packaging masters"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete <strong>{deleteTarget?.name}</strong>. Existing entries using this type will retain snapshot records, but new entries cannot select it.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
