import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PaymentRecord, Purchase } from '../../types';
import { NavTab } from '../common/Sidebar';
import { formatINR, formatCroreINR, getIndianFinancialYear } from '../../utils/calculations';
import { convertToCSV, downloadFile, triggerPrint } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { BentoCard } from '../common/BentoCard';
import {
  CreditCard,
  Plus,
  Search,
  Eye,
  Printer,
  Ban,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Wallet,
  Lock,
  X,
  ChevronRight,
  Receipt,
  UserCheck
} from 'lucide-react';

interface PurchasePaymentViewProps {
  onNavigate?: (tab: NavTab) => void;
  preselectedPurchaseId?: string;
  preselectedSupplierId?: string;
  onClearPreselectedPurchase?: () => void;
}

export const PurchasePaymentView: React.FC<PurchasePaymentViewProps> = ({
  onNavigate: _onNavigate,
  preselectedPurchaseId,
  preselectedSupplierId,
  onClearPreselectedPurchase
}) => {
  const {
    payments,
    purchases,
    suppliers,
    bankAccounts,
    addPayment,
    voidPayment,
    businessSettings
  } = useData();

  const { permissions } = useAuth();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  // Active top-level subtab
  const [activeSubTab, setActiveSubTab] = useState<'disburse' | 'register' | 'payables'>('register');

  // Search and Filters for Register
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterFy, setFilterFy] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Form State for Recording Payment
  const [formSupplierId, setFormSupplierId] = useState(preselectedSupplierId || '');
  const [formPurchaseId, setFormPurchaseId] = useState(preselectedPurchaseId || '');
  const [formAccountId, setFormAccountId] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formMode, setFormMode] = useState<'Bank Transfer' | 'Cheque' | 'Cash' | 'RTGS/NEFT' | 'UPI'>('Bank Transfer');
  const [formReferenceNo, setFormReferenceNo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [targetMode, setTargetMode] = useState<'fifo' | 'specific'>('fifo');

  // Modals state
  const [voucherModalPayment, setVoucherModalPayment] = useState<PaymentRecord | null>(null);
  const [voidModalTarget, setVoidModalTarget] = useState<PaymentRecord | null>(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [inspectPurchaseTarget, setInspectPurchaseTarget] = useState<Purchase | null>(null);

  // Handle incoming preselected purchase
  useEffect(() => {
    if (preselectedPurchaseId) {
      const match = purchases.find((p) => p.id === preselectedPurchaseId);
      if (match) {
        setFormSupplierId(match.supplierId);
        setFormPurchaseId(match.id);
        setTargetMode('specific');
        setFormAmount(String(match.balancePayable > 0 ? match.balancePayable : match.totalCost));
        setActiveSubTab('disburse');
      }
    } else if (preselectedSupplierId) {
      setFormSupplierId(preselectedSupplierId);
      setActiveSubTab('disburse');
    }
  }, [preselectedPurchaseId, preselectedSupplierId, purchases]);

  // Lookup maps
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const accountMap = useMemo(() => new Map(bankAccounts.map((a) => [a.id, a])), [bankAccounts]);
  const purchaseMap = useMemo(() => new Map(purchases.map((p) => [p.id, p])), [purchases]);

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active), [suppliers]);
  const activeBankAccounts = useMemo(() => bankAccounts.filter((b) => b.active), [bankAccounts]);

  // Selected supplier object & metrics
  const selectedSupplier = useMemo(() => {
    return formSupplierId ? supplierMap.get(formSupplierId) : null;
  }, [formSupplierId, supplierMap]);

  // Supplier's unpaid/partially paid purchases
  const supplierUnpaidPurchases = useMemo(() => {
    if (!formSupplierId) return [];
    return purchases.filter(
      (p) => !p.isVoided && p.supplierId === formSupplierId && p.balancePayable > 0
    );
  }, [formSupplierId, purchases]);

  // Total balance payable for selected supplier
  const supplierTotalOutstanding = useMemo(() => {
    return supplierUnpaidPurchases.reduce((sum, p) => sum + p.balancePayable, 0);
  }, [supplierUnpaidPurchases]);

  // High-level KPI Stats (handles up to 100 Crores)
  const kpiStats = useMemo(() => {
    const nonVoidedPayments = payments.filter((p) => !p.isVoided);
    const totalDisbursed = nonVoidedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const nonVoidedPurchases = purchases.filter((p) => !p.isVoided);
    const totalOutstanding = nonVoidedPurchases.reduce((acc, p) => acc + (p.balancePayable || 0), 0);
    const pendingLotsCount = nonVoidedPurchases.filter((p) => p.balancePayable > 0).length;
    const fullySettledCount = nonVoidedPurchases.filter((p) => p.paymentStatus === 'Fully Paid').length;

    // Active suppliers with dues
    const suppliersWithDuesSet = new Set(
      nonVoidedPurchases.filter((p) => p.balancePayable > 0).map((p) => p.supplierId)
    );

    return {
      totalDisbursed,
      totalOutstanding,
      pendingLotsCount,
      fullySettledCount,
      activeSuppliersWithDues: suppliersWithDuesSet.size,
      totalPaymentsCount: payments.length
    };
  }, [payments, purchases]);

  // Supplier payables aggregation table
  const supplierPayablesList = useMemo(() => {
    const list = suppliers.map((sup) => {
      const supPurchases = purchases.filter((p) => !p.isVoided && p.supplierId === sup.id);
      const totalPurchased = supPurchases.reduce((acc, p) => acc + p.totalCost, 0);
      const totalPaid = supPurchases.reduce((acc, p) => acc + p.amountPaid, 0);
      const totalOutstanding = supPurchases.reduce((acc, p) => acc + p.balancePayable, 0);
      const unpaidLots = supPurchases.filter((p) => p.balancePayable > 0);

      // Find earliest unpaid date
      let oldestPendingDate = '-';
      if (unpaidLots.length > 0) {
        const sorted = [...unpaidLots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
        oldestPendingDate = sorted[0].purchaseDate;
      }

      return {
        supplier: sup,
        totalPurchased,
        totalPaid,
        totalOutstanding,
        unpaidCount: unpaidLots.length,
        oldestPendingDate,
        status:
          totalOutstanding <= 0
            ? 'Fully Settled'
            : totalPaid > 0
            ? 'Partially Settled'
            : 'Unsettled'
      };
    });

    // Default sort: highest outstanding first
    return list.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [suppliers, purchases]);

  // Unique financial years in payments
  const availableFys = useMemo(() => {
    const set = new Set(payments.map((p) => p.financialYear).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [payments]);

  // Filtered payment register
  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      if (!showVoided && pay.isVoided) return false;
      if (filterSupplierId && pay.supplierId !== filterSupplierId) return false;
      if (filterMode && pay.paymentMode !== filterMode) return false;
      if (filterAccountId && pay.paidFromAccountId !== filterAccountId) return false;
      if (filterFy && pay.financialYear !== filterFy) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sup = supplierMap.get(pay.supplierId);
        const matchNo = pay.paymentNo.toLowerCase().includes(q);
        const matchRef = (pay.referenceNo || '').toLowerCase().includes(q);
        const matchNotes = (pay.notes || '').toLowerCase().includes(q);
        const matchSup = sup ? sup.name.toLowerCase().includes(q) || sup.code.toLowerCase().includes(q) : false;
        if (!matchNo && !matchRef && !matchNotes && !matchSup) return false;
      }

      return true;
    }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [payments, showVoided, filterSupplierId, filterMode, filterAccountId, filterFy, searchQuery, supplierMap]);

  // Target purchase selector handler
  const handleSelectSpecificPurchase = (p: Purchase) => {
    setFormPurchaseId(p.id);
    setTargetMode('specific');
    setFormAmount(String(p.balancePayable));
    showToast(`Pre-filled ₹${p.balancePayable.toLocaleString('en-IN')} for lot ${p.purchaseId}`, 'info');
  };

  // Reset form
  const handleResetForm = () => {
    setFormSupplierId('');
    setFormPurchaseId('');
    setFormAccountId('');
    setFormAmount('');
    setFormDate(todayStr);
    setFormMode('Bank Transfer');
    setFormReferenceNo('');
    setFormNotes('');
    setTargetMode('fifo');
    if (onClearPreselectedPurchase) {
      onClearPreselectedPurchase();
    }
  };

  // Submit payment form
  const handleDisbursePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions.canManagePayments) {
      showToast('Unauthorized: Only Master Accountant and Owner/Admin can disburse payments.', 'error');
      return;
    }

    if (!formSupplierId) {
      showToast('Please select a supplier.', 'error');
      return;
    }

    if (!formAccountId) {
      showToast('Please select the disbursal bank/cash account.', 'error');
      return;
    }

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid payment amount greater than ₹0.', 'error');
      return;
    }

    if (supplierTotalOutstanding > 0 && numAmount > supplierTotalOutstanding * 1.5) {
      if (!window.confirm(`Payment amount (₹${numAmount.toLocaleString('en-IN')}) is significantly higher than total supplier dues (₹${supplierTotalOutstanding.toLocaleString('en-IN')}). Do you want to proceed with this advance?`)) {
        return;
      }
    }

    const fy = getIndianFinancialYear(formDate) || businessSettings.financialYear;

    addPayment({
      paymentDate: formDate,
      financialYear: fy,
      supplierId: formSupplierId,
      purchaseId: targetMode === 'specific' && formPurchaseId ? formPurchaseId : undefined,
      paidFromAccountId: formAccountId,
      amount: numAmount,
      paymentMode: formMode,
      referenceNo: formReferenceNo.trim() || undefined,
      notes: formNotes.trim() || undefined
    });

    handleResetForm();
    setActiveSubTab('register');
  };

  // Handle Void confirmation
  const handleConfirmVoid = () => {
    if (!voidModalTarget) return;
    if (!voidReasonText.trim()) {
      showToast('Please provide a mandatory reason for voiding this payment voucher.', 'error');
      return;
    }

    voidPayment(voidModalTarget.id, voidReasonText.trim());
    setVoidModalTarget(null);
    setVoidReasonText('');
  };

  // Export filtered register to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      showToast('No payment records to export.', 'warning');
      return;
    }

    const rows = filteredPayments.map((p) => {
      const sup = supplierMap.get(p.supplierId);
      const acc = accountMap.get(p.paidFromAccountId);
      const targetLot = p.purchaseId ? purchaseMap.get(p.purchaseId)?.purchaseId || p.purchaseId : 'FIFO / On Account';

      return {
        voucherNo: p.paymentNo,
        date: p.paymentDate,
        fy: p.financialYear,
        supplierCode: sup?.code || '',
        supplierName: sup?.name || '',
        account: acc ? `${acc.name} (${acc.bank})` : '',
        mode: p.paymentMode,
        ref: p.referenceNo || '',
        amount: p.amount,
        targetLot,
        notes: p.notes || '',
        status: p.isVoided ? 'VOIDED' : 'ACTIVE',
        voidReason: p.voidReason || '',
        createdBy: p.createdBy,
        createdAt: p.createdAt
      };
    });

    const columns: { key: keyof typeof rows[0]; label: string }[] = [
      { key: 'voucherNo', label: 'Voucher No' },
      { key: 'date', label: 'Payment Date' },
      { key: 'fy', label: 'Financial Year' },
      { key: 'supplierCode', label: 'Supplier Code' },
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'account', label: 'Disbursal Account' },
      { key: 'mode', label: 'Payment Mode' },
      { key: 'ref', label: 'Reference / UTR' },
      { key: 'amount', label: 'Amount Paid (INR)' },
      { key: 'targetLot', label: 'Settlement Allocation' },
      { key: 'notes', label: 'Notes' },
      { key: 'status', label: 'Status' },
      { key: 'voidReason', label: 'Void Reason' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'createdAt', label: 'Created At' }
    ];

    const csvStr = convertToCSV(rows, columns);
    downloadFile(csvStr, `Supplier_Payments_Register_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    showToast('Payment register exported successfully.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title & Quick Disburse action */}
      <PageHeader
        title="Purchase Payments & Supplier Disbursals"
        subtitle="Record post-procurement payments to seafood suppliers, manage disbursal vouchers, and audit supplier outstanding balances"
        badge="Disbursal Center"
        primaryAction={{
          label: 'Disburse Payment',
          onClick: () => setActiveSubTab('disburse'),
          icon: Plus
        }}
        secondaryAction={{
          label: 'Export CSV',
          onClick: handleExportCSV,
          icon: Download
        }}
      />

      {/* 2. Top KPI Bento Cards (100-Crore Safe Grid Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard
          label="Total Disbursed"
          value={formatINR(kpiStats.totalDisbursed)}
          caption={`${kpiStats.totalPaymentsCount} vouchers • All non-voided disbursals`}
          icon={Wallet}
          variant="highlight"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />

        <BentoCard
          label="Total Supplier Dues"
          value={formatINR(kpiStats.totalOutstanding)}
          caption={`Across ${kpiStats.activeSuppliersWithDues} suppliers awaiting settlement`}
          icon={Clock}
          variant={kpiStats.totalOutstanding > 0 ? 'warning' : 'default'}
          iconBg="bg-amber-50"
          iconColor="text-amber-700"
        />

        <BentoCard
          label="Pending Lots"
          value={kpiStats.pendingLotsCount}
          caption="Purchase transactions with remaining balance"
          icon={Receipt}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <BentoCard
          label="Fully Settled Lots"
          value={kpiStats.fullySettledCount}
          caption="Procurement transactions settled in full"
          icon={CheckCircle2}
          variant="success"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2">
        <button
          onClick={() => setActiveSubTab('register')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeSubTab === 'register'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-gray-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Register ({filteredPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('disburse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeSubTab === 'disburse'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Disburse Payment (Post-Procurement)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeSubTab === 'payables'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-ink-600 hover:text-ink-900 hover:bg-gray-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Supplier Payables ({supplierPayablesList.filter((s) => s.totalOutstanding > 0).length} with Dues)</span>
        </button>
      </div>

      {/* 4. TAB 1: DISBURSE PAYMENT (POST-PROCUREMENT FORM) */}
      {activeSubTab === 'disburse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Disburse Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  Record Supplier Disbursal
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Record bank transfer, RTGS/NEFT, cheque, or cash payment made to supplier post-purchase
                </p>
              </div>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                FY: {getIndianFinancialYear(formDate)}
              </span>
            </div>

            {!permissions.canManagePayments && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Unauthorized: Only Master Accountant and Admin can disburse payments.</span>
              </div>
            )}

            <form onSubmit={handleDisbursePayment} className="space-y-5">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                  Supplier / Boat Owner <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formSupplierId}
                  onChange={(e) => {
                    setFormSupplierId(e.target.value);
                    setFormPurchaseId('');
                    setFormAmount('');
                  }}
                  required
                  disabled={!permissions.canManagePayments}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm font-medium text-ink-900"
                >
                  <option value="">-- Choose Supplier to Disburse --</option>
                  {activeSuppliers.map((s) => {
                    const dues = purchases
                      .filter((p) => !p.isVoided && p.supplierId === s.id)
                      .reduce((sum, p) => sum + p.balancePayable, 0);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) • Dues: {formatINR(dues)} • {s.bankName || 'No Bank'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Settlement Allocation Mode */}
              {formSupplierId && (
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Settlement Target Mode
                    </span>
                    <span className="text-xs text-ink-500">
                      {supplierUnpaidPurchases.length} open lot{supplierUnpaidPurchases.length !== 1 ? 's' : ''} available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        targetMode === 'fifo'
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetMode"
                        checked={targetMode === 'fifo'}
                        onChange={() => {
                          setTargetMode('fifo');
                          setFormPurchaseId('');
                        }}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink-900 block">
                          Auto-FIFO across Unpaid Lots
                        </span>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          Apportions payment starting from the oldest unpaid purchase transaction
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        targetMode === 'specific'
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetMode"
                        checked={targetMode === 'specific'}
                        onChange={() => setTargetMode('specific')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-ink-900 block">
                          Target Specific Purchase Lot
                        </span>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          Directly settles or reduces payable balance for one selected purchase lot
                        </p>
                      </div>
                    </label>
                  </div>

                  {targetMode === 'specific' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-ink-700 mb-1">
                        Select Purchase Lot to Settle
                      </label>
                      <select
                        value={formPurchaseId}
                        onChange={(e) => {
                          setFormPurchaseId(e.target.value);
                          if (e.target.value) {
                            const match = purchases.find((p) => p.id === e.target.value);
                            if (match) {
                              setFormAmount(String(match.balancePayable));
                            }
                          }
                        }}
                        required={targetMode === 'specific'}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:border-rose-600 outline-none transition text-xs font-medium text-ink-900"
                      >
                        <option value="">-- Choose Purchase Lot --</option>
                        {supplierUnpaidPurchases.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.purchaseId} • {p.purchaseDate} • Inv: {p.invoiceNo || 'N/A'} • Total: {formatINR(p.totalCost)} • Due: {formatINR(p.balancePayable)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Disbursal Amount (₹) <span className="text-rose-600">*</span>
                    </label>
                    {supplierTotalOutstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormAmount(String(supplierTotalOutstanding))}
                        className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
                      >
                        Fill Full Dues ({formatINR(supplierTotalOutstanding)})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 font-mono font-bold text-base text-ink-900 bg-rose-50/40 border border-rose-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
                  />
                  {formAmount && parseFloat(formAmount) >= 10000000 && (
                    <p className="text-[11px] font-bold text-rose-700 mt-1">
                      {formatCroreINR(parseFloat(formAmount))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                    Payment Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm text-ink-900 font-medium"
                  />
                </div>
              </div>

              {/* Disbursal Account & Payment Mode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                    Paid From Account <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    required
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm text-ink-900 font-medium"
                  >
                    <option value="">-- Disbursal Bank / Cash Float --</option>
                    {activeBankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.bank} • {acc.accountType} • {acc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as any)}
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm text-ink-900 font-medium"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="RTGS/NEFT">RTGS / NEFT Direct</option>
                    <option value="UPI">UPI / Digital Instant</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Harbour Cash Float</option>
                  </select>
                </div>
              </div>

              {/* Transaction Ref & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                    UTR / Cheque / Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC2981920 or CHQ-00129"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                    Payment Narration / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Post-purchase settlement for landings week 42"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    disabled={!permissions.canManagePayments}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition text-sm text-ink-900"
                  />
                </div>
              </div>

              {/* Submit / Reset Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 text-xs font-bold text-ink-600 hover:text-ink-900 hover:bg-gray-100 rounded-xl transition"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={!permissions.canManagePayments}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Disburse &amp; Post to Ledger</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Info: Live Supplier Profile & Outstanding Impact */}
          <div className="space-y-4">
            {selectedSupplier ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      Supplier Profile
                    </span>
                    <h4 className="text-base font-bold text-ink-900">
                      {selectedSupplier.name}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-ink-600 bg-gray-100 px-2 py-0.5 rounded">
                    {selectedSupplier.code}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-ink-500">Contact / Phone:</span>
                    <span className="font-semibold text-ink-800">{selectedSupplier.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-ink-500">Primary Bank:</span>
                    <span className="font-semibold text-ink-800">{selectedSupplier.bankName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-ink-500">Account No:</span>
                    <span className="font-mono font-semibold text-ink-800">{selectedSupplier.bankAccount || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-ink-500">IFSC Code:</span>
                    <span className="font-mono font-semibold text-ink-800">{selectedSupplier.bankIfsc || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-ink-500">Credit Period:</span>
                    <span className="font-semibold text-ink-800">{selectedSupplier.creditDays || selectedSupplier.paymentTerms || '0 Days'}</span>
                  </div>
                </div>

                {/* Live Settlement Balance Projection */}
                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
                    Ledger Impact Projection
                  </span>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-600">Current Outstanding:</span>
                    <span className="font-bold font-mono text-ink-900">{formatINR(supplierTotalOutstanding)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-600">Disbursal Amount:</span>
                    <span className="font-bold font-mono text-rose-700">
                      - {formatINR(parseFloat(formAmount) || 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-rose-200 flex justify-between text-xs">
                    <span className="font-bold text-ink-900">Projected Balance:</span>
                    <span className="font-black font-mono text-emerald-800">
                      {formatINR(Math.max(0, supplierTotalOutstanding - (parseFloat(formAmount) || 0)))}
                    </span>
                  </div>
                </div>

                {/* List of open lots for quick click */}
                {supplierUnpaidPurchases.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-ink-700 block">
                      Open Lots for {selectedSupplier.name} ({supplierUnpaidPurchases.length}):
                    </span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {supplierUnpaidPurchases.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-rose-50/50 hover:border-rose-200 transition text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold font-mono text-ink-900 block">{p.purchaseId}</span>
                            <span className="text-[10px] text-ink-500">{p.purchaseDate} • Due: {formatINR(p.balancePayable)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectSpecificPurchase(p)}
                            className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-700 text-[10px] font-bold rounded-md shadow-2xs transition"
                          >
                            Settle Lot
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50/80 rounded-2xl border border-gray-200 p-6 text-center space-y-2">
                <Building2 className="w-8 h-8 text-ink-400 mx-auto" />
                <h4 className="text-sm font-bold text-ink-700">No Supplier Selected</h4>
                <p className="text-xs text-ink-500">
                  Select a supplier from the form to inspect their current outstanding dues, bank coordinates, and open purchase lots.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 2: PAYMENT REGISTER & VOUCHER HISTORY */}
      {activeSubTab === 'register' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search by Voucher #, Supplier Name, UTR / Cheque Ref, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none text-xs text-ink-900 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-ink-700 font-medium outline-none"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-ink-700 font-medium outline-none"
                >
                  <option value="">All Modes</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="RTGS/NEFT">RTGS/NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>

                <select
                  value={filterAccountId}
                  onChange={(e) => setFilterAccountId(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-ink-700 font-medium outline-none"
                >
                  <option value="">All Accounts</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {availableFys.length > 0 && (
                  <select
                    value={filterFy}
                    onChange={(e) => setFilterFy(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-ink-700 font-medium outline-none"
                  >
                    <option value="">All FYs</option>
                    {availableFys.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs text-ink-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showVoided}
                    onChange={(e) => setShowVoided(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Show Voided</span>
                </label>
              </div>
            </div>
          </div>

          {/* Payment Register Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-ink-500 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Date &amp; FY</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Paid From</th>
                    <th className="py-3 px-4">Mode &amp; Ref</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Allocation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-ink-500">
                        <CreditCard className="w-8 h-8 text-ink-300 mx-auto mb-2" />
                        <p className="font-semibold">No payment vouchers found</p>
                        <p className="text-[11px] text-ink-400 mt-0.5">
                          Use the "Disburse Payment" tab above to record payments made to seafood suppliers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const sup = supplierMap.get(p.supplierId);
                      const acc = accountMap.get(p.paidFromAccountId);
                      const targetPurchase = p.purchaseId ? purchaseMap.get(p.purchaseId) : null;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-rose-50/20 transition ${
                            p.isVoided ? 'opacity-60 bg-gray-50/60' : ''
                          }`}
                        >
                          {/* Voucher No */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold font-mono text-ink-900 block">
                              {p.paymentNo}
                            </span>
                            <span className="text-[10px] text-ink-400">
                              by {p.createdBy?.split('@')[0]}
                            </span>
                          </td>

                          {/* Date & FY */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-ink-800 block">{p.paymentDate}</span>
                            <span className="text-[10px] text-ink-500">{p.financialYear}</span>
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-ink-900 block">{sup?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-ink-500">{sup?.code} • {sup?.bankName || 'No Bank'}</span>
                          </td>

                          {/* Paid From Account */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-ink-800 block">{acc?.name || 'General Float'}</span>
                            <span className="text-[10px] text-ink-500">{acc?.bank} • {acc?.accountType}</span>
                          </td>

                          {/* Mode & Ref */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-ink-800 block">{p.paymentMode}</span>
                            <span className="text-[10px] font-mono text-ink-500">{p.referenceNo || 'No Ref'}</span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <span className="font-black font-mono text-sm text-ink-900 block">
                              {formatINR(p.amount)}
                            </span>
                            {p.amount >= 10000000 && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 rounded">
                                {formatCroreINR(p.amount)}
                              </span>
                            )}
                          </td>

                          {/* Allocation */}
                          <td className="py-3 px-4">
                            {targetPurchase ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setInspectPurchaseTarget(targetPurchase)}
                                  className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1 font-mono"
                                >
                                  <span>{targetPurchase.purchaseId}</span>
                                  <Eye className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] text-ink-500">Targeted Lot Settlement</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-ink-600">
                                FIFO On Account
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            {p.isVoided ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 cursor-help"
                                title={`Void Reason: ${p.voidReason || 'No reason specified'}`}
                              >
                                VOIDED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ACTIVE
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print Voucher Modal */}
                              <button
                                onClick={() => setVoucherModalPayment(p)}
                                className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Print A4 Payment Voucher"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Void Payment Action */}
                              {!p.isVoided && permissions.canVoid && (
                                <button
                                  onClick={() => {
                                    setVoidModalTarget(p);
                                    setVoidReasonText('');
                                  }}
                                  className="p-1.5 rounded-lg text-ink-400 hover:text-amber-700 hover:bg-amber-50 transition"
                                  title="Void payment voucher and reverse ledger allocation"
                                >
                                  <Ban className="w-4 h-4" />
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
        </div>
      )}

      {/* 6. TAB 3: SUPPLIER PAYABLES OVERVIEW */}
      {activeSubTab === 'payables' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-rose-600" />
                Supplier Payables Audit Ledger
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Overview of aggregate purchases, total disbursements, and outstanding balances per supplier
              </p>
            </div>
            <span className="text-xs font-bold text-ink-600 bg-gray-100 px-3 py-1 rounded-lg">
              {supplierPayablesList.filter((s) => s.totalOutstanding > 0).length} Suppliers with Outstanding Dues
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-ink-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Credit Terms</th>
                  <th className="py-3 px-4 text-right">Total Purchases (₹)</th>
                  <th className="py-3 px-4 text-right">Total Disbursed (₹)</th>
                  <th className="py-3 px-4 text-right">Outstanding Due (₹)</th>
                  <th className="py-3 px-4 text-center">Unpaid Lots</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierPayablesList.map((item) => (
                  <tr key={item.supplier.id} className="hover:bg-rose-50/20 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-ink-900 block">{item.supplier.name}</span>
                      <span className="text-[10px] text-ink-500">{item.supplier.code} • {item.supplier.bankName || 'No Bank'}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-ink-700">
                      <span className="font-medium">{item.supplier.creditDays || item.supplier.paymentTerms || 0} Days</span>
                      {item.oldestPendingDate !== '-' && (
                        <div className="text-[10px] text-amber-700">
                          Oldest: {item.oldestPendingDate}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-ink-900">
                      {formatINR(item.totalPurchased)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-emerald-800">
                      {formatINR(item.totalPaid)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-black text-rose-800">
                      {formatINR(item.totalOutstanding)}
                      {item.totalOutstanding >= 10000000 && (
                        <div className="text-[10px] font-bold text-rose-700">
                          {formatCroreINR(item.totalOutstanding)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.unpaidCount > 0 ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.unpaidCount} Lots
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Fully Settled'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'Partially Settled'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {item.totalOutstanding > 0 && permissions.canManagePayments ? (
                        <button
                          onClick={() => {
                            setFormSupplierId(item.supplier.id);
                            setFormAmount(String(item.totalOutstanding));
                            setTargetMode('fifo');
                            setActiveSubTab('disburse');
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                        >
                          <span>Pay Now</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-400">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PRINTABLE PAYMENT VOUCHER MODAL */}
      {voucherModalPayment && (
        <Modal
          isOpen={Boolean(voucherModalPayment)}
          onClose={() => setVoucherModalPayment(null)}
          title={`Payment Voucher: ${voucherModalPayment.paymentNo}`}
          subtitle="Official disbursement slip & bank settlement proof"
        >
          <div className="space-y-4">
            {/* Printable Box */}
            <div id="payment-voucher-print-area" className="p-6 bg-white border border-gray-200 rounded-2xl space-y-4 font-sans text-xs">
              {/* Letterhead */}
              <div className="flex items-start justify-between border-b pb-3 border-gray-200">
                <div>
                  <h2 className="text-base font-black uppercase text-ink-900 tracking-wide">
                    {businessSettings.businessName || 'SEAFOOD PROCUREMENT EXPORTS'}
                  </h2>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {businessSettings.address || 'Harbour Road, Fishing Port'}, {businessSettings.district || ''}
                  </p>
                  <p className="text-[11px] font-mono text-ink-500">
                    GSTIN: {businessSettings.gstin || '32AABCS1429B1Z2'} • State: {businessSettings.state || 'Kerala'} (32)
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold text-xs rounded border border-rose-200 block">
                    PAYMENT DISBURSAL VOUCHER
                  </span>
                  <span className="font-mono font-bold text-xs text-ink-900 mt-1 block">
                    {voucherModalPayment.paymentNo}
                  </span>
                  <span className="text-[10px] text-ink-500">
                    Date: {voucherModalPayment.paymentDate}
                  </span>
                </div>
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block">
                    Disbursed To (Beneficiary)
                  </span>
                  {(() => {
                    const sup = supplierMap.get(voucherModalPayment.supplierId);
                    return (
                      <div className="mt-1 space-y-0.5">
                        <strong className="text-sm text-ink-900 block">{sup?.name || 'N/A'}</strong>
                        <p className="text-[11px] text-ink-600">Code: {sup?.code} • Phone: {sup?.phone || 'N/A'}</p>
                        <p className="text-[11px] text-ink-600">Bank: {sup?.bankName || 'N/A'} • A/c: {sup?.bankAccount || 'N/A'}</p>
                        <p className="text-[11px] font-mono text-ink-600">IFSC: {sup?.bankIfsc || 'N/A'}</p>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block">
                    Paid From (Source Account)
                  </span>
                  {(() => {
                    const acc = accountMap.get(voucherModalPayment.paidFromAccountId);
                    return (
                      <div className="mt-1 space-y-0.5">
                        <strong className="text-sm text-ink-900 block">{acc?.name || 'Primary Bank'}</strong>
                        <p className="text-[11px] text-ink-600">{acc?.bank} • {acc?.accountType}</p>
                        <p className="text-[11px] font-mono text-ink-600">Code: {acc?.code || 'N/A'}</p>
                        <p className="text-[11px] text-ink-600">Mode: <strong>{voucherModalPayment.paymentMode}</strong></p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Transaction & Amount Details */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-600">Transaction / UTR Ref #:</span>
                  <span className="font-mono font-bold text-ink-900">{voucherModalPayment.referenceNo || 'Direct Clearing'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-600">Settlement Target:</span>
                  <span className="font-semibold text-ink-900">
                    {voucherModalPayment.purchaseId
                      ? `Specific Purchase Lot: ${purchaseMap.get(voucherModalPayment.purchaseId)?.purchaseId || voucherModalPayment.purchaseId}`
                      : 'On Account (FIFO Apportionment across ledger)'}
                  </span>
                </div>
                {voucherModalPayment.notes && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200">
                    <span className="text-ink-600">Narration:</span>
                    <span className="text-ink-800 italic">{voucherModalPayment.notes}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-ink-900">Total Disbursed Amount:</span>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-rose-800">
                      {formatINR(voucherModalPayment.amount)}
                    </span>
                    {voucherModalPayment.amount >= 10000000 && (
                      <span className="text-xs font-bold text-rose-700 block">
                        ({formatCroreINR(voucherModalPayment.amount)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-200 text-center text-[10px] text-ink-500">
                <div>
                  <div className="border-b border-gray-300 pb-8 mb-1"></div>
                  <span>Prepared By ({voucherModalPayment.createdBy?.split('@')[0]})</span>
                </div>
                <div>
                  <div className="border-b border-gray-300 pb-8 mb-1"></div>
                  <span>Verified By (Accountant)</span>
                </div>
                <div>
                  <div className="border-b border-gray-300 pb-8 mb-1"></div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoucherModalPayment(null)}
                className="px-4 py-2 border border-gray-200 text-ink-700 font-semibold rounded-xl hover:bg-gray-50 text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs text-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher (A4)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. VOID PAYMENT MODAL */}
      {voidModalTarget && (
        <Modal
          isOpen={Boolean(voidModalTarget)}
          onClose={() => setVoidModalTarget(null)}
          title="Void Payment Voucher"
          subtitle={`Reverse payment ${voidModalTarget.paymentNo} and restore supplier payable balance`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <Ban className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Action Cannot Be Undone Automatically</strong>
                <span>
                  Voiding this voucher will immediately credit back {formatINR(voidModalTarget.amount)} to supplier{' '}
                  <strong>{supplierMap.get(voidModalTarget.supplierId)?.name}</strong>'s outstanding balance.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">
                Mandatory Void Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Cheque bounced / incorrect beneficiary account / double entry recorded in error..."
                value={voidReasonText}
                onChange={(e) => setVoidReasonText(e.target.value)}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none text-xs text-ink-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVoidModalTarget(null)}
                className="px-4 py-2 border border-gray-200 text-ink-700 font-semibold rounded-xl hover:bg-gray-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={!voidReasonText.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs text-xs transition flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Void &amp; Reverse Ledger</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 9. INSPECT PURCHASE LOT MODAL */}
      {inspectPurchaseTarget && (
        <Modal
          isOpen={Boolean(inspectPurchaseTarget)}
          onClose={() => setInspectPurchaseTarget(null)}
          title={`Purchase Lot: ${inspectPurchaseTarget.purchaseId}`}
          subtitle="Details of targeted procurement transaction"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <span className="text-ink-500">Date:</span>
                <strong className="text-ink-900 block">{inspectPurchaseTarget.purchaseDate}</strong>
              </div>
              <div>
                <span className="text-ink-500">Supplier:</span>
                <strong className="text-ink-900 block">{supplierMap.get(inspectPurchaseTarget.supplierId)?.name}</strong>
              </div>
              <div>
                <span className="text-ink-500">Total Quantity:</span>
                <strong className="text-ink-900 block font-mono">{inspectPurchaseTarget.weightKg} Kg</strong>
              </div>
              <div>
                <span className="text-ink-500">Total Landed Cost:</span>
                <strong className="text-ink-900 block font-mono text-rose-700">{formatINR(inspectPurchaseTarget.totalCost)}</strong>
              </div>
              <div>
                <span className="text-ink-500">Amount Paid:</span>
                <strong className="text-ink-900 block font-mono text-emerald-700">{formatINR(inspectPurchaseTarget.amountPaid)}</strong>
              </div>
              <div>
                <span className="text-ink-500">Remaining Due:</span>
                <strong className="text-ink-900 block font-mono text-amber-700">{formatINR(inspectPurchaseTarget.balancePayable)}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectPurchaseTarget(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink-800 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
