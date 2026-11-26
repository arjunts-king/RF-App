import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Layers } from 'lucide-react';
import { Size } from '../../types';

export interface SizeComboboxProps {
  value: string; // selected sizeId or size name
  sizeList: Size[];
  onChange: (size: Size | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SizeCombobox: React.FC<SizeComboboxProps> = ({
  value,
  sizeList,
  onChange,
  placeholder = 'Select Grade / Size...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSize = useMemo(() => {
    return sizeList.find((sz) => sz.id === value || sz.name.toLowerCase() === value.toLowerCase()) || null;
  }, [sizeList, value]);

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, viewportWidth >= 640 ? 320 : 280), viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;

    setMenuPosition({
      top: openUpward ? Math.max(8, rect.top - 6) : rect.bottom + 6,
      left,
      width,
      openUpward
    });
  }, []);

  // Click outside to close (handles both trigger container and portaled menu)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, updateMenuPosition]);

  // Intelligent multi-token & normalized real-time filter across sizes
  const filteredSizes = useMemo(() => {
    const q = (isTyping ? query : '').trim().toLowerCase();
    if (!q) return sizeList;

    const tokens = q.split(/\s+/).filter(Boolean);
    const normQ = q.replace(/[^a-z0-9]/g, '');

    return sizeList.filter((sz) => {
      const searchCorpus = [sz.name, sz.code, sz.description].filter(Boolean).join(' ').toLowerCase();
      const normCorpus = searchCorpus.replace(/[^a-z0-9]/g, '');

      const allTokensMatch = tokens.every((token) => searchCorpus.includes(token));
      const normMatch = normQ.length >= 2 && normCorpus.includes(normQ);

      return allTokensMatch || normMatch;
    });
  }, [sizeList, query, isTyping]);

  // Reset highlight index & scroll position when filter changes
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

  const handleSelect = (sz: Size) => {
    onChange(sz);
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
    updateMenuPosition();
    setIsOpen(true);
  };

  const handleClick = () => {
    updateMenuPosition();
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsTyping(true);
    setIsOpen(true);
    updateMenuPosition();
  };

  // Keyboard navigation on the direct inline input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        updateMenuPosition();
      } else {
        setHighlightedIndex((prev) => {
          const next = prev < filteredSizes.length - 1 ? prev + 1 : prev;
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
      if (isOpen && filteredSizes[highlightedIndex]) {
        handleSelect(filteredSizes[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
        updateMenuPosition();
      }
    } else if (e.key === 'Tab') {
      // Natural Tab key navigation:
      // If menu is open and user was typing and a valid match is highlighted, commit it!
      if (isOpen) {
        if (isTyping && filteredSizes[highlightedIndex]) {
          handleSelect(filteredSizes[highlightedIndex]);
        } else {
          setIsOpen(false);
          setIsTyping(false);
        }
      }
      // DO NOT call e.preventDefault(); let native browser Tab move to the next field (cartonsCount)
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
      updateMenuPosition();
    }
  };

  const inputValue = isTyping
    ? query
    : selectedSize
    ? selectedSize.name + (selectedSize.description ? ` (${selectedSize.description})` : '')
    : '';

  const dropdownMenu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            onMouseDown={(e) => e.preventDefault()} // Prevents blur before click
            style={{
              position: 'fixed',
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              ...(menuPosition.openUpward
                ? { bottom: `${window.innerHeight - menuPosition.top}px` }
                : { top: `${menuPosition.top}px` })
            }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header info */}
            <div className="px-3 py-2 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-ink-500">
              <span className="truncate">
                {isTyping && query.trim() ? `Results for "${query.trim()}"` : 'Select Grade / Size Master'}
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600 shrink-0 ml-2">
                {filteredSizes.length} {filteredSizes.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {/* Filtered Sizes List */}
            <div
              ref={listRef}
              className="max-h-56 overflow-y-auto divide-y divide-gray-50 font-medium"
            >
              {filteredSizes.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <Layers className="w-6 h-6 mx-auto mb-1.5 text-rose-300" />
                  <p className="text-xs font-bold text-ink-800">
                    No sizes found matching "{query}"
                  </p>
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    Try searching by grade or count (e.g. 71/90, 100/200, 6/8, U/3)
                  </p>
                </div>
              ) : (
                filteredSizes.map((sz, idx) => {
                  const isSelected = selectedSize?.id === sz.id;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={sz.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleSelect(sz)}
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
                        <span className="font-mono text-[11px] font-black text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                          {sz.name}
                        </span>
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'font-black text-rose-950' : 'font-semibold text-ink-800'
                          }`}
                        >
                          {sz.description || sz.code}
                        </span>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer keyboard hints */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
              <span>Use ↑↓, Enter or Tab</span>
              <span>Esc to close</span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative flex-1 min-w-[120px]" ref={containerRef}>
      {/* Direct Interactive Input Combobox (Always shows active blinking cursor upon click/focus) */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={selectedSize ? selectedSize.name : placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full pl-3 pr-14 py-1.5 rounded-xl border text-xs font-bold outline-none transition-all ${
            isOpen
              ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs text-ink-900'
              : selectedSize
              ? 'border-gray-200 bg-white hover:border-rose-300 text-ink-900'
              : 'border-dashed border-gray-300 bg-gray-50/60 hover:bg-white hover:border-gray-400 text-ink-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        />

        {/* Clear & Dropdown Action Buttons (tabIndex -1 prevents Tab interruption) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedSize && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear size selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            className="p-1 text-gray-400 hover:text-ink-700 rounded-md transition"
            title="Toggle size options"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-rose-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {dropdownMenu}
    </div>
  );
};
