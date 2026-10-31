import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface BentoCardProps {
  label: string;
  value: string | number;
  caption?: string;
  linkText?: string;
  onLinkClick?: () => void;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'info';
}

export const BentoCard: React.FC<BentoCardProps> = ({
  label,
  value,
  caption,
  linkText,
  onLinkClick,
  icon: Icon,
  iconColor = 'text-ink-600',
  iconBg = 'bg-gray-100',
  trend,
  variant = 'default'
}) => {
  const isHighlight = variant === 'highlight';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col justify-between card-liquid-hover ${
        isHighlight
          ? 'glass-surface-blush border-rose-200/80 hover:border-rose-300'
          : isWarning
          ? 'bg-amber-50/40 backdrop-blur-md border-amber-200/80 hover:border-amber-300 shadow-xs'
          : isSuccess
          ? 'bg-emerald-50/40 backdrop-blur-md border-emerald-200/80 hover:border-emerald-300 shadow-xs'
          : 'glass-surface-regular border-white/80 hover:border-rose-200/70 shadow-xs'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                isHighlight ? 'text-rose-800' : isSuccess ? 'text-emerald-800' : isWarning ? 'text-amber-800' : 'text-ink-500'
              }`}
            >
              {label}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-2xl font-black font-mono tracking-tight ${
                  isHighlight
                    ? 'text-rose-700'
                    : isWarning
                    ? 'text-amber-800'
                    : 'text-ink-900'
                }`}
              >
                {value}
              </span>
              {trend && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                    trend.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {trend.value}
                </span>
              )}
            </div>
            {caption && (
              <p
                className={`text-[11px] leading-relaxed mt-0.5 ${
                  isHighlight ? 'text-rose-900/70' : 'text-ink-500'
                }`}
              >
                {caption}
              </p>
            )}
          </div>

          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isHighlight ? 'bg-rose-600 text-white shadow-xs' : `${iconBg} ${iconColor}`
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>

      {linkText && onLinkClick && (
        <div
          className={`pt-3 mt-3 border-t ${
            isHighlight ? 'border-rose-100' : 'border-gray-50'
          }`}
        >
          <button
            type="button"
            onClick={onLinkClick}
            className={`text-xs font-bold inline-flex items-center gap-1 group transition-colors ${
              isHighlight
                ? 'text-rose-800 hover:text-rose-950'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <span>{linkText}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};
