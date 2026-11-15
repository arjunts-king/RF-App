import React, { useState } from 'react';
import { LucideIcon, TrendingUp } from 'lucide-react';

export interface TrendPoint {
  label: string;
  value: number;
  formattedValue?: string;
  secondaryLabel?: string;
  secondaryValue?: string | number;
}

export interface TrendLineVisualProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'default';
  };
  points: TrendPoint[];
  color?: string;
  unit?: string;
  benchmark?: {
    value: number;
    label: string;
  };
  emptyMessage?: string;
  className?: string;
}

export const TrendLineVisual: React.FC<TrendLineVisualProps> = ({
  title,
  subtitle,
  icon: Icon = TrendingUp,
  badge,
  points,
  color = '#f43f5e', // rose-500
  unit = '',
  benchmark,
  emptyMessage = 'No historical trend points recorded.',
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const validPoints = points.filter((p) => typeof p.value === 'number' && !isNaN(p.value));
  const values = validPoints.map((p) => p.value);
  if (benchmark && typeof benchmark.value === 'number') {
    values.push(benchmark.value);
  }

  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 1;
  const range = maxVal - minVal || 1;

  // SVG coordinate mapping
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const getCoords = (val: number, idx: number, total: number) => {
    const x = total <= 1 ? width / 2 : paddingX + (idx / (total - 1)) * plotWidth;
    const y = height - paddingY - ((val - minVal) / range) * plotHeight;
    return { x, y };
  };

  // Build path
  const coords = validPoints.map((p, idx) => getCoords(p.value, idx, validPoints.length));
  const linePath = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
    : '';

  const benchmarkY = benchmark ? height - paddingY - ((benchmark.value - minVal) / range) * plotHeight : null;

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
          {benchmark && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
              <span className="w-3 h-0.5 border-t border-dashed border-gray-400" />
              <span>{benchmark.label}: {benchmark.value.toLocaleString()} {unit}</span>
            </div>
          )}
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(badge.variant)}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      {validPoints.length === 0 ? (
        <div className="py-10 text-center text-xs text-ink-400 italic font-medium">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">
          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id={`trend-grad-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f3f4f6" strokeWidth="1" />
              <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#f3f4f6" strokeWidth="1" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e5e7eb" strokeWidth="1.5" />

              {/* Benchmark Reference Line */}
              {benchmarkY !== null && (
                <line
                  x1={paddingX}
                  y1={benchmarkY}
                  x2={width - paddingX}
                  y2={benchmarkY}
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Area Gradient */}
              {areaPath && (
                <path d={areaPath} fill={`url(#trend-grad-${title.replace(/\s+/g, '')})`} />
              )}

              {/* Main Line */}
              {linePath && (
                <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Data Point Circles */}
              {coords.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke={color}
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-200"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredIndex !== null && validPoints[hoveredIndex] && (
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[11px] font-mono py-1 px-3 rounded-xl shadow-lg pointer-events-none transition-all z-20 flex items-center gap-2"
              >
                <span className="font-sans font-bold text-gray-300">{validPoints[hoveredIndex].label}:</span>
                <span className="font-extrabold text-white">
                  {validPoints[hoveredIndex].formattedValue || `${validPoints[hoveredIndex].value.toLocaleString()} ${unit}`.trim()}
                </span>
                {validPoints[hoveredIndex].secondaryLabel && (
                  <span className="text-[10px] text-gray-400">
                    ({validPoints[hoveredIndex].secondaryLabel}: {validPoints[hoveredIndex].secondaryValue})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom X-Axis Range */}
          <div className="flex items-center justify-between text-[10px] text-ink-500 font-medium px-2">
            <span>{validPoints[0]?.label || 'Start'}</span>
            <span className="text-gray-400">
              Min: {minVal.toLocaleString()} {unit} · Max: {maxVal.toLocaleString()} {unit}
            </span>
            <span>{validPoints[validPoints.length - 1]?.label || 'End'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
