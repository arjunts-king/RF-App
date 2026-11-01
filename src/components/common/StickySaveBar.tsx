import React from 'react';
import { LucideIcon, Save, RotateCcw } from 'lucide-react';

export interface StickyMetric {
  label: string;
  value: string;
  isPrimary?: boolean;
  highlight?: boolean;
}

interface StickySaveBarProps {
  metrics?: StickyMetric[];
  primaryLabel?: string;
  primaryIcon?: LucideIcon;
  onPrimaryClick?: () => void;
  isSubmitting?: boolean;
  isPrimaryDisabled?: boolean;
  secondaryLabel?: string;
  secondaryIcon?: LucideIcon;
  onSecondaryClick?: () => void;
  onSecondary?: () => void;
  statusMessage?: string;
  formId?: string;
}

export const StickySaveBar: React.FC<StickySaveBarProps> = ({
  metrics = [],
  primaryLabel = 'Save transaction',
  primaryIcon: PrimaryIcon = Save,
  onPrimaryClick,
  isSubmitting = false,
  isPrimaryDisabled = false,
  secondaryLabel = 'Reset',
  secondaryIcon: SecondaryIcon = RotateCcw,
  onSecondaryClick,
  onSecondary,
  statusMessage,
  formId
}) => {
  const effectiveSecondaryClick = onSecondaryClick || onSecondary;
  return (
    <div className="sticky bottom-4 z-30 glass-surface-thick p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 mt-8 animate-liquid-up text-white">
      {/* Live Calculated Metrics */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs flex-wrap">
        {metrics.map((m, idx) => (
          <React.Fragment key={m.label}>
            {idx > 0 && <div className="hidden sm:block h-7 w-px bg-white/20" />}
            <div>
              <span className="text-[10px] font-bold text-rose-200 uppercase block">
                {m.label}
              </span>
              <span
                className={`text-base font-extrabold font-mono block ${
                  m.isPrimary || m.highlight ? 'text-white' : 'text-rose-100'
                }`}
              >
                {m.value}
              </span>
            </div>
          </React.Fragment>
        ))}

        {statusMessage && (
          <div className="text-[11px] font-medium text-rose-200/90 italic">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Button Actions: Confident Primary + Quieter Secondary */}
      <div className="flex items-center gap-3 shrink-0">
        {effectiveSecondaryClick && (
          <button
            type="button"
            onClick={effectiveSecondaryClick}
            disabled={isSubmitting}
            className="btn-secondary-liquid inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-50"
          >
            <SecondaryIcon className="w-3.5 h-3.5 text-white/80" />
            <span>{secondaryLabel}</span>
          </button>
        )}

        <button
          type={formId ? 'submit' : 'button'}
          form={formId}
          onClick={onPrimaryClick}
          disabled={isPrimaryDisabled || isSubmitting}
          className="btn-liquid inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <PrimaryIcon className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
          <span>{isSubmitting ? 'Saving...' : primaryLabel}</span>
        </button>
      </div>
    </div>
  );
};
