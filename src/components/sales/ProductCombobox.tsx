import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Fish, Hash, Layers } from 'lucide-react';
import { Species } from '../../types';

export interface ProductComboboxProps {
  value: string; // selected speciesId
  speciesList: Species[];
  onChange: (species: Species | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MACKEREL_ALIASES = ['mackerel', 'mackrel', 'mackeral', 'makarel', 'makrel', 'mackerell', 'kanagurta'];

function normalizeSearchToken(token: string): string {
  const lower = token.toLowerCase();
  if (MACKEREL_ALIASES.some((alias) => lower === alias || (lower.length >= 3 && alias.startsWith(lower)))) {
    return 'mackerel';
  }
  return lower;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  value,
  speciesList,
  onChange,
  placeholder = 'Select Commercial Product...',
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

  const selectedSpecies = useMemo(() => {
    return speciesList.find((sp) => sp.id === value) || null;
  }, [speciesList, value]);

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, viewportWidth >= 640 ? 460 : 360), viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const estimatedHeight = 360;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

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
      const inContainer = containerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inContainer && !inMenu) {
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

  // Reposition portaled dropdown on scroll/resize while open
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

  // Intelligent multi-token & normalized real-time filter across all product attributes
  const filteredProducts = useMemo(() => {
    const q = (isTyping ? query : '').trim().toLowerCase();
    if (!q) return speciesList;

    const rawTokens = q.split(/\s+/).filter(Boolean);
    const tokens = rawTokens.map(normalizeSearchToken);
    const normalizedQueryStr = tokens.join(' ');
    const normQ = normalizedQueryStr.replace(/[^a-z0-9]/g, '');

    const matched = speciesList.filter((sp) => {
      // Direct species isolation guards:
      // If user is searching for a specific biological species, strictly isolate it and return immediately.
      const isMackerelSearch = tokens.some(
        (t) =>
          t.includes('mackerel') ||
          t.includes('kanagurta') ||
          MACKEREL_ALIASES.some((a) => t.includes(a) || (t.length >= 3 && a.startsWith(t)))
      );
      if (isMackerelSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();
        const catLower = (sp.category || '').toLowerCase();

        // Strictly reject any product belonging to another species
        const isOtherSpecies =
          nameLower.includes('ribbon') || headLower.includes('ribbon') || rawLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') || rawLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') || rawLower.includes('shrimp') || catLower.includes('shrimp') ||
          nameLower.includes('prawn') || headLower.includes('prawn') || rawLower.includes('prawn') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') || catLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') || catLower.includes('octopus') ||
          nameLower.includes('poovalan') || headLower.includes('poovalan') || rawLower.includes('poovalan') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isMackerelProduct =
          nameLower.includes('mackerel') ||
          headLower.includes('mackerel') ||
          sciLower.includes('kanagurta') ||
          rawLower.includes('mackerel');
        if (!isMackerelProduct) return false;
        const extraTokens = tokens.filter((t) => t !== 'mackerel' && t !== 'kanagurta' && !MACKEREL_ALIASES.includes(t));
        if (extraTokens.length === 0) return true;
      }

      const isRibbonSearch = tokens.some(
        (t) => t.includes('ribbon') || t.includes('savala') || t.includes('hairtail') || (t.length >= 4 && 'ribbonfish'.startsWith(t))
      );
      if (isRibbonSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') || rawLower.includes('mackerel') ||
          nameLower.includes('van') || headLower.includes('van') || rawLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') || rawLower.includes('shrimp') ||
          nameLower.includes('prawn') || headLower.includes('prawn') || rawLower.includes('prawn') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') ||
          nameLower.includes('poovalan') || headLower.includes('poovalan') || rawLower.includes('poovalan') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isRibbonProduct =
          nameLower.includes('ribbon') ||
          headLower.includes('ribbon') ||
          sciLower.includes('savala') ||
          rawLower.includes('ribbon') ||
          nameLower.includes('hairtail');
        return isRibbonProduct;
      }

      const isVannameiSearch = tokens.some((t) => t.includes('vannamei') || t.includes('vanamei'));
      if (isVannameiSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') || rawLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') || rawLower.includes('ribbon') ||
          nameLower.includes('squid') || headLower.includes('squid') || rawLower.includes('squid') ||
          nameLower.includes('octopus') || headLower.includes('octopus') || rawLower.includes('octopus') ||
          nameLower.includes('leather jacket') || headLower.includes('leather jacket') || rawLower.includes('leather jacket') ||
          nameLower.includes('cuttlefish') || headLower.includes('cuttlefish') || rawLower.includes('cuttlefish') ||
          nameLower.includes('tuna') || headLower.includes('tuna') || rawLower.includes('tuna');
        if (isOtherSpecies) return false;

        const isVannameiProduct =
          nameLower.includes('van') ||
          headLower.includes('van') ||
          sciLower.includes('vannamei') ||
          rawLower.includes('van');
        return isVannameiProduct;
      }

      const isSquidSearch = tokens.some((t) => t.includes('squid') || t.includes('loligo') || t.includes('duvaucelii'));
      if (isSquidSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') ||
          nameLower.includes('shrimp') || headLower.includes('shrimp') ||
          nameLower.includes('octopus') || headLower.includes('octopus');
        if (isOtherSpecies) return false;

        const isSquidProduct =
          nameLower.includes('squid') ||
          nameLower.includes('loligo') ||
          headLower.includes('squid') ||
          sciLower.includes('duvaucelii') ||
          rawLower.includes('squid');
        return isSquidProduct;
      }

      const isOctopusSearch = tokens.some((t) => t.includes('octopus'));
      if (isOctopusSearch) {
        const nameLower = (sp.name || '').toLowerCase();
        const headLower = (sp.speciesHeadName || '').toLowerCase();
        const rawLower = (sp.rawSpeciesName || '').toLowerCase();
        const sciLower = (sp.scientificName || '').toLowerCase();

        const isOtherSpecies =
          nameLower.includes('mackerel') || headLower.includes('mackerel') ||
          nameLower.includes('ribbon') || headLower.includes('ribbon') ||
          nameLower.includes('van') || headLower.includes('van') ||
          nameLower.includes('squid') || headLower.includes('squid');
        if (isOtherSpecies) return false;

        const isOctopusProduct =
          nameLower.includes('octopus') ||
          headLower.includes('octopus') ||
          sciLower.includes('octopus') ||
          sciLower.includes('vulgaris') ||
          rawLower.includes('octopus');
        return isOctopusProduct;
      }

      const searchCorpus = [
        sp.name,
        sp.code,
        sp.speciesHeadName,
        sp.rawSpeciesName,
        sp.scientificName,
        sp.category,
        sp.productForm,
        sp.processingType,
        sp.hsCode,
        (sp as any).description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const normCorpus = searchCorpus.replace(/[^a-z0-9]/g, '');

      // 1. All tokens match anywhere across all product fields (1-char grade tokens like "a"/"b"/"c" require word boundary)
      const tokenMatches = (token: string) => {
        if (token.length === 1) {
          const wordRe = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return wordRe.test(sp.name || '') || wordRe.test(sp.code || '');
        }
        return searchCorpus.includes(token);
      };
      const allTokensMatch = tokens.every(tokenMatches);

      // 2. Normalized match (handles spaces/hyphens differences)
      const normMatch = normQ.length >= 2 && normCorpus.includes(normQ);

      return allTokensMatch || normMatch;
    });

    // Rank direct product-name matches ahead of secondary attribute matches
    return matched.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aNameHit = tokens.every((t) => aName.includes(t)) ? 1 : 0;
      const bNameHit = tokens.every((t) => bName.includes(t)) ? 1 : 0;
      if (aNameHit !== bNameHit) return bNameHit - aNameHit;
      return 0;
    });
  }, [speciesList, query, isTyping]);

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

  const handleSelect = (sp: Species) => {
    onChange(sp);
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
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
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
          const next = prev < filteredProducts.length - 1 ? prev + 1 : prev;
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
      if (isOpen && filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
        updateMenuPosition();
      }
    } else if (e.key === 'Tab') {
      // Natural Tab key navigation:
      // If menu is open and user was typing and a valid match is highlighted, commit it!
      if (isOpen) {
        if (isTyping && filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        } else {
          setIsOpen(false);
          setIsTyping(false);
        }
      }
      // DO NOT call e.preventDefault(); let native browser Tab move to the next field (hsCode)
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

  // Display value for the input
  const inputValue = isTyping
    ? query
    : selectedSpecies
    ? selectedSpecies.name
    : '';

  const dropdownMenu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            onMouseDown={(e) => e.preventDefault()} // Prevents input blur before option click
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
              <span className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">
                  {isTyping && query.trim()
                    ? `Results for "${query.trim()}"`
                    : 'Select Commercial Product Master'}
                </span>
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600 shrink-0 ml-2">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {/* Filtered Products List */}
            <div
              ref={listRef}
              className="max-h-72 overflow-y-auto divide-y divide-gray-50 font-medium"
            >
              {filteredProducts.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Fish className="w-8 h-8 mx-auto mb-2 text-rose-300" />
                  <p className="text-xs font-bold text-ink-800">
                    No products found matching "{query}"
                  </p>
                  <p className="text-[11px] text-ink-500 mt-1 max-w-[280px] mx-auto">
                    Try searching by code (e.g. PRD-001), category (Fish, Shrimp, Squid), or raw species name.
                  </p>
                </div>
              ) : (
                filteredProducts.map((sp, idx) => {
                  const isSelected = selectedSpecies?.id === sp.id;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={sp.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleSelect(sp)}
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
                        {/* Line 1: Code & Name */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                            {sp.code}
                          </span>
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-rose-950 font-black' : 'text-ink-900'
                            }`}
                          >
                            {sp.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-auto" />
                          )}
                        </div>

                        {/* Line 2: Scientific Name & Species Head */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {sp.speciesHeadName && (
                            <span className="font-bold text-[10px] text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              {sp.speciesHeadName}
                            </span>
                          )}
                          {sp.scientificName && (
                            <span className="italic text-ink-500 text-[11px] truncate">
                              {sp.scientificName}
                            </span>
                          )}
                        </div>

                        {/* Line 3: Product Form / Processing Type */}
                        {(sp.productForm || sp.processingType) && (
                          <div className="text-[10px] text-ink-500 flex items-center gap-1 truncate font-normal">
                            <Layers className="w-3 h-3 text-ink-400 shrink-0" />
                            <span className="truncate">
                              {sp.productForm || 'Standard'} {sp.processingType ? `· ${sp.processingType}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right column: Category & HSN Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        {sp.category && (
                          <span className="text-[10px] font-semibold text-ink-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {sp.category}
                          </span>
                        )}
                        {sp.hsCode && (
                          <span className="font-mono text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5 text-amber-600" />
                            {sp.hsCode}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer keyboard hints */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
              <span>Use ↑↓ arrows, Enter or Tab to select</span>
              <span>Esc to close</span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative flex-1 min-w-[200px]" ref={containerRef}>
      {/* Direct Interactive Input Combobox (Always shows active blinking cursor upon click/focus) */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-gray-400">
          {selectedSpecies && !isTyping ? (
            <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
              {selectedSpecies.code}
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
          placeholder={selectedSpecies ? selectedSpecies.name : placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onMouseUp={(e) => {
            if (!isTyping && selectedSpecies) {
              e.preventDefault();
            }
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full ${
            selectedSpecies && !isTyping ? 'pl-20' : 'pl-8'
          } pr-14 py-1.5 rounded-xl border text-xs font-bold outline-none transition-all ${
            isOpen
              ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs text-ink-900'
              : selectedSpecies
              ? 'border-gray-200 bg-white hover:border-rose-300 text-ink-900'
              : 'border-dashed border-gray-300 bg-gray-50/60 hover:bg-white hover:border-gray-400 text-ink-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        />

        {/* Clear & Dropdown Action Buttons (tabIndex -1 prevents Tab interruption) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedSpecies && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear product selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            className="p-1 text-gray-400 hover:text-ink-700 rounded-md transition"
            title="Toggle product options"
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
