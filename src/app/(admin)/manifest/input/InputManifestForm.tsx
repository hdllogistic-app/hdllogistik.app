'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Package,
  CreditCard,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CustomerOption {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  address: string;
}

export function InputManifestForm() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Form Fields
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientProvinceArea, setRecipientProvinceArea] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shareLocationUrl, setShareLocationUrl] = useState('');

  const [itemName, setItemName] = useState('');
  const [weightKg, setWeightKg] = useState<string>('1');
  const [koliCount, setKoliCount] = useState<string>('1');
  const [shippingRatePerKg, setShippingRatePerKg] = useState<string>('10000');
  const [billingMode, setBillingMode] = useState<'DIRECT' | 'INVOICE'>('DIRECT');
  const [paymentDeliveryMethod, setPaymentDeliveryMethod] = useState<'CASH' | 'DFOD' | 'COD'>('CASH');
  const [codAmount, setCodAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedResi, setLastCreatedResi] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch active customers for optional prefill
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch('/api/manifests/customers');
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      } catch (err) {
        console.error('Failed to load customer options:', err);
      }
    }
    fetchCustomers();
  }, []);

  // Customer Prefill Selection Handler
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);

    if (!custId) return;

    const found = customers.find((c) => c.id === custId);
    if (found) {
      setSenderName(found.name);
      setSenderPhone(found.phone);
      setSenderAddress(found.address);
    }
  };

  // Live Calculations (Preview Only — Backend recalculates safely)
  const numericWeight = parseFloat(weightKg) || 0;
  const numericRate = parseFloat(shippingRatePerKg) || 0;
  const numericCOD = parseFloat(codAmount) || 0;

  const totalShippingFeePreview = Math.max(0, numericWeight * numericRate);

  let totalRecipientBillPreview = 0;
  if (paymentDeliveryMethod === 'DFOD') {
    totalRecipientBillPreview = totalShippingFeePreview;
  } else if (paymentDeliveryMethod === 'COD') {
    totalRecipientBillPreview = Math.max(0, numericCOD);
  } else {
    totalRecipientBillPreview = 0;
  }

  const resetForm = () => {
    setSelectedCustomerId('');
    setSenderName('');
    setSenderPhone('');
    setSenderAddress('');
    setRecipientName('');
    setRecipientPhone('');
    setRecipientProvinceArea('');
    setRecipientAddress('');
    setShareLocationUrl('');
    setItemName('');
    setWeightKg('1');
    setKoliCount('1');
    setShippingRatePerKg('10000');
    setBillingMode('DIRECT');
    setPaymentDeliveryMethod('CASH');
    setCodAmount('0');
    setNotes('');
  };

  const handleSave = async (mode: 'INPUT_ONLY' | 'INPUT_AND_PRINT') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Client Validation
    if (
      !senderName.trim() ||
      !senderPhone.trim() ||
      !senderAddress.trim() ||
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !recipientProvinceArea.trim() ||
      !recipientAddress.trim() ||
      !itemName.trim()
    ) {
      setErrorMessage('Semua field data pengirim, penerima, dan nama barang wajib diisi.');
      return;
    }

    if (numericWeight <= 0) {
      setErrorMessage('Berat barang harus lebih besar dari 0 kg.');
      return;
    }

    if (parseInt(koliCount, 10) < 1) {
      setErrorMessage('Jumlah koli minimal 1.');
      return;
    }

    if (paymentDeliveryMethod === 'COD' && numericCOD <= 0) {
      setErrorMessage('Nominal COD / Tagihan Penerima wajib diisi dan harus lebih besar dari 0 untuk metode COD.');
      return;
    }

    // 1. SYNCHRONOUS POPUP RESERVATION BEFORE ASYNC BOUNDARY
    let printWindow: Window | null = null;
    if (mode === 'INPUT_AND_PRINT') {
      printWindow = window.open('about:blank', '_blank');
      if (!printWindow) {
        setErrorMessage('Popup browser diblokir. Mohon izinkan popup di browser Anda untuk mencetak resi.');
        return;
      }
    }

    setLoading(true);

    try {
      // 2. SINGLE MANIFEST CREATION API CALL
      const response = await fetch('/api/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          senderAddress: senderAddress.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientProvinceArea: recipientProvinceArea.trim(),
          recipientAddress: recipientAddress.trim(),
          shareLocationUrl: shareLocationUrl.trim() || null,
          itemName: itemName.trim(),
          weightKg: numericWeight,
          koliCount: parseInt(koliCount, 10),
          shippingRatePerKg: numericRate,
          billingMode,
          paymentDeliveryMethod,
          codAmount: paymentDeliveryMethod === 'COD' ? numericCOD : 0,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      // 3. HANDLE CREATION FAILURE: CLOSE BLANK WINDOW
      if (!response.ok || !data.success) {
        if (printWindow) {
          printWindow.close();
        }
        setErrorMessage(data.error || 'Gagal menyimpan manifest. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // 4. HANDLE CREATION SUCCESS: NAVIGATE RESERVED WINDOW TO PRINT URL
      const createdResi = data.manifest.resiNumber;
      setLastCreatedResi(createdResi);
      setSuccessMessage(`Manifest berhasil disimpan dengan Nomor Resi: ${createdResi}`);

      if (mode === 'INPUT_AND_PRINT' && printWindow) {
        printWindow.location.href = `/manifest/print/${createdResi}?autoprint=1`;
        try {
          printWindow.opener = null;
        } catch {
          // ignore opener error if any
        }
      }

      resetForm();
    } catch {
      if (printWindow) {
        printWindow.close();
      }
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Feedback */}
      {lastCreatedResi && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between gap-4 text-blue-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <div className="text-xs text-blue-300 font-medium">Resi Terakhir Berhasil Dibuat:</div>
              <div className="text-lg font-mono font-bold text-white tracking-widest">
                {lastCreatedResi}
              </div>
            </div>
          </div>
          <a
            href={`/manifest/print/${lastCreatedResi}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Ulang</span>
          </a>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && !lastCreatedResi && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-start gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Input Form Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: DATA PENGIRIM */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>1. Data Pengirim (Sender)</span>
            </div>
            {customers.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">
                {customers.length} Pelanggan Terdaftar
              </span>
            )}
          </div>

          {/* Prefill Autocomplete Select */}
          {customers.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">
                Pilih Pelanggan Terdaftar (Opsional Prefill):
              </label>
              <select
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">-- Input Pengirim Manual --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Pengirim <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={loading}
                placeholder="Contoh: PT Sumber Rejeki"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor HP Pengirim <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                disabled={loading}
                placeholder="Contoh: 081234567890"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Pengirim <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                disabled={loading}
                placeholder="Alamat lengkap pengirim"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DATA PENERIMA */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4" />
            <span>2. Data Penerima (Recipient)</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Penerima <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={loading}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP Penerima <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  disabled={loading}
                  placeholder="Contoh: 089876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Area / Wilayah Tujuan <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientProvinceArea}
                onChange={(e) => setRecipientProvinceArea(e.target.value)}
                disabled={loading}
                placeholder="Contoh: Surabaya Barat / Jawa Timur"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Lengkap Penerima <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                disabled={loading}
                placeholder="Alamat lengkap penerima"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Share Location / Link Google Maps (Opsional)
              </label>
              <input
                type="text"
                value={shareLocationUrl}
                onChange={(e) => setShareLocationUrl(e.target.value)}
                disabled={loading}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full px-3.5 py-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: DATA BARANG & BIAYA */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider border-b border-slate-800 pb-3">
            <Package className="w-4 h-4" />
            <span>3. Data Barang & Rincian Ongkir</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Barang <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={loading}
                placeholder="Contoh: Sparepart Mesin / DUS Makanan"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Berat Barang (kg) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Koli <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={koliCount}
                  onChange={(e) => setKoliCount(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tarif Ongkir / kg (Rp) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={shippingRatePerKg}
                onChange={(e) => setShippingRatePerKg(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Live Financial Calculation Box */}
            <div className="p-3 bg-slate-950 border border-emerald-900/50 rounded-xl space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Ongkir ({weightKg} kg × Rp {numericRate.toLocaleString('id-ID')}):</span>
                <span className="font-mono font-semibold text-emerald-400">
                  Rp {totalShippingFeePreview.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                <span>
                  {paymentDeliveryMethod === 'DFOD'
                    ? 'Tagihan DFOD ke Penerima:'
                    : paymentDeliveryMethod === 'COD'
                    ? 'Tagihan COD ke Penerima:'
                    : 'Tagihan Penerima:'}
                </span>
                <span className="font-mono text-emerald-300">
                  Rp {totalRecipientBillPreview.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: PEMBAYARAN & CATATAN */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider border-b border-slate-800 pb-3">
              <CreditCard className="w-4 h-4" />
              <span>4. Mode Pembayaran & Catatan</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mode Penagihan (Billing Mode) <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBillingMode('DIRECT')}
                    disabled={loading}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      billingMode === 'DIRECT'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    DIRECT (Pembayaran Langsung)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMode('INVOICE')}
                    disabled={loading}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      billingMode === 'INVOICE'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    INVOICE (Tagihan Kolektif)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Metode Pembayaran <span className="text-red-400">*</span>
                </label>
                <select
                  value={paymentDeliveryMethod}
                  onChange={(e) => setPaymentDeliveryMethod(e.target.value as 'CASH' | 'DFOD' | 'COD')}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="CASH">CASH — Pembayaran Tunai (Pengirim / Lunas)</option>
                  <option value="DFOD">DFOD — Delivery Fee On Delivery (Bayar Ongkir di Penerima)</option>
                  <option value="COD">COD — Cash On Delivery (Tagihan Barang ke Penerima)</option>
                </select>
              </div>

              {/* Dynamic COD Field */}
              {paymentDeliveryMethod === 'COD' && (
                <div className="space-y-1 p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                  <label className="block text-xs font-bold text-amber-300">
                    Nominal COD / Tagihan Penerima (Rp) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    disabled={loading}
                    placeholder="Contoh: 1500000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-700/60 rounded-xl text-amber-200 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-amber-400/80">
                    Nominal ini adalah TOTAL yang akan ditagihkan kepada penerima barang.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Pengiriman (Opsional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  placeholder="Instruksi khusus / catatan pengiriman"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input Only */}
            <button
              type="button"
              onClick={() => handleSave('INPUT_ONLY')}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <FileText className="w-4 h-4 text-sky-400" />
              )}
              <span>Simpan (Input Only)</span>
            </button>

            {/* Input & Print */}
            <button
              type="button"
              onClick={() => handleSave('INPUT_AND_PRINT')}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Printer className="w-4 h-4 text-white" />
              )}
              <span>Simpan & Cetak (Input & Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
