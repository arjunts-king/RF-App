import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Building,
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const BusinessSettingsView: React.FC = () => {
  const { permissions } = useAuth();
  const {
    businessSettings,
    updateBusinessSettings,
    clearAllTransactions,
    wipeDatabaseCompletely,
    loadStarterPresets
  } = useData();

  const [formData, setFormData] = useState({ ...businessSettings });
  const [confirmAction, setConfirmAction] = useState<'wipe' | 'clear-transactions' | 'starter-presets' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessSettings(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-600" />
            Business Profile &amp; Application Customization
          </h2>
          <p className="text-xs text-ink-500">
            Personalize your company branding, tax registration, financial year, and database state.
          </p>
        </div>
      </div>

      {/* Company Branding & Letterhead Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-6 text-xs">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2 mb-3">
            <Building className="w-4 h-4" />
            1. Company Profile &amp; Statement Letterhead
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">
                Company / Business Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                className="w-full p-2.5 font-bold text-ink-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Active Financial Year</label>
              <input
                type="text"
                placeholder="e.g. FY 2026-27"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                className="w-full p-2.5 font-bold text-rose-700 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full p-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            2. Address &amp; Compliance Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block font-semibold text-ink-700 mb-1">Office / Wharf Address</label>
              <input
                type="text"
                placeholder="e.g. Pier Road, Fisheries Terminal Wharf"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">District / City</label>
              <input
                type="text"
                placeholder="e.g. Ernakulam / Cochin"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Kerala"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Business Phone</label>
              <input
                type="text"
                placeholder="+91 98470 ..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 32AABCC8810K1ZX"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Company PAN</label>
              <input
                type="text"
                placeholder="e.g. AABCC8810K"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="accounts@mycompany.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Company Branding</span>
          </button>
        </div>
      </form>

      {/* Database State Controls & Clean Slate */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-600" />
          Database Management &amp; Clean Slate Controls
        </h3>
        <p className="text-ink-500">
          Configure whether you want an absolute zero clean state to enter all your species and suppliers manually, or load optional starter presets.
        </p>

        {!permissions.isOwnerAdmin && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Administrator Privileges Required: Database wipes and transaction purges can only be performed by Owner / Admin users.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Option 1: Clean Blank State */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3 flex flex-col justify-between">
            <div>
              <span className="font-bold text-rose-950 block text-sm">Wipe to 100% Clean State</span>
              <p className="text-ink-500 mt-1">
                Removes all transactions and master data completely so you can start from absolute zero.
              </p>
            </div>
            <button
              disabled={!permissions.isOwnerAdmin}
              onClick={() => {
                if (!permissions.isOwnerAdmin) return;
                setConfirmAction('wipe');
              }}
              className={`w-full py-2 font-bold rounded-xl transition ${
                permissions.isOwnerAdmin
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                  : 'bg-rose-200 text-rose-400 cursor-not-allowed'
              }`}
              title={!permissions.isOwnerAdmin ? 'Requires Owner/Admin role' : ''}
            >
              Reset to 100% Empty
            </button>
          </div>

          {/* Option 2: Clear Transactions Only */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3 flex flex-col justify-between">
            <div>
              <span className="font-bold text-ink-900 block text-sm">Clear Transactions Only</span>
              <p className="text-ink-500 mt-1">
                Deletes all purchase entries and payments, but retains your configured suppliers and species.
              </p>
            </div>
            <button
              disabled={!permissions.isOwnerAdmin}
              onClick={() => {
                if (!permissions.isOwnerAdmin) return;
                setConfirmAction('clear-transactions');
              }}
              className={`w-full py-2 border font-bold rounded-xl transition ${
                permissions.isOwnerAdmin
                  ? 'border-gray-300 hover:bg-gray-100 text-ink-700 cursor-pointer'
                  : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
              title={!permissions.isOwnerAdmin ? 'Requires Owner/Admin role' : ''}
            >
              Clear All Transactions
            </button>
          </div>

          {/* Option 3: Load Starter Presets */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 flex flex-col justify-between">
            <div>
              <span className="font-bold text-emerald-950 block text-sm">Load Starter Presets</span>
              <p className="text-ink-500 mt-1">
                Quickly imports standard seafood presets (Vannamei, Sizes, Counts, Kochi Harbour, Ice, Transport) which you can freely customize.
              </p>
            </div>
            <button
              disabled={!permissions.isOwnerAdmin}
              onClick={() => {
                if (!permissions.isOwnerAdmin) return;
                setConfirmAction('starter-presets');
              }}
              className={`w-full py-2 font-bold rounded-xl transition ${
                permissions.isOwnerAdmin
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
              }`}
              title={!permissions.isOwnerAdmin ? 'Requires Owner/Admin role' : ''}
            >
              Load Starter Templates
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction === 'wipe'
            ? 'Confirm Complete Database Wipe'
            : confirmAction === 'clear-transactions'
            ? 'Confirm Clear Transactions'
            : 'Confirm Loading Starter Templates'
        }
        subtitle={
          confirmAction === 'wipe'
            ? 'Permanent reset to a completely blank slate'
            : confirmAction === 'clear-transactions'
            ? 'Reset purchases and payments ledger'
            : 'Import standard seafood master presets'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {confirmAction === 'wipe' && (
            <>
              <p className="text-ink-700 font-medium">
                Are you sure you want to completely wipe all data to a 100% blank slate?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wider block">Irreversible Action</span>
                <p className="text-[11px] leading-relaxed">
                  This permanently removes <strong>ALL transactions, purchases, payments, audit logs, and master records</strong> (suppliers, species, grades, sizes, counts, locations, bank accounts, and expenses).
                </p>
              </div>
            </>
          )}

          {confirmAction === 'clear-transactions' && (
            <>
              <p className="text-ink-700 font-medium">
                Are you sure you want to wipe all purchases and payment records?
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wider block">Transactions Reset</span>
                <p className="text-[11px] leading-relaxed">
                  All procurement entries and voucher payments will be permanently deleted. Your master suppliers, species, landing centres, and bank accounts will remain intact.
                </p>
              </div>
            </>
          )}

          {confirmAction === 'starter-presets' && (
            <>
              <p className="text-ink-700 font-medium">
                Load standard seafood master templates into your account?
              </p>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider block">Master Presets</span>
                <p className="text-[11px] leading-relaxed">
                  Standard presets (Vannamei Shrimp, industry count brackets, Kochi Harbour, Ice, Vehicle Rent, Dalali) will be populated. You can freely edit or delete any item afterwards.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmAction === 'wipe') {
                  wipeDatabaseCompletely();
                } else if (confirmAction === 'clear-transactions') {
                  clearAllTransactions();
                } else if (confirmAction === 'starter-presets') {
                  loadStarterPresets();
                }
                setConfirmAction(null);
              }}
              className={`px-4 py-2 rounded-xl font-bold text-white transition shadow-xs ${
                confirmAction === 'starter-presets'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {confirmAction === 'wipe'
                ? 'Confirm Wipe 100%'
                : confirmAction === 'clear-transactions'
                ? 'Confirm Clear Transactions'
                : 'Load Presets'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
