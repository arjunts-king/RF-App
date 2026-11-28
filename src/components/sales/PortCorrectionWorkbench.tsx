import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../common/PageHeader';
import {
  Anchor,
  CheckCircle2,
  Search,
  RotateCcw,
  Save,
  Copy,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { extractInvoiceNumericValue } from '../../utils/calculations';

interface DraftPortRow {
  portOfLoadingId: string;
  portOfDischargeId: string;
  finalDestinationId: string;
}

export const PortCorrectionWorkbench: React.FC = () => {
  const { salesInvoices, ports, customers, bulkUpdateSalesInvoicePorts } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'modified' | 'incomplete'>('all');
  const [drafts, setDrafts] = useState<Record<string, DraftPortRow>>({});

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const portMap = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);

  const activeInvoices = useMemo(
    () =>
      salesInvoices
        .filter((inv) => !inv.isVoided)
        .sort((a, b) => extractInvoiceNumericValue(a.invoiceNo) - extractInvoiceNumericValue(b.invoiceNo)),
    [salesInvoices]
  );

  // Split ports into Indian loading ports and overseas ports for easy scanning, while keeping all active ports selectable
  const sortedPorts = useMemo(
    () =>
      [...ports]
        .filter((p) => p.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ports]
  );

  const indianPorts = useMemo(
    () => sortedPorts.filter((p) => (p.country || '').trim().toLowerCase() === 'india'),
    [sortedPorts]
  );

  const overseasPorts = useMemo(
    () => sortedPorts.filter((p) => (p.country || '').trim().toLowerCase() !== 'india'),
    [sortedPorts]
  );

  const getEffectiveRow = (invId: string): DraftPortRow => {
    const inv = activeInvoices.find((i) => i.id === invId);
    const draft = drafts[invId];
    return {
      portOfLoadingId: draft?.portOfLoadingId ?? inv?.portOfLoadingId ?? '',
      portOfDischargeId: draft?.portOfDischargeId ?? inv?.portOfDischargeId ?? '',
      finalDestinationId: draft?.finalDestinationId ?? inv?.finalDestinationId ?? ''
    };
  };

  const isRowModified = (invId: string): boolean => {
    const inv = activeInvoices.find((i) => i.id === invId);
    const draft = drafts[invId];
    if (!inv || !draft) return false;
    return (
      draft.portOfLoadingId !== inv.portOfLoadingId ||
      draft.portOfDischargeId !== inv.portOfDischargeId ||
      draft.finalDestinationId !== inv.finalDestinationId
    );
  };

  const isRowComplete = (row: DraftPortRow): boolean =>
    Boolean(row.portOfLoadingId && row.portOfDischargeId && row.finalDestinationId);

  const updateRowField = (
    invId: string,
    field: keyof DraftPortRow,
    value: string
  ) => {
    const inv = activeInvoices.find((i) => i.id === invId);
    if (!inv) return;
    setDrafts((prev) => {
      const current = prev[invId] || {
        portOfLoadingId: inv.portOfLoadingId || '',
        portOfDischargeId: inv.portOfDischargeId || '',
        finalDestinationId: inv.finalDestinationId || ''
      };
      return {
        ...prev,
        [invId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleCopyPodToDest = (invId: string) => {
    const row = getEffectiveRow(invId);
    if (!row.portOfDischargeId) return;
    updateRowField(invId, 'finalDestinationId', row.portOfDischargeId);
  };

  const handleResetRow = (invId: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[invId];
      return next;
    });
  };

  const handleResetAll = () => {
    setDrafts({});
    showToast('Discarded unsaved port edits.', 'info');
  };

  const handleCopyAllPodToDest = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      activeInvoices.forEach((inv) => {
        const cur = next[inv.id] || {
          portOfLoadingId: inv.portOfLoadingId || '',
          portOfDischargeId: inv.portOfDischargeId || '',
          finalDestinationId: inv.finalDestinationId || ''
        };
        if (cur.portOfDischargeId && cur.finalDestinationId !== cur.portOfDischargeId) {
          next[inv.id] = {
            ...cur,
            finalDestinationId: cur.portOfDischargeId
          };
        }
      });
      return next;
    });
    showToast('Copied Port of Discharge to Final Destination in draft.', 'info');
  };

  const modifiedRows = useMemo(
    () => activeInvoices.filter((inv) => isRowModified(inv.id)),
    [activeInvoices, drafts]
  );

  const completeCount = useMemo(
    () => activeInvoices.filter((inv) => isRowComplete(getEffectiveRow(inv.id))).length,
    [activeInvoices, drafts]
  );

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      if (statusFilter === 'modified' && !isRowModified(inv.id)) return false;
      if (statusFilter === 'incomplete' && isRowComplete(getEffectiveRow(inv.id))) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const cust = customerMap.get(inv.consigneeId);
        const pol = portMap.get(getEffectiveRow(inv.id).portOfLoadingId);
        const pod = portMap.get(getEffectiveRow(inv.id).portOfDischargeId);
        const fd = portMap.get(getEffectiveRow(inv.id).finalDestinationId);
        return (
          inv.invoiceNo.toLowerCase().includes(q) ||
          (cust?.name || inv.consigneeName || '').toLowerCase().includes(q) ||
          (cust?.country || inv.countryOfDestination || '').toLowerCase().includes(q) ||
          (pol?.name || '').toLowerCase().includes(q) ||
          (pod?.name || '').toLowerCase().includes(q) ||
          (fd?.name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeInvoices, statusFilter, searchTerm, drafts, customerMap, portMap]);

  const handleCompleteAndSave = () => {
    if (modifiedRows.length === 0) {
      showToast('No port changes to apply.', 'info');
      return;
    }

    const incompleteModified = modifiedRows.filter((inv) => !isRowComplete(getEffectiveRow(inv.id)));
    if (incompleteModified.length > 0) {
      showToast(
        `Please select POL, POD, and Final Destination for all modified invoices (${incompleteModified.length} incomplete).`,
        'error'
      );
      return;
    }

    const payload = modifiedRows.map((inv) => {
      const row = getEffectiveRow(inv.id);
      return {
        invoiceId: inv.id,
        portOfLoadingId: row.portOfLoadingId,
        portOfDischargeId: row.portOfDischargeId,
        finalDestinationId: row.finalDestinationId
      };
    });

    const { updatedCount } = bulkUpdateSalesInvoicePorts(payload);
    setDrafts({});
    showToast(
      `Successfully updated port details on ${updatedCount} invoice(s).`,
      'success'
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        title="Invoice Port Correction Workbench"
        subtitle="Review and correct Port of Loading (POL), Port of Discharge (POD), and Final Destination across all export invoices, then apply all changes at once."
        breadcrumbs={['Sales', 'Invoice Port Correction']}
        primaryAction={{
          label: `Complete & Save (${modifiedRows.length})`,
          onClick: handleCompleteAndSave,
          icon: Save
        }}
        secondaryActions={[
          ...(modifiedRows.length > 0
            ? [
                {
                  label: 'Discard Drafts',
                  onClick: handleResetAll,
                  icon: RotateCcw
                }
              ]
            : []),
          {
            label: 'Sync POD -> Final Dest',
            onClick: handleCopyAllPodToDest,
            icon: Copy
          }
        ]}
      />

      {/* Summary & Progress Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-bold text-ink-500 uppercase">Total Active Invoices</span>
          <div className="text-2xl font-black text-ink-900 mt-1">{activeInvoices.length}</div>
          <span className="text-[11px] text-ink-500">Ready for port verification</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-bold text-ink-500 uppercase">Fully Filled (POL + POD + Final Dest)</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {completeCount} / {activeInvoices.length}
          </div>
          <span className="text-[11px] text-ink-500">All 3 ports assigned</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase">Pending Unsaved Edits</span>
          <div className="text-2xl font-black text-rose-800 mt-1">{modifiedRows.length}</div>
          <span className="text-[11px] text-ink-500">Click Complete &amp; Save to apply</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search invoice #, consignee, country, or port..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'modified', 'incomplete'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === mode
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-gray-100 text-ink-700 hover:bg-gray-200'
              }`}
            >
              {mode === 'all' && `All (${activeInvoices.length})`}
              {mode === 'modified' && `Modified (${modifiedRows.length})`}
              {mode === 'incomplete' && `Incomplete (${activeInvoices.length - completeCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Editable Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-3 px-3">Invoice</th>
                <th className="py-3 px-3">Consignee &amp; Country</th>
                <th className="py-3 px-3 min-w-[190px]">Port of Loading (POL)</th>
                <th className="py-3 px-3 min-w-[210px]">Port of Discharge (POD)</th>
                <th className="py-3 px-3 min-w-[210px]">Final Destination</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((inv) => {
                const row = getEffectiveRow(inv.id);
                const modified = isRowModified(inv.id);
                const complete = isRowComplete(row);
                const cust = customerMap.get(inv.consigneeId);
                const custName = cust?.name || inv.consigneeName || inv.buyerName || 'Customer';
                const custCountry = cust?.country || inv.countryOfDestination || '';

                return (
                  <tr
                    key={inv.id}
                    className={
                      modified
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : !complete
                        ? 'bg-rose-50/30 hover:bg-rose-50/50'
                        : 'hover:bg-gray-50/60'
                    }
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink-900">{inv.invoiceNo}</span>
                        {modified && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                            Edited
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500">{inv.invoiceDate}</div>
                    </td>

                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="font-semibold text-ink-800 truncate" title={custName}>
                        {custName}
                      </div>
                      <div className="text-[11px] font-bold text-rose-700">{custCountry || '—'}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={row.portOfLoadingId}
                        onChange={(e) => updateRowField(inv.id, 'portOfLoadingId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:border-rose-400 outline-none"
                      >
                        <option value="">-- Select POL --</option>
                        <optgroup label="Indian Loading Ports">
                          {indianPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other Ports">
                          {overseasPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.country})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={row.portOfDischargeId}
                        onChange={(e) => updateRowField(inv.id, 'portOfDischargeId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:border-rose-400 outline-none"
                      >
                        <option value="">-- Select POD --</option>
                        <optgroup label="Overseas Destination Ports">
                          {overseasPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.country})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Indian Ports">
                          {indianPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.country})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={row.finalDestinationId}
                        onChange={(e) => updateRowField(inv.id, 'finalDestinationId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:border-rose-400 outline-none"
                      >
                        <option value="">-- Select Final Destination --</option>
                        <optgroup label="Overseas Destination Ports">
                          {overseasPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.country})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Indian Ports">
                          {indianPorts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.country})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyPodToDest(inv.id)}
                          title="Copy POD to Final Destination"
                          className="p-1.5 rounded-lg text-ink-600 hover:bg-gray-100 hover:text-rose-700 transition"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {modified && (
                          <button
                            type="button"
                            onClick={() => handleResetRow(inv.id)}
                            title="Revert row changes"
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-500">
                    <Anchor className="w-6 h-6 mx-auto mb-2 text-ink-300" />
                    No invoices match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Action Bar when edits are staged */}
      {modifiedRows.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-ink-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold">
            {modifiedRows.some((inv) => !isRowComplete(getEffectiveRow(inv.id))) ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              {modifiedRows.length} invoice(s) modified — ready to update all port details
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleCompleteAndSave}
            className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Complete &amp; Save All</span>
          </button>
        </div>
      )}
    </div>
  );
};
