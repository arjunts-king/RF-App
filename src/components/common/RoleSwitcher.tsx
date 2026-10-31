import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Eye,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react';

export interface RoleSwitcherProps {
  variant?: 'popover' | 'cards' | 'inline';
  onRoleChanged?: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  variant = 'popover',
  onRoleChanged
}) => {
  const { currentUser, switchUserRole } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rolesConfig: {
    role: UserRole;
    name: string;
    shortTitle: string;
    badge: string;
    desc: string;
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    activeBg: string;
  }[] = [
    {
      role: 'admin',
      name: 'Owner / Admin',
      shortTitle: 'Admin',
      badge: 'Full Access',
      desc: 'Complete administrative authority, permanent record deletions, staff role management, and surveillance audit logs.',
      icon: ShieldAlert,
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      activeBg: 'bg-rose-600 text-white'
    },
    {
      role: 'master_accountant',
      name: 'Master Accountant',
      shortTitle: 'Master Acct',
      badge: 'Financial Control',
      desc: 'Procurement & sales management, payment reconciliations, supplier ledgers, transaction voiding, and master data setup.',
      icon: ShieldCheck,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      activeBg: 'bg-purple-600 text-white'
    },
    {
      role: 'junior_accountant',
      name: 'Junior Accountant',
      shortTitle: 'Junior Acct',
      badge: 'Data Entry',
      desc: 'Fast harbour purchase weighment entry, processing lot inputs, and daily shift records. Master data and deletion are restricted.',
      icon: UserCheck,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      activeBg: 'bg-blue-600 text-white'
    },
    {
      role: 'viewer',
      name: 'Management / Viewer',
      shortTitle: 'Viewer',
      badge: 'Read-Only',
      desc: 'Executive analytics, procurement summaries, production yield matrix, and commercial export reports. All forms are read-only.',
      icon: Eye,
      color: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      activeBg: 'bg-amber-600 text-white'
    }
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectRole = (role: UserRole) => {
    if (currentUser.role === role) {
      setIsOpen(false);
      return;
    }
    switchUserRole(role);
    const target = rolesConfig.find((r) => r.role === role);
    showToast(`Role switched to ${target?.name || role}`, 'success');
    setIsOpen(false);
    if (onRoleChanged) onRoleChanged();
  };

  const currentConfig = rolesConfig.find((r) => r.role === currentUser.role) || rolesConfig[0];
  const CurrentIcon = currentConfig.icon;

  // Cards Variant (used inside Profile Modal & Settings)
  if (variant === 'cards') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-ink-900">
              Choose Your Active Role
            </span>
          </div>
          <span className="text-[11px] text-ink-500 font-medium">
            Click any role to test its permissions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rolesConfig.map((r) => {
            const Icon = r.icon;
            const isSelected = currentUser.role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleSelectRole(r.role)}
                className={`p-3.5 rounded-2xl border text-left card-liquid-hover relative flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs ring-2 ring-rose-500/20'
                    : 'glass-surface-regular border-white/80 hover:border-rose-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-rose-600 text-white' : `${r.bgColor} ${r.color}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                        <span>{r.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                        {r.badge}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-ink-600 leading-snug">
                  {r.desc}
                </p>

                <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[10px]">
                  <span className={isSelected ? 'font-bold text-rose-700' : 'text-ink-400'}>
                    {isSelected ? '● Currently Active' : 'Click to Switch'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Inline Variant (e.g. for mobile drawer)
  if (variant === 'inline') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider flex items-center justify-between">
          <span>Choose Active Role:</span>
          <span className="text-rose-600 font-semibold lowercase">tap to change</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {rolesConfig.map((r) => {
            const Icon = r.icon;
            const isSelected = currentUser.role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleSelectRole(r.role)}
                className={`flex items-center gap-2 p-2 rounded-xl text-left border transition ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                    : 'bg-white text-ink-800 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : r.color}`} />
                <div className="min-w-0">
                  <div className="text-xs truncate">{r.shortTitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default Popover Variant (Top bar pill with dropdown)
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary-liquid flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface-thin hover:border-rose-300 text-ink-800 transition group cursor-pointer"
        title="Click to choose / switch your active role"
        aria-expanded={isOpen}
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${currentConfig.bgColor} ${currentConfig.color}`}>
          <CurrentIcon className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-ink-500 hidden xl:inline">Role:</span>
          <span className="text-ink-900 font-bold">{currentConfig.name}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-ink-400 group-hover:text-rose-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-surface-thick rounded-2xl border border-white/90 p-3 z-50 animate-liquid-pop shadow-2xl">
          <div className="px-2 py-1.5 border-b border-gray-100 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Choose Active Role
            </span>
            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Instant Switch
            </span>
          </div>

          <div className="space-y-1">
            {rolesConfig.map((r) => {
              const Icon = r.icon;
              const isSelected = currentUser.role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleSelectRole(r.role)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-rose-50 border border-rose-200 text-ink-900'
                      : 'hover:bg-gray-50 border border-transparent text-ink-700'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isSelected ? 'bg-rose-600 text-white' : `${r.bgColor} ${r.color}`
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-900">
                        {r.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-rose-700 stroke-[3]" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-snug line-clamp-2">
                      {r.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 px-2 flex items-center justify-between text-[10px] text-ink-400">
            <span>Session persistence enabled</span>
            <span>4 distinct security levels</span>
          </div>
        </div>
      )}
    </div>
  );
};
