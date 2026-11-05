import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, LucideIcon } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  icon?: LucideIcon;
  placeholder?: string;
  className?: string;
  maxBadgeDisplay?: number;
  badgeColor?: 'rose' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'purple';
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selectedIds,
  onChange,
  icon: Icon,
  placeholder = 'Search...',
  className = '',
  badgeColor = 'rose'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    const visibleIds = filteredOptions.map((o) => o.id);
    const combined = Array.from(new Set([...selectedIds, ...visibleIds]));
    onChange(combined);
  };

  const clearSelection = () => {
    onChange([]);
  };

  // Color mappings
  const colorStyles = {
    rose: {
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      activeBtn: 'border-rose-400 bg-rose-50/50 text-rose-900',
      check: 'bg-rose-600 border-rose-600 text-white'
    },
    blue: {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      activeBtn: 'border-blue-400 bg-blue-50/50 text-blue-900',
      check: 'bg-blue-600 border-blue-600 text-white'
    },
    emerald: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      activeBtn: 'border-emerald-400 bg-emerald-50/50 text-emerald-900',
      check: 'bg-emerald-600 border-emerald-600 text-white'
    },
    amber: {
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      activeBtn: 'border-amber-400 bg-amber-50/50 text-amber-900',
      check: 'bg-amber-600 border-amber-600 text-white'
    },
    indigo: {
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      activeBtn: 'border-indigo-400 bg-indigo-50/50 text-indigo-900',
      check: 'bg-indigo-600 border-indigo-600 text-white'
    },
    purple: {
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      activeBtn: 'border-purple-400 bg-purple-50/50 text-purple-900',
      check: 'bg-purple-600 border-purple-600 text-white'
    }
  };

  const activeColor = colorStyles[badgeColor] || colorStyles.rose;
  const isFiltered = selectedIds.length > 0;

  // Compute trigger button summary text
  const buttonSummary = useMemo(() => {
    if (selectedIds.length === 0) {
      return label;
    }
    if (selectedIds.length === 1) {
      const match = options.find((o) => o.id === selectedIds[0]);
      return `${label}: ${match?.label || '1 selected'}`;
    }
    return `${label} (${selectedIds.length})`;
  }, [selectedIds, options, label]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${
          isFiltered
            ? `${activeColor.activeBtn} shadow-2xs`
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-ink-700'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        title={selectedIds.length > 0 ? `${selectedIds.length} ${label} selected` : `Filter by ${label}`}
      >
        {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isFiltered ? 'text-rose-600' : 'text-ink-400'}`} />}
        <span className="truncate max-w-[150px]">{buttonSummary}</span>

        {selectedIds.length > 1 && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black border ${activeColor.badge}`}
          >
            {selectedIds.length}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-ink-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />

        {isFiltered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="p-0.5 hover:bg-black/10 rounded-full transition ml-0.5"
            title={`Clear all ${label}`}
          >
            <X className="w-3 h-3 text-ink-500 hover:text-ink-900" />
          </button>
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-gray-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Search */}
          <div className="p-2.5 bg-gray-50/80 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-700 px-1">
              <span>Select {label}</span>
              <span className="text-[10px] text-ink-500">
                {selectedIds.length} of {options.length} selected
              </span>
            </div>

            {options.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-rose-500 font-medium"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1 px-1 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="font-bold text-rose-700 hover:text-rose-900 hover:underline transition"
              >
                Select All ({filteredOptions.length})
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="font-medium text-ink-500 hover:text-rose-600 transition"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-400">
                No matching {label.toLowerCase()} found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-rose-50/60 text-ink-900 font-semibold'
                        : 'hover:bg-gray-50 text-ink-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? activeColor.check
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="block text-[10px] text-ink-400 font-normal truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-ink-600">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {selectedIds.length > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-ink-600">
                {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} filtered
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
