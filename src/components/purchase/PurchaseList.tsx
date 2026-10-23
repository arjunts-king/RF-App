import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Purchase } from '../../types';
import { formatINR, formatKg, computePurchaseFields } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { generateTallyPurchaseXML } from '../../utils/tallyExport';
import { convertToCSV, downloadFile } from '../../utils/exportUtils';
import {
  Search,
  Download,
  FileCode,
  Eye,
  Pencil,
  Trash2,
  Ban,
  AlertTriangle,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export const PurchaseList: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const {
    purchases,
    suppliers,
    species,
    grades,
    sizes,
    counts,
    locations,
    expenseTypes,
    updatePurchase,
    voidPurchase,
    deletePurchasePermanently,
    businessSettings
  } = useData();
  const { permissions } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Modals
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [voidModalTarget, setVoidModalTarget] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [deleteModalTarget, setDeleteModalTarget] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editForm, setEditForm] = useState({
    purchaseDate: '',
    supplierId: '',
    locationId: '',
    invoiceNo: '',
    batchNo: '',
    speciesId: '',
    gradeId: '',
    sizeId: '',
    countId: '',
    boxesCount: 0,
    weightKg: 0,
    ratePerKg: 0,
    damageWeightKg: 0,
    damageRatePerKg: 0,
    expenseBreakdown: {} as Record<string, number>,
    remarks: '',
    editReason: ''
  });

  // Lookups
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const speciesMap = new Map(species.map((sp) => [sp.id, sp]));
  const gradeMap = new Map(grades.map((g) => [g.id, g]));
  const sizeMap = new Map(sizes.map((sz) => [sz.id, sz]));
  const countMap = new Map(counts.map((c) => [c.id, c]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const expenseTypeMap = new Map(expenseTypes.map((e) => [e.id, e]));

  // Filtered List
  const filteredPurchases = purchases.filter((p) => {
    if (!showVoided && p.isVoided) return false;
    if (showVoided && !p.isVoided) return false;

    if (supplierFilter && p.supplierId !== supplierFilter) return false;
    if (speciesFilter && p.speciesId !== speciesFilter) return false;
    if (statusFilter && p.paymentStatus !== statusFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = p.purchaseId.toLowerCase().includes(q);
      const matchInvoice = p.invoiceNo?.toLowerCase().includes(q);
      const matchBatch = p.batchNo?.toLowerCase().includes(q);
      const matchSupplier = supplierMap.get(p.supplierId)?.name.toLowerCase().includes(q);
      const matchSpecies = speciesMap.get(p.speciesId)?.name.toLowerCase().includes(q);
      return matchId || matchInvoice || matchBatch || matchSupplier || matchSpecies;
    }

    return true;
  });

  const handleVoidConfirm = () => {
    if (!voidModalTarget || !voidReason.trim()) return;
    const res = voidPurchase(voidModalTarget.id, voidReason.trim());
    if (res.success) {
      setVoidModalTarget(null);
      setVoidReason('');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModalTarget) return;
    const res = deletePurchasePermanently(deleteModalTarget.id);
    if (res.success) {
      setDeleteModalTarget(null);
    }
  };

  const handleStartEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setEditForm({
      purchaseDate: p.purchaseDate,
      supplierId: p.supplierId,
      locationId: p.locationId,
      invoiceNo: p.invoiceNo || '',
      batchNo: p.batchNo || '',
      speciesId: p.speciesId,
      gradeId: p.gradeId || '',
      sizeId: p.sizeId || '',
      countId: p.countId || '',
      boxesCount: p.boxesCount || 0,
      weightKg: p.weightKg || 0,
      ratePerKg: p.ratePerKg || 0,
      damageWeightKg: p.damageWeightKg || 0,
      damageRatePerKg: p.damageRatePerKg || 0,
      expenseBreakdown: { ...(p.expenseBreakdown || {}) },
      remarks: p.remarks || '',
      editReason: ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    if (!editForm.editReason.trim()) return;

    const res = updatePurchase(
      editingPurchase.id,
      {
        purchaseDate: editForm.purchaseDate,
        supplierId: editForm.supplierId,
        locationId: editForm.locationId,
        invoiceNo: editForm.invoiceNo,
        batchNo: editForm.batchNo.trim() || undefined,
        speciesId: editForm.speciesId,
        gradeId: editForm.gradeId,
        sizeId: editForm.sizeId,
        countId: editForm.countId,
        boxesCount: Number(editForm.boxesCount) || 0,
        weightKg: Number(editForm.weightKg) || 0,
        ratePerKg: Number(editForm.ratePerKg) || 0,
        damageWeightKg: Number(editForm.damageWeightKg) || 0,
        damageRatePerKg: Number(editForm.damageRatePerKg) || 0,
        expenseBreakdown: editForm.expenseBreakdown,
        remarks: editForm.remarks
      },
      editForm.editReason.trim()
    );

    if (res.success) {
      setEditingPurchase(null);
    }
  };

  const activeExpenseTypes = expenseTypes.filter((e) => e.active);
  const editSupplier = suppliers.find((s) => s.id === editForm.supplierId);
  const editDerived = computePurchaseFields({
    weightKg: Number(editForm.weightKg) || 0,
    ratePerKg: Number(editForm.ratePerKg) || 0,
    damageWeightKg: Number(editForm.damageWeightKg) || 0,
    damageRatePerKg: Number(editForm.damageRatePerKg) || 0,
    expenseBreakdown: editForm.expenseBreakdown,
    amountPaid: editingPurchase?.amountPaid || 0,
    purchaseDate: editForm.purchaseDate,
    supplier: editSupplier
  });

  const handleExportCSV = () => {
    const exportData = filteredPurchases.map((p) => ({
      PurchaseID: p.purchaseId,
      Date: p.purchaseDate,
      FY: p.financialYear,
      Supplier: supplierMap.get(p.supplierId)?.name || 'N/A',
      HarbourLocation: locationMap.get(p.locationId)?.name || 'N/A',
      InvoiceNo: p.invoiceNo || 'N/A',
      BatchNo: p.batchNo || 'None',
      Species: speciesMap.get(p.speciesId)?.name || 'N/A',
      Grade: gradeMap.get(p.gradeId)?.name || 'N/A',
      Size: sizeMap.get(p.sizeId)?.name || 'N/A',
      Count: countMap.get(p.countId)?.name || 'N/A',
      WeightKg: p.weightKg,
      RatePerKg: p.ratePerKg,
      PurchaseValue: p.purchaseValue,
      DamageAmount: p.damageAmount,
      TotalExpenses: p.totalExpenses,
      TotalCost: p.totalCost,
      EffectiveRate: p.effectiveRatePerKg,
      AmountPaid: p.amountPaid,
      BalancePayable: p.balancePayable,
      DueDate: p.dueDate,
      PaymentStatus: p.paymentStatus,
      IsVoided: p.isVoided ? 'Yes' : 'No',
      CreatedBy: p.createdBy
    }));

    const csvStr = convertToCSV(exportData, [
      { key: 'PurchaseID', label: 'Purchase ID' },
      { key: 'Date', label: 'Purchase Date' },
      { key: 'FY', label: 'Financial Year' },
      { key: 'Supplier', label: 'Supplier Name' },
      { key: 'HarbourLocation', label: 'Landing Centre' },
      { key: 'InvoiceNo', label: 'Invoice No' },
      { key: 'BatchNo', label: 'Batch No' },
      { key: 'Species', label: 'Species' },
      { key: 'Grade', label: 'Grade' },
      { key: 'Size', label: 'Physical Size' },
      { key: 'Count', label: 'Piece Count' },
      { key: 'WeightKg', label: 'Weight (Kg)' },
      { key: 'RatePerKg', label: 'Rate (INR/Kg)' },
      { key: 'PurchaseValue', label: 'Purchase Value' },
      { key: 'DamageAmount', label: 'Damage Deductions' },
      { key: 'TotalExpenses', label: 'Total Expenses' },
      { key: 'TotalCost', label: 'Final Total Cost' },
      { key: 'EffectiveRate', label: 'Effective Rate/Kg' },
      { key: 'AmountPaid', label: 'Amount Paid' },
      { key: 'BalancePayable', label: 'Balance Payable' },
      { key: 'DueDate', label: 'Due Date' },
      { key: 'PaymentStatus', label: 'Payment Status' },
      { key: 'IsVoided', label: 'Voided' },
      { key: 'CreatedBy', label: 'Entered By' }
    ]);

    downloadFile(csvStr, `Seafood_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportTallyXML = () => {
    const xml = generateTallyPurchaseXML(filteredPurchases, suppliers, businessSettings.businessName);
    downloadFile(xml, `Tally_Purchase_Import_${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, Supplier, Species, Invoice, Batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Species</option>
            {species.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-rose-600 outline-none transition"
          >
            <option value="">All Payment Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Fully Paid">Fully Paid</option>
          </select>

          <button
            onClick={() => setShowVoided(!showVoided)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              showVoided
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-gray-50 text-ink-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {showVoided ? 'Showing Voided' : 'Active Only'}
          </button>
        </div>

        {/* Action Buttons: Import, Export to CSV and Tally XML */}
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('excel-import')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 rounded-xl transition shadow-2xs"
              title="Bulk import existing seafood purchases from Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Import Excel</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-rose-50 text-ink-700 hover:text-rose-700 text-xs font-semibold border border-gray-200 rounded-xl transition"
            title="Export filtered transactions to Excel CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handleExportTallyXML}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100/70 text-rose-700 text-xs font-semibold border border-rose-200 rounded-xl transition"
            title="Generate Tally-compatible XML voucher export"
          >
            <FileCode className="w-3.5 h-3.5 text-rose-600" />
            <span>Tally XML</span>
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-4">Purchase ID</th>
                <th className="py-3 px-4">Date &amp; FY</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Species, Size &amp; Count</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Rate / Kg</th>
                <th className="py-3 px-4 text-right">Landed Cost</th>
                <th className="py-3 px-4 text-right">Eff. Rate</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-ink-900">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const supp = supplierMap.get(p.supplierId);
                  const spec = speciesMap.get(p.speciesId);
                  const sz = sizeMap.get(p.sizeId);
                  const cnt = countMap.get(p.countId);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-rose-50/40 transition-colors ${p.isVoided ? 'bg-gray-50/60 opacity-60' : ''}`}
                    >
                      <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {p.purchaseId}
                          {p.batchNo && (
                            <span title={`Shared Batch: ${p.batchNo}`}>
                              <Layers className="w-3.5 h-3.5 text-amber-600" />
                            </span>
                          )}
                        </div>
                        {p.invoiceNo && <div className="text-[10px] text-ink-500 font-normal">Inv: {p.invoiceNo}</div>}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold">{p.purchaseDate}</div>
                        <div className="text-[10px] text-ink-500">{p.financialYear}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-900 line-clamp-1">{supp?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-ink-500 capitalize">{supp?.type?.replace('_', ' ')}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-900 line-clamp-1">{spec?.name || 'Species'}</div>
                        <div className="text-[10px] text-ink-500">
                          {[sz?.name ? `Size: ${sz.name}` : '', cnt?.name ? `Count: ${cnt.name}` : ''].filter(Boolean).join(' · ') || 'Standard'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        {formatKg(p.weightKg)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        ₹{p.ratePerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-rose-900 whitespace-nowrap">
                        {formatINR(p.totalCost)}
                      </td>

                      <td className="py-3 px-4 text-right text-ink-700 whitespace-nowrap">
                        ₹{p.effectiveRatePerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'Fully Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                        {p.balancePayable > 0 && (
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            Due: {formatINR(p.balancePayable)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Modal */}
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Inspect complete details & audit metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action: Junior Accountant, Master Accountant, Admin */}
                          {!p.isVoided && permissions.canCreateEditPurchases && (
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 rounded-lg text-ink-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit purchase record (Junior/Master Accountant, Admin)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Void Action: Master Accountant or Admin */}
                          {!p.isVoided && permissions.canVoid && (
                            <button
                              onClick={() => setVoidModalTarget(p)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                              title="Soft delete / void with mandatory reason"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Permanent Delete: OWNER/ADMIN EXCLUSIVE */}
                          {permissions.canPermanentlyDelete && (
                            <button
                              onClick={() => setDeleteModalTarget(p)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition"
                              title="Permanent purge (Owner/Admin only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase Transaction: ${selectedPurchase?.purchaseId}`}
        subtitle="Complete procurement audit inspection and breakdown"
        maxWidth="max-w-3xl"
      >
        {selectedPurchase && (
          <div className="space-y-6 text-xs">
            {selectedPurchase.isVoided && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium">
                <strong>VOIDED TRANSACTION:</strong> {selectedPurchase.voidReason} (by {selectedPurchase.voidedBy} on {new Date(selectedPurchase.voidedAt || '').toLocaleString()})
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-ink-500 block">Purchase Date</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.purchaseDate}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Financial Year</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.financialYear}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Invoice / Bill</span>
                <span className="font-bold text-ink-900 text-sm">{selectedPurchase.invoiceNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-ink-500 block">Batch Pool</span>
                <span className="font-bold text-rose-700 text-sm">{selectedPurchase.batchNo || 'Single Product'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Supplier & Harbour</h4>
                <div>
                  <strong>Supplier:</strong> {supplierMap.get(selectedPurchase.supplierId)?.name}
                </div>
                <div>
                  <strong>Harbour Landing:</strong> {locationMap.get(selectedPurchase.locationId)?.name}
                </div>
                <div>
                  <strong>Payment Terms:</strong> {supplierMap.get(selectedPurchase.supplierId)?.paymentTerms}
                </div>
                <div>
                  <strong>Calculated Due Date:</strong> {selectedPurchase.dueDate}
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Product Specification</h4>
                <div>
                  <strong>Species:</strong> {speciesMap.get(selectedPurchase.speciesId)?.name}
                </div>
                <div>
                  <strong>Grade:</strong> {gradeMap.get(selectedPurchase.gradeId)?.name || 'Standard'}
                </div>
                <div>
                  <strong>Physical Size:</strong> {sizeMap.get(selectedPurchase.sizeId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Piece Count:</strong> {countMap.get(selectedPurchase.countId)?.name || 'N/A'}
                </div>
                <div>
                  <strong>Total Boxes:</strong> {selectedPurchase.boxesCount}
                </div>
              </div>
            </div>

            {/* Financial Valuation Breakdown */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">Cost & Expenses Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-ink-500 block">Weight</span>
                  <span className="font-bold text-ink-900">{formatKg(selectedPurchase.weightKg)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Rate / Kg</span>
                  <span className="font-bold text-ink-900">₹{selectedPurchase.ratePerKg.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Base Purchase Value</span>
                  <span className="font-bold text-ink-900">{formatINR(selectedPurchase.purchaseValue)}</span>
                </div>
                <div>
                  <span className="text-ink-500 block">Damage Deduction</span>
                  <span className="font-bold text-rose-700">-{formatINR(selectedPurchase.damageAmount)}</span>
                </div>
              </div>

              {/* Dynamic Expense Breakdown */}
              <div className="pt-2 border-t border-gray-200">
                <span className="text-xs font-semibold text-ink-700 block mb-1">
                  Landing Expense Heads {selectedPurchase.isBatchAllocated ? '(Proportionally Allocated)' : ''}:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(selectedPurchase.expenseBreakdown || {}).map(([expId, val]) => (
                    <div key={expId} className="p-2 bg-white rounded-lg border border-gray-200 text-xs">
                      <span className="text-ink-500 block">{expenseTypeMap.get(expId)?.name || expId}</span>
                      <span className="font-bold text-ink-900">{formatINR(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs font-bold">
                <span>Final Total Cost: <span className="text-rose-700 text-sm">{formatINR(selectedPurchase.totalCost)}</span></span>
                <span>Effective Rate/Kg: <span className="text-ink-900">₹{selectedPurchase.effectiveRatePerKg.toFixed(2)} / Kg</span></span>
                <span>Balance Payable: <span className="text-rose-800">{formatINR(selectedPurchase.balancePayable)}</span></span>
              </div>
            </div>

            {/* Attached Photo of Weighment Slip / Boat ID */}
            {selectedPurchase.photoUrl && (
              <div className="p-4 border border-gray-200 rounded-xl space-y-2 bg-gray-50/30">
                <h4 className="font-bold text-ink-900 uppercase text-[11px] text-rose-700">
                  Attached Weighment Slip / Boat ID Photo
                </h4>
                <div className="max-w-md rounded-xl overflow-hidden border border-gray-200 bg-white p-1 shadow-2xs">
                  <img
                    src={selectedPurchase.photoUrl}
                    alt={`Weighment Slip for ${selectedPurchase.purchaseId}`}
                    className="w-full max-h-72 object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Audit & Staff Metadata */}
            <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-ink-500 space-y-1">
              <div>Created By: <strong>{selectedPurchase.createdBy}</strong> at {new Date(selectedPurchase.createdAt).toLocaleString()}</div>
              {selectedPurchase.updatedBy && (
                <div>Last Updated By: <strong>{selectedPurchase.updatedBy}</strong> at {new Date(selectedPurchase.updatedAt).toLocaleString()}</div>
              )}
              {selectedPurchase.remarks && <div>Remarks: {selectedPurchase.remarks}</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* VOID CONFIRMATION MODAL */}
      <Modal
        isOpen={!!voidModalTarget}
        onClose={() => setVoidModalTarget(null)}
        title={`Void Transaction: ${voidModalTarget?.purchaseId}`}
        subtitle="Soft delete. Record remains recoverable with an explicit audit note."
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-700">
            You are about to void purchase <strong>{voidModalTarget?.purchaseId}</strong>. The transaction will be marked inactive and deducted from supplier payables, but will remain visible in audit logs.
          </p>

          <div>
            <label className="block font-semibold text-ink-900 mb-1">
              Reason for Voiding <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Inadvertent duplicate entry at harbour, lot returned to boat owner due to spoilage"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setVoidModalTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVoidConfirm}
              disabled={!voidReason.trim()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 transition"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </Modal>

      {/* PERMANENT PURGE CONFIRMATION MODAL (OWNER/ADMIN EXCLUSIVE) */}
      <Modal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        title="CRITICAL: Permanent Purge Record"
        subtitle="Owner / Admin Exclusive Authority"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong>Irreversible Action:</strong> This will completely remove purchase{' '}
              <strong>{deleteModalTarget?.purchaseId}</strong> from the database. This action is permanently logged to your surveillance audit log.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModalTarget(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Abort
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition"
            >
              Permanently Purge Record
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT PURCHASE MODAL */}
      <Modal
        isOpen={!!editingPurchase}
        onClose={() => setEditingPurchase(null)}
        title={`Edit Transaction: ${editingPurchase?.purchaseId}`}
        subtitle="Modify weighment, pricing, lot, or landing expenses with audit compliance reason"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Date</label>
              <input
                type="date"
                value={editForm.purchaseDate}
                onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Supplier</label>
              <select
                value={editForm.supplierId}
                onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Harbour / Location</label>
              <select
                value={editForm.locationId}
                onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.harbourCentre})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Invoice / Weighment Slip #</label>
              <input
                type="text"
                value={editForm.invoiceNo}
                onChange={(e) => setEditForm({ ...editForm, invoiceNo: e.target.value })}
                placeholder="e.g. INV-1049"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Batch / Lot # (Optional)</label>
              <input
                type="text"
                value={editForm.batchNo}
                onChange={(e) => setEditForm({ ...editForm, batchNo: e.target.value })}
                placeholder="e.g. BATCH-2026-04"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Species</label>
              <select
                value={editForm.speciesId}
                onChange={(e) => setEditForm({ ...editForm, speciesId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                required
              >
                {species.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name} ({sp.scientificName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Grade</label>
              <select
                value={editForm.gradeId}
                onChange={(e) => setEditForm({ ...editForm, gradeId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Physical Size</label>
              <select
                value={editForm.sizeId}
                onChange={(e) => setEditForm({ ...editForm, sizeId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {sizes.map((sz) => (
                  <option key={sz.id} value={sz.id}>{sz.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Piece Count</label>
              <select
                value={editForm.countId}
                onChange={(e) => setEditForm({ ...editForm, countId: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              >
                <option value="">None / Standard</option>
                {counts.map((cnt) => (
                  <option key={cnt.id} value={cnt.id}>{cnt.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Boxes / Crates Count</label>
              <input
                type="number"
                min="0"
                value={editForm.boxesCount || ''}
                onChange={(e) => setEditForm({ ...editForm, boxesCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Weight (Kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.weightKg || ''}
                onChange={(e) => setEditForm({ ...editForm, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Rate / Kg (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.ratePerKg || ''}
                onChange={(e) => setEditForm({ ...editForm, ratePerKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl focus:border-rose-600 outline-none font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
            <div>
              <label className="block font-semibold text-amber-900 mb-1">Damage / Rejection Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.damageWeightKg || ''}
                onChange={(e) => setEditForm({ ...editForm, damageWeightKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-600 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-amber-900 mb-1">Damage Rate / Kg (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.damageRatePerKg || ''}
                onChange={(e) => setEditForm({ ...editForm, damageRatePerKg: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-600 outline-none"
              />
            </div>
          </div>

          {/* Dynamic Landing Expenses */}
          {activeExpenseTypes.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block font-bold text-ink-900 mb-2">Landing & Logistics Expenses (₹)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeExpenseTypes.map((et) => (
                  <div key={et.id}>
                    <span className="block text-[11px] font-medium text-ink-600 truncate">{et.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editForm.expenseBreakdown[et.id] || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditForm({
                          ...editForm,
                          expenseBreakdown: {
                            ...editForm.expenseBreakdown,
                            [et.id]: val
                          }
                        });
                      }}
                      className="w-full p-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-rose-600 outline-none mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Summary Pill */}
          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] text-ink-500 font-semibold uppercase">Purchase Value</div>
              <div className="font-bold text-ink-900">{formatINR(editDerived.purchaseValue)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-500 font-semibold uppercase">Total Expenses</div>
              <div className="font-bold text-ink-900">{formatINR(editDerived.totalExpenses)}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-800 font-semibold uppercase">Total Cost</div>
              <div className="font-bold text-rose-900">{formatINR(editDerived.totalCost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-800 font-semibold uppercase">Eff. Rate/Kg</div>
              <div className="font-bold text-rose-900">₹{editDerived.effectiveRatePerKg.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Remarks</label>
            <input
              type="text"
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              placeholder="e.g. Weighment calibrated at boat discharge"
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <label className="block font-bold text-rose-900 mb-1">
              Reason for Edit <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Corrected weight after second scale check, updated ice charges"
              value={editForm.editReason}
              onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
              className="w-full p-2.5 bg-rose-50/30 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
            <p className="text-[10px] text-ink-500 mt-1">This explanation will be permanently recorded in the system audit trail.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingPurchase(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-ink-700 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editForm.editReason.trim() || editForm.weightKg <= 0 || editForm.ratePerKg <= 0}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
