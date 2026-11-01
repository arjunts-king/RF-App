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
  iconColor,
  iconBg,
  trend,
  variant = 'default'
}) => {
  const isHighlight = variant === 'highlight';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col justify-between card-liquid-hover text-white ${
        isHighlight
          ? 'glass-surface-blush border-white/50 shadow-xl'
          : isWarning
          ? 'bg-amber-500/20 backdrop-blur-md border-amber-300/40 shadow-lg text-white'
          : isSuccess
          ? 'bg-emerald-500/20 backdrop-blur-md border-emerald-300/40 shadow-lg text-white'
          : 'glass-surface-regular border-white/30 shadow-lg'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                isHighlight ? 'text-white' : isSuccess ? 'text-emerald-200' : isWarning ? 'text-amber-200' : 'text-rose-100'
              }`}
            >
              {label}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-2xl font-black font-mono tracking-tight ${
                  isHighlight
                    ? 'text-white'
                    : isWarning
                    ? 'text-amber-200'
                    : 'text-white'
                }`}
              >
                {value}
              </span>
              {trend && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                    trend.isPositive
                      ? 'bg-emerald-400/25 text-emerald-200 border-emerald-300/40'
                      : 'bg-rose-400/25 text-rose-200 border-rose-300/40'
                  }`}
                >
                  {trend.value}
                </span>
              )}
            </div>
            {caption && (
              <p
                className={`text-[11px] leading-relaxed mt-0.5 ${
                  isHighlight ? 'text-rose-100/90' : 'text-white/75'
                }`}
              >
                {caption}
              </p>
            )}
          </div>

          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                iconBg && iconColor
                  ? `${iconBg} ${iconColor}`
                  : isHighlight
                  ? 'bg-white text-rose-900 shadow-md'
                  : 'bg-white/20 text-white border border-white/30 backdrop-blur-md'
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
            isHighlight ? 'border-white/25' : 'border-white/15'
          }`}
        >
          <button
            type="button"
            onClick={onLinkClick}
            className="text-xs font-bold inline-flex items-center gap-1 group text-white hover:text-rose-200 transition-colors"
          >
            <span>{linkText}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};
