import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Fish, Hash, Layers } from 'lucide-react';
import { Species } from '../../types';

interface ProductComboboxProps {
  value: string; // selected speciesId
  speciesList: Species[];
  onChange: (species: Species | null) => void;
  placeholder?: string;
  disabled?: boolean;
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSpecies = useMemo(() => {
    return speciesList.find((sp) => sp.id === value) || null;
  }, [speciesList, value]);

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
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return speciesList;

    return speciesList.filter((sp) => {
      const matchName = (sp.name || '').toLowerCase().includes(q);
      const matchCode = (sp.code || '').toLowerCase().includes(q);
      const matchRaw = (sp.rawSpeciesName || '').toLowerCase().includes(q);
      const matchSci = (sp.scientificName || '').toLowerCase().includes(q);
      const matchCat = (sp.category || '').toLowerCase().includes(q);
      const matchForm = (sp.productForm || '').toLowerCase().includes(q);
      const matchProc = (sp.processingType || '').toLowerCase().includes(q);
      const matchHs = (sp.hsCode || '').toLowerCase().includes(q);

      return (
        matchName ||
        matchCode ||
        matchRaw ||
        matchSci ||
        matchCat ||
        matchForm ||
        matchProc ||
        matchHs
      );
    });
  }, [speciesList, query]);

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
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
      // scroll into view
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
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

  const handleSelect = (sp: Species) => {
    onChange(sp);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div className="relative flex-1 min-w-[200px]" ref={containerRef}>
      {/* Trigger Button / Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-all ${
          isOpen
            ? 'border-rose-400 bg-white ring-2 ring-rose-100 shadow-xs'
            : selectedSpecies
            ? 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/20'
            : 'border-dashed border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={selectedSpecies ? `${selectedSpecies.code} - ${selectedSpecies.name}` : placeholder}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {selectedSpecies ? (
            <>
              <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                {selectedSpecies.code}
              </span>
              <span className="text-xs font-bold text-ink-900 truncate">
                {selectedSpecies.name}
              </span>
              {selectedSpecies.rawSpeciesName && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold shrink-0">
                  <Fish className="w-2.5 h-2.5 text-emerald-600" />
                  {selectedSpecies.rawSpeciesName}
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
          {selectedSpecies && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e as any);
              }}
              className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
              title="Clear product selection"
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
        <div className="absolute left-0 top-full mt-1.5 w-[380px] sm:w-[460px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                placeholder="Type name, code, raw catch, HSN..."
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

            {/* Results Counter / Filter status */}
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-semibold text-ink-500">
              <span>
                {query.trim()
                  ? `Showing results for "${query.trim()}"`
                  : 'Commercial Products Master'}
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-gray-200 text-ink-600">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
          </div>

          {/* Filtered Products List */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto divide-y divide-gray-50 font-medium"
          >
            {filteredProducts.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Fish className="w-8 h-8 mx-auto mb-2 text-rose-300" />
                <p className="text-xs font-bold text-ink-800">
                  No products found matching "{query}"
                </p>
                <p className="text-[11px] text-ink-500 mt-1 max-w-[280px] mx-auto">
                  Try searching with product code (e.g. PRD-001), category (Fish, Shrimp, Squid), or raw species connection.
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
                    onClick={() => handleSelect(sp)}
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

                      {/* Line 2: Scientific Name */}
                      {sp.scientificName && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="italic text-ink-500 text-[11px] truncate">
                            {sp.scientificName}
                          </span>
                        </div>
                      )}

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

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-ink-400">
            <span>Use ↑↓ arrows and Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
