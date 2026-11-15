import React from 'react';
import { LucideIcon, BarChart3 } from 'lucide-react';

export interface BarChartItem {
  label: string;
  value: number;
  formattedValue?: string;
  percentage?: number;
  color?: string;
  secondaryLabel?: string;
  secondaryValue?: string | number;
  subtext?: string;
}

export interface BarChartVisualProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'default';
  };
  data: BarChartItem[];
  orientation?: 'horizontal' | 'vertical';
  maxItems?: number;
  heightClass?: string;
  unit?: string;
  emptyMessage?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  '#f43f5e', // rose-500
  '#0284c7', // sky-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316'  // orange-500
];

export const BarChartVisual: React.FC<BarChartVisualProps> = ({
  title,
  subtitle,
  icon: Icon = BarChart3,
  badge,
  data,
  orientation = 'horizontal',
  maxItems,
  heightClass = 'h-52',
  unit = '',
  emptyMessage = 'No data available for graphical display.',
  className = ''
}) => {
  const displayItems = maxItems ? data.slice(0, maxItems) : data;
  const maxValue = Math.max(...displayItems.map((d) => d.value), 0.0001);
  const totalValue = displayItems.reduce((acc, d) => acc + d.value, 0);

  const getBadgeClass = (variant = 'default') => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'info':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xs border border-gray-100 p-5 space-y-4 ${className}`}>
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
          </div>
        </div>

        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(badge.variant)}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Chart Body */}
      {displayItems.length === 0 ? (
        <div className="py-10 text-center text-xs text-ink-400 italic font-medium">{emptyMessage}</div>
      ) : orientation === 'vertical' ? (
        /* Vertical Column Chart */
        <div className="space-y-2">
          <div className={`${heightClass} flex items-end gap-2 pt-6 pb-2 border-b border-gray-100 overflow-x-auto`}>
            {displayItems.map((item, idx) => {
              const heightPct = Math.max(8, (item.value / maxValue) * 100);
              const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              return (
                <div key={idx} className="flex-1 min-w-[32px] flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 bg-ink-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap transition-opacity z-20 shadow-md">
                    {item.label}: {item.formattedValue || `${item.value.toLocaleString()} ${unit}`.trim()}
                    {item.secondaryLabel && ` · ${item.secondaryLabel}: ${item.secondaryValue}`}
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%`, backgroundColor: color }}
                    className="w-full rounded-t-md hover:brightness-110 transition cursor-pointer shadow-2xs"
                  />
                  {/* Bottom Label */}
                  <span className="text-[10px] text-ink-500 font-semibold truncate max-w-[48px] text-center" title={item.label}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-400 px-1 font-medium">
            <span>Baseline (0 {unit})</span>
            <span>Peak: {maxValue.toLocaleString()} {unit}</span>
          </div>
        </div>
      ) : (
        /* Horizontal Progress / Bar Breakdown */
        <div className="space-y-3 pt-1">
          {displayItems.map((item, idx) => {
            const pct = item.percentage !== undefined ? item.percentage : totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            const barWidthPct = Math.min(100, Math.max(3, (item.value / maxValue) * 100));
            const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

            return (
              <div key={idx} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-ink-900 truncate font-bold" title={item.label}>
                      {item.label}
                    </span>
                    {item.subtext && <span className="text-[10px] text-ink-400 shrink-0">({item.subtext})</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.secondaryValue !== undefined && (
                      <span className="text-[10px] text-ink-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        {item.secondaryLabel ? `${item.secondaryLabel}: ` : ''}{item.secondaryValue}
                      </span>
                    )}
                    <span className="text-ink-900 font-mono font-bold">
                      {item.formattedValue || `${item.value.toLocaleString()} ${unit}`.trim()}
                    </span>
                    <span className="text-[11px] font-bold text-ink-500 w-12 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 group-hover:brightness-105"
                    style={{ width: `${barWidthPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
