import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';

export interface ComparisonMetric {
  label: string;
  value: number;
  formattedValue: string;
  color: string;
  percentage?: number;
  subtext?: string;
}

export interface ComparisonBarVisualProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'default';
  };
  metrics: ComparisonMetric[];
  totalLabel?: string;
  totalFormatted?: string;
  className?: string;
}

export const ComparisonBarVisual: React.FC<ComparisonBarVisualProps> = ({
  title,
  subtitle,
  icon: Icon = Layers,
  badge,
  metrics,
  totalLabel = 'Total Volume',
  totalFormatted,
  className = ''
}) => {
  const sumValues = metrics.reduce((acc, m) => acc + Math.max(0, m.value), 0);

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
      {/* Header */}
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

        <div className="flex items-center gap-2">
          {totalFormatted && (
            <span className="text-[11px] font-bold text-ink-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
              {totalLabel}: {totalFormatted}
            </span>
          )}
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(badge.variant)}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Segmented Proportional Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          {metrics.map((m, idx) => {
            const pct = m.percentage !== undefined ? m.percentage : sumValues > 0 ? (Math.max(0, m.value) / sumValues) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                style={{ width: `${pct}%`, backgroundColor: m.color }}
                className="h-full hover:brightness-110 transition-all cursor-pointer relative group"
                title={`${m.label}: ${m.formattedValue} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(4, Math.max(2, metrics.length))} gap-3 pt-1`}>
        {metrics.map((m, idx) => {
          const pct = m.percentage !== undefined ? m.percentage : sumValues > 0 ? (Math.max(0, m.value) / sumValues) * 100 : 0;
          return (
            <div key={idx} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1">
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="font-bold text-ink-700 truncate">{m.label}</span>
                </div>
                <span className="font-extrabold text-ink-900 font-mono text-[10px]">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm font-black text-ink-900 font-mono">
                {m.formattedValue}
              </div>
              {m.subtext && (
                <div className="text-[10px] text-ink-400 font-medium">{m.subtext}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
