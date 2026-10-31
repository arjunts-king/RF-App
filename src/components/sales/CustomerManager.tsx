import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Customer } from '../../types';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Users,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Globe,
  Mail,
  Phone,
  FileSpreadsheet,
  Download,
  Building,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export const CustomerManager: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, toggleCustomerActive, bulkImportCustomers } =
    useData();
  const { permissions } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('United States');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  // Extract unique countries
  const countries = Array.from(new Set(customers.map((c) => c.country).filter(Boolean))).sort();

  const filteredCustomers = customers.filter((c) => {
    if (countryFilter && c.country !== countryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchCountry = c.country.toLowerCase().includes(q);
      const matchContact = c.contactPerson.toLowerCase().includes(q);
      const matchTax = c.taxId.toLowerCase().includes(q);
      return matchName || matchCode || matchCountry || matchContact || matchTax;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`CUST-${String(customers.length + 1).padStart(3, '0')}`);
    setName('');
    setAddress('');
    setCountry('United States');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setTaxId('');
    setBankDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c.id);
    setCode(c.code);
    setName(c.name);
    setAddress(c.address);
    setCountry(c.country);
    setContactPerson(c.contactPerson);
    setPhone(c.phone);
    setEmail(c.email);
    setTaxId(c.taxId);
    setBankDetails(c.bankDetails);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateCustomer(editingId, {
        code: code.trim(),
        name: name.trim(),
        address: address.trim(),
        country: country.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        taxId: taxId.trim(),
        bankDetails: bankDetails.trim()
      });
    } else {
      addCustomer({
        code: code.trim(),
        name: name.trim(),
        address: address.trim(),
        country: country.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        taxId: taxId.trim(),
        bankDetails: bankDetails.trim(),
        active: true
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteCustomer(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    const data = customers.map((c) => ({
      Code: c.code,
      Name: c.name,
      Country: c.country,
      Address: c.address,
      ContactPerson: c.contactPerson,
      Phone: c.phone,
      Email: c.email,
      TaxID: c.taxId,
      BankDetails: c.bankDetails,
      Active: c.active ? 'Yes' : 'No'
    }));

    const csv = convertToCSV(data, [
      { key: 'Code', label: 'Customer Code' },
      { key: 'Name', label: 'Customer Name' },
      { key: 'Country', label: 'Country' },
      { key: 'Address', label: 'Address' },
      { key: 'ContactPerson', label: 'Contact Person' },
      { key: 'Phone', label: 'Phone' },
      { key: 'Email', label: 'Email' },
      { key: 'TaxID', label: 'Tax ID / GSTIN' },
      { key: 'BankDetails', label: 'Realization Bank Details' },
      { key: 'Active', label: 'Active Status' }
    ]);

    downloadFile(csv, `Customers_Consignees_${new Date().toISOString().split('T')[0]}.csv`);
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

      bulkImportCustomers(records);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Figma Header Block */}
      <PageHeader
        title="Consignees and buyers master"
        subtitle="Global seafood importers, consignees, buyer entities, overseas tax IDs, and bank realization credentials."
        breadcrumbs={['Sales', 'Customer Master']}
        primaryAction={
          permissions.canManageSalesMasterData
            ? {
                label: 'Add Customer',
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
              placeholder="Search customer name, code, contact, country, tax ID..."
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
            Showing <strong>{filteredCustomers.length}</strong> of {customers.length} registered customers
          </span>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className={`p-6 rounded-2xl border transition-all ${
              c.active
                ? 'bg-white border-gray-100 shadow-xs hover:border-rose-300'
                : 'bg-gray-50/70 border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    {c.code}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-500 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-ink-400" />
                    {c.country}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink-900 mt-2 leading-snug">{c.name}</h3>
              </div>

              {permissions.canManageSalesMasterData && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    title="Edit Customer"
                    className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {permissions.canPermanentlyDelete && (
                    <button
                      onClick={() => setDeleteTarget(c)}
                      title="Delete Customer"
                      className="p-1.5 text-ink-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-ink-700 pt-3 border-t border-gray-100">
              {c.contactPerson && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Building className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <span className="truncate">Attn: {c.contactPerson}</span>
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Phone className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <span className="truncate">{c.phone}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Mail className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.taxId && (
                <div className="flex items-center gap-2 text-ink-600 font-mono text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <span className="truncate">Tax ID: {c.taxId}</span>
                </div>
              )}
              {c.bankDetails && (
                <div className="flex items-start gap-2 text-ink-600 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <CreditCard className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{c.bankDetails}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-ink-400 truncate max-w-[180px]">
                {c.address || 'No registered address'}
              </span>

              {permissions.canManageSalesMasterData && (
                <button
                  onClick={() => toggleCustomerActive(c.id)}
                  className="transition"
                >
                  <StatusBadge status={c.active ? 'Active' : 'Inactive'} />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
            <Users className="w-8 h-8 mx-auto text-ink-400" />
            <h4 className="text-sm font-bold text-ink-900">No Customers Found</h4>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              No consignees match your current search filters. Add a new customer or import from CSV.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Consignee / Customer Record' : 'Register New Consignee / Customer'}
        subtitle="Manage overseas seafood buyers, tax credentials, and remittance banking information"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Customer Code <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CUST-001"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">
                Company / Consignee Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pacific Seafood Imports LLC"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                required
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Tax ID / VAT / GSTIN</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. US-EIN-99281938"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Registered Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 104 Waterfront Way, Port of Los Angeles, CA 90731"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 213 555 0192"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. imports@pacificseafood.com"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-700 mb-1">Bank Realization &amp; SWIFT Instructions</label>
            <textarea
              rows={2}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="e.g. Bank of America, SWIFT: BOFAUS3N, IBAN / Acc: 882910283..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-400 text-xs font-mono"
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
              {editingId ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Customer Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete Customer — ${deleteTarget?.name}`}
        subtitle="Permanent purge from customer master"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed">
            <strong>Warning:</strong> You are about to delete customer <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}). This will permanently remove their records from active lookups.
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
