import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RoleBadge } from './RoleBadge';
import { RoleSwitcher } from './RoleSwitcher';
import { Modal } from './Modal';
import { Wifi, WifiOff, RefreshCw, Shield, Menu } from 'lucide-react';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { currentUser } = useAuth();
  const { isOnline, offlineQueue, syncOfflineQueue, businessSettings } = useData();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs px-4 lg:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button
                onClick={onOpenMobileMenu}
                className="md:hidden p-1.5 -ml-1 text-ink-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-200 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M18.5 8C17 6.5 14.5 6 12 7C9.5 8 7 9 4.5 8C3.5 10 3.5 14 4.5 16C7 15 9.5 16 12 17C14.5 18 17 17.5 18.5 16C20.5 14 20.5 10 18.5 8ZM15.5 11C14.95 11 14.5 10.55 14.5 10C14.5 9.45 14.95 9 15.5 9C16.05 9 16.5 9.45 16.5 10C16.5 10.55 16.05 11 15.5 11Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-ink-900">
                  {businessSettings.businessName}
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  {businessSettings.financialYear}
                </span>
              </div>
              <p className="text-xs text-ink-500 font-medium">{businessSettings.tagline}</p>
            </div>
          </div>

          {/* Role Switcher for instant evaluation */}
          <div className="order-last md:order-none w-full md:w-auto flex justify-center">
            <RoleSwitcher />
          </div>

          {/* Status & Profile Strip */}
          <div className="flex items-center gap-3">
            {/* PWA Network Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-amber-700" />}
              <span className="hidden sm:inline">{isOnline ? 'Harbour Live' : 'Offline Mode'}</span>
            </div>

            {/* Offline sync button if pending records */}
            {offlineQueue.length > 0 && (
              <button
                onClick={syncOfflineQueue}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                title="Sync locally cached offline records"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sync ({offlineQueue.length})</span>
              </button>
            )}

            {/* User Profile Pill */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-ink-900 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-ink-500">{currentUser.designation}</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile & Non-Admin Fixed Designation Modal */}
      <Modal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        title="User Profile & Security Credentials"
        subtitle="Individual authenticated staff session"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-50 border border-rose-200">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-base font-bold text-ink-900">{currentUser.name}</h4>
              <p className="text-xs text-ink-500">{currentUser.email}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <RoleBadge role={currentUser.role} size="sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-ink-500 block font-medium">Designation (Fixed)</span>
              <span className="text-ink-900 font-semibold text-sm mt-0.5 block">{currentUser.designation}</span>
              <span className="text-[11px] text-ink-500 mt-1 block">Role change restricted to Owner/Admin</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-ink-500 block font-medium">Account ID</span>
              <span className="text-ink-900 font-semibold text-sm mt-0.5 block">{currentUser.id}</span>
              <span className="text-[11px] text-ink-500 mt-1 block">Created: {new Date(currentUser.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded-xl text-xs space-y-2">
            <h5 className="font-semibold text-ink-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-600" />
              Active System Permissions:
            </h5>
            <ul className="space-y-1 text-ink-700">
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Permanent Deletion Authority: <strong>{currentUser.role === 'admin' ? 'Granted (Exclusive)' : 'Denied'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' || currentUser.role === 'master_accountant' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Transaction Voiding / Master Data Management: <strong>{currentUser.role === 'admin' || currentUser.role === 'master_accountant' ? 'Granted' : 'Denied'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role !== 'viewer' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Purchase Data Entry: <strong>{currentUser.role !== 'viewer' ? 'Granted' : 'Read-Only'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                Audit Trail Surveillance View: <strong>{currentUser.role === 'admin' ? 'Accessible' : 'Restricted to Owner/Admin'}</strong>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};
