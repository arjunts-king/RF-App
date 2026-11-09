import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building, Globe, MapPin } from 'lucide-react';
import { Customer } from '../../types';

interface CustomerComboboxProps {
  value: string; // selected customerId
  customerList: Customer[];
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowNoneOption?: boolean;
  noneOptionLabel?: string;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
  value,
  customerList,
  onChange,
  placeholder = 'Select Customer / Consignee...',
  disabled = false,
  allowNoneOption = false,
  noneOptionLabel = 'N.A. (Same as Consignee)'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = useMemo(() => {
    return customerList.find((c) => c.id === value) || null;
  }, [customerList, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Strict real-time filter: ONLY results matching the typed query
  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customerList;

    return customerList.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCode = (c.code || '').toLowerCase().includes(q);
      const matchCountry = (c.country || '').toLowerCase().includes(q);
      const matchAddress = (c.address || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCountry || matchAddress;
    });
  }, [customerList, query]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev
      );
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        block: 'nearest'
      });
    }
  };

  const handleSelect = (c: Customer | null) => {
    onChange(c);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div className="relative min-w-[200px]" ref={containerRef}>
      {/* Trigger Button / Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-left transition-all ${
          isOpen
            ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs'
            : selectedCustomer
            ? 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/20'
            : 'border-dashed border-gray-300 bg-white hover:bg-rose-50/30 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={selectedCustomer ? `${selectedCustomer.code} - ${selectedCustomer.name}` : placeholder}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedCustomer ? (
            <>
              <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                {selectedCustomer.code}
              </span>
              <span className="text-xs font-bold text-ink-900 truncate">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.country && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-semibold shrink-0">
                  <Globe className="w-2.5 h-2.5 text-blue-500" />
                  {selectedCustomer.country}
                </span>
              )}
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400 italic truncate font-normal">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCustomer && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e as any);
              }}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear customer selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-rose-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-auto top-full mt-1.5 w-[360px] sm:w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 bg-gray-50/90 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-rose-600 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type name, code, country, or city..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 rounded-xl text-xs font-medium text-ink-900 outline-none transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-semibold text-ink-500">
              <span>
                {query.trim() ? `Results for "${query.trim()}"` : 'Customer & Consignee Master'}
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600">
                {filteredCustomers.length} {filteredCustomers.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
          </div>

          {/* Option for N.A. / None */}
          {allowNoneOption && !query && (
            <div className="p-1 border-b border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                  !value ? 'bg-rose-50 text-rose-700' : 'text-ink-600 hover:bg-gray-100'
                }`}
              >
                <span>{noneOptionLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-rose-600" />}
              </button>
            </div>
          )}

          {/* Filtered Customers List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-gray-50 font-medium"
          >
            {filteredCustomers.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Building className="w-8 h-8 mx-auto mb-2 text-rose-300" />
                <p className="text-xs font-bold text-ink-800">
                  No customers found matching "{query}"
                </p>
                <p className="text-[11px] text-ink-500 mt-1">
                  Try searching with customer code (e.g. CUST-001) or country name.
                </p>
              </div>
            ) : (
              filteredCustomers.map((c, idx) => {
                const isSelected = selectedCustomer?.id === c.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-rose-50/80'
                        : isHighlighted
                        ? 'bg-rose-50/40'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Line 1: Code & Name */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                          {c.code}
                        </span>
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-rose-950 font-black' : 'text-ink-900'
                          }`}
                        >
                          {c.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-auto" />
                        )}
                      </div>

                      {/* Line 2: Country & Address snippet */}
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
                        {c.country && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                            <Globe className="w-2.5 h-2.5 text-blue-600" />
                            <span>{c.country}</span>
                          </span>
                        )}
                        {c.address && (
                          <span className="truncate text-ink-400 text-[11px] flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right column: Customer type */}
                    <div className="shrink-0 pt-0.5">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {c.customerType || 'Overseas'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
            <span>Use ↑↓ and Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
