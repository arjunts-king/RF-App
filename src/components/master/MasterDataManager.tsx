import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from '../common/Modal';
import { formatINR } from '../../utils/calculations';
import {
  Database,
  PlusCircle,
  Truck,
  Fish,
  Grid,
  Scale,
  Building,
  CreditCard,
  Layers,
  Pencil,
  Trash2,
  Inbox,
  FileSpreadsheet,
  Hash,
  Boxes
} from 'lucide-react';
import { Supplier, Species, Grade, Size, Count, PurchaseLocation, BankAccount, ExpenseType, SlabType } from '../../types';

type MasterTab = 'suppliers' | 'species' | 'grades' | 'sizes' | 'counts' | 'locations' | 'accounts' | 'expenses' | 'slabs';

export const MasterDataManager: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const {
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    bankAccounts,
    expenseTypes,
    slabTypes,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierActive,
    addSpecies,
    updateSpecies,
    deleteSpecies,
    toggleSpeciesActive,
    addGrade,
    updateGrade,
    deleteGrade,
    toggleGradeActive,
    addSize,
    updateSize,
    deleteSize,
    addCount,
    updateCount,
    deleteCount,
    addLocation,
    updateLocation,
    deleteLocation,
    toggleLocationActive,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addExpenseType,
    updateExpenseType,
    deleteExpenseType,
    toggleExpenseTypeActive,
    addSlabType,
    updateSlabType,
    deleteSlabType,
    toggleSlabTypeActive
  } = useData();

  const [activeTab, setActiveTab] = useState<MasterTab>('suppliers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'supplier') deleteSupplier(deleteTarget.id);
    else if (deleteTarget.type === 'species') deleteSpecies(deleteTarget.id);
    else if (deleteTarget.type === 'grade') deleteGrade(deleteTarget.id);
    else if (deleteTarget.type === 'size') deleteSize(deleteTarget.id);
    else if (deleteTarget.type === 'count') deleteCount(deleteTarget.id);
    else if (deleteTarget.type === 'location') deleteLocation(deleteTarget.id);
    else if (deleteTarget.type === 'account') deleteBankAccount(deleteTarget.id);
    else if (deleteTarget.type === 'expense') deleteExpenseType(deleteTarget.id);
    else if (deleteTarget.type === 'slab') deleteSlabType(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Supplier form state
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [supType, setSupType] = useState<'boat_owner' | 'auctioneer_agent' | 'trader' | 'farm' | 'other'>('boat_owner');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supDistrict, setSupDistrict] = useState('');
  const [supState, setSupState] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supPan, setSupPan] = useState('');
  const [supBank, setSupBank] = useState('');
  const [supAcc, setSupAcc] = useState('');
  const [supIfsc, setSupIfsc] = useState('');
  const [supTerms, setSupTerms] = useState('');
  const [supCreditDays, setSupCreditDays] = useState('');
  const [supOpeningBal, setSupOpeningBal] = useState('0');

  // Species form state
  const [spCode, setSpCode] = useState('');
  const [spName, setSpName] = useState('');
  const [spScientific, setSpScientific] = useState('');
  const [spCategory, setSpCategory] = useState('Shrimp / Prawns');
  const [spProductForm, setSpProductForm] = useState('Headless Shell-On (HLSO)');
  const [spProcessingType, setSpProcessingType] = useState('Block Frozen');

  // Grade form state
  const [grdCode, setGrdCode] = useState('');
  const [grdName, setGrdName] = useState('');
  const [grdDesc, setGrdDesc] = useState('');

  // Size form state
  const [szCode, setSzCode] = useState('');
  const [szName, setSzName] = useState('');
  const [szDesc, setSzDesc] = useState('');

  // Count form state
  const [cntCode, setCntCode] = useState('');
  const [cntName, setCntName] = useState('');
  const [cntDesc, setCntDesc] = useState('');

  // Location form state
  const [locCode, setLocCode] = useState('');
  const [locName, setLocName] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locState, setLocState] = useState('');
  const [locWharf, setLocWharf] = useState('');

  // Account form state
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accBank, setAccBank] = useState('');
  const [accType, setAccType] = useState<'Current' | 'Savings' | 'Cash Float'>('Current');
  const [accOpening, setAccOpening] = useState('0');

  // Expense Type form state
  const [expCode, setExpCode] = useState('');
  const [expName, setExpName] = useState('');
  const [expCat, setExpCat] = useState('Landing Expense');

  // Slab Type form state (Production)
  const [slbCode, setSlbCode] = useState('');
  const [slbName, setSlbName] = useState('');
  const [slbWeight, setSlbWeight] = useState('2.0');
  const [slbUnit, setSlbUnit] = useState('Kg');
  const [slbApp, setSlbApp] = useState('All Products');

  const tabs: { id: MasterTab; label: string; icon: any; count: number }[] = [
    { id: 'suppliers', label: 'Suppliers', icon: Truck, count: suppliers.length },
    { id: 'species', label: 'Species / Product', icon: Fish, count: species.length },
    { id: 'grades', label: 'Grades', icon: Grid, count: grades.length },
    { id: 'sizes', label: 'Sizes', icon: Scale, count: sizes.length },
    { id: 'counts', label: 'Counts / Pcs', icon: Hash, count: counts.length },
    { id: 'slabs', label: 'Slab Types', icon: Boxes, count: slabTypes.length },
    { id: 'locations', label: 'Harbour Locations', icon: Building, count: locations.length },
    { id: 'accounts', label: 'Bank / Cash Accounts', icon: CreditCard, count: bankAccounts.length },
    { id: 'expenses', label: 'Dynamic Expense Heads', icon: Layers, count: expenseTypes.length }
  ];

  const handleOpenAdd = () => {
    setEditingId(null);
    if (activeTab === 'suppliers') {
      setSupCode(`SUP-${String(suppliers.length + 1).padStart(3, '0')}`);
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupDistrict('');
      setSupState('');
      setSupGstin('');
      setSupPan('');
      setSupBank('');
      setSupAcc('');
      setSupIfsc('');
      setSupTerms('');
      setSupCreditDays('');
      setSupOpeningBal('0');
    } else if (activeTab === 'species') {
      setSpCode(`SPE-${String(species.length + 1).padStart(3, '0')}`);
      setSpName('');
      setSpScientific('');
      setSpCategory('Shrimp / Prawns');
    } else if (activeTab === 'grades') {
      setGrdCode(`GRD-${String(grades.length + 1).padStart(3, '0')}`);
      setGrdName('');
      setGrdDesc('');
    } else if (activeTab === 'sizes') {
      setSzCode(`SZ-${String(sizes.length + 1).padStart(3, '0')}`);
      setSzName('');
      setSzDesc('');
    } else if (activeTab === 'counts') {
      setCntCode(`CNT-${String(counts.length + 1).padStart(3, '0')}`);
      setCntName('');
      setCntDesc('');
    } else if (activeTab === 'locations') {
      setLocCode(`LOC-${String(locations.length + 1).padStart(3, '0')}`);
      setLocName('');
      setLocDistrict('');
      setLocState('');
      setLocWharf('');
    } else if (activeTab === 'accounts') {
      setAccCode(`ACC-${String(bankAccounts.length + 1).padStart(3, '0')}`);
      setAccName('');
      setAccBank('');
      setAccType('Current');
      setAccOpening('0');
    } else if (activeTab === 'expenses') {
      setExpCode(`EXP-${String(expenseTypes.length + 1).padStart(3, '0')}`);
      setExpName('');
      setExpCat('Direct Purchase Expense');
    } else if (activeTab === 'slabs') {
      setSlbCode(`SLB-${String(slabTypes.length + 1).padStart(3, '0')}`);
      setSlbName('');
      setSlbWeight('2.0');
      setSlbUnit('Kg');
      setSlbApp('All Products');
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'suppliers') {
      const s = item as Supplier;
      setSupCode(s.code);
      setSupName(s.name);
      setSupType(s.type);
      setSupContact(s.contactPerson);
      setSupPhone(s.phone);
      setSupEmail(s.email);
      setSupAddress(s.address);
      setSupDistrict(s.district);
      setSupState(s.state);
      setSupGstin(s.gstin || '');
      setSupPan(s.pan || '');
      setSupBank(s.bankName);
      setSupAcc(s.bankAccount);
      setSupIfsc(s.bankIfsc);
      setSupTerms(s.paymentTerms || '');
      setSupCreditDays(s.creditDays !== undefined && s.creditDays !== null && s.creditDays > 0 ? String(s.creditDays) : '');
      setSupOpeningBal(String(s.openingBalance));
    } else if (activeTab === 'species') {
      const sp = item as Species;
      setSpCode(sp.code);
      setSpName(sp.name);
      setSpScientific(sp.scientificName);
      setSpCategory(sp.category);
      setSpProductForm(sp.productForm || 'Headless Shell-On (HLSO)');
      setSpProcessingType(sp.processingType || 'Block Frozen');
    } else if (activeTab === 'grades') {
      const g = item as Grade;
      setGrdCode(g.code);
      setGrdName(g.name);
      setGrdDesc(g.description);
    } else if (activeTab === 'sizes') {
      const sz = item as Size;
      setSzCode(sz.code);
      setSzName(sz.name);
      setSzDesc(sz.description || '');
    } else if (activeTab === 'counts') {
      const cnt = item as Count;
      setCntCode(cnt.code);
      setCntName(cnt.name);
      setCntDesc(cnt.description || '');
    } else if (activeTab === 'locations') {
      const l = item as PurchaseLocation;
      setLocCode(l.code);
      setLocName(l.name);
      setLocDistrict(l.district);
      setLocState(l.state);
      setLocWharf(l.harbourCentre);
    } else if (activeTab === 'accounts') {
      const a = item as BankAccount;
      setAccCode(a.code);
      setAccName(a.name);
      setAccBank(a.bank);
      setAccType(a.accountType);
      setAccOpening(String(a.openingBalance));
    } else if (activeTab === 'expenses') {
      const e = item as ExpenseType;
      setExpCode(e.code);
      setExpName(e.name);
      setExpCat(e.category);
    } else if (activeTab === 'slabs') {
      const sl = item as SlabType;
      setSlbCode(sl.code);
      setSlbName(sl.name);
      setSlbWeight(String(sl.standardWeightKg));
      setSlbUnit(sl.unit);
      setSlbApp(sl.productApplicability);
    }
    setIsModalOpen(true);
  };

  const handleSaveEntity = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'suppliers') {
      const payload = {
        code: supCode,
        name: supName,
        type: supType,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        district: supDistrict,
        state: supState,
        gstin: supGstin || undefined,
        pan: supPan || undefined,
        bankName: supBank,
        bankAccount: supAcc,
        bankIfsc: supIfsc,
        paymentTerms: supTerms.trim() || (parseInt(supCreditDays, 10) > 0 ? `Net ${parseInt(supCreditDays, 10)} Days` : 'Immediate / Cash'),
        creditDays: parseInt(supCreditDays, 10) || 0,
        openingBalance: parseFloat(supOpeningBal) || 0,
        active: true
      };
      if (editingId) updateSupplier(editingId, payload);
      else addSupplier(payload);
    } else if (activeTab === 'species') {
      const payload = {
        code: spCode,
        name: spName,
        scientificName: spScientific,
        category: spCategory,
        productForm: spProductForm,
        processingType: spProcessingType,
        active: true
      };
      if (editingId) updateSpecies(editingId, payload);
      else addSpecies(payload);
    } else if (activeTab === 'grades') {
      const payload = { code: grdCode, name: grdName, description: grdDesc, active: true };
      if (editingId) updateGrade(editingId, payload);
      else addGrade(payload);
    } else if (activeTab === 'sizes') {
      const payload = { code: szCode, name: szName, description: szDesc, active: true };
      if (editingId) updateSize(editingId, payload);
      else addSize(payload);
    } else if (activeTab === 'counts') {
      const payload = { code: cntCode, name: cntName, description: cntDesc, active: true };
      if (editingId) updateCount(editingId, payload);
      else addCount(payload);
    } else if (activeTab === 'locations') {
      const payload = { code: locCode, name: locName, district: locDistrict, state: locState, harbourCentre: locWharf, active: true };
      if (editingId) updateLocation(editingId, payload);
      else addLocation(payload);
    } else if (activeTab === 'accounts') {
      const payload = { code: accCode, name: accName, bank: accBank, accountType: accType, openingBalance: parseFloat(accOpening) || 0, active: true };
      if (editingId) updateBankAccount(editingId, payload);
      else addBankAccount(payload);
    } else if (activeTab === 'expenses') {
      const payload = { code: expCode, name: expName, category: expCat, active: true };
      if (editingId) updateExpenseType(editingId, payload);
      else addExpenseType(payload);
    } else if (activeTab === 'slabs') {
      const payload = {
        code: slbCode,
        name: slbName,
        standardWeightKg: parseFloat(slbWeight) || 2.0,
        unit: slbUnit,
        productApplicability: slbApp,
        active: true
      };
      if (editingId) updateSlabType(editingId, payload);
      else addSlabType(payload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-600" />
            Master Reference Data Repository
          </h2>
          <p className="text-xs text-ink-500">
            Fully customizable master lists with referential integrity. Add, edit, or archive your actual suppliers, species, sizes, and harbours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('excel-import')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition shadow-2xs"
              title="Import master reference data from Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import from Excel</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New {tabs.find((t) => t.id === activeTab)?.label.replace(/s$/, '')}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-ink-700 hover:bg-rose-50 border border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-ink-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* MASTER DATA TABLES */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        {/* SUPPLIERS TABLE */}
        {activeTab === 'suppliers' && (
          <div className="overflow-x-auto">
            {suppliers.length === 0 ? (
              <div className="py-16 text-center text-ink-500 space-y-3">
                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-semibold text-sm text-ink-700">No suppliers registered yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  Click the <strong>Add New Supplier</strong> button above to add your boat owners, auctioneers, or farms.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Credit Terms</th>
                    <th className="py-2.5 px-3">Bank Details</th>
                    <th className="py-2.5 px-3 text-right">Opening Bal</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-rose-700">{s.code}</td>
                      <td className="py-3 px-3 font-bold text-ink-900">{s.name}</td>
                      <td className="py-3 px-3 capitalize">{s.type.replace('_', ' ')}</td>
                      <td className="py-3 px-3">
                        <div>{s.contactPerson}</div>
                        <div className="text-[10px] text-ink-500">{s.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div>{s.creditDays > 0 ? `${s.creditDays} Credit Days` : 'Immediate / Cash'}</div>
                        <div className="text-[10px] text-ink-500">{s.paymentTerms || (s.creditDays > 0 ? `Net ${s.creditDays} Days` : 'No Credit Terms')}</div>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div>{s.bankName}</div>
                        <div className="text-[10px] text-ink-500">A/c: {s.bankAccount}</div>
                      </td>
                      <td className="py-3 px-3 text-right">{formatINR(s.openingBalance)}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleSupplierActive(s.id)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition ${
                            s.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {s.active ? 'Active' : 'Archived'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Edit Supplier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'supplier', id: s.id, name: s.name })}
                            className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"
                            title="Delete Supplier (if unreferenced)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SPECIES TABLE */}
        {activeTab === 'species' && (
          <div className="overflow-x-auto">
            {species.length === 0 ? (
              <div className="py-16 text-center text-ink-500 space-y-3">
                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-semibold text-sm text-ink-700">No species added yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  Click <strong>Add New Species</strong> to register your raw seafood varieties (e.g. Vannamei, Tiger, Tuna).
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Commercial Name</th>
                    <th className="py-2.5 px-3">Scientific Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Product Form</th>
                    <th className="py-2.5 px-3">Processing Type</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {species.map((sp) => (
                    <tr key={sp.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-rose-700">{sp.code}</td>
                      <td className="py-3 px-3 font-bold text-ink-900">{sp.name}</td>
                      <td className="py-3 px-3 italic text-ink-500">{sp.scientificName}</td>
                      <td className="py-3 px-3">{sp.category}</td>
                      <td className="py-3 px-3 text-ink-700 font-medium">{sp.productForm || 'Standard'}</td>
                      <td className="py-3 px-3 text-ink-700 font-medium">{sp.processingType || 'Block Frozen'}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleSpeciesActive(sp.id)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            sp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-300'
                          }`}
                        >
                          {sp.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(sp)}
                            className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Edit Species"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'species', id: sp.id, name: sp.name })}
                            className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"
                            title="Delete Species"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* EXPENSES TABLE */}
        {activeTab === 'expenses' && (
          <div className="overflow-x-auto">
            {expenseTypes.length === 0 ? (
              <div className="py-16 text-center text-ink-500 space-y-3">
                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-semibold text-sm text-ink-700">No dynamic expense heads configured</p>
                <p className="text-xs max-w-sm mx-auto">
                  Click <strong>Add New Dynamic Expense Head</strong> to create cost heads (e.g. Ice, Vehicle Rent, Dalali, Labour).
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Expense Head Name</th>
                    <th className="py-2.5 px-3">Accounting Category</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {expenseTypes.map((e) => (
                    <tr key={e.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-bold text-rose-700">{e.code}</td>
                      <td className="py-3 px-3 font-bold text-ink-900">{e.name}</td>
                      <td className="py-3 px-3 text-ink-500">{e.category}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleExpenseTypeActive(e.id)}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            e.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {e.active ? 'Active' : 'Archived'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEdit(e)} className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: 'expense', id: e.id, name: e.name })} className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* GRADES, SIZES, COUNTS, SLABS, LOCATIONS, ACCOUNTS TABLES */}
        {(activeTab === 'grades' || activeTab === 'sizes' || activeTab === 'counts' || activeTab === 'slabs' || activeTab === 'locations' || activeTab === 'accounts') && (
          <div className="p-4 text-xs">
            {activeTab === 'grades' && (
              grades.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No grades registered yet. Add Grade A, B, Live, or Rejects.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {grades.map((g) => (
                    <li key={g.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <strong className="text-ink-900">{g.name}</strong> ({g.code})
                        <p className="text-[11px] text-ink-500">{g.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(g)} className="p-1.5 text-ink-500 hover:text-rose-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'grade', id: g.id, name: g.name })} className="p-1.5 text-rose-600 hover:text-rose-800"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => toggleGradeActive(g.id)}
                          className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                            g.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {g.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {activeTab === 'sizes' && (
              sizes.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No physical sizes configured yet. Add Small, Medium, Large, Extra Large, etc.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sizes.map((sz) => (
                    <div key={sz.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-ink-900 block">{sz.name}</span>
                        <span className="text-[10px] text-ink-500 block">{sz.description || sz.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(sz)} className="p-1 text-ink-500 hover:text-rose-600"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'size', id: sz.id, name: sz.name })} className="p-1 text-rose-600 hover:text-rose-800"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'counts' && (
              counts.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No piece counts configured yet. Add 10/20, 20/30, 31/40, 41/50, 71/90, 100+, etc.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {counts.map((cnt) => (
                    <div key={cnt.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-ink-900 block">{cnt.name}</span>
                        <span className="text-[10px] text-ink-500 block">{cnt.description || cnt.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(cnt)} className="p-1 text-ink-500 hover:text-rose-600"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'count', id: cnt.id, name: cnt.name })} className="p-1 text-rose-600 hover:text-rose-800"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'slabs' && (
              slabTypes.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No production slab types configured yet. Add 2.0 Kg Standard Block, 1.8 Kg Export Slab, etc.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {slabTypes.map((sl) => (
                    <div key={sl.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink-900 block">{sl.name}</span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                            {sl.standardWeightKg} {sl.unit}
                          </span>
                        </div>
                        <span className="text-[11px] text-ink-500 block mt-1">Applicable: {sl.productApplicability} · ({sl.code})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleOpenEdit(sl)} className="p-1.5 text-ink-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'slab', id: sl.id, name: sl.name })} className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => toggleSlabTypeActive(sl.id)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            sl.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {sl.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'locations' && (
              locations.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No landing harbour locations added yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {locations.map((loc) => (
                    <li key={loc.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <strong className="text-ink-900">{loc.name}</strong> ({loc.code})
                        <p className="text-[11px] text-ink-500">{loc.harbourCentre} · {loc.district}, {loc.state}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(loc)} className="p-1.5 text-ink-500 hover:text-rose-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'location', id: loc.id, name: loc.name })} className="p-1.5 text-rose-600 hover:text-rose-800"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => toggleLocationActive(loc.id)}
                          className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                            loc.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {loc.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {activeTab === 'accounts' && (
              bankAccounts.length === 0 ? (
                <div className="py-12 text-center text-ink-500">No bank or cash accounts configured yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {bankAccounts.map((acc) => (
                    <li key={acc.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <strong className="text-ink-900">{acc.name}</strong> ({acc.bank} · {acc.accountType})
                        <p className="text-[11px] text-ink-500">Opening Balance: {formatINR(acc.openingBalance)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(acc)} className="p-1.5 text-ink-500 hover:text-rose-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'account', id: acc.id, name: acc.name })} className="p-1.5 text-rose-600 hover:text-rose-800"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${editingId ? 'Edit' : 'Add'} Master Record: ${tabs.find((t) => t.id === activeTab)?.label.replace(/s$/, '')}`}
        subtitle="Referential integrity protected database entry"
      >
        <form onSubmit={handleSaveEntity} className="space-y-4 text-xs">
          {activeTab === 'suppliers' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Code</label>
                  <input type="text" value={supCode} onChange={(e) => setSupCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Supplier Name</label>
                  <input type="text" value={supName} onChange={(e) => setSupName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type</label>
                  <select value={supType} onChange={(e) => setSupType(e.target.value as any)} className="w-full p-2 bg-gray-50 border rounded-lg">
                    <option value="boat_owner">Boat Owner</option>
                    <option value="auctioneer_agent">Auctioneer / Agent</option>
                    <option value="trader">Trader</option>
                    <option value="farm">Aquaculture Farm</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Contact Person</label>
                  <input type="text" value={supContact} onChange={(e) => setSupContact(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input type="text" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Credit Days <span className="font-normal text-ink-500 text-[10px]">(Optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (Immediate)"
                    value={supCreditDays}
                    onChange={(e) => setSupCreditDays(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Terms <span className="font-normal text-ink-500 text-[10px]">(Optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Immediate, Net 15"
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Bank Name</label>
                  <input type="text" value={supBank} onChange={(e) => setSupBank(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Account No</label>
                  <input type="text" value={supAcc} onChange={(e) => setSupAcc(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">IFSC Code</label>
                  <input type="text" value={supIfsc} onChange={(e) => setSupIfsc(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={expCode} onChange={(e) => setExpCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Expense Head Name (e.g. Ice, Porter)</label>
                <input type="text" placeholder="e.g. Ice & Salting" value={expName} onChange={(e) => setExpName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <input type="text" value={expCat} onChange={(e) => setExpCat(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          {activeTab === 'species' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={spCode} onChange={(e) => setSpCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Species Name</label>
                <input type="text" placeholder="e.g. Black Tiger Shrimp" value={spName} onChange={(e) => setSpName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Scientific Name</label>
                <input type="text" placeholder="e.g. Penaeus monodon" value={spScientific} onChange={(e) => setSpScientific(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <input type="text" value={spCategory} onChange={(e) => setSpCategory(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Product Form (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Headless Shell-On (HLSO), PD, Fillets"
                    value={spProductForm}
                    onChange={(e) => setSpProductForm(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Processing Type (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Block Frozen, IQF, Blast Frozen"
                    value={spProcessingType}
                    onChange={(e) => setSpProcessingType(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={grdCode} onChange={(e) => setGrdCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Grade Name</label>
                <input type="text" placeholder="e.g. Grade A" value={grdName} onChange={(e) => setGrdName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input type="text" value={grdDesc} onChange={(e) => setGrdDesc(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          {activeTab === 'sizes' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={szCode} onChange={(e) => setSzCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Size Name (e.g. Small, Medium, Large, 1-2kg)</label>
                <input type="text" placeholder="e.g. Medium (500g - 1kg)" value={szName} onChange={(e) => setSzName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input type="text" placeholder="e.g. Fish weighing 500g to 1kg" value={szDesc} onChange={(e) => setSzDesc(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          {activeTab === 'counts' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={cntCode} onChange={(e) => setCntCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Piece Count (e.g. 10/20, 20/30, 41/50, 100+)</label>
                <input type="text" placeholder="e.g. 20/30 count" value={cntName} onChange={(e) => setCntName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input type="text" placeholder="e.g. 20 to 30 pcs per Kg" value={cntDesc} onChange={(e) => setCntDesc(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          {activeTab === 'slabs' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Slab ID / Code</label>
                <input type="text" value={slbCode} onChange={(e) => setSlbCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Slab Type Name</label>
                <input type="text" placeholder="e.g. 2.0 Kg Standard Export Block" value={slbName} onChange={(e) => setSlbName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Standard Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={slbWeight}
                    onChange={(e) => setSlbWeight(e.target.value)}
                    required
                    className="w-full p-2 bg-gray-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Unit</label>
                  <select value={slbUnit} onChange={(e) => setSlbUnit(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg">
                    <option value="Kg">Kg</option>
                    <option value="Lbs">Lbs</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Product Applicability</label>
                <input
                  type="text"
                  placeholder="e.g. Shrimp / Prawns, Tuna, All Products"
                  value={slbApp}
                  onChange={(e) => setSlbApp(e.target.value)}
                  className="w-full p-2 bg-gray-50 border rounded-lg"
                />
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={locCode} onChange={(e) => setLocCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Harbour / Location Name</label>
                <input type="text" placeholder="e.g. Kochi Fisheries Harbour" value={locName} onChange={(e) => setLocName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">District</label>
                  <input type="text" value={locDistrict} onChange={(e) => setLocDistrict(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">State</label>
                  <input type="text" value={locState} onChange={(e) => setLocState(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Wharf / Landing Centre</label>
                <input type="text" value={locWharf} onChange={(e) => setLocWharf(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Code</label>
                <input type="text" value={accCode} onChange={(e) => setAccCode(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Account Display Name</label>
                <input type="text" placeholder="e.g. HDFC Current Account" value={accName} onChange={(e) => setAccName(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Bank Name</label>
                  <input type="text" value={accBank} onChange={(e) => setAccBank(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Account Type</label>
                  <select value={accType} onChange={(e) => setAccType(e.target.value as any)} className="w-full p-2 bg-gray-50 border rounded-lg">
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="Cash Float">Cash Float</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" value={accOpening} onChange={(e) => setAccOpening(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
              {editingId ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Master Record Deletion"
        subtitle="This action cannot be undone if the record is removed"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>?
          </p>
          <p className="text-ink-500 text-[11px] bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
            Note: Records with existing purchase or accounting transaction history cannot be deleted and should be marked as "Archived" instead.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
