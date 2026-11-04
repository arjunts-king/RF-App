import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Layers,
  Lock,
  Unlock,
    AlertTriangle,
    ShieldAlert,
  } from 'lucide-react';
import { PeriodCloseLock } from '../../types';
import { Modal } from '../common/Modal';

export const PeriodCloseView: React.FC = () => {
  const {
    periodCloseLocks,
    inventoryCalculation,
    closePeriodLock,
    unlockPeriod
  } = useData();

  const { permissions, currentUser } = useAuth();
  const isAdmin = currentUser.role === 'admin';

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [selectedLockForUnlock, setSelectedLockForUnlock] = useState<PeriodCloseLock | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

  // Lock Form State
  const [periodToLock, setPeriodToLock] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [lockRemarks, setLockRemarks] = useState('');

  const { totalClosingQty, totalClosingValue, reconciliation } = inventoryCalculation;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatKg = (val: number) => {
    return `${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Kg`;
  };

  const handleOpenLockModal = () => {
    setLockRemarks('Monthly reconciliation audit passed successfully.');
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = (e: React.FormEvent) => {
    e.preventDefault();
    closePeriodLock(periodToLock, totalClosingQty, totalClosingValue, lockRemarks);
    setIsLockModalOpen(false);
  };

  const handleOpenUnlockModal = (lock: PeriodCloseLock) => {
    setSelectedLockForUnlock(lock);
    setUnlockReason('');
    setIsUnlockModalOpen(true);
  };

  const handleConfirmUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLockForUnlock || !unlockReason.trim()) return;
    unlockPeriod(selectedLockForUnlock.period, unlockReason.trim());
    setIsUnlockModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Period Close & Month-End Locking
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Audit Seal Engine
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Month-end lock after inventory reconciliation passes. Locked periods prevent retroactive transaction alterations except by Owner / Admin with audit justification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {permissions.canPeriodClose && (
            <button
              onClick={handleOpenLockModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Inventory Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Reconciliation Status Card */}
      <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-900">
              Live Mathematical Reconciliation Status
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              reconciliation.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {reconciliation.status}
            </span>
          </div>
          <div className="text-[11px] font-bold text-ink-600">
            Formula Check: Opening + Receipts - Issues + Adjustments = Closing
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Opening Value</div>
            <div className="text-sm font-bold text-ink-900 mt-0.5">{formatCurrency(reconciliation.openingValue)}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div className="text-[10px] text-emerald-700 uppercase font-semibold">(+) Total Receipts</div>
            <div className="text-sm font-bold text-emerald-900 mt-0.5">{formatCurrency(reconciliation.receiptsValue)}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
            <div className="text-[10px] text-rose-700 uppercase font-semibold">(-) Total Issues (COGS)</div>
            <div className="text-sm font-bold text-rose-900 mt-0.5">{formatCurrency(reconciliation.issuesValue)}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
            <div className="text-[10px] text-amber-700 uppercase font-semibold">(+/-) Adjustments</div>
            <div className="text-sm font-bold text-amber-900 mt-0.5">{formatCurrency(reconciliation.adjustmentsValue)}</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
            <div className="text-[10px] text-blue-700 uppercase font-semibold">(=) Closing Value</div>
            <div className="text-sm font-black text-blue-900 mt-0.5">{formatCurrency(reconciliation.closingValue)}</div>
          </div>
        </div>
      </div>

      {/* Locked Periods Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Closing Quantity (Kg)</th>
                <th className="py-3 px-3 text-right">Closing Valuation (₹)</th>
                <th className="py-3 px-3">Locked By / Date</th>
                <th className="py-3 px-3">Remarks / Unlocked Info</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {periodCloseLocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-400 font-semibold">
                    No closed inventory periods. Click "Lock Inventory Period" to seal prior months.
                  </td>
                </tr>
              ) : (
                periodCloseLocks.map((lock) => {
                  const isLocked = lock.status === 'locked';

                  return (
                    <tr key={lock.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-ink-900 text-sm">
                        {lock.period}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                            isLocked
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          {isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink-900">
                        {formatKg(lock.closingQty || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800">
                        {formatCurrency(lock.closingValue || 0)}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-ink-500">
                        <span className="font-semibold text-ink-800 block">{lock.closedBy}</span>
                        <span>{new Date(lock.closedAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-ink-600 max-w-[220px]">
                        {lock.remarks || lock.notes || '—'}
                        {lock.unlockReason && (
                          <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                            Unlocked by {lock.unlockedBy}: {lock.unlockReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isLocked && isAdmin && (
                          <button
                            onClick={() => handleOpenUnlockModal(lock)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Unlock</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOCK PERIOD */}
      {isLockModalOpen && (
        <Modal
          isOpen={isLockModalOpen}
          onClose={() => setIsLockModalOpen(false)}
          title="Lock Inventory Accounting Period"
        >
          <form onSubmit={handleConfirmLock} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Month-End Seal Notice</span>
              </div>
              <p>
                Locking this period will freeze closing balances and prevent any modifications to purchases or sales within the period without Owner/Admin intervention.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Period (YYYY-MM) *</label>
              <input
                type="text"
                required
                pattern="^\d{4}-(0[1-9]|1[0-2])$"
                placeholder="2026-10"
                value={periodToLock}
                onChange={(e) => setPeriodToLock(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Reconciled Closing Qty:</span>
                <span className="font-bold text-ink-900">{formatKg(totalClosingQty)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Reconciled Closing Valuation:</span>
                <span className="font-black text-emerald-800">{formatCurrency(totalClosingValue)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Audit Closing Notes</label>
              <textarea
                rows={2}
                value={lockRemarks}
                onChange={(e) => setLockRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none"
                placeholder="Audit and reconciliation observations..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm & Lock Period</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: UNLOCK PERIOD (ADMIN ONLY) */}
      {isUnlockModalOpen && selectedLockForUnlock && (
        <Modal
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          title={`Unlock Period ${selectedLockForUnlock.period}`}
        >
          <form onSubmit={handleConfirmUnlock} className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <span>Owner / Admin Surveillance Authorization</span>
              </div>
              <p>
                Unlocking a closed period allows backdated transactions that will trigger an automatic recalculation of all moving weighted averages. A justification is mandatory and logged permanently.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Reason for Unlocking Closed Period *
              </label>
              <textarea
                required
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl outline-none focus:border-rose-600"
                placeholder="Explain the required audit adjustment or correction..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Authorize & Unlock</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
