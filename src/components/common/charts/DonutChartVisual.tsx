import React, { useState } from 'react';
import { LucideIcon, PieChart } from 'lucide-react';

export interface DonutSegment {
  label: string;
  value: number;
  formattedValue?: string;
  color?: string;
  subtext?: string;
}

export interface DonutChartVisualProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'default';
  };
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  unit?: string;
  emptyMessage?: string;
  className?: string;
}

const DEFAULT_DONUT_COLORS = [
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

export const DonutChartVisual: React.FC<DonutChartVisualProps> = ({
  title,
  subtitle,
  icon: Icon = PieChart,
  badge,
  data,
  centerLabel = 'Total',
  centerValue,
  unit = '',
  emptyMessage = 'No data available for distribution display.',
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const displayCenterValue = centerValue || (totalValue > 0 ? `${totalValue.toLocaleString()} ${unit}`.trim() : '0');

  // SVG Donut calculation
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segmentsWithOffset = data.map((item, index) => {
    const fraction = totalValue > 0 ? item.value / totalValue : 0;
    const strokeDash = fraction * circumference;
    const currentOffset = cumulativeOffset;
    cumulativeOffset += strokeDash;
    const color = item.color || DEFAULT_DONUT_COLORS[index % DEFAULT_DONUT_COLORS.length];
    return {
      ...item,
      fraction,
      percentage: fraction * 100,
      strokeDash,
      strokeOffset: currentOffset,
      color
    };
  });

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

        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(badge.variant)}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Body: Donut + Legend */}
      {data.length === 0 || totalValue === 0 ? (
        <div className="py-10 text-center text-xs text-ink-400 italic font-medium">{emptyMessage}</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-1">
          {/* SVG Donut Graphic */}
          <div className="relative shrink-0 flex items-center justify-center w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              {/* Background track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth={strokeWidth}
              />
              {/* Data segments */}
              {segmentsWithOffset.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredIndex === idx ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${seg.strokeDash} ${circumference}`}
                  strokeDashoffset={-seg.strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">
                {hoveredIndex !== null ? segmentsWithOffset[hoveredIndex].label : centerLabel}
              </span>
              <span className="text-xs font-extrabold text-ink-900 font-mono mt-0.5 line-clamp-2">
                {hoveredIndex !== null
                  ? segmentsWithOffset[hoveredIndex].formattedValue || `${segmentsWithOffset[hoveredIndex].value.toLocaleString()} ${unit}`.trim()
                  : displayCenterValue}
              </span>
              {hoveredIndex !== null && (
                <span className="text-[10px] font-bold text-rose-600 mt-0.5">
                  {segmentsWithOffset[hoveredIndex].percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Legend Strip */}
          <div className="flex-1 w-full space-y-2 max-h-52 overflow-y-auto pr-1">
            {segmentsWithOffset.map((seg, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${
                    isHovered ? 'bg-rose-50/70 border border-rose-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: seg.color,
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-ink-900 truncate block" title={seg.label}>
                        {seg.label}
                      </span>
                      {seg.subtext && <span className="text-[10px] text-ink-400 block">{seg.subtext}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span className="font-mono font-bold text-ink-900">
                      {seg.formattedValue || `${seg.value.toLocaleString()} ${unit}`.trim()}
                    </span>
                    <span className="text-[10px] font-bold text-ink-500 w-11 text-right">
                      {seg.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
