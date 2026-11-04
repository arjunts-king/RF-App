import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Link,
      DollarSign,
      } from 'lucide-react';
import { InventoryItem, InventoryQuantityBasis } from '../../types';
import { Modal } from '../common/Modal';

export const InventoryItemManager: React.FC = () => {
  const {
    inventoryItems,
    inventoryMappings,
    openingStocks,
    species,
    grades,
    sizes,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    toggleInventoryItemActive,
    addInventoryMapping,
    deleteInventoryMapping,
    saveOpeningStock,
    deleteOpeningStock
  } = useData();

  const { permissions } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'items' | 'mappings'>('items');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [targetItemForOpening, setTargetItemForOpening] = useState<InventoryItem | null>(null);

  // Form State for Item
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Shrimp / Prawns');
  const [quantityBasis, setQuantityBasis] = useState<InventoryQuantityBasis>('purchase_weight');
  const [minStockQty, setMinStockQty] = useState('500');
  const [description, setDescription] = useState('');

  // Form State for Mapping
  const [mappingItemId, setMappingItemId] = useState('');
  const [mappingModule, setMappingModule] = useState<'purchase' | 'sales'>('purchase');
  const [mappingSpeciesId, setMappingSpeciesId] = useState('');
  const [mappingGradeId, setMappingGradeId] = useState('');
  const [mappingSizeId, setMappingSizeId] = useState('');
  const [mappingNotes, setMappingNotes] = useState('');

  // Form State for Opening Stock
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingQtyKg, setOpeningQtyKg] = useState('');
  const [openingUnitRate, setOpeningUnitRate] = useState('');
  const [openingTotalValue, setOpeningTotalValue] = useState('');
  const [openingRemarks, setOpeningRemarks] = useState('');

  // Open Item Modal
  const openAddItemModal = () => {
    setEditingItem(null);
    setItemCode(`INV-${String(inventoryItems.length + 1).padStart(3, '0')}`);
    setItemName('');
    setCategory('Shrimp / Prawns');
    setQuantityBasis('purchase_weight');
    setMinStockQty('500');
    setDescription('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemCode(item.code);
    setItemName(item.name);
    setCategory(item.category);
    setQuantityBasis(item.quantityBasis);
    setMinStockQty(String(item.minimumStockQuantity));
    setDescription(item.description || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemName.trim()) return;

    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        code: itemCode.trim().toUpperCase(),
        name: itemName.trim(),
        category,
        quantityBasis,
        minimumStockQuantity: parseFloat(minStockQty) || 0,
        description: description.trim()
      });
    } else {
      addInventoryItem({
        code: itemCode.trim().toUpperCase(),
        name: itemName.trim(),
        unit: 'Kg',
        category,
        quantityBasis,
        minimumStockQuantity: parseFloat(minStockQty) || 0,
        description: description.trim(),
        active: true
      });
    }
    setIsItemModalOpen(false);
  };

  // Open Mapping Modal
  const openAddMappingModal = (defaultItemId?: string) => {
    setMappingItemId(defaultItemId || (inventoryItems[0]?.id || ''));
    setMappingModule('purchase');
    setMappingSpeciesId('');
    setMappingGradeId('');
    setMappingSizeId('');
    setMappingNotes('');
    setIsMappingModalOpen(true);
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingItemId) return;

    if (mappingModule === 'purchase') {
      if (!mappingSpeciesId) return;
      addInventoryMapping({
        inventoryItemId: mappingItemId,
        module: 'purchase',
        speciesId: mappingSpeciesId,
        gradeId: mappingGradeId || undefined,
        sizeId: mappingSizeId || undefined,
        notes: mappingNotes.trim() || undefined
      });
    } else {
      if (!mappingSpeciesId) return;
      addInventoryMapping({
        inventoryItemId: mappingItemId,
        module: 'sales',
        salesProductId: mappingSpeciesId,
        salesSizeId: mappingSizeId || undefined,
        notes: mappingNotes.trim() || undefined
      });
    }
    setIsMappingModalOpen(false);
  };

  // Open Opening Stock Modal
  const openOpeningStockModal = (item: InventoryItem) => {
    setTargetItemForOpening(item);
    const existing = openingStocks.find((o) => o.inventoryItemId === item.id);
    if (existing) {
      setOpeningDate(existing.effectiveDate);
      setOpeningQtyKg(String(existing.quantityKg));
      setOpeningUnitRate(String(existing.unitCost));
      setOpeningTotalValue(String(existing.totalValue));
      setOpeningRemarks(existing.remarks || '');
    } else {
      setOpeningDate('2026-04-01'); // FY start
      setOpeningQtyKg('');
      setOpeningUnitRate('');
      setOpeningTotalValue('');
      setOpeningRemarks('Initial setup balance');
    }
    setIsOpeningStockModalOpen(true);
  };

  const handleOpeningQtyChange = (val: string) => {
    setOpeningQtyKg(val);
    const q = parseFloat(val) || 0;
    const r = parseFloat(openingUnitRate) || 0;
    if (q > 0 && r > 0) {
      setOpeningTotalValue((q * r).toFixed(2));
    }
  };

  const handleOpeningRateChange = (val: string) => {
    setOpeningUnitRate(val);
    const q = parseFloat(openingQtyKg) || 0;
    const r = parseFloat(val) || 0;
    if (q > 0 && r > 0) {
      setOpeningTotalValue((q * r).toFixed(2));
    }
  };

  const handleSaveOpeningStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItemForOpening) return;
    const qty = parseFloat(openingQtyKg) || 0;
    const val = parseFloat(openingTotalValue) || 0;
    const rate = parseFloat(openingUnitRate) || (qty > 0 ? val / qty : 0);

    saveOpeningStock({
      inventoryItemId: targetItemForOpening.id,
      effectiveDate: openingDate,
      quantityKg: qty,
      unitCost: rate,
      totalValue: val || qty * rate,
      remarks: openingRemarks
    });
    setIsOpeningStockModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Inventory Master & Product Mappings
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Perpetual Ledger Master
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Maintain inventory stock items, opening stock balances, and mapping rules from Procurement species & Sales export products.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeSubTab === 'items' ? (
            <button
              onClick={openAddItemModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Inventory Item</span>
            </button>
          ) : (
            <button
              onClick={() => openAddMappingModal()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Link className="w-4 h-4" />
              <span>Create Product Mapping</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'items'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Inventory Master Items ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mappings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'mappings'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-white'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>Procurement & Sales Mappings ({inventoryMappings.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY ITEMS MASTER */}
      {activeSubTab === 'items' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Item Code</th>
                  <th className="py-3 px-3">Item Name & Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Quantity Basis</th>
                  <th className="py-3 px-3 text-right">Min Stock (Kg)</th>
                  <th className="py-3 px-3">Opening Stock</th>
                  <th className="py-3 px-3 text-center">Active</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                {inventoryItems.map((item) => {
                  const opening = openingStocks.find((o) => o.inventoryItemId === item.id);
                  const isYield = item.quantityBasis === 'yield';

                  return (
                    <tr key={item.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-ink-900">
                        {item.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-ink-500">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-ink-600 font-semibold">{item.category}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isYield
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isYield ? 'Yield Weight' : 'Purchase Weight'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink-800">
                        {item.minimumStockQuantity} Kg
                      </td>
                      <td className="py-3 px-3">
                        {opening ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-ink-900">{opening.quantityKg} Kg</span>
                            <span className="text-[10px] text-ink-500 block">
                              ₹{(opening.unitCost || 0).toFixed(2)}/Kg (₹{(opening.totalValue || 0).toLocaleString()})
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openOpeningStockModal(item)}
                            className="text-[10px] font-bold text-rose-700 hover:underline"
                          >
                            + Set Opening
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleInventoryItemActive(item.id)}
                          className={`text-xs ${item.active ? 'text-emerald-600' : 'text-gray-400'}`}
                          title="Toggle active status"
                        >
                          {item.active ? <CheckCircle2 className="w-4 h-4 inline" /> : <XCircle className="w-4 h-4 inline" />}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => openOpeningStockModal(item)}
                          className="p-1 hover:bg-gray-100 rounded text-ink-600"
                          title="Configure Opening Stock"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {permissions.canPermanentlyDelete && (
                          <button
                            onClick={() => deleteInventoryItem(item.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT MAPPINGS */}
      {activeSubTab === 'mappings' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-ink-900">
                Transaction Mapping Directory
              </h3>
              <p className="text-[11px] text-ink-500 font-medium">
                Links purchase lots and sales line items to their perpetual inventory item.
              </p>
            </div>
            <button
              onClick={() => openAddMappingModal()}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Mapping</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Module Source</th>
                  <th className="py-3 px-3">Source Product / Species</th>
                  <th className="py-3 px-3">Grade / Size Condition</th>
                  <th className="py-3 px-3">Target Inventory Item</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
                {inventoryMappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-400 font-semibold">
                      No explicit mappings configured. Engine uses standard species foreign keys and name matches automatically.
                    </td>
                  </tr>
                ) : (
                  inventoryMappings.map((map) => {
                    const item = inventoryItems.find((i) => i.id === map.inventoryItemId);
                    const sp = species.find((s) => s.id === (map.speciesId || map.salesProductId));
                    const gr = grades.find((g) => g.id === map.gradeId);
                    const sz = sizes.find((s) => s.id === (map.sizeId || map.salesSizeId));

                    return (
                      <tr key={map.id} className="hover:bg-rose-50/30 transition">
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              map.module === 'purchase'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {map.module === 'purchase' ? 'Procurement' : 'Commercial Sales'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-ink-900">
                          {sp ? sp.name : map.speciesId || map.salesProductId || 'Any Species'}
                        </td>
                        <td className="py-3 px-3 text-ink-600 font-mono text-[11px]">
                          {gr ? gr.name : 'Any Grade'} &middot; {sz ? sz.name : 'Any Size'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-rose-700">{item ? item.code : map.inventoryItemId}</div>
                          <div className="text-[10px] text-ink-500">{item ? item.name : ''}</div>
                        </td>
                        <td className="py-3 px-3 text-ink-500 text-[11px]">
                          {map.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => deleteInventoryMapping(map.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* MODAL: ADD / EDIT INVENTORY ITEM */}
      {isItemModalOpen && (
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          title={editingItem ? 'Edit Inventory Master Item' : 'Create Inventory Master Item'}
        >
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Item Code *</label>
                <input
                  type="text"
                  required
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600 uppercase"
                  placeholder="e.g. INV-VAN-001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                >
                  <option value="Shrimp / Prawns">Shrimp / Prawns</option>
                  <option value="Cephalopods">Cephalopods</option>
                  <option value="Pelagic Finfish">Pelagic Finfish</option>
                  <option value="Crustaceans">Crustaceans</option>
                  <option value="Finished Goods">Finished Goods</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                placeholder="e.g. Frozen Vannamei Shrimp (Yield Stock)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Quantity Basis *</label>
                <select
                  value={quantityBasis}
                  onChange={(e) => setQuantityBasis(e.target.value as InventoryQuantityBasis)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                >
                  <option value="purchase_weight">Raw Purchase Weight (Kg)</option>
                  <option value="yield">Finished Processed Yield (Kg)</option>
                </select>
                <span className="text-[10px] text-ink-400 mt-0.5 block">
                  Select "Finished Processed Yield" for Vannamei Shrimp.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Min Stock Threshold (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={minStockQty}
                  onChange={(e) => setMinStockQty(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                  placeholder="500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Description / Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                placeholder="Optional notes or specifications"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Save Inventory Item
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE PRODUCT MAPPING */}
      {isMappingModalOpen && (
        <Modal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          title="Map Source Product to Inventory Item"
        >
          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Target Inventory Item *</label>
              <select
                value={mappingItemId}
                onChange={(e) => setMappingItemId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
              >
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Module Source *</label>
                <select
                  value={mappingModule}
                  onChange={(e) => setMappingModule(e.target.value as 'purchase' | 'sales')}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                >
                  <option value="purchase">Purchase (Stock In)</option>
                  <option value="sales">Sales (Stock Out)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Product / Species *</label>
                <select
                  value={mappingSpeciesId}
                  onChange={(e) => setMappingSpeciesId(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                  required
                >
                  <option value="">-- Select Product --</option>
                  {species.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mappingModule === 'purchase' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Optional Grade Restriction</label>
                  <select
                    value={mappingGradeId}
                    onChange={(e) => setMappingGradeId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="">All Grades</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Optional Size Restriction</label>
                  <select
                    value={mappingSizeId}
                    onChange={(e) => setMappingSizeId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="">All Sizes</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Mapping Remarks</label>
              <input
                type="text"
                value={mappingNotes}
                onChange={(e) => setMappingNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                placeholder="e.g. Export pack Vannamei lines"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Save Mapping
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: OPENING STOCK CONFIGURATION */}
      {isOpeningStockModalOpen && targetItemForOpening && (
        <Modal
          isOpen={isOpeningStockModalOpen}
          onClose={() => setIsOpeningStockModalOpen(false)}
          title={`Set Opening Stock: ${targetItemForOpening.code}`}
        >
          <form onSubmit={handleSaveOpeningStock} className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <div className="font-bold text-ink-900">{targetItemForOpening.name}</div>
              <div className="text-[10px] text-ink-500">
                Opening stock establishes initial quantity and total valuation on the effective date.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Effective Date *</label>
              <input
                type="date"
                required
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Opening Quantity (Kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={openingQtyKg}
                  onChange={(e) => handleOpeningQtyChange(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                  placeholder="e.g. 5000.000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Unit Rate (₹ / Kg)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={openingUnitRate}
                  onChange={(e) => handleOpeningRateChange(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                  placeholder="e.g. 420.0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Total Valuation (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={openingTotalValue}
                onChange={(e) => setOpeningTotalValue(e.target.value)}
                className="w-full text-xs font-bold text-emerald-800 px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                placeholder="e.g. 2100000.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Remarks</label>
              <input
                type="text"
                value={openingRemarks}
                onChange={(e) => setOpeningRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                placeholder="Initial setup balance as of financial year start"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              {openingStocks.some((o) => o.inventoryItemId === targetItemForOpening.id) && permissions.canPermanentlyDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    const os = openingStocks.find((o) => o.inventoryItemId === targetItemForOpening.id);
                    if (os) deleteOpeningStock(os.id);
                    setIsOpeningStockModalOpen(false);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear Opening Stock
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningStockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Save Opening Balance
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
