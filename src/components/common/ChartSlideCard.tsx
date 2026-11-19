import React, { useState, ReactNode } from 'react';
import { Maximize2, Filter, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';

export interface ChartSlideStructuredTag {
  label: string;
  value?: string;
  color?: 'rose' | 'blue' | 'emerald' | 'amber' | 'purple' | 'gray';
}

export type ChartSlideFilterTag = string | ChartSlideStructuredTag;

export interface ChartSlideCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: ReactNode;
  activeFilters?: ChartSlideFilterTag[];
  children: ReactNode;
  expandedView?: ReactNode; // Optional customized layout when expanded
  viewAllLink?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ChartSlideCard: React.FC<ChartSlideCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  activeFilters = [],
  children,
  expandedView,
  viewAllLink,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div
        className={`bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col justify-between h-full min-h-[380px] group/chart relative ${className}`}
      >
        {/* Top: Header, Title, Active Filter tags, Expand Button */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-ink-900 truncate">
                    {title}
                  </h4>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-[11px] text-ink-500 font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons: Expand */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 text-ink-600 hover:text-rose-700 border border-gray-200 hover:border-rose-200 flex items-center justify-center transition shadow-2xs min-h-[32px] min-w-[32px]"
                title="Expand chart to full screen"
                aria-label={`Expand ${title} chart`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Active Filter Tags shown directly in the chart card as specified */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-50">
              <span className="text-[10px] font-bold text-ink-400 uppercase flex items-center gap-1">
                <Filter className="w-2.5 h-2.5" />
                Filtered:
              </span>
              {activeFilters.map((rawF, i) => {
                const f = typeof rawF === 'string' ? { label: rawF, value: '', color: 'rose' as const } : rawF;
                const colorClasses =
                  f.color === 'blue'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : f.color === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : f.color === 'amber'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : f.color === 'purple'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClasses}`}
                  >
                    <span>{f.label}{f.value ? ':' : ''}</span>
                    {f.value && <strong className="font-bold">{f.value}</strong>}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Middle: Chart Graphics */}
        <div className="py-4 flex-1 flex flex-col justify-center min-w-0">
          {children}
        </div>

        {/* Bottom: Footer / Deep Dive Link */}
        {viewAllLink && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={viewAllLink.onClick}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1 group/link"
            >
              <span>{viewAllLink.label}</span>
              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[10px] text-ink-400 font-mono">Live Filtered</span>
          </div>
        )}
      </div>

      {/* Full-Size Chart Expansion Modal */}
      {isExpanded && (
        <Modal
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          title={title}
          subtitle={subtitle}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            {/* Active filter chips inside modal */}
            {activeFilters.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-rose-600" />
                  Active applied filters:
                </span>
                {activeFilters.map((rawF, i) => {
                  const f = typeof rawF === 'string' ? { label: rawF, value: '' } : rawF;
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 text-ink-800 shadow-2xs"
                    >
                      <span className="text-ink-500">{f.label}{f.value ? ':' : ''}</span>
                      {f.value && <strong className="text-rose-700">{f.value}</strong>}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Expanded Chart Rendering */}
            <div className="p-6 bg-white rounded-2xl border border-gray-100 min-h-[320px] flex flex-col justify-center">
              {expandedView || children}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              {viewAllLink ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    viewAllLink.onClick();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition"
                >
                  <span>{viewAllLink.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-2.5 bg-ink-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
