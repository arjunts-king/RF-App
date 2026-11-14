import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLiquidGlass } from '../../context/LiquidGlassContext';
import { PageHeader } from '../common/PageHeader';
import {
  Building,
  Save,
  RotateCcw,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const BusinessSettingsView: React.FC = () => {
  const { permissions } = useAuth();
  const {
    businessSettings,
    updateBusinessSettings,
    clearAllTransactions,
    wipeDatabaseCompletely,
    purgePurchaseModuleData,
    loadStarterPresets
  } = useData();
  const {
    reduceTransparency,
    setReduceTransparency,
    reduceMotion,
    setReduceMotion,
    ambientGlow,
    setAmbientGlow
  } = useLiquidGlass();

  const [formData, setFormData] = useState({ ...businessSettings });
  const [confirmAction, setConfirmAction] = useState<'wipe' | 'clear-transactions' | 'purge-purchase' | 'starter-presets' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessSettings(formData);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Business profile & application settings"
        subtitle="Personalize your company branding, tax registration, financial year, and database state."
        breadcrumbs={['Settings', 'Business Profile']}
      />

      {/* Company Branding & Letterhead Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-6 text-xs">
        <div>
          <div className="border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-rose-700" />
              1. Company Profile &amp; Statement Letterhead
            </h3>
            <p className="text-[11px] text-ink-500 mt-0.5">Appears on invoices, vouchers, and statements</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-ink-700 mb-1">
                Company / Business Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                className="w-full p-2.5 font-bold text-ink-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Active Financial Year</label>
              <input
                type="text"
                placeholder="e.g. FY 2026-27"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                className="w-full p-2.5 font-bold text-rose-700 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full p-2.5 font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
              2. Address &amp; Compliance Details
            </h3>
            <p className="text-[11px] text-ink-500">Official tax, wharf, and contact coordinates</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block font-bold text-ink-700 mb-1">Office / Wharf Address</label>
              <input
                type="text"
                placeholder="e.g. Pier Road, Fisheries Terminal Wharf"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">District / City</label>
              <input
                type="text"
                placeholder="e.g. Ernakulam / Cochin"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Kerala"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Business Phone</label>
              <input
                type="text"
                placeholder="+91 98470 ..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 32AABCC8810K1ZX"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Company PAN</label>
              <input
                type="text"
                placeholder="e.g. AABCC8810K"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-700 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="accounts@mycompany.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            className="btn-liquid flex items-center gap-2 px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Company Branding</span>
          </button>
        </div>
      </form>

      {/* 3. Liquid Glass & Motion System Preferences (iOS Polish Layer) */}
      <div className="glass-surface-regular p-6 rounded-2xl shadow-xs border border-white/80 space-y-4 text-xs">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            3. Liquid Glass Surfaces &amp; Motion Polish Preferences
          </h3>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Configure iOS-style liquid frosted glass translucency, spring entrance transitions, and ambient refraction orbs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="p-4 rounded-xl border border-gray-200 bg-white/70 hover:bg-white cursor-pointer transition flex flex-col justify-between card-liquid-hover">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-ink-900 text-sm">Reduce Transparency</span>
                <input
                  type="checkbox"
                  checked={reduceTransparency}
                  onChange={(e) => setReduceTransparency(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Replaces semi-transparent frosted glass with crisp solid white backgrounds. Ideal for high-contrast accessibility or low-power displays.
              </p>
            </div>
            <span className="text-[10px] font-bold text-rose-700 mt-3 pt-2 border-t border-gray-100">
              {reduceTransparency ? 'Active: Solid White Mode' : 'Default: Liquid Glass Mode'}
            </span>
          </label>

          <label className="p-4 rounded-xl border border-gray-200 bg-white/70 hover:bg-white cursor-pointer transition flex flex-col justify-between card-liquid-hover">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-ink-900 text-sm">Reduce Motion</span>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Disables spring lifts, page translations, and slow floating animations. Replaces transitions with instantaneous state changes.
              </p>
            </div>
            <span className="text-[10px] font-bold text-rose-700 mt-3 pt-2 border-t border-gray-100">
              {reduceMotion ? 'Active: Instant Transitions' : 'Default: Spring Fluid Motion'}
            </span>
          </label>

          <label className="p-4 rounded-xl border border-gray-200 bg-white/70 hover:bg-white cursor-pointer transition flex flex-col justify-between card-liquid-hover">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-ink-900 text-sm">Ambient Fluid Glow</span>
                <input
                  type="checkbox"
                  checked={ambientGlow}
                  onChange={(e) => setAmbientGlow(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Places subtle blush ambient light shapes behind hero headers, giving frosted glass surfaces gentle color refraction.
              </p>
            </div>
            <span className="text-[10px] font-bold text-rose-700 mt-3 pt-2 border-t border-gray-100">
              {ambientGlow ? 'Active: Ambient Refraction' : 'Disabled: Plain Neutral Light'}
            </span>
          </label>
        </div>
      </div>

      {/* Database State Controls & Clean Slate */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-700" />
          Database Management &amp; Clean Slate Controls
        </h3>
        <p className="text-ink-500">
          Configure whether you want an absolute zero clean state to enter all your species and suppliers manually, or load optional starter presets.
        </p>

        {!permissions.isOwnerAdmin && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs">
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
              className={`w-full py-2 font-bold rounded-full transition ${
                permissions.isOwnerAdmin
                  ? 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer shadow-xs'
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
              className={`w-full py-2 border font-bold rounded-full transition ${
                permissions.isOwnerAdmin
                  ? 'border-gray-300 hover:bg-gray-100 text-ink-700 cursor-pointer'
                  : 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
              title={!permissions.isOwnerAdmin ? 'Requires Owner/Admin role' : ''}
            >
              Clear All Transactions
            </button>
          </div>

          {/* Option 3: Purge Purchase Module Only */}
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 space-y-3 flex flex-col justify-between">
            <div>
              <span className="font-bold text-rose-950 block text-sm">Purge Purchase Module</span>
              <p className="text-ink-500 mt-1">
                Deletes all purchase transactions and purchase master reference data (suppliers, locations, grades, sizes, counts, expenses, accounts) while keeping Sales and other modules intact.
              </p>
            </div>
            <button
              disabled={!permissions.isOwnerAdmin}
              onClick={() => {
                if (!permissions.isOwnerAdmin) return;
                setConfirmAction('purge-purchase');
              }}
              className={`w-full py-2 font-bold rounded-full transition ${
                permissions.isOwnerAdmin
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs'
                  : 'bg-rose-200 text-rose-400 cursor-not-allowed'
              }`}
              title={!permissions.isOwnerAdmin ? 'Requires Owner/Admin role' : ''}
            >
              Purge Purchase Module Data
            </button>
          </div>

          {/* Option 4: Load Starter Presets */}
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
              className={`w-full py-2 font-bold rounded-full transition ${
                permissions.isOwnerAdmin
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
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
            : confirmAction === 'purge-purchase'
            ? 'Confirm Purge Purchase Module'
            : 'Confirm Loading Starter Templates'
        }
        subtitle={
          confirmAction === 'wipe'
            ? 'Permanent reset to a completely blank slate'
            : confirmAction === 'clear-transactions'
            ? 'Reset purchases and payments ledger'
            : confirmAction === 'purge-purchase'
            ? 'Delete all purchase transactions and master reference data'
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

          {confirmAction === 'purge-purchase' && (
            <>
              <p className="text-ink-700 font-medium">
                Are you sure you want to delete all purchase transactions and master reference data from the purchase module?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wider block">Procurement Module Purge</span>
                <p className="text-[11px] leading-relaxed">
                  All <strong>purchase entries, voucher payments, purchase returns, purchase species, suppliers, locations, grades, sizes, counts, expense types, and bank accounts</strong> in the purchase module will be deleted. Commercial Export Invoices and Sales Masters remain completely untouched.
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
                } else if (confirmAction === 'purge-purchase') {
                  purgePurchaseModuleData();
                } else if (confirmAction === 'starter-presets') {
                  loadStarterPresets();
                }
                setConfirmAction(null);
              }}
              className={`px-4 py-2 rounded-full font-bold text-white transition shadow-xs ${
                confirmAction === 'starter-presets'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {confirmAction === 'wipe'
                ? 'Confirm Wipe 100%'
                : confirmAction === 'clear-transactions'
                ? 'Confirm Clear Transactions'
                : confirmAction === 'purge-purchase'
                ? 'Confirm Purge Purchase Data'
                : 'Load Presets'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
