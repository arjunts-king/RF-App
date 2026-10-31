import React from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface ActionItem {
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  title?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: ActionItem;
  secondaryActions?: ActionItem[];
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  children
}) => {
  return (
    <div className="mb-6 space-y-3">
      {/* Breadcrumbs if provided */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <span className="text-ink-300">/</span>}
                {crumb.onClick && !isLast ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-rose-700 transition hover:underline"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className={isLast ? 'text-ink-900 font-semibold' : ''}>
                    {crumb.label}
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 font-sans">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-ink-500 font-normal leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Group: One Confident Primary Button with Quieter Secondary Actions */}
        {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {secondaryActions?.map((act, index) => {
              const Icon = act.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={act.onClick}
                  disabled={act.disabled}
                  title={act.title}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-ink-700 text-xs font-semibold shadow-2xs hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-ink-500" />}
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-rose-600/30"
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
