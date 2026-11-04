import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Boxes,
    Search,
    Download,
  Printer,
  AlertTriangle,
  CheckCircle2,
    } from 'lucide-react';

export const InventoryPositionView: React.FC = () => {
  const { inventoryCalculation } = useData();
  const { stockPositions } = inventoryCalculation;

  const [asOnDate, setAsOnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    stockPositions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [stockPositions]);

  // Filtered stock positions
  const filteredPositions = useMemo(() => {
    let list = [...stockPositions];

    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.stockStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.itemCode.toLowerCase().includes(q) ||
          p.itemName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [stockPositions, selectedCategory, statusFilter, searchQuery]);

  // Totals for filtered view
  const filteredQty = filteredPositions.reduce((sum, p) => sum + p.quantityOnHand, 0);
  const filteredValue = filteredPositions.reduce((sum, p) => sum + p.totalStockValue, 0);
  const lowStockCount = filteredPositions.filter((p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock').length;
  const negativeCount = filteredPositions.filter((p) => p.stockStatus === 'Negative Stock').length;

  const handleExportCSV = () => {
    const headers = [
      'Item Code',
      'Item Name',
      'Category',
      'Unit Basis',
      'Closing Quantity (Kg)',
      'Weighted Average Cost (INR/Kg)',
      'Total Stock Value (INR)',
      'Minimum Stock Qty (Kg)',
      'Status',
      'Days of Cover'
    ];

    const rows = filteredPositions.map((p) => [
      `"${p.itemCode}"`,
      `"${p.itemName}"`,
      `"${p.category}"`,
      p.quantityBasis,
      p.quantityOnHand.toFixed(3),
      p.averageCostPerKg.toFixed(4),
      p.totalStockValue.toFixed(2),
      p.minimumStockQuantity.toFixed(3),
      p.stockStatus,
      p.daysOfCover >= 999 ? 'No Sales' : p.daysOfCover.toFixed(1)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Position_As_On_${asOnDate}.csv`);
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
              <Boxes className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Stock Position as on Date
            </h1>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Moving Average Valuation
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Real-time balances on hand, unit weighted average rates, low-stock thresholds and days-of-cover analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Position CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-ink-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-ink-500" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Total Quantity on Hand</div>
          <div className="text-2xl font-black text-ink-900">{formatKg(filteredQty)}</div>
          <div className="text-[10px] text-ink-400 font-semibold">{filteredPositions.length} items listed</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Total Valuation (₹)</div>
          <div className="text-2xl font-black text-emerald-700">{formatCurrency(filteredValue)}</div>
          <div className="text-[10px] text-ink-400 font-semibold">Weighted moving cost basis</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Average Cost / Kg</div>
          <div className="text-2xl font-black text-blue-700">
            ₹{filteredQty > 0 ? (filteredValue / filteredQty).toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] text-ink-400 font-semibold">Across filtered inventory pool</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Stock Alerts</div>
          <div className="text-2xl font-black text-amber-700 flex items-center gap-1.5">
            {lowStockCount > 0 ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> {lowStockCount} Low
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1 text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> All Normal
              </span>
            )}
          </div>
          <div className="text-[10px] text-ink-400 font-semibold">
            {negativeCount > 0 ? `${negativeCount} negative stock balances!` : 'No negative balances'}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* As on Date */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Position As On Date</label>
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Stock Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold text-ink-800 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Normal">Normal</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Negative Stock">Negative Stock</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-600 mb-1">Search Item</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold text-ink-800 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-rose-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stock Position Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Item Code & Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Quantity Basis</th>
                <th className="py-3 px-3 text-right">Quantity on Hand</th>
                <th className="py-3 px-3 text-right">Weighted Avg Cost</th>
                <th className="py-3 px-3 text-right">Total Valuation</th>
                <th className="py-3 px-3 text-right">Min Threshold</th>
                <th className="py-3 px-3 text-right">Days of Cover</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-400 font-semibold">
                    No inventory items match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  return (
                    <tr key={pos.inventoryItemId} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900">{pos.itemName}</div>
                        <div className="text-[10px] text-ink-400 font-mono">{pos.itemCode}</div>
                      </td>
                      <td className="py-3 px-3 text-ink-600 font-semibold">{pos.category}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            pos.quantityBasis === 'yield'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pos.quantityBasis === 'yield' ? 'Yield Output' : 'Purchase Weight'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">
                        {formatKg(pos.quantityOnHand)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 font-bold">
                        ₹{pos.averageCostPerKg.toFixed(4)} / Kg
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800">
                        {formatCurrency(pos.totalStockValue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-600">
                        {formatKg(pos.minimumStockQuantity)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {pos.daysOfCover >= 999 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={`font-bold ${pos.daysOfCover < 7 ? 'text-rose-700' : 'text-ink-800'}`}>
                            {pos.daysOfCover.toFixed(0)} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            pos.stockStatus === 'Normal'
                              ? 'bg-emerald-50 text-emerald-700'
                              : pos.stockStatus === 'Low Stock'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : pos.stockStatus === 'Negative Stock'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {pos.stockStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredPositions.length > 0 && (
              <tfoot className="bg-gray-100/80 font-black text-ink-900 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="py-3 px-3 uppercase text-[10px] tracking-wider">
                    Total Filtered Stock Position
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink-900">
                    {formatKg(filteredQty)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-700">
                    ₹{filteredQty > 0 ? (filteredValue / filteredQty).toFixed(4) : '0.00'} / Kg
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-800">
                    {formatCurrency(filteredValue)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-right text-xs text-ink-500 font-semibold">
                    Reconciled moving average balances
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
