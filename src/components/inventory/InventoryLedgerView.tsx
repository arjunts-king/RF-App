import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  BookOpen,
  Filter,
  Download,
  Printer,
    Search,
              RefreshCw
} from 'lucide-react';
import { InventoryMovement } from '../../types';

export const InventoryLedgerView: React.FC = () => {
  const { inventoryCalculation, inventoryItems, rebuildInventoryLedger } = useData();
  const { allMovements, movementsByItem } = inventoryCalculation;

  // Filter States
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Formatter helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatKg = (val: number) => {
    return (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const formatRate = (val: number) => {
    return (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    let list: InventoryMovement[] = [];

    if (selectedItemId === 'ALL') {
      list = [...allMovements];
    } else {
      list = movementsByItem[selectedItemId] ? [...movementsByItem[selectedItemId]] : [];
    }

    if (movementTypeFilter !== 'ALL') {
      list = list.filter((m) => m.movementType === movementTypeFilter);
    }

    if (startDate) {
      list = list.filter((m) => m.date >= startDate);
    }

    if (endDate) {
      list = list.filter((m) => m.date <= endDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.referenceId.toLowerCase().includes(q) ||
          m.referenceDescription.toLowerCase().includes(q) ||
          m.movementType.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allMovements, movementsByItem, selectedItemId, movementTypeFilter, startDate, endDate, searchQuery]);

  // Aggregate totals
  const totalQtyIn = filteredMovements.reduce((sum, m) => sum + m.quantityIn, 0);
  const totalQtyOut = filteredMovements.reduce((sum, m) => sum + m.quantityOut, 0);
  const totalMovementValueIn = filteredMovements
    .filter((m) => m.quantityIn > 0)
    .reduce((sum, m) => sum + m.movementValue, 0);
  const totalMovementValueOut = filteredMovements
    .filter((m) => m.quantityOut > 0)
    .reduce((sum, m) => sum + m.movementValue, 0);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Inventory Item',
      'Movement Type',
      'Reference No',
      'Description',
      'Qty In (Kg)',
      'Qty Out (Kg)',
      'Movement Rate (INR/Kg)',
      'Movement Value (INR)',
      'Balance Qty (Kg)',
      'Average Cost (INR/Kg)',
      'Balance Value (INR)'
    ];

    const rows = filteredMovements.map((m) => {
      const item = inventoryItems.find((i) => i.id === m.inventoryItemId);
      return [
        m.date,
        item ? `"${item.code} - ${item.name}"` : m.inventoryItemId,
        m.movementType,
        `"${m.referenceId}"`,
        `"${m.referenceDescription.replace(/"/g, '""')}"`,
        m.quantityIn.toFixed(3),
        m.quantityOut.toFixed(3),
        m.rate.toFixed(4),
        m.movementValue.toFixed(2),
        m.balanceQuantity.toFixed(3),
        m.averageCost.toFixed(4),
        m.balanceValue.toFixed(2)
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Valuation_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable view trigger
  const handlePrint = () => {
    window.print();
  };

  const selectedItemObj = inventoryItems.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Perpetual Inventory Valuation Ledger (Stock Card)
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Moving Weighted Average Method
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Running stock card ledger with unit costs and valuations computed after every movement in date & timestamp order.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => rebuildInventoryLedger()}
            className="px-3 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
            title="Recalculate entire ledger chronologically from source transactions"
          >
            <RefreshCw className="w-4 h-4 text-ink-500" />
            <span>Recalculate Engine</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-ink-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-ink-700 uppercase tracking-wider pb-2 border-b border-gray-100">
          <Filter className="w-3.5 h-3.5 text-rose-600" />
          <span>Ledger Filter Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Item Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Inventory Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            >
              <option value="ALL">Consolidated (All Items)</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Movement Type</label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            >
              <option value="ALL">All Movements</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="purchase_receipt">Purchase Receipts (Stock In)</option>
              <option value="sales_issue">Sales Issues (Stock Out)</option>
              <option value="purchase_return">Purchase Returns (Out)</option>
              <option value="sales_return">Sales Returns (In)</option>
              <option value="stock_adjustment">Stock Adjustments</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>

          {/* Search Voucher / Description */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Search Reference</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="PUR / INV / ADJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold text-ink-800 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Selected Item Metadata Banner (When viewing specific item) */}
        {selectedItemObj && (
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-900">{selectedItemObj.code}:</span>
              <span className="font-medium text-ink-800">{selectedItemObj.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-bold text-rose-700 border border-rose-200">
                Basis: {selectedItemObj.quantityBasis === 'yield' ? 'Finished Yield' : 'Purchase Weight'}
              </span>
            </div>
            <div className="text-[11px] text-ink-600">
              Min Stock: <span className="font-bold text-ink-900">{selectedItemObj.minimumStockQuantity} Kg</span>
            </div>
          </div>
        )}
      </div>

      {/* Movement Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Reference / Voucher</th>
                <th className="py-3 px-3">Movement Type</th>
                {selectedItemId === 'ALL' && <th className="py-3 px-3">Item</th>}
                <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/30">Qty In (Kg)</th>
                <th className="py-3 px-3 text-right text-rose-800 bg-rose-50/30">Qty Out (Kg)</th>
                <th className="py-3 px-3 text-right">Rate (₹/Kg)</th>
                <th className="py-3 px-3 text-right">Movement Value (₹)</th>
                <th className="py-3 px-3 text-right font-bold text-ink-900 bg-gray-100/40">Balance Qty (Kg)</th>
                <th className="py-3 px-3 text-right font-bold text-ink-900 bg-gray-100/40">Avg Cost (₹/Kg)</th>
                <th className="py-3 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40">Balance Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={selectedItemId === 'ALL' ? 11 : 10} className="py-8 text-center text-ink-400 font-semibold">
                    No ledger transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const item = inventoryItems.find((i) => i.id === m.inventoryItemId);
                  
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-rose-50/30 transition ${
                        m.isNegativeStock ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-600 whitespace-nowrap">
                        {m.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold font-mono text-ink-900">{m.referenceId}</div>
                        <div className="text-[10px] text-ink-500 truncate max-w-[200px]" title={m.referenceDescription}>
                          {m.referenceDescription}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            m.movementType === 'opening_stock'
                              ? 'bg-blue-50 text-blue-700'
                              : m.movementType === 'purchase_receipt'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.movementType === 'sales_issue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : m.movementType === 'purchase_return'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {m.movementType.replace('_', ' ')}
                        </span>
                      </td>

                      {selectedItemId === 'ALL' && (
                        <td className="py-2.5 px-3 font-semibold text-ink-800 whitespace-nowrap">
                          {item ? item.code : m.inventoryItemId}
                        </td>
                      )}

                      {/* Qty In */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/10 whitespace-nowrap">
                        {m.quantityIn > 0 ? formatKg(m.quantityIn) : '—'}
                      </td>

                      {/* Qty Out */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 bg-rose-50/10 whitespace-nowrap">
                        {m.quantityOut > 0 ? formatKg(m.quantityOut) : '—'}
                      </td>

                      {/* Movement Unit Rate */}
                      <td className="py-2.5 px-3 text-right font-mono text-ink-700 whitespace-nowrap">
                        ₹{formatRate(m.rate)}
                      </td>

                      {/* Movement Value */}
                      <td className="py-2.5 px-3 text-right font-bold text-ink-900 whitespace-nowrap">
                        {formatCurrency(m.movementValue)}
                      </td>

                      {/* Running Balance Quantity */}
                      <td className={`py-2.5 px-3 text-right font-mono font-bold bg-gray-100/30 whitespace-nowrap ${
                        m.balanceQuantity < 0 ? 'text-rose-700' : 'text-ink-900'
                      }`}>
                        {formatKg(m.balanceQuantity)}
                        {m.balanceQuantity < 0 && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 bg-rose-200 text-rose-900 rounded font-bold">
                            NEG
                          </span>
                        )}
                      </td>

                      {/* Running Weighted Average Cost */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 bg-gray-100/30 whitespace-nowrap">
                        ₹{formatRate(m.averageCost)}
                      </td>

                      {/* Running Balance Valuation */}
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800 bg-emerald-50/30 whitespace-nowrap">
                        {formatCurrency(m.balanceValue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Summary Totals Row */}
            {filteredMovements.length > 0 && (
              <tfoot className="bg-gray-100/80 font-black text-ink-900 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={selectedItemId === 'ALL' ? 4 : 3} className="py-3 px-3 uppercase text-[10px] tracking-wider">
                    Total Movement Filter Summary ({filteredMovements.length} Records)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-mono">
                    {formatKg(totalQtyIn)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 font-mono">
                    {formatKg(totalQtyOut)}
                  </td>
                  <td className="py-3 px-3 text-right">—</td>
                  <td className="py-3 px-3 text-right">
                    {formatCurrency(totalMovementValueIn + totalMovementValueOut)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-right text-xs font-bold text-ink-600">
                    Perpetual Weighted Moving Average
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
