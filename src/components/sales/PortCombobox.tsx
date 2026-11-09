import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Anchor, Globe } from 'lucide-react';
import { PortMaster } from '../../types';

interface PortComboboxProps {
  value: string; // selected portId
  portList: PortMaster[];
  onChange: (port: PortMaster | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PortCombobox: React.FC<PortComboboxProps> = ({
  value,
  portList,
  onChange,
  placeholder = 'Load from Port Master...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedPort = useMemo(() => {
    return portList.find((p) => p.id === value) || null;
  }, [portList, value]);

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
  const filteredPorts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return portList;

    return portList.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCode = (p.code || '').toLowerCase().includes(q);
      const matchCountry = (p.country || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCountry;
    });
  }, [portList, query]);

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
        prev < filteredPorts.length - 1 ? prev + 1 : prev
      );
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPorts[highlightedIndex]) {
        handleSelect(filteredPorts[highlightedIndex]);
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

  const handleSelect = (p: PortMaster) => {
    onChange(p);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button / Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-all ${
          isOpen
            ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs'
            : selectedPort
            ? 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/20'
            : 'border-dashed border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={selectedPort ? `${selectedPort.code} - ${selectedPort.name} (${selectedPort.country})` : placeholder}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {selectedPort ? (
            <>
              <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                {selectedPort.code}
              </span>
              <span className="text-xs font-bold text-ink-900 truncate">
                {selectedPort.name}
              </span>
              {selectedPort.country && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-semibold shrink-0">
                  <Globe className="w-2.5 h-2.5 text-blue-500" />
                  {selectedPort.country}
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
          {selectedPort && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e as any);
              }}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear port selection"
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
        <div className="absolute left-0 top-full mt-1.5 w-[300px] sm:w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                placeholder="Type port name, code (e.g. INCOK, CNTAO), country..."
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
                {query.trim() ? `Results for "${query.trim()}"` : 'Port Masters'}
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600">
                {filteredPorts.length} {filteredPorts.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
          </div>

          {/* Filtered Ports List */}
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto divide-y divide-gray-50 font-medium"
          >
            {filteredPorts.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <Anchor className="w-6 h-6 mx-auto mb-1.5 text-rose-300" />
                <p className="text-xs font-bold text-ink-800">
                  No ports found matching "{query}"
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">
                  Try searching by port name, port code (e.g. INCOK, CNTSN), or country.
                </p>
              </div>
            ) : (
              filteredPorts.map((p, idx) => {
                const isSelected = selectedPort?.id === p.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 transition flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-rose-50/80'
                        : isHighlighted
                        ? 'bg-rose-50/40'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[11px] font-black text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                        {p.code}
                      </span>
                      <span
                        className={`text-xs truncate ${
                          isSelected ? 'font-black text-rose-950' : 'font-semibold text-ink-800'
                        }`}
                      >
                        {p.name}
                      </span>
                      {p.country && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                          {p.country}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
            <span>Use ↑↓ and Enter</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
