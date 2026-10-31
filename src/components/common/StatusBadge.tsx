import React from 'react';

export type StatusBadgeType =
  | 'paid'
  | 'partially-paid'
  | 'unpaid'
  | 'overdue'
  | 'realized'
  | 'partially-realized'
  | 'not-realized'
  | 'exception'
  | 'voided'
  | 'active'
  | 'inactive'
  | 'draft';

interface StatusBadgeProps {
  status: StatusBadgeType | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm'
}) => {
  const normalized = String(status).toLowerCase().replace(/[\s_]+/g, '-');

  let style = 'bg-gray-100 text-gray-700 border-gray-300';
  let defaultLabel = label || status;

  switch (normalized) {
    case 'paid':
    case 'fully-paid':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      defaultLabel = label || 'Paid';
      break;
    case 'partially-paid':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      defaultLabel = label || 'Partially paid';
      break;
    case 'unpaid':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      defaultLabel = label || 'Unpaid';
      break;
    case 'overdue':
      style = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
      defaultLabel = label || 'Overdue';
      break;
    case 'realized':
    case 'fully-realized':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      defaultLabel = label || 'Realized';
      break;
    case 'partially-realized':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      defaultLabel = label || 'Partially realized';
      break;
    case 'not-realized':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      defaultLabel = label || 'Not realized';
      break;
    case 'exception':
    case 'has-variance':
      style = 'bg-amber-100 text-amber-900 border-amber-300';
      defaultLabel = label || 'Exception';
      break;
    case 'voided':
      style = 'bg-gray-100 text-gray-500 border-gray-300 line-through';
      defaultLabel = label || 'Voided';
      break;
    case 'active':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      defaultLabel = label || 'Active';
      break;
    case 'inactive':
      style = 'bg-gray-100 text-gray-500 border-gray-200';
      defaultLabel = label || 'Inactive';
      break;
    case 'draft':
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      defaultLabel = label || 'Draft';
      break;
    default:
      style = 'bg-gray-50 text-ink-700 border-gray-200';
      defaultLabel = label || status;
  }

  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border transition-colors ${sizeClass} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{defaultLabel}</span>
    </span>
  );
};
