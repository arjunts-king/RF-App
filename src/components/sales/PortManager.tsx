import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-rose-600" />
            Port Master Directory
          </h2>
          <p className="text-xs text-ink-500">
            Dropdown reference master for Port of Loading (POL), Port of Discharge (POD), and Final Destination terminals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canManageSalesMasterData && (
            <label className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-ink-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportSample} className="hidden" />
            </label>
          )}

          {permissions.canManageSalesMasterData && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Port</span>
            </button>
          )}
        </div>
      </div>

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
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Countries ({countries.length})</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-ink-500 font-medium">
          Showing <strong>{filteredPorts.length}</strong> of {ports.length} registered ports
        </div>
      </div>

      {/* Ports Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
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
                    <td className="py-3 px-4 text-ink-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-ink-400" />
                      <span>{p.country}</span>
                    </td>
                    <td className="py-3 px-4">
                      {permissions.canManageSalesMasterData ? (
                        <button
                          onClick={() => togglePortActive(p.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-ink-500 hover:bg-gray-200'
                          }`}
                        >
                          {p.active ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-ink-500'
                        }`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {permissions.canManageSalesMasterData && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Port"
                            className="p-1.5 text-ink-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
        title={editingId ? 'Edit Port Master' : 'Add New Port'}
        subtitle="Specify official UN/LOCODE, port designation, and country"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">
              Port Code (UN/LOCODE) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. INCOK, USLAX, NLRTM"
              required
              maxLength={10}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono font-bold outline-none focus:border-rose-600"
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
              placeholder="e.g. Cochin Port (Willingdon Island)"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-600"
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
              placeholder="e.g. India, United States, Japan, Netherlands"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition"
            >
              {editingId ? 'Save Changes' : 'Add Port'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Port Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Port Deletion"
        subtitle="Permanent purge from master port registry"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700 leading-relaxed">
            Are you sure you want to permanently delete port <strong>{deleteTarget?.name}</strong> (
            {deleteTarget?.code})?
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            Notice: If this port is designated as Port of Loading, Port of Discharge, or Final Destination on any existing export invoice, deletion will be blocked to safeguard transaction records.
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition"
            >
              Confirm Permanent Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
