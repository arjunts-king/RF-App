import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { computePurchaseFields, formatINR } from '../../utils/calculations';
import {
  Camera,
  Layers,
  Save,
  RotateCcw,
  Scale,
  CreditCard,
  FileText,
  DollarSign,
  X
} from 'lucide-react';

export const PurchaseEntryForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { suppliers, species, grades, sizes, counts, locations, bankAccounts, expenseTypes, addPurchase } = useData();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  // Form State
  const [purchaseDate, setPurchaseDate] = useState<string>(today);
  const [supplierId, setSupplierId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');

  const [speciesId, setSpeciesId] = useState<string>('');
  const [gradeId, setGradeId] = useState<string>('');
  const [sizeId, setSizeId] = useState<string>('');
  const [secondarySizeId, setSecondarySizeId] = useState<string>('');
  const [isDualSize, setIsDualSize] = useState<boolean>(false);
  const [countId, setCountId] = useState<string>('');
  const [boxesCount, setBoxesCount] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [ratePerKg, setRatePerKg] = useState<string>('');

  const [damageWeightKg, setDamageWeightKg] = useState<string>('0');
  const [damageRatePerKg, setDamageRatePerKg] = useState<string>('0');

  // Dynamic Expenses Map (expenseTypeId -> amount)
  const [expenseBreakdown, setExpenseBreakdown] = useState<Record<string, string>>({});

  // Payment Tracking
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentDate, setPaymentDate] = useState<string>(today);
  const [paidFromAccountId, setPaidFromAccountId] = useState<string>('');

  // Info
  const [rejectionWeightKg, setRejectionWeightKg] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Active master lists
  const activeSuppliers = suppliers.filter((s) => s.active);
  const activeSpecies = species.filter((s) => s.active);
  const activeGrades = grades.filter((g) => g.active);
  const activeSizes = sizes.filter((s) => s.active);
  const activeCounts = counts.filter((c) => c.active);
  const activeLocations = locations.filter((l) => l.active);
  const activeAccounts = bankAccounts.filter((b) => b.active);
  const activeExpenseTypes = expenseTypes.filter((e) => e.active);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Convert string inputs to numeric for live derived calculations
  const parsedExpenses: Record<string, number> = {};
  Object.entries(expenseBreakdown).forEach(([k, v]) => {
    parsedExpenses[k] = parseFloat(v) || 0;
  });

  const liveDerived = computePurchaseFields({
    weightKg: parseFloat(weightKg) || 0,
    ratePerKg: parseFloat(ratePerKg) || 0,
    damageWeightKg: parseFloat(damageWeightKg) || 0,
    damageRatePerKg: parseFloat(damageRatePerKg) || 0,
    expenseBreakdown: parsedExpenses,
    amountPaid: parseFloat(amountPaid) || 0,
    purchaseDate,
    supplier: selectedSupplier
  });

  const handleExpenseChange = (id: string, value: string) => {
    setExpenseBreakdown((prev) => ({ ...prev, [id]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.65);
            setPhotoPreview(compressed);
          } else {
            setPhotoPreview(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setPurchaseDate(today);
    setSupplierId('');
    setLocationId('');
    setInvoiceNo('');
    setBatchNo('');
    setSpeciesId('');
    setGradeId('');
    setSizeId('');
    setSecondarySizeId('');
    setIsDualSize(false);
    setCountId('');
    setBoxesCount('');
    setWeightKg('');
    setRatePerKg('');
    setDamageWeightKg('0');
    setDamageRatePerKg('0');
    setExpenseBreakdown({});
    setAmountPaid('0');
    setPaymentDate(today);
    setPaidFromAccountId('');
    setRejectionWeightKg('0');
    setRemarks('');
    setPhotoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions.canCreateEditPurchases) {
      showToast('You do not have permission to record purchases.', 'error');
      return;
    }

    if (!supplierId || !speciesId || !locationId) {
      showToast('Please select Supplier, Species, and Harbour Location.', 'error');
      return;
    }

    const numericWeight = parseFloat(weightKg);
    const numericRate = parseFloat(ratePerKg);

    if (isNaN(numericWeight) || numericWeight <= 0) {
      showToast('Weight must be greater than 0 Kg.', 'error');
      return;
    }

    if (isNaN(numericRate) || numericRate < 0) {
      showToast('Rate per Kg must be >= 0.', 'error');
      return;
    }

    const numericPaid = parseFloat(amountPaid) || 0;
    if (numericPaid > 0 && !paidFromAccountId) {
      showToast('Please select the Bank / Cash Account from which immediate payment was disbursed.', 'warning');
      return;
    }

    if (isDualSize) {
      if (!sizeId || !secondarySizeId) {
        showToast('Please select both Primary and Secondary sizes for a dual-size entry.', 'error');
        return;
      }
      if (sizeId === secondarySizeId) {
        showToast('Primary and Secondary sizes must be different.', 'error');
        return;
      }
      if (!remarks.trim()) {
        showToast('Remarks are required for dual-size entries to document that the total weight encompasses both sizes without distinction.', 'error');
        return;
      }
    }

    const res = addPurchase({
      purchaseDate,
      supplierId,
      locationId,
      invoiceNo,
      batchNo: batchNo.trim() || undefined,
      speciesId,
      gradeId,
      sizeId,
      secondarySizeId: isDualSize ? secondarySizeId : undefined,
      isDualSize,
      countId,
      boxesCount: parseInt(boxesCount, 10) || 0,
      weightKg: numericWeight,
      ratePerKg: numericRate,
      damageWeightKg: parseFloat(damageWeightKg) || 0,
      damageRatePerKg: parseFloat(damageRatePerKg) || 0,
      expenseBreakdown: parsedExpenses,
      amountPaid: parseFloat(amountPaid) || 0,
      paymentDate: parseFloat(amountPaid) > 0 ? paymentDate : undefined,
      paidFromAccountId: parseFloat(amountPaid) > 0 ? paidFromAccountId : undefined,
      rejectionWeightKg: parseFloat(rejectionWeightKg) || 0,
      remarks,
      photoUrl: photoPreview || undefined
    });

    if (res.success) {
      resetForm();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-rose-50 via-white to-rose-50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink-900">Harbour Purchase Entry</h2>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
              Mobile-First Form
            </span>
          </div>
          <p className="text-xs text-ink-500">
            One form, one save action. Record landing transactions directly from phone or desktop.
          </p>
        </div>

        {batchNo && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Shared Batch Pool: {batchNo}</span>
          </div>
        )}
      </div>

      {(activeSuppliers.length === 0 || activeSpecies.length === 0 || activeLocations.length === 0) && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">!</div>
          <div>
            <strong className="block font-bold">Master Reference Data is currently empty:</strong>
            <span className="block mt-0.5">
              To record a purchase, please add your suppliers, species, and harbour locations under <strong>Master Reference Data</strong> in the sidebar, or click <strong>Business Settings</strong> to load starter templates.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* SECTION 1: IDENTIFICATION */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            1. Transaction Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Purchase Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                max={today}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Supplier (Boat/Agent/Farm) <span className="text-rose-600">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Master Supplier --</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}{s.creditDays ? ` · Credit: ${s.creditDays}d` : ' · Immediate'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Landing Harbour / Location <span className="text-rose-600">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Harbour Location --</option>
                {activeLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Invoice / Bill No.</label>
              <input
                type="text"
                placeholder="e.g. INV-9042"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Batch No. <span className="text-[10px] text-ink-500 font-normal">(Shared Expense Pool)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BATCH-OCT19-A"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PRODUCT SPECIFICATION & WEIGHMENT */}
        <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              2. Seafood Product & Weighment
            </h3>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-400 transition select-none shadow-2xs">
              <input
                type="checkbox"
                checked={isDualSize}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsDualSize(checked);
                  if (!checked) setSecondarySizeId('');
                }}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-rose-900">
                Two Sizes in Single Item (Combined Total Kg)
              </span>
            </label>
          </div>

          {isDualSize && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase shrink-0 mt-0.5">Constraint Active</span>
              <div>
                <strong>Combined Lot Mode:</strong> This entry is for a single purchase item containing <strong>two sizes</strong> (e.g. <em>Semi Needle 6/10 &amp; 10/20</em>) where only the <strong>total weight (Kg)</strong> is specified without distinction. <strong>Remarks are mandatory</strong> for this entry to document the combined catch.
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isDualSize ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-4`}>
            <div className={isDualSize ? 'lg:col-span-2' : 'lg:col-span-2'}>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Species / Product <span className="text-rose-600">*</span>
              </label>
              <select
                value={speciesId}
                onChange={(e) => setSpeciesId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Species --</option>
                {activeSpecies.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({sp.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Grade</label>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Any Grade --</option>
                {activeGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {!isDualSize ? (
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">Physical Size</label>
                <select
                  value={sizeId}
                  onChange={(e) => setSizeId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
                >
                  <option value="">-- Any Size --</option>
                  {activeSizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.description ? `(${s.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-rose-900 mb-1">
                    Primary Size <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={sizeId}
                    onChange={(e) => setSizeId(e.target.value)}
                    required
                    className="w-full text-xs font-bold px-3 py-2 bg-rose-50/50 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
                  >
                    <option value="">-- Size 1 (e.g. 6/10) --</option>
                    {activeSizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.description ? `(${s.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-900 mb-1">
                    Secondary Size <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={secondarySizeId}
                    onChange={(e) => setSecondarySizeId(e.target.value)}
                    required
                    className="w-full text-xs font-bold px-3 py-2 bg-rose-50/50 border border-rose-300 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
                  >
                    <option value="">-- Size 2 (e.g. 10/20) --</option>
                    {activeSizes
                      .filter((s) => s.id !== sizeId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.description ? `(${s.description})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Piece Count / Pcs</label>
              <select
                value={countId}
                onChange={(e) => setCountId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Any Count --</option>
                {activeCounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.description ? `(${c.description})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">No. of Boxes / Bags</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={boxesCount}
                onChange={(e) => setBoxesCount(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                {isDualSize ? (
                  <span>
                    Total Combined Weight (Kg) <span className="text-rose-600">*</span>
                  </span>
                ) : (
                  <span>
                    Net Weight (Kg) <span className="text-rose-600">*</span>
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={isDualSize ? "e.g. 2000.00 total" : "0.00"}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
                className={`w-full text-xs font-bold text-ink-900 px-3 py-2 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition ${
                  isDualSize ? 'bg-rose-100/70 border-2 border-rose-400' : 'bg-rose-50/50 border border-rose-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PRICING, DAMAGE DEDUCTION & AUTO VALUATION */}
        <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            3. Pricing, Damage Deductions & Auto-Calculation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Rate per Kg (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="₹0.00"
                value={ratePerKg}
                onChange={(e) => setRatePerKg(e.target.value)}
                required
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-gray-300 rounded-xl focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1">
                Purchase Value (Calculated: Weight × Rate)
              </label>
              <div className="text-sm font-bold text-ink-900 px-3 py-2 bg-gray-100 rounded-xl border border-gray-200">
                {formatINR(liveDerived.purchaseValue)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Damage Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={damageWeightKg}
                onChange={(e) => setDamageWeightKg(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-gray-300 rounded-xl focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Damage Rate (₹/Kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={damageRatePerKg}
                onChange={(e) => setDamageRatePerKg(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-gray-300 rounded-xl focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-200 text-xs">
            <span className="text-ink-500 font-medium">
              Damage Deduction Amount: <strong>{formatINR(liveDerived.damageAmount)}</strong>
            </span>
            <span className="text-ink-900 font-bold">
              Gross Purchase Value: <span className="text-rose-700">{formatINR(liveDerived.grossPurchaseValue)}</span>
            </span>
          </div>
        </div>

        {/* SECTION 4: USER-EXTENSIBLE DYNAMIC EXPENSE HEADS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              4. Direct Landing & Procurement Expenses
            </h3>
            <span className="text-[11px] text-ink-500">
              {batchNo ? 'Will be proportionally allocated across batch' : 'Direct row expenses'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeExpenseTypes.map((exp) => (
              <div key={exp.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  {exp.name} (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenseBreakdown[exp.id] || ''}
                  onChange={(e) => handleExpenseChange(exp.id, e.target.value)}
                  className="w-full text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:border-rose-600 outline-none transition"
                />
                <span className="text-[10px] text-ink-500 mt-1 block capitalize">{exp.category}</span>
              </div>
            ))}
          </div>

          {/* Computed Summary Strip */}
          <div className="mt-4 p-4 rounded-xl bg-rose-50/70 border border-rose-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-[11px] font-semibold text-ink-500 uppercase block">Total Landing Expenses</span>
              <span className="text-sm font-bold text-ink-900 mt-0.5 block">{formatINR(liveDerived.totalExpenses)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-ink-500 uppercase block">Final Landed Cost</span>
              <span className="text-base font-extrabold text-rose-700 mt-0.5 block">{formatINR(liveDerived.totalCost)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-ink-500 uppercase block">Effective Landed Rate/Kg</span>
              <span className="text-sm font-bold text-ink-900 mt-0.5 block">
                ₹{liveDerived.effectiveRatePerKg.toFixed(2)} / Kg
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: PAYMENT RECORDING (OPTIONAL AT HARBOUR ENTRY) */}
        <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              5. Immediate Payment (Optional or Complete at Office)
            </h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-100/60 px-2.5 py-0.5 rounded-full border border-rose-200">
              Status: {liveDerived.paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Amount Paid Now (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full text-xs font-bold text-ink-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Disbursed From Account</label>
              <select
                value={paidFromAccountId}
                onChange={(e) => setPaidFromAccountId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
              >
                <option value="">-- Select Bank / Cash Float --</option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-500 mb-1">
                Balance Payable (Calculated)
              </label>
              <div className="text-sm font-bold text-rose-900 px-3 py-2 bg-rose-50 rounded-xl border border-rose-200">
                {formatINR(liveDerived.balancePayable)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-gray-100">
            <span>
              Supplier Credit Days: <strong>{selectedSupplier?.creditDays ? `${selectedSupplier.creditDays} days` : '0 days (Immediate)'}</strong>
            </span>
            <span>
              Calculated Due Date: <strong>{liveDerived.dueDate || 'N/A'}</strong>
            </span>
          </div>
        </div>

        {/* SECTION 6: QUALITY, PHOTO ATTACHMENT & REMARKS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Rejection Weight (Kg) <span className="text-[10px] text-ink-500">(Informational)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rejectionWeightKg}
              onChange={(e) => setRejectionWeightKg(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition"
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDualSize ? 'text-rose-900 font-bold' : 'text-ink-700'}`}>
              Remarks / Quality Notes {isDualSize ? <span className="text-rose-600 font-bold">* (Required for Dual-Size lot)</span> : null}
            </label>
            <input
              type="text"
              placeholder={
                isDualSize
                  ? "e.g. 2000 kg total of both 6/10 and 10/20 size without distinction"
                  : "e.g. Dawn catch, boat registration KL-07-291"
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required={isDualSize}
              className={`w-full text-xs font-medium px-3 py-2 rounded-xl focus:bg-white focus:border-rose-600 outline-none transition ${
                isDualSize && !remarks.trim()
                  ? 'bg-rose-50/70 border-2 border-rose-400 text-rose-950 placeholder-rose-400'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            />
            {isDualSize && (
              <p className="text-[10px] text-rose-700 mt-1 font-medium">
                * Please state that the total weight encompasses both sizes without individual distinction.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Weighment Slip / Boat ID Photo
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-rose-50 border border-dashed border-gray-300 hover:border-rose-400 rounded-xl text-xs font-medium text-ink-700 transition">
                <Camera className="w-4 h-4 text-rose-600" />
                <span>{photoPreview ? 'Change Photo' : 'Upload / Snap'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {photoPreview && (
                <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-gray-200 group shrink-0">
                  <img src={photoPreview} alt="Slip Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SUBMISSION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-ink-700 hover:bg-gray-100 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-200 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Purchase Transaction</span>
          </button>
        </div>
      </form>
    </div>
  );
};
