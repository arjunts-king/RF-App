import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Users2, Lock } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, switchUserRole } = useAuth();

  const roles: { role: UserRole; label: string; shortLabel: string; desc: string }[] = [
    { role: 'admin', label: '1. Owner / Admin', shortLabel: 'Owner', desc: 'Full control, permanent deletes & audit log' },
    { role: 'master_accountant', label: '2. Master Acct', shortLabel: 'Master', desc: 'Full access except deletes & surveillance' },
    { role: 'junior_accountant', label: '3. Junior Acct', shortLabel: 'Junior', desc: 'Field entry only. No master data/payments' },
    { role: 'viewer', label: '4. Viewer', shortLabel: 'Viewer', desc: 'Read-only reports & dashboards' }
  ];

  // For Master Accountant, Junior Accountant, and Viewer:
  // "Master/Junior Accountant see their role as a fixed read-only label, never a selector"
  if (currentUser.role !== 'admin') {
    const roleLabels: Record<UserRole, string> = {
      admin: 'Owner / Admin',
      master_accountant: 'Master Accountant',
      junior_accountant: 'Junior Accountant',
      viewer: 'Management / Viewer'
    };

    return (
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-rose-200/80 rounded-xl px-3 py-1 shadow-xs max-w-full">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
          <Lock className="w-3.5 h-3.5 text-rose-600" />
          <span className="hidden sm:inline">Designated Role:</span>
        </div>
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
          {roleLabels[currentUser.role]} (Read-Only)
        </span>
        <button
          onClick={() => switchUserRole('admin')}
          title="Return to Owner / Admin session"
          className="text-[11px] text-rose-600 hover:text-rose-800 underline font-semibold ml-1 cursor-pointer"
        >
          Reset to Admin
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm border border-rose-200/80 rounded-xl px-2 py-1 shadow-xs max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 px-1 border-r border-rose-200 pr-2 shrink-0">
        <Users2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Role Simulator:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
        {roles.map((r) => {
          const isActive = currentUser.role === r.role;
          return (
            <button
              key={r.role}
              onClick={() => switchUserRole(r.role)}
              title={r.desc}
              className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'text-ink-700 hover:bg-rose-100/60 hover:text-rose-900'
              }`}
            >
              <span className="sm:hidden">{r.shortLabel}</span>
              <span className="hidden sm:inline">{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
