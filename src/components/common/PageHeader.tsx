import React from 'react';

export type BreadcrumbItem = string | {
  label: string;
  onClick?: () => void;
};

export interface ActionItem {
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  title?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: ActionItem;
  secondaryAction?: ActionItem;
  secondaryActions?: ActionItem[];
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  badge,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  secondaryActions = [],
  children
}) => {
  const effectiveDescription = description || subtitle;
  const allSecondaryActions = [
    ...(secondaryAction ? [secondaryAction] : []),
    ...secondaryActions
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Breadcrumbs if provided */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-rose-200 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const label = typeof crumb === 'string' ? crumb : crumb.label;
            const onClick = typeof crumb === 'string' ? undefined : crumb.onClick;
            return (
              <React.Fragment key={label + idx}>
                {idx > 0 && <span className="text-white/40">/</span>}
                {onClick && !isLast ? (
                  <button
                    onClick={onClick}
                    className="hover:text-white transition hover:underline"
                  >
                    {label}
                  </button>
                ) : (
                  <span className={isLast ? 'text-white font-semibold' : ''}>
                    {label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Header Row: Title on Left, Single Primary Button (+ Quieter Secondaries) on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-md">
                {badge}
              </span>
            )}
          </div>
          {effectiveDescription && (
            <p className="text-sm text-rose-100 font-normal leading-relaxed max-w-3xl">
              {effectiveDescription}
            </p>
          )}
        </div>

        {/* Action Group: One Confident Primary Button with Quieter Secondary Actions */}
        {(primaryAction || allSecondaryActions.length > 0) && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {allSecondaryActions.map((act, index) => {
              const Icon = act.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={act.onClick}
                  disabled={act.disabled}
                  title={act.title}
                  className="btn-secondary-liquid inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/30 bg-white/15 text-white text-xs font-semibold shadow-md hover:bg-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-white/80" />}
                  <span>{act.label}</span>
                </button>
              );
            })}

            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                title={primaryAction.title}
                className="btn-liquid inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-white/95 text-rose-900 text-xs font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
                <span>{primaryAction.label}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {children}
    </div>
  );
};
