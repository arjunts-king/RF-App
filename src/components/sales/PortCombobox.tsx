import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Anchor } from 'lucide-react';
import { PortMaster } from '../../types';

export interface PortComboboxProps {
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
  const [isTyping, setIsTyping] = useState(false);
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
  const filteredPorts = useMemo(() => {
    const q = (isTyping ? query : '').trim().toLowerCase();
    if (!q) return portList;

    return portList.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCode = (p.code || '').toLowerCase().includes(q);
      const matchCountry = (p.country || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCountry;
    });
  }, [portList, query, isTyping]);

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

  const handleSelect = (p: PortMaster) => {
    onChange(p);
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
          const next = prev < filteredPorts.length - 1 ? prev + 1 : prev;
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
      if (isOpen && filteredPorts[highlightedIndex]) {
        handleSelect(filteredPorts[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        if (isTyping && filteredPorts[highlightedIndex]) {
          handleSelect(filteredPorts[highlightedIndex]);
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
    : selectedPort
    ? `${selectedPort.name} (${selectedPort.country})`
    : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Interactive Input with Cursor */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-gray-400">
          {selectedPort && !isTyping ? (
            <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
              {selectedPort.code}
            </span>
          ) : (
            <Anchor className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={selectedPort ? selectedPort.name : placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full ${
            selectedPort && !isTyping ? 'pl-20' : 'pl-8'
          } pr-14 py-1.5 rounded-xl border text-xs font-bold outline-none transition-all ${
            isOpen
              ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs text-ink-900'
              : selectedPort
              ? 'border-gray-200 bg-white hover:border-rose-300 text-ink-900'
              : 'border-dashed border-gray-300 bg-gray-50/60 hover:bg-white hover:border-gray-400 text-ink-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedPort && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear port selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            className="p-1 text-gray-400 hover:text-ink-700 rounded-md transition"
            title="Toggle port options"
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
          className="absolute left-0 top-full mt-1.5 w-[300px] sm:w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-ink-500">
            <span>
              {isTyping && query.trim() ? `Results for "${query.trim()}"` : 'Port Master'}
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600">
              {filteredPorts.length} {filteredPorts.length === 1 ? 'match' : 'matches'}
            </span>
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
                  Try searching by code (e.g. INCOK, THLCH) or country
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
                    tabIndex={-1}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 transition flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/80'
                        : isHighlighted
                        ? 'bg-rose-50/40'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-black text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
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
                        <span className="text-[10px] text-ink-400 font-normal shrink-0">
                          ({p.country})
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

          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
            <span>Use ↑↓, Enter or Tab</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
