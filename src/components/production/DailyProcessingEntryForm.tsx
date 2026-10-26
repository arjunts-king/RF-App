import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Save,
  RotateCcw,
  Scale,
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Box
} from 'lucide-react';
import { ProductionShift } from '../../types';

export const DailyProcessingEntryForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const {
    suppliers,
    species,
    grades,
    sizes,
    counts,
    slabTypes,
    slabTolerancePct,
    addProcessingEntry
  } = useData();
  const { currentUser, permissions } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const shiftOptions: ProductionShift[] = [
    'General Day Shift (08:00 - 17:00)',
    'Morning Shift (06:00 - 14:00)',
    'Evening Shift (14:00 - 22:00)',
    'Night Shift (22:00 - 06:00)'
  ];

  // Form State
  const [processingDate, setProcessingDate] = useState<string>(today);
  const [shift, setShift] = useState<string>(shiftOptions[0]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [speciesId, setSpeciesId] = useState<string>('');
  const [gradeId, setGradeId] = useState<string>('');
  const [sizeId, setSizeId] = useState<string>('');
  const [countId, setCountId] = useState<string>('');
  const [supplierBoxId, setSupplierBoxId] = useState<string>('');

  const [slabTypeId, setSlabTypeId] = useState<string>('');
  const [slabsCount, setSlabsCount] = useState<string>('');
  const [processedWeightKg, setProcessedWeightKg] = useState<string>('');
  const [rejectionWeightKg, setRejectionWeightKg] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');

  // Active master data
  const activeSuppliers = suppliers.filter((s) => s.active);
  const activeSpecies = species.filter((sp) => sp.active);
  const activeGrades = grades.filter((g) => g.active);
  const activeSizes = sizes.filter((s) => s.active);
  const activeCounts = counts.filter((c) => c.active);
  const activeSlabTypes = slabTypes.filter((st) => st.active);

  // Selected slab type & standard weight
  const selectedSlabType = slabTypes.find((st) => st.id === slabTypeId);
  const standardWeightKg = selectedSlabType?.standardWeightKg || 0;

  // Numeric values for live calculations
  const numericSlabs = parseInt(slabsCount, 10) || 0;
  const numericProcessed = parseFloat(processedWeightKg) || 0;
  const numericRejection = parseFloat(rejectionWeightKg) || 0;

  // Expected weight & variance calculation
  const expectedWeightKg = Number((numericSlabs * standardWeightKg).toFixed(2));
  const varianceWeightKg = Number((numericProcessed - expectedWeightKg).toFixed(2));
  const variancePct = expectedWeightKg > 0 ? Number(((varianceWeightKg / expectedWeightKg) * 100).toFixed(2)) : 0;
  const hasVariance = expectedWeightKg > 0 && Math.abs(variancePct) > slabTolerancePct;

  const resetForm = () => {
    setProcessingDate(today);
    setShift(shiftOptions[0]);
    setSupplierId('');
    setSpeciesId('');
    setGradeId('');
    setSizeId('');
    setCountId('');
    setSupplierBoxId('');
    setSlabTypeId('');
    setSlabsCount('');
    setProcessedWeightKg('');
    setRejectionWeightKg('0');
    setRemarks('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions.canCreateEditPurchases && currentUser.role === 'viewer') {
      showToast('Unauthorized: Viewer accounts have read-only access.', 'error');
      return;
    }

    if (!processingDate) {
      showToast('Please select a valid Processing Date.', 'error');
      return;
    }

    if (!supplierId || !speciesId || !gradeId || (!sizeId && !countId)) {
      showToast('Supplier, Product/Species, Grade, and Size/Count are required.', 'error');
      return;
    }

    if (!slabTypeId) {
      showToast('Please select a Slab Type.', 'error');
      return;
    }

    if (numericProcessed < 0) {
      showToast('Processed Quantity (Kg) cannot be negative.', 'error');
      return;
    }

    if (numericRejection < 0) {
      showToast('Rejection Quantity (Kg) cannot be negative.', 'error');
      return;
    }

    if (numericSlabs <= 0 && numericProcessed <= 0) {
      showToast('Please enter Number of Slabs and Processed Weight.', 'error');
      return;
    }

    const res = addProcessingEntry({
      processingDate,
      shift,
      supplierId,
      speciesId,
      gradeId,
      sizeId,
      countId,
      supplierBoxId,
      slabTypeId,
      standardSlabWeightKg: standardWeightKg,
      slabsCount: numericSlabs,
      processedWeightKg: numericProcessed,
      rejectionWeightKg: numericRejection,
      remarks
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
            <h2 className="text-lg font-bold text-ink-900">Daily Processing Entry</h2>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
              Factory Line Entry
            </span>
          </div>
          <p className="text-xs text-ink-500">
            One form = One transaction. Server computes expected slab weights, variance tolerance &amp; audit timestamps.
          </p>
        </div>

        {/* Live System Metadata Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-ink-700">
            <UserCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>Operator: <strong>{currentUser.name}</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-ink-700">
            <Clock className="w-3.5 h-3.5 text-ink-500" />
            <span>Shift: <strong>{shift.split(' ')[0]}</strong></span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* SECTION 1: SHIFT & LOT IDENTIFICATION */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            1. Date, Shift &amp; Lot Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Processing Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={processingDate}
                onChange={(e) => setProcessingDate(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Processing Shift <span className="text-rose-600">*</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                {shiftOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Raw Material Supplier <span className="text-rose-600">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Supplier --</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Supplier Box / Lot Identification
              </label>
              <input
                type="text"
                placeholder="e.g. CRATE-402 / BOAT-A1"
                value={supplierBoxId}
                onChange={(e) => setSupplierBoxId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PRODUCT SPECIFICATION */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4" />
            2. Seafood Product &amp; Grading
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Product / Species <span className="text-rose-600">*</span>
              </label>
              <select
                value={speciesId}
                onChange={(e) => setSpeciesId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Product --</option>
                {activeSpecies.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} {sp.productForm ? `[${sp.productForm}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Quality Grade <span className="text-rose-600">*</span>
              </label>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Grade --</option>
                {activeGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Physical Size
              </label>
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Any Size --</option>
                {activeSizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Piece Count
              </label>
              <select
                value={countId}
                onChange={(e) => setCountId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Any Count --</option>
                {activeCounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: SLAB WEIGHMENT & QUANTITIES */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-2">
            <Box className="w-4 h-4" />
            3. Slab Packaging &amp; Processing Output
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Slab Type <span className="text-rose-600">*</span>
              </label>
              <select
                value={slabTypeId}
                onChange={(e) => setSlabTypeId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              >
                <option value="">-- Select Slab Type --</option>
                {activeSlabTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.standardWeightKg} {st.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Standard Slab Weight (Auto)
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-ink-800">
                {selectedSlabType ? `${selectedSlabType.standardWeightKg} ${selectedSlabType.unit}` : 'Select Slab Type'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                No. of Slabs Packed <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 150"
                value={slabsCount}
                onChange={(e) => setSlabsCount(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Processed Quantity (Kg) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 300.5"
                value={processedWeightKg}
                onChange={(e) => setProcessedWeightKg(e.target.value)}
                required
                className="w-full text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition text-ink-900"
              />
            </div>
          </div>

          {/* Second Row: Rejection & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Rejection Quantity (Kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={rejectionWeightKg}
                onChange={(e) => setRejectionWeightKg(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Processing Remarks / Lot Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Clean glaze, export packing batch #4, high freshness index"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: SERVER DERIVED WEIGHT & VARIANCE AUDIT BANNER */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Live Server-Computed Weight Reconciliation
            </h4>
            <span className="text-[11px] font-semibold text-ink-500">
              Tolerance Band: ±{slabTolerancePct}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="text-[10px] text-ink-500 block uppercase font-medium">Expected Slab Weight</span>
              <span className="font-bold text-ink-900 text-sm mt-0.5 block">
                {expectedWeightKg.toFixed(2)} Kg
              </span>
              <span className="text-[10px] text-ink-500">
                {numericSlabs} slabs × {standardWeightKg} Kg
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="text-[10px] text-ink-500 block uppercase font-medium">Actual Processed Weight</span>
              <span className="font-bold text-rose-700 text-sm mt-0.5 block">
                {numericProcessed.toFixed(2)} Kg
              </span>
              <span className="text-[10px] text-ink-500">Scale Reading</span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="text-[10px] text-ink-500 block uppercase font-medium">Weight Variance</span>
              <span
                className={`font-bold text-sm mt-0.5 block ${
                  hasVariance ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {varianceWeightKg > 0 ? `+${varianceWeightKg}` : varianceWeightKg} Kg ({variancePct > 0 ? `+${variancePct}` : variancePct}%)
              </span>
              <span className="text-[10px] text-ink-500">Diff vs Expected</span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="text-[10px] text-ink-500 block uppercase font-medium">Rejection Rate</span>
              <span className="font-bold text-ink-900 text-sm mt-0.5 block">
                {numericProcessed > 0
                  ? `${((numericRejection / (numericProcessed + numericRejection)) * 100).toFixed(1)}%`
                  : '0.0%'}
              </span>
              <span className="text-[10px] text-ink-500">{numericRejection} Kg rejected</span>
            </div>
          </div>

          {/* Non-Blocking Slab Variance Notice (Flag, Don't Block) */}
          {hasVariance && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5 text-xs animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Slab Weight Variance Alert (±{slabTolerancePct}% Tolerance Exceeded):</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  The actual processed quantity ({numericProcessed} Kg) diverges by{' '}
                  <strong>{variancePct > 0 ? `+${variancePct}` : variancePct}%</strong> from the standard expected slab weight ({expectedWeightKg} Kg).
                  This transaction will be accepted and automatically flagged in the Exception Report for supervisor review.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-ink-700 text-xs font-semibold rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Processing Transaction</span>
          </button>
        </div>
      </form>
    </div>
  );
};
