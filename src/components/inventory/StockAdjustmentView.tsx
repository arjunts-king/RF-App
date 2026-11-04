import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  RotateCcw,
  Plus,
  Trash2,
        Download,
    Info
} from 'lucide-react';
import { StockAdjustmentReason } from '../../types';
import { Modal } from '../common/Modal';

export const StockAdjustmentView: React.FC = () => {
  const {
    stockAdjustments,
    inventoryItems,
    inventoryCalculation,
    addStockAdjustment,
    deleteStockAdjustment
  } = useData();

  const { permissions } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityKg, setQuantityKg] = useState('');
  const [isDeduction, setIsDeduction] = useState(true); // default negative for shrinkage/wastage
  const [reason, setReason] = useState<StockAdjustmentReason>('wastage');
  const [remarks, setRemarks] = useState('');

  // Selected item position and current average cost
  const selectedItemPosition = inventoryCalculation.stockPositions.find(
    (p) => p.inventoryItemId === selectedItemId
  );
  const currentAvgCost = selectedItemPosition?.averageCostPerKg || 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatKg = (val: number) => {
    return `${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Kg`;
  };

  const handleOpenModal = () => {
    setSelectedItemId(inventoryItems[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setQuantityKg('');
    setIsDeduction(true);
    setReason('wastage');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    const qtyVal = parseFloat(quantityKg);
    if (isNaN(qtyVal) || qtyVal <= 0) return;

    const finalQty = isDeduction ? -Math.abs(qtyVal) : Math.abs(qtyVal);
    const totalVal = Number((finalQty * currentAvgCost).toFixed(2));

    addStockAdjustment({
      inventoryItemId: selectedItemId,
      date,
      quantityKg: finalQty,
      unitCost: currentAvgCost,
      ratePerKg: currentAvgCost,
      totalValue: totalVal,
      reason,
      remarks: remarks.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Adjustment No',
      'Date',
      'Inventory Item',
      'Reason',
      'Quantity (Kg)',
      'Unit Cost (INR/Kg)',
      'Adjustment Value (INR)',
      'Remarks',
      'Recorded By'
    ];

    const rows = stockAdjustments.map((a) => {
      const item = inventoryItems.find((i) => i.id === a.inventoryItemId);
      return [
        `"${a.adjustmentNo || a.id}"`,
        a.date,
        item ? `"${item.code} - ${item.name}"` : a.inventoryItemId,
        a.reason,
        a.quantityKg.toFixed(3),
        a.unitCost.toFixed(4),
        a.totalValue.toFixed(2),
        `"${(a.remarks || '').replace(/"/g, '""')}"`,
        `"${a.createdBy}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Adjustments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Stock Adjustments & Wastage Register
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Valued at Moving Average Cost
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Record shrinkage, spoilage, glazing variance, and write-offs. Valued strictly at the current moving weighted average cost at that moment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-ink-500" />
            <span>Export CSV</span>
          </button>
          {permissions.canManageInventoryAdjustments && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Stock Adjustment</span>
            </button>
          )}
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Adjustment No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Inventory Item</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3 text-right">Adjustment Qty (Kg)</th>
                <th className="py-3 px-3 text-right">Unit Rate (₹/Kg)</th>
                <th className="py-3 px-3 text-right">Total Impact (₹)</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {stockAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-400 font-semibold">
                    No manual stock adjustments recorded. Ordinary movements are driven automatically by Purchases and Sales.
                  </td>
                </tr>
              ) : (
                stockAdjustments.map((adj) => {
                  const item = inventoryItems.find((i) => i.id === adj.inventoryItemId);
                  const isNegative = adj.quantityKg < 0;

                  return (
                    <tr key={adj.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-ink-900">
                        {adj.adjustmentNo || adj.id}
                      </td>
                      <td className="py-3 px-3 text-ink-600 font-mono text-[11px] whitespace-nowrap">
                        {adj.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900">{item ? item.name : adj.inventoryItemId}</div>
                        <div className="text-[10px] text-ink-400 font-mono">{item ? item.code : ''}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          {adj.reason.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        isNegative ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {isNegative ? '' : '+'}{formatKg(adj.quantityKg)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-700">
                        ₹{(adj.unitCost || 0).toFixed(4)}
                      </td>
                      <td className={`py-3 px-3 text-right font-black ${
                        isNegative ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {formatCurrency(adj.totalValue)}
                      </td>
                      <td className="py-3 px-3 text-ink-500 text-[11px] max-w-[200px] truncate" title={adj.remarks}>
                        {adj.remarks || '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {permissions.canPermanentlyDelete && (
                          <button
                            onClick={() => deleteStockAdjustment(adj.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            title="Delete and reverse in ledger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD STOCK ADJUSTMENT */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Post Stock Adjustment / Wastage"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Inventory Item *</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
              >
                {inventoryItems.map((item) => {
                  const pos = inventoryCalculation.stockPositions.find((p) => p.inventoryItemId === item.id);
                  return (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name} (On Hand: {pos ? pos.quantityOnHand.toFixed(1) : 0} Kg)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Current Average Cost Display Card */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Current Weighted Average Cost:</span>
              </div>
              <span className="font-black font-mono text-blue-900 text-sm">
                ₹{currentAvgCost.toFixed(4)} / Kg
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Adjustment Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Adjustment Direction</label>
                <div className="flex gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsDeduction(true)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border ${
                      isDeduction ? 'bg-rose-600 text-white border-rose-600' : 'bg-gray-50 text-ink-600 border-gray-200'
                    }`}
                  >
                    Deduction (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeduction(false)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border ${
                      !isDeduction ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-ink-600 border-gray-200'
                    }`}
                  >
                    Addition (+)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Quantity (Kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0.001"
                  placeholder="e.g. 50.000"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                >
                  <option value="wastage">Wastage / Processing Loss</option>
                  <option value="shrinkage">Shrinkage / Drip Loss</option>
                  <option value="spoilage">Spoilage / Quality Deterioration</option>
                  <option value="count_difference">Count Difference / Physical Audit</option>
                  <option value="glazing_variance">Glazing Variance</option>
                  <option value="damage_writeoff">Damage Write-off</option>
                  <option value="other">Other Variance</option>
                </select>
              </div>
            </div>

            {/* Estimated Total Impact */}
            {parseFloat(quantityKg) > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                <span className="font-semibold text-ink-700">Financial Impact:</span>
                <span className={`font-black font-mono text-sm ${isDeduction ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {isDeduction ? '-' : '+'}{formatCurrency((parseFloat(quantityKg) || 0) * currentAvgCost)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Remarks & Details *</label>
              <textarea
                required
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                placeholder="Document the physical cause of variance or loss..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Post Adjustment to Ledger
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
