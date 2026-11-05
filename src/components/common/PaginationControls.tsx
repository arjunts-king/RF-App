import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 250],
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate visible page numbers with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white/80 backdrop-blur-xs border-t border-gray-100 text-xs text-ink-600 ${className}`}
    >
      {/* Left: Record Range Summary & Page Size Selector */}
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
        <span className="font-medium text-ink-500">
          Showing <span className="font-bold text-ink-900">{startRecord}</span>–
          <span className="font-bold text-ink-900">{endRecord}</span> of{' '}
          <span className="font-bold text-ink-900">{totalItems}</span> records
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-3">
            <span className="text-[11px] text-ink-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-gray-50 border border-gray-200 text-ink-800 text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-medium cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-ink-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
          title="First Page"
          aria-label="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-ink-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`min-w-7 h-7 px-2 text-xs font-semibold rounded-lg transition ${
                  p === safeCurrentPage
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-ink-700 hover:bg-gray-100'
                }`}
                aria-current={p === safeCurrentPage ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-ink-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-ink-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
          title="Last Page"
          aria-label="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
