import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePerformance } from '../../context/PerformanceContext';
import { Filter, X, BookmarkPlus, Bookmark, Trash2, RotateCcw } from 'lucide-react';

interface PerformanceFilterBarProps {
  showExpenseStatus?: boolean;
  showDrawbackRodtepStatus?: boolean;
  showProfitLoss?: boolean;
}

export const PerformanceFilterBar: React.FC<PerformanceFilterBarProps> = ({
  showExpenseStatus = true,
  showDrawbackRodtepStatus = false,
  showProfitLoss = false,
}) => {
  const { speciesHeads, customers, ports, salesInvoices } = useData();
  const { filters, setFilters, resetFilters, savedViews, saveView, deleteView } = usePerformance();
  const [newViewName, setNewViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const financialYears = useMemo(() => {
    const fys = new Set<string>();
    salesInvoices.forEach((i) => {
      if (i.financialYear) fys.add(i.financialYear);
    });
    return Array.from(fys).sort();
  }, [salesInvoices]);

  const invoiceNumbers = useMemo(() => {
    return Array.from(new Set(salesInvoices.filter((i) => !i.isVoided).map((i) => i.invoiceNo))).sort();
  }, [salesInvoices]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.dateFrom) {
      chips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}`, onRemove: () => setFilters((f) => ({ ...f, dateFrom: '' })) });
    }
    if (filters.dateTo) {
      chips.push({ key: 'dateTo', label: `To: ${filters.dateTo}`, onRemove: () => setFilters((f) => ({ ...f, dateTo: '' })) });
    }
    if (filters.financialYear) {
      chips.push({ key: 'fy', label: `FY: ${filters.financialYear}`, onRemove: () => setFilters((f) => ({ ...f, financialYear: '' })) });
    }
    if (filters.month) {
      chips.push({ key: 'month', label: `Month: ${filters.month}`, onRemove: () => setFilters((f) => ({ ...f, month: '' })) });
    }
    filters.speciesHeadIds.forEach((id) => {
      const head = speciesHeads.find((h) => h.id === id);
      chips.push({
        key: `head_${id}`,
        label: `Head: ${head?.name || id}`,
        onRemove: () => setFilters((f) => ({ ...f, speciesHeadIds: f.speciesHeadIds.filter((x) => x !== id) })),
      });
    });
    filters.customerIds.forEach((id) => {
      const cust = customers.find((c) => c.id === id);
      chips.push({
        key: `cust_${id}`,
        label: `Buyer: ${cust?.name || id}`,
        onRemove: () => setFilters((f) => ({ ...f, customerIds: f.customerIds.filter((x) => x !== id) })),
      });
    });
    filters.invoiceNumbers.forEach((inv) => {
      chips.push({
        key: `inv_${inv}`,
        label: `Inv: ${inv}`,
        onRemove: () => setFilters((f) => ({ ...f, invoiceNumbers: f.invoiceNumbers.filter((x) => x !== inv) })),
      });
    });
    (filters.portIds || []).forEach((id) => {
      const p = ports.find((pt) => pt.id === id);
      chips.push({
        key: `port_${id}`,
        label: `Port: ${p?.name || id}`,
        onRemove: () => setFilters((f) => ({ ...f, portIds: (f.portIds || []).filter((x) => x !== id) })),
      });
    });
    if (filters.expensesStatus !== 'all') {
      chips.push({ key: 'expStatus', label: `Expenses: ${filters.expensesStatus}`, onRemove: () => setFilters((f) => ({ ...f, expensesStatus: 'all' })) });
    }
    if (filters.drawbackStatus !== 'all') {
      chips.push({ key: 'dbStatus', label: `Drawback: ${filters.drawbackStatus}`, onRemove: () => setFilters((f) => ({ ...f, drawbackStatus: 'all' })) });
    }
    if (filters.rodtepStatus !== 'all') {
      chips.push({ key: 'rtStatus', label: `RoTDEP: ${filters.rodtepStatus}`, onRemove: () => setFilters((f) => ({ ...f, rodtepStatus: 'all' })) });
    }
    if (filters.profitLoss !== 'all') {
      chips.push({ key: 'pl', label: `P&L: ${filters.profitLoss}`, onRemove: () => setFilters((f) => ({ ...f, profitLoss: 'all' })) });
    }
    return chips;
  }, [filters, speciesHeads, customers, ports, setFilters]);

  return (
    <div className="glass-surface-regular rounded-2xl border border-white/80 p-4 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-ink-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-rose-600" />
          <span>Shared Performance Filters</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedViews.map((v) => (
            <div key={v.id} className="flex items-center bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5 text-xs">
              <button
                onClick={() => setFilters(v.filters)}
                className="flex items-center gap-1 font-semibold text-rose-800 hover:underline"
              >
                <Bookmark className="w-3 h-3" />
                {v.name}
              </button>
              <button
                onClick={() => deleteView(v.id)}
                className="ml-1.5 text-rose-400 hover:text-rose-700"
                title="Delete saved view"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {showSaveInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="View name..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
              />
              <button
                onClick={() => {
                  if (newViewName.trim()) {
                    saveView(newViewName);
                    setNewViewName('');
                    setShowSaveInput(false);
                  }
                }}
                className="px-2 py-1 text-xs bg-rose-600 text-white rounded-lg font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveInput(false)}
                className="px-1.5 py-1 text-xs text-ink-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-ink-600 hover:text-rose-700 bg-white border border-gray-200 rounded-lg"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save View
            </button>
          )}

          {activeChips.length > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Financial Year</label>
          <select
            value={filters.financialYear}
            onChange={(e) => setFilters((f) => ({ ...f, financialYear: e.target.value }))}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          >
            <option value="">All FYs</option>
            {financialYears.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Month</label>
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Species Head</label>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !filters.speciesHeadIds.includes(val)) {
                setFilters((f) => ({ ...f, speciesHeadIds: [...f.speciesHeadIds, val] }));
              }
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          >
            <option value="">+ Add Species Head...</option>
            {speciesHeads.map((sh) => (
              <option key={sh.id} value={sh.id}>{sh.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Customer / Consignee</label>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !filters.customerIds.includes(val)) {
                setFilters((f) => ({ ...f, customerIds: [...f.customerIds, val] }));
              }
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          >
            <option value="">+ Add Customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Invoice No.</label>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !filters.invoiceNumbers.includes(val)) {
                setFilters((f) => ({ ...f, invoiceNumbers: [...f.invoiceNumbers, val] }));
              }
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          >
            <option value="">+ Add Invoice...</option>
            {invoiceNumbers.map((inv) => (
              <option key={inv} value={inv}>{inv}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Destination / Port</label>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !(filters.portIds || []).includes(val)) {
                setFilters((f) => ({ ...f, portIds: [...(f.portIds || []), val] }));
              }
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          >
            <option value="">+ Add Port...</option>
            {ports.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {showExpenseStatus && (
          <div>
            <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Expenses Status</label>
            <select
              value={filters.expensesStatus}
              onChange={(e) => setFilters((f) => ({ ...f, expensesStatus: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All</option>
              <option value="pending">Expenses Pending</option>
              <option value="complete">Expenses Complete</option>
            </select>
          </div>
        )}

        {showDrawbackRodtepStatus && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Drawback Status</label>
              <select
                value={filters.drawbackStatus}
                onChange={(e) => setFilters((f) => ({ ...f, drawbackStatus: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">RoTDEP Status</label>
              <select
                value={filters.rodtepStatus}
                onChange={(e) => setFilters((f) => ({ ...f, rodtepStatus: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
              </select>
            </div>
          </>
        )}

        {showProfitLoss && (
          <div>
            <label className="block text-[10px] font-bold text-ink-500 uppercase mb-1">Profit / Loss</label>
            <select
              value={filters.profitLoss}
              onChange={(e) => setFilters((f) => ({ ...f, profitLoss: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All</option>
              <option value="profit">Profitable Only</option>
              <option value="loss">Loss-making Only</option>
            </select>
          </div>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-rose-950">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
