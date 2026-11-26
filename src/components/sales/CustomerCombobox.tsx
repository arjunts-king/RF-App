import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building, Globe } from 'lucide-react';
import { Customer } from '../../types';

export interface CustomerComboboxProps {
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
  const [isTyping, setIsTyping] = useState(false);
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
        setIsTyping(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Strict real-time filter: ONLY results matching the typed query
  const filteredCustomers = useMemo(() => {
    const q = (isTyping ? query : '').trim().toLowerCase();
    if (!q) return customerList;

    return customerList.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCode = (c.code || '').toLowerCase().includes(q);
      const matchCountry = (c.country || '').toLowerCase().includes(q);
      const matchAddress = (c.address || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCountry || matchAddress;
    });
  }, [customerList, query, isTyping]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [query, isTyping]);

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
    setQuery('');
    setIsTyping(false);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setIsTyping(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsTyping(true);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => {
          const next = prev < filteredCustomers.length - 1 ? prev + 1 : prev;
          scrollHighlightedIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          scrollHighlightedIntoView(next);
          return next;
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        if (isTyping && filteredCustomers[highlightedIndex]) {
          handleSelect(filteredCustomers[highlightedIndex]);
        } else {
          setIsOpen(false);
          setIsTyping(false);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setIsTyping(false);
    } else {
      inputRef.current?.focus();
      setIsOpen(true);
    }
  };

  const inputValue = isTyping
    ? query
    : selectedCustomer
    ? selectedCustomer.name
    : '';

  return (
    <div className="relative min-w-[200px]" ref={containerRef}>
      {/* Interactive Input with cursor */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-gray-400">
          {selectedCustomer && !isTyping ? (
            <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
              {selectedCustomer.code}
            </span>
          ) : (
            <Search className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={selectedCustomer ? selectedCustomer.name : placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full ${
            selectedCustomer && !isTyping ? 'pl-20' : 'pl-8'
          } pr-14 py-1.5 rounded-xl border text-xs font-bold outline-none transition-all ${
            isOpen
              ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs text-ink-900'
              : selectedCustomer
              ? 'border-gray-200 bg-white hover:border-rose-300 text-ink-900'
              : 'border-dashed border-gray-300 bg-white hover:bg-rose-50/30 hover:border-gray-400 text-ink-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedCustomer && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            className="p-1 text-gray-400 hover:text-ink-700 rounded-md transition"
            title="Toggle customer options"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-rose-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Searchable Dropdown Menu */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 sm:left-auto top-full mt-1.5 w-[360px] sm:w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-ink-500">
            <span>
              {isTyping && query.trim()
                ? `Results for "${query.trim()}"`
                : 'Customer & Consignee Master'}
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {/* Option for N.A. / None */}
          {allowNoneOption && !query && (
            <div className="p-1 border-b border-gray-100 bg-gray-50/50">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
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
            className="max-h-64 overflow-y-auto divide-y divide-gray-50 font-medium"
          >
            {filteredCustomers.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Building className="w-8 h-8 mx-auto mb-2 text-rose-300" />
                <p className="text-xs font-bold text-ink-800">
                  No customers found matching "{query}"
                </p>
                <p className="text-[11px] text-ink-500 mt-1">
                  Try searching by code, country, or city
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
                    tabIndex={-1}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 transition flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/80'
                        : isHighlighted
                        ? 'bg-rose-50/40'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
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

                      {c.address && (
                        <div className="text-[11px] text-ink-500 line-clamp-1 font-normal">
                          {c.address}
                        </div>
                      )}
                    </div>

                    {c.country && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shrink-0 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        {c.country}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
            <span>Use ↑↓, Enter or Tab</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
