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
  Coins,
} from 'lucide-react';

interface CustomerOption {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  address: string;
}

interface ShippingRateOption {
  id: string;
  province: string;
  city: string;
  ratePerKg: number;
}

export function InputManifestForm() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Shipping Rates Master State
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [currentRatePerKg, setCurrentRatePerKg] = useState<number>(0);

  // Form Fields
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shareLocationUrl, setShareLocationUrl] = useState('');

  const [itemName, setItemName] = useState('');
  const [weightKg, setWeightKg] = useState<string>('1');
  const [koliCount, setKoliCount] = useState<string>('1');
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

  // Fetch active shipping rates master
  useEffect(() => {
    async function fetchRates() {
      setLoadingRates(true);
      try {
        const res = await fetch('/api/shipping-rates/active');
        const data = await res.json();
        if (data.success && Array.isArray(data.rates)) {
          setShippingRates(data.rates);
        }
      } catch (err) {
        console.error('Failed to load shipping rates master:', err);
      } finally {
        setLoadingRates(false);
      }
    }
    fetchRates();
  }, []);

  // Available distinct provinces from active shipping rates
  const availableProvinces = Array.from(new Set(shippingRates.map((r) => r.province))).sort();

  // Available cities filtered by selected province
  const availableCities = shippingRates
    .filter((r) => r.province === selectedProvince)
    .sort((a, b) => a.city.localeCompare(b.city));

  // Handle Province change and reset dependent city and rate
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    setSelectedProvince(prov);
    setSelectedCity('');
    setCurrentRatePerKg(0);
  };

  // Handle City change and update read-only rate per kg
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = e.target.value;
    setSelectedCity(c);
    const matched = shippingRates.find(
      (r) => r.province === selectedProvince && r.city === c
    );
    if (matched) {
      setCurrentRatePerKg(matched.ratePerKg);
    } else {
      setCurrentRatePerKg(0);
    }
  };

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

  // Live Calculations (Preview Only — Backend recalculates safely as single source of truth)
  const numericWeight = parseFloat(weightKg) || 0;
  const numericCOD = parseFloat(codAmount) || 0;

  const totalShippingFeePreview = Math.max(0, numericWeight * currentRatePerKg);

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
    setSelectedProvince('');
    setSelectedCity('');
    setCurrentRatePerKg(0);
    setRecipientAddress('');
    setShareLocationUrl('');
    setItemName('');
    setWeightKg('1');
    setKoliCount('1');
    setBillingMode('DIRECT');
    setPaymentDeliveryMethod('CASH');
    setCodAmount('0');
    setNotes('');
  };

  const handleSave = async (mode: 'INPUT_ONLY' | 'INPUT_AND_PRINT') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client Validation
    if (
      !senderName.trim() ||
      !senderPhone.trim() ||
      !senderAddress.trim() ||
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !selectedProvince ||
      !selectedCity ||
      !recipientAddress.trim() ||
      !itemName.trim()
    ) {
      setErrorMessage('Semua field data pengirim, penerima (termasuk Provinsi & Kota), dan nama barang wajib diisi.');
      return;
    }

    if (currentRatePerKg <= 0) {
      setErrorMessage('Tarif ongkir untuk area ini tidak tersedia. Periksa Database Ongkir.');
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
          recipientProvince: selectedProvince,
          recipientCity: selectedCity,
          recipientProvinceArea: `${selectedCity}, ${selectedProvince}`,
          recipientAddress: recipientAddress.trim(),
          shareLocationUrl: shareLocationUrl.trim() || null,
          itemName: itemName.trim(),
          weightKg: numericWeight,
          koliCount: parseInt(koliCount, 10),
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

      // 4. CREATION SUCCESS: REDIRECT PRINT WINDOW IF INTENDED
      const resi = data.manifest.resiNumber;
      const manifestId = data.manifest.id;
      setLastCreatedResi(resi);

      if (mode === 'INPUT_AND_PRINT' && printWindow) {
        printWindow.location.href = `/manifest/print/${manifestId}`;
        setSuccessMessage(`Manifest resi ${resi} berhasil dibuat dan jendela cetak telah dibuka.`);
      } else {
        setSuccessMessage(`Manifest resi ${resi} berhasil dibuat dan disimpan.`);
      }

      resetForm();
    } catch (err) {
      if (printWindow) {
        printWindow.close();
      }
      setErrorMessage('Terjadi kesalahan koneksi ke server saat menyimpan manifest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between gap-4 text-emerald-300 text-sm">
          <div className="flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-white underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800/60">
        
        {/* 1. DATA PENGIRIM */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>1. Data Pengirim (Sender)</span>
            </div>

            {customers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Pilih Pelanggan:</span>
                <select
                  value={selectedCustomerId}
                  onChange={handleCustomerSelect}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">-- Isi Manual --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Pengirim <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Contoh: Toko Sentosa"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                placeholder="Contoh: 08123456789"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat Lengkap Pengirim <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              placeholder="Contoh: Jl. Industri No. 45, Bandung"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 2. DATA PENERIMA */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>2. Data Penerima (Recipient)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Penerima <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                placeholder="Contoh: 08987654321"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* PROVINSI & KOTA/KABUPATEN DROPDOWNS FROM SHIPPING RATE MASTER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Provinsi <span className="text-red-400">*</span>
              </label>
              {loadingRates ? (
                <div className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Memuat area...</span>
                </div>
              ) : shippingRates.length === 0 ? (
                <div className="px-3.5 py-2.5 bg-slate-950 border border-red-800/60 rounded-xl text-red-400 text-xs font-medium">
                  Database ongkir belum tersedia. Tambahkan area melalui Pengaturan → Database Ongkir.
                </div>
              ) : (
                <select
                  required
                  value={selectedProvince}
                  onChange={handleProvinceChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">[ Pilih Provinsi ▼ ]</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kota / Kabupaten <span className="text-red-400">*</span>
              </label>
              {loadingRates ? (
                <div className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Memuat kota...</span>
                </div>
              ) : (
                <select
                  required
                  disabled={!selectedProvince || availableCities.length === 0}
                  value={selectedCity}
                  onChange={handleCityChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">[ Pilih Kota / Kabupaten ▼ ]</option>
                  {availableCities.map((r) => (
                    <option key={r.id} value={r.city}>
                      {r.city} (Rp {r.ratePerKg.toLocaleString('id-ID')}/kg)
                    </option>
                  ))}
                </select>
              )}
            </div>
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
              placeholder="Contoh: Jl. Raya Tanjungsari No. 12, Sumedang"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Link Google Maps / Share Location (Opsional)
            </label>
            <input
              type="text"
              value={shareLocationUrl}
              onChange={(e) => setShareLocationUrl(e.target.value)}
              placeholder="Contoh: https://maps.app.goo.gl/xxx"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 3. DATA BARANG & RINCIAN ONGKIR */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>3. Data Barang & Rincian Ongkir</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Barang <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: Sparepart Mobil / Pakaian"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Berat Total (Kg) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* READ ONLY TARIF ONGKIR / KG FROM DATABASE ONGKIR MASTER */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Tarif Ongkir / Kg</span>
                <span className="text-[10px] text-emerald-400 font-mono font-normal">Database Rate</span>
              </label>
              <div className="px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-400 text-xs font-mono font-bold flex items-center justify-between">
                <span>
                  {currentRatePerKg > 0
                    ? `Rp ${currentRatePerKg.toLocaleString('id-ID')} / Kg`
                    : 'Pilih area tujuan'}
                </span>
                <Coins className="w-3.5 h-3.5 text-emerald-500/50" />
              </div>
            </div>
          </div>

          {/* TOTAL ONGKIR DISPLAY */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Total Ongkos Kirim:
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              Rp {totalShippingFeePreview.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* 4. MODE PEMBAYARAN & CATATAN */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>4. Mode Pembayaran & Catatan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mode Penagihan (Billing Mode) <span className="text-red-400">*</span>
              </label>
              <select
                value={billingMode}
                onChange={(e) => setBillingMode(e.target.value as 'DIRECT' | 'INVOICE')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="DIRECT">DIRECT (Penagihan Langsung)</option>
                <option value="INVOICE">INVOICE (Tagihan Pelanggan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Metode Pembayaran <span className="text-red-400">*</span>
              </label>
              <select
                value={paymentDeliveryMethod}
                onChange={(e) =>
                  setPaymentDeliveryMethod(e.target.value as 'CASH' | 'DFOD' | 'COD')
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="CASH">CASH (Bayar Pengirim)</option>
                <option value="DFOD">DFOD (Delivery Fee on Delivery - Ongkir Bayar Penerima)</option>
                <option value="COD">COD (Cash on Delivery - Barang + Ongkir Bayar Penerima)</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC METODE PEMBAYARAN INFORMATION & INPUT BANNER */}
          {paymentDeliveryMethod === 'CASH' && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200">
                Ringkasan Pembayaran CASH:
              </div>
              <p>• Total Ongkir: Rp {totalShippingFeePreview.toLocaleString('id-ID')} (Dibayar oleh Pengirim)</p>
              <p>• Tagihan Penerima: Rp 0</p>
            </div>
          )}

          {paymentDeliveryMethod === 'DFOD' && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 space-y-1">
              <div className="font-semibold text-indigo-200">
                Ringkasan Pembayaran DFOD (Delivery Fee on Delivery):
              </div>
              <p>• Total Ongkir: Rp {totalShippingFeePreview.toLocaleString('id-ID')}</p>
              <p className="font-bold text-indigo-400">
                • Tagihan Penerima Saat Delivery: Rp {totalShippingFeePreview.toLocaleString('id-ID')}
              </p>
            </div>
          )}

          {paymentDeliveryMethod === 'COD' && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-300">
                  Nominal COD / Tagihan Barang Penerima (Rp) <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-amber-400/80 font-mono">Wajib {'>'} 0</span>
              </div>
              <input
                type="number"
                min="1"
                required
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                placeholder="Masukkan nominal tagihan barang..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-800/60 rounded-xl text-amber-300 font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="text-xs text-amber-300/80 space-y-1 border-t border-amber-800/40 pt-2 font-medium">
                <p>• Ongkir Terpisah: Rp {totalShippingFeePreview.toLocaleString('id-ID')}</p>
                <p className="font-bold text-amber-300">
                  • Total Penagihan ke Penerima: Rp {totalRecipientBillPreview.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Operasional (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Titip di pos satpam jika rumah kosong"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-400 font-mono">
            {lastCreatedResi && (
              <span>Resi Terakhir: <strong className="text-sky-400 font-bold">{lastCreatedResi}</strong></span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave('INPUT_ONLY')}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
              <FileText className="w-4 h-4" />
              <span>Input Saja</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave('INPUT_AND_PRINT')}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <Printer className="w-4 h-4" />
              <span>Input & Print Resi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
