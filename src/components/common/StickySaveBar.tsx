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
    <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Live Calculated Metrics */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs flex-wrap">
        {metrics.map((m, idx) => (
          <React.Fragment key={m.label}>
            {idx > 0 && <div className="hidden sm:block h-7 w-px bg-gray-200" />}
            <div>
              <span className="text-[10px] font-bold text-ink-500 uppercase block">
                {m.label}
              </span>
              <span
                className={`text-base font-extrabold font-mono block ${
                  m.isPrimary || m.highlight ? 'text-rose-700' : 'text-ink-900'
                }`}
              >
                {m.value}
              </span>
            </div>
          </React.Fragment>
        ))}

        {statusMessage && (
          <div className="text-[11px] font-medium text-ink-500 italic">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-ink-700 text-xs font-semibold shadow-2xs hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <SecondaryIcon className="w-3.5 h-3.5 text-ink-500" />
            <span>{secondaryLabel}</span>
          </button>
        )}

        <button
          type={formId ? 'submit' : 'button'}
          form={formId}
          onClick={onPrimaryClick}
          disabled={isPrimaryDisabled || isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-rose-600/30"
        >
          <PrimaryIcon className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
          <span>{isSubmitting ? 'Saving...' : primaryLabel}</span>
        </button>
      </div>
    </div>
  );
};
