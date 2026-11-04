import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { PhysicalStockCountItem } from '../../types';
import { Modal } from '../common/Modal';

export const PhysicalStockCountView: React.FC = () => {
  const {
    physicalStockCounts,
    inventoryItems,
    inventoryCalculation,
    savePhysicalStockCount,
    postPhysicalStockCount,
    deletePhysicalStockCount
  } = useData();

  const { permissions } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [countRemarks, setCountRemarks] = useState('');
  const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});

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
    setCountDate(new Date().toISOString().split('T')[0]);
    setCountRemarks('Monthly warehouse physical audit');

    // Pre-populate with current book quantities
    const initialMap: Record<string, string> = {};
    inventoryItems.forEach((item) => {
      const pos = inventoryCalculation.stockPositions.find((p) => p.inventoryItemId === item.id);
      initialMap[item.id] = String(pos ? pos.quantityOnHand : 0);
    });
    setCountedQuantities(initialMap);
    setIsModalOpen(true);
  };

  const handleQtyChange = (itemId: string, val: string) => {
    setCountedQuantities((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleSaveCount = (e: React.FormEvent, shouldPostDirectly: boolean) => {
    e.preventDefault();

    const items: PhysicalStockCountItem[] = [];
    let totalVarQty = 0;
    let totalVarVal = 0;

    inventoryItems.forEach((item) => {
      const pos = inventoryCalculation.stockPositions.find((p) => p.inventoryItemId === item.id);
      const bookQty = pos ? pos.quantityOnHand : 0;
      const unitCost = pos ? pos.averageCostPerKg : 0;
      const countedQty = parseFloat(countedQuantities[item.id]) || 0;
      const varianceQty = Number((countedQty - bookQty).toFixed(3));
      const varianceVal = Number((varianceQty * unitCost).toFixed(2));

      totalVarQty += varianceQty;
      totalVarVal += varianceVal;

      items.push({
        inventoryItemId: item.id,
        bookQuantityKg: bookQty,
        countedQuantityKg: countedQty,
        varianceQuantityKg: varianceQty,
        varianceKg: varianceQty,
        unitCost,
        varianceValue: varianceVal
      });
    });

    const res = savePhysicalStockCount({
      countDate,
      items,
      totalVarianceQtyKg: totalVarQty,
      totalVarianceValue: totalVarVal,
      remarks: countRemarks,
      referenceNo: `CNT-${countDate}`
    });

    if (shouldPostDirectly && res.countId && permissions.canManageInventoryAdjustments) {
      postPhysicalStockCount(res.countId);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Physical Stock Count & Variance Reconciliation
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Warehouse Audit Engine
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Compare warehouse counts against book stock. Variances generate adjusting debit/credit entries valued at current moving weighted average cost.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {permissions.canRecordStockCounts && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Physical Count</span>
            </button>
          )}
        </div>
      </div>

      {/* Counts Register Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Count Ref No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-center">Items Audited</th>
                <th className="py-3 px-3 text-right">Net Variance Qty (Kg)</th>
                <th className="py-3 px-3 text-right">Net Variance Value (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {physicalStockCounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-400 font-semibold">
                    No physical stock counts recorded yet. Click "Record New Physical Count" to audit warehouse balances.
                  </td>
                </tr>
              ) : (
                physicalStockCounts.map((cnt) => {
                  const isPosted = cnt.status === 'posted';
                  const refNo = cnt.referenceNo || cnt.countNo || cnt.id;

                  return (
                    <tr key={cnt.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-ink-900">
                        {refNo}
                      </td>
                      <td className="py-3 px-3 text-ink-600 font-mono text-[11px] whitespace-nowrap">
                        {cnt.countDate}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {cnt.items.length} items
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        cnt.totalVarianceQtyKg < 0 ? 'text-rose-700' : cnt.totalVarianceQtyKg > 0 ? 'text-emerald-700' : 'text-ink-600'
                      }`}>
                        {cnt.totalVarianceQtyKg > 0 ? '+' : ''}{formatKg(cnt.totalVarianceQtyKg)}
                      </td>
                      <td className={`py-3 px-3 text-right font-black ${
                        cnt.totalVarianceValue < 0 ? 'text-rose-700' : cnt.totalVarianceValue > 0 ? 'text-emerald-700' : 'text-ink-600'
                      }`}>
                        {cnt.totalVarianceValue > 0 ? '+' : ''}{formatCurrency(cnt.totalVarianceValue)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isPosted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPosted ? 'Posted to Ledger' : 'Draft Sheet'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-ink-500 text-[11px]">
                        {cnt.createdBy}
                        {cnt.postedBy && (
                          <span className="text-[10px] text-emerald-700 block">
                            Posted by: {cnt.postedBy}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        {!isPosted && permissions.canManageInventoryAdjustments && (
                          <button
                            onClick={() => postPhysicalStockCount(cnt.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            title="Generate and post variance adjustments"
                          >
                            Post Variances
                          </button>
                        )}
                        {permissions.canPermanentlyDelete && (
                          <button
                            onClick={() => deletePhysicalStockCount(cnt.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            title="Delete count record"
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

      {/* MODAL: PHYSICAL COUNT SHEET ENTRY */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Warehouse Physical Stock Count Sheet"
        >
          <form onSubmit={(e) => handleSaveCount(e, false)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Audit Count Date *</label>
                <input
                  type="date"
                  required
                  value={countDate}
                  onChange={(e) => setCountDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Audit Remarks</label>
                <input
                  type="text"
                  value={countRemarks}
                  onChange={(e) => setCountRemarks(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                  placeholder="e.g. Month-end physical verification"
                />
              </div>
            </div>

            {/* Items Count Entry Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 text-[10px] font-bold text-ink-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Inventory Item</th>
                    <th className="py-2.5 px-3 text-right">Book Stock (Kg)</th>
                    <th className="py-2.5 px-3 text-right w-36">Physical Count (Kg)</th>
                    <th className="py-2.5 px-3 text-right">Variance (Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {inventoryItems.map((item) => {
                    const pos = inventoryCalculation.stockPositions.find((p) => p.inventoryItemId === item.id);
                    const bookQty = pos ? pos.quantityOnHand : 0;
                    const countedVal = parseFloat(countedQuantities[item.id]) || 0;
                    const diff = Number((countedVal - bookQty).toFixed(3));

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3">
                          <div className="font-bold text-ink-900">{item.name}</div>
                          <div className="text-[10px] text-ink-400 font-mono">{item.code}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-ink-700">
                          {formatKg(bookQty)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            required
                            value={countedQuantities[item.id] ?? ''}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="w-28 text-right font-mono font-bold text-ink-900 px-2 py-1 border border-gray-300 rounded-lg outline-none focus:border-rose-600"
                          />
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${
                          diff < 0 ? 'text-rose-700' : diff > 0 ? 'text-emerald-700' : 'text-gray-400'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(3)} Kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-ink-800 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Save as Draft
                </button>
                {permissions.canManageInventoryAdjustments && (
                  <button
                    type="button"
                    onClick={(e) => handleSaveCount(e, true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                  >
                    Save & Post Adjustments
                  </button>
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
