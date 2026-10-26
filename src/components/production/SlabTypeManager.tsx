import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-rose-600" />
            Production Slab Types Master
          </h2>
          <p className="text-xs text-ink-500">
            Define standard frozen slab sizes, master carton units, and target weights (Kg) used during packing.
          </p>
        </div>

        {permissions.canManageMasterData && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Slab Type</span>
          </button>
        )}
      </div>

      {/* Grid of Slab Types */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        {slabTypes.length === 0 ? (
          <div className="py-12 text-center text-ink-500 text-xs">
            No slab types configured yet. Click "Add New Slab Type" to register your packing configurations.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slabTypes.map((st) => (
              <div
                key={st.id}
                className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 hover:border-rose-200 transition space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      {st.code}
                    </span>
                    <button
                      onClick={() => toggleSlabTypeActive(st.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                        st.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-200 text-gray-600 border-gray-300'
                      }`}
                    >
                      {st.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-ink-900 mt-2">{st.name}</h3>

                  <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-ink-500 font-medium">Standard Slab Weight:</span>
                    <span className="text-sm font-extrabold text-ink-900">
                      {st.standardWeightKg} {st.unit}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-ink-500">
                    Applicable Products: <strong className="text-ink-800">{st.productApplicability}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-200/80">
                  {permissions.canManageMasterData && (
                    <button
                      onClick={() => handleOpenEdit(st)}
                      className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Edit Slab Type"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {permissions.canPermanentlyDelete && (
                    <button
                      onClick={() => setDeleteTarget(st)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Slab Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Slab Type' : 'Add New Slab Type'}
        subtitle="Configure packaging block specifications and target weight"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Slab ID / Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Slab Type Name</label>
            <input
              type="text"
              placeholder="e.g. 2.0 Kg Standard Export Block"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Standard Weight</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
              >
                <option value="Kg">Kg</option>
                <option value="Lbs">Lbs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Product Applicability</label>
            <input
              type="text"
              placeholder="e.g. All Products, Shrimp / Prawns, Pelagic Finfish"
              value={productApp}
              onChange={(e) => setProductApp(e.target.value)}
              className="w-full p-2 bg-gray-50 border rounded-xl outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-ink-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
            >
              {editingId ? 'Update Slab Type' : 'Save Slab Type'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Slab Type Deletion"
        subtitle="This action cannot be undone if removed"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            Are you sure you want to permanently delete slab type <strong>{deleteTarget?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
