import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { PortMaster } from '../../types';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Anchor,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Globe,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export const PortManager: React.FC = () => {
  const { ports, addPort, updatePort, deletePort, togglePortActive, bulkImportPorts } = useData();
  const { permissions } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortMaster | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('India');

  const countries = Array.from(new Set(ports.map((p) => p.country).filter(Boolean))).sort();

  const filteredPorts = ports.filter((p) => {
    if (countryFilter && p.country !== countryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = p.code.toLowerCase().includes(q);
      const matchCountry = p.country.toLowerCase().includes(q);
      return matchName || matchCode || matchCountry;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setCountry('India');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PortMaster) => {
    setEditingId(p.id);
    setCode(p.code);
    setName(p.name);
    setCountry(p.country);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    if (editingId) {
      updatePort(editingId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        country: country.trim()
      });
    } else {
      addPort({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        country: country.trim(),
        active: true
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deletePort(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    const data = ports.map((p) => ({
      Code: p.code,
      Name: p.name,
      Country: p.country,
      Active: p.active ? 'Yes' : 'No'
    }));

    const csv = convertToCSV(data, [
      { key: 'Code', label: 'Port UN/LOCODE' },
      { key: 'Name', label: 'Port Name' },
      { key: 'Country', label: 'Country' },
      { key: 'Active', label: 'Active Status' }
    ]);

    downloadFile(csv, `Ports_Directory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImportSample = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const records: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        records.push(row);
      }

      bulkImportPorts(records);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Port master directory"
        subtitle="Dropdown reference master for Port of Loading (POL), Port of Discharge (POD), and Final Destination terminals."
        breadcrumbs={['Sales', 'Ports Directory']}
        primaryAction={
          permissions.canManageSalesMasterData
            ? {
                label: 'Add Port',
                onClick: handleOpenAdd,
                icon: PlusCircle
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Export CSV',
            onClick: handleExportCSV,
            icon: Download
          }
        ]}
      />

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search port code (UN/LOCODE), port name, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-400 outline-none transition"
          >
            <option value="">All Countries ({countries.length})</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canManageSalesMasterData && (
            <label className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportSample} className="hidden" />
            </label>
          )}

          <span className="text-xs text-ink-500 font-medium">
            Showing <strong>{filteredPorts.length}</strong> of {ports.length} registered ports
          </span>
        </div>
      </div>

      {/* Ports Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-3 px-4">Port Code / LOCODE</th>
                <th className="py-3 px-4">Port Name</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Status</th>
                {permissions.canManageSalesMasterData && (
                  <th className="py-3 px-4 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-500">
                    <Anchor className="w-6 h-6 mx-auto mb-1 text-ink-400" />
                    No ports matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPorts.map((p) => (
                  <tr key={p.id} className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-ink-900">{p.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-ink-700">
                        <Globe className="w-3.5 h-3.5 text-ink-400" />
                        <span>{p.country}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {permissions.canManageSalesMasterData ? (
                        <button
                          onClick={() => togglePortActive(p.id)}
                          className="transition"
                        >
                          <StatusBadge status={p.active ? 'Active' : 'Inactive'} />
                        </button>
                      ) : (
                        <StatusBadge status={p.active ? 'Active' : 'Inactive'} />
                      )}
                    </td>
                    {permissions.canManageSalesMasterData && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Port"
                            className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="Delete Port"
                              className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Port Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Port Terminal Record' : 'Register New Port Terminal'}
        subtitle="Maintain official maritime port locations and UN/LOCODE identifiers"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port Code / UN LOCODE <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. INCOK or USLAX"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold font-mono outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port Terminal Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cochin Port Terminal"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Country <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India or United States"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:border-rose-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              {editingId ? 'Save Changes' : 'Create Port'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Port Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete Port — ${deleteTarget?.name}`}
        subtitle="Permanent purge from maritime port directory"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}). This will remove the port from subsequent sales invoice selections.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full transition"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
