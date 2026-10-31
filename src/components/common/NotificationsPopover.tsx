import React, { useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Bell, AlertTriangle, Clock, RefreshCw, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { formatINR } from '../../utils/calculations';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: 'purchase' | 'production' | 'sales', tab: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { purchases, processingEntries, salesInvoices, offlineQueue, syncOfflineQueue } = useData();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Overdue payables
  const overduePurchases = purchases.filter(
    (p) => !p.isVoided && p.balancePayable > 0 && p.dueDate && p.dueDate < todayStr
  );
  const totalOverdueVal = overduePurchases.reduce((s, p) => s + p.balancePayable, 0);

  // 2. Production slab variances
  const varianceLots = processingEntries.filter((p) => !p.isVoided && p.hasSlabVariance);

  // 3. Unsettled export invoices
  const pendingRealizations = salesInvoices.filter(
    (inv) => !inv.isVoided && inv.realizationStatus !== 'Fully Realized'
  );

  const totalNotifications =
    (offlineQueue.length > 0 ? 1 : 0) +
    (overduePurchases.length > 0 ? 1 : 0) +
    (varianceLots.length > 0 ? 1 : 0) +
    (pendingRealizations.length > 0 ? 1 : 0);

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="p-3.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-rose-700" />
          <h3 className="text-xs font-bold text-ink-900 tracking-tight">System Notifications</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
            {totalNotifications}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-500 hover:text-ink-900 p-1 rounded-lg hover:bg-white/80 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {totalNotifications === 0 ? (
          <div className="p-6 text-center text-xs text-ink-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-ink-900">All caught up!</p>
            <p className="text-[11px] mt-0.5">No critical alerts or variances across modules.</p>
          </div>
        ) : (
          <>
            {/* Offline sync item if any */}
            {offlineQueue.length > 0 && (
              <div className="p-3.5 hover:bg-amber-50/50 transition flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900">Offline Entries Pending</h4>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {offlineQueue.length} harbour purchase(s) recorded offline awaiting cloud sync.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    syncOfflineQueue();
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0"
                >
                  Sync Now
                </button>
              </div>
            )}

            {/* Overdue payables alert */}
            {overduePurchases.length > 0 && (
              <button
                onClick={() => {
                  onNavigate('purchase', 'outstanding');
                  onClose();
                }}
                className="w-full text-left p-3.5 hover:bg-rose-50/50 transition flex items-start justify-between gap-3 text-xs group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900 group-hover:text-rose-700 transition">
                      Overdue Supplier Payables
                    </h4>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {overduePurchases.length} lot(s) totaling <strong>{formatINR(totalOverdueVal)}</strong> exceed credit days.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-rose-600 shrink-0 self-center" />
              </button>
            )}

            {/* Slab Variance in Production */}
            {varianceLots.length > 0 && (
              <button
                onClick={() => {
                  onNavigate('production', 'processing-log');
                  onClose();
                }}
                className="w-full text-left p-3.5 hover:bg-amber-50/50 transition flex items-start justify-between gap-3 text-xs group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900 group-hover:text-amber-800 transition">
                      Production Slab Weight Variance
                    </h4>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {varianceLots.length} lot(s) deviated from standard slab packaging tolerance.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-amber-800 shrink-0 self-center" />
              </button>
            )}

            {/* Sales Pending Realization */}
            {pendingRealizations.length > 0 && (
              <button
                onClick={() => {
                  onNavigate('sales', 'realizations');
                  onClose();
                }}
                className="w-full text-left p-3.5 hover:bg-rose-50/40 transition flex items-start justify-between gap-3 text-xs group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900 group-hover:text-rose-700 transition">
                      Export Realizations Pending
                    </h4>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {pendingRealizations.length} commercial invoice(s) awaiting foreign exchange realization.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-rose-600 shrink-0 self-center" />
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center text-[11px] text-ink-500">
        Refreshed automatically from real-time database state
      </div>
    </div>
  );
};
