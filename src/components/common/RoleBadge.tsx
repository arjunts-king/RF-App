import React from 'react';
import { UserRole } from '../../types';
import { ShieldCheck, UserCheck, ShieldAlert, Eye } from 'lucide-react';

export const RoleBadge: React.FC<{ role: UserRole; size?: 'sm' | 'md' }> = ({ role, size = 'sm' }) => {
  const configs: Record<UserRole, { label: string; bg: string; text: string; border: string; icon: any }> = {
    admin: {
      label: 'Owner / Admin',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: ShieldAlert
    },
    master_accountant: {
      label: 'Master Accountant',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: ShieldCheck
    },
    junior_accountant: {
      label: 'Junior Accountant',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: UserCheck
    },
    viewer: {
      label: 'Management / Viewer',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: Eye
    }
  };

  const conf = configs[role] || configs.viewer;
  const Icon = conf.icon;
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${conf.bg} ${conf.text} ${conf.border} ${pad}`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {conf.label}
    </span>
  );
};
