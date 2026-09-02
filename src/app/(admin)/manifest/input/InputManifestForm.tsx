'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  History,
  Search,
  Check,
  HelpCircle,
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
  active?: boolean;
}

interface SenderHistoryItem {
  name: string;
  phone: string;
  address: string;
  lastUsedAt: string;
}

interface RecipientHistoryItem {
  name: string;
  phone: string;
  address: string;
  recipientProvinceArea: string;
  shareLocationUrl: string | null;
  lastUsedAt: string;
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

  // Sender History Autocomplete State
  const [senderSearchQuery, setSenderSearchQuery] = useState('');
  const [senderSuggestions, setSenderSuggestions] = useState<SenderHistoryItem[]>([]);
  const [loadingSenderHistory, setLoadingSenderHistory] = useState(false);
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [senderHighlightedIndex, setSenderHighlightedIndex] = useState(-1);
  const senderDropdownRef = useRef<HTMLDivElement>(null);

  // Recipient History Autocomplete State
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [recipientSuggestions, setRecipientSuggestions] = useState<RecipientHistoryItem[]>([]);
  const [loadingRecipientHistory, setLoadingRecipientHistory] = useState(false);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [recipientHighlightedIndex, setRecipientHighlightedIndex] = useState(-1);
  const [recipientAreaNotice, setRecipientAreaNotice] = useState<string | null>(null);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  // Form Fields State
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [senderAddress, setSenderAddress] = useState<string>('');

  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [shareLocationUrl, setShareLocationUrl] = useState<string>('');

  const [itemName, setItemName] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('1.0');
  const [koliCount, setKoliCount] = useState<string>('1');

  const [billingMode, setBillingMode] = useState<'DIRECT' | 'INVOICE'>('DIRECT');
  const [paymentDeliveryMethod, setPaymentDeliveryMethod] = useState<'CASH' | 'DFOD' | 'COD'>('CASH');
  const [codAmount, setCodAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // UI Control State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCreatedResi, setLastCreatedResi] = useState<string | null>(null);

  // Load Shipping Rates & Customers on mount
  useEffect(() => {
    async function initData() {
      setLoadingRates(true);
      try {
        const [custRes, ratesRes] = await Promise.all([
          fetch('/api/manifests/customers'),
          fetch('/api/shipping-rates/active'),
        ]);

        const custData = await custRes.json();
        if (custData.success && Array.isArray(custData.customers)) {
          setCustomers(custData.customers);
        }

        const ratesData = await ratesRes.json();
        if (ratesData.success && Array.isArray(ratesData.rates)) {
          setShippingRates(ratesData.rates);
        }
      } catch (err) {
        console.error('Failed to load active rates or customers:', err);
      } finally {
        setLoadingRates(false);
      }
    }
    initData();
  }, []);

  // Click outside to dismiss history autocomplete dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        senderDropdownRef.current &&
        !senderDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSenderDropdown(false);
      }
      if (
        recipientDropdownRef.current &&
        !recipientDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRecipientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Sender History Autocomplete
  const fetchSenderHistory = useCallback(async (query: string) => {
    setLoadingSenderHistory(true);
    try {
      const res = await fetch(
        `/api/manifests/history/contacts?type=SENDER&query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSenderSuggestions(data.suggestions);
      } else {
        setSenderSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch sender history:', err);
      setSenderSuggestions([]);
    } finally {
      setLoadingSenderHistory(false);
    }
  }, []);

  // Fetch Recipient History Autocomplete
  const fetchRecipientHistory = useCallback(async (query: string) => {
    setLoadingRecipientHistory(true);
    try {
      const res = await fetch(
        `/api/manifests/history/contacts?type=RECIPIENT&query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setRecipientSuggestions(data.suggestions);
      } else {
        setRecipientSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch recipient history:', err);
      setRecipientSuggestions([]);
    } finally {
      setLoadingRecipientHistory(false);
    }
  }, []);

  // Debounced search trigger for Sender History
  useEffect(() => {
    if (!showSenderDropdown) return;
    const timer = setTimeout(() => {
      fetchSenderHistory(senderSearchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [senderSearchQuery, showSenderDropdown, fetchSenderHistory]);

  // Debounced search trigger for Recipient History
  useEffect(() => {
    if (!showRecipientDropdown) return;
    const timer = setTimeout(() => {
      fetchRecipientHistory(recipientSearchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [recipientSearchQuery, showRecipientDropdown, fetchRecipientHistory]);

  // Derived list of unique active Provinces
  const availableProvinces = Array.from(
    new Set(shippingRates.map((r) => r.province))
  ).sort();

  // Derived list of Cities for selected Province
  const availableCities = selectedProvince
    ? shippingRates.filter((r) => r.province === selectedProvince)
    : [];

  // Handle Province change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    setSelectedProvince(prov);
    setSelectedCity('');
    setCurrentRatePerKg(0);
    setRecipientAreaNotice(null);
  };

  // Handle City change
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityVal = e.target.value;
    setSelectedCity(cityVal);
    setRecipientAreaNotice(null);
    const matchedRate = shippingRates.find(
      (r) => r.province === selectedProvince && r.city === cityVal
    );
    if (matchedRate) {
      setCurrentRatePerKg(matchedRate.ratePerKg);
    } else {
      setCurrentRatePerKg(0);
    }
  };

  // Select Customer autofill
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

  // Select Sender History suggestion
  const handleSelectSenderItem = (item: SenderHistoryItem) => {
    setSenderName(item.name);
    setSenderPhone(item.phone);
    setSenderAddress(item.address);
    setShowSenderDropdown(false);
    setSenderSearchQuery('');
  };

  // Select Recipient History suggestion & smart area mapping
  const handleSelectRecipientItem = (item: RecipientHistoryItem) => {
    setRecipientName(item.name);
    setRecipientPhone(item.phone);
    setRecipientAddress(item.address);
    if (item.shareLocationUrl) {
      setShareLocationUrl(item.shareLocationUrl);
    }

    setRecipientAreaNotice(null);

    if (item.recipientProvinceArea && shippingRates.length > 0) {
      const parts = item.recipientProvinceArea.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        const targetCity = parts[0];
        const targetProvince = parts[1];

        const matchedRate = shippingRates.find(
          (r) =>
            r.city.toUpperCase() === targetCity.toUpperCase() &&
            r.province.toUpperCase() === targetProvince.toUpperCase()
        );

        if (matchedRate) {
          setSelectedProvince(matchedRate.province);
          setSelectedCity(matchedRate.city);
          setCurrentRatePerKg(matchedRate.ratePerKg);
        } else {
          setRecipientAreaNotice(
            `Area riwayat ("${item.recipientProvinceArea}") tidak aktif atau tidak ditemukan pada Database Ongkir saat ini. Silakan pilih area tujuan secara manual.`
          );
        }
      } else {
        setRecipientAreaNotice(
          `Area riwayat ("${item.recipientProvinceArea}") perlu dikonfirmasi. Silakan pilih Provinsi & Kota/Kabupaten.`
        );
      }
    }

    setShowRecipientDropdown(false);
    setRecipientSearchQuery('');
  };

  // Total Shipping Fee preview calculation
  const parsedWeight = parseFloat(weightKg) || 0;
  const totalShippingFeePreview = currentRatePerKg * parsedWeight;

  // Total Recipient Bill preview calculation
  const parsedCodAmount = parseFloat(codAmount) || 0;
  const totalRecipientBillPreview =
    paymentDeliveryMethod === 'COD'
      ? parsedCodAmount + totalShippingFeePreview
      : paymentDeliveryMethod === 'DFOD'
      ? totalShippingFeePreview
      : 0;

  // Handle Form Submit
  const handleSave = async (action: 'INPUT_ONLY' | 'INPUT_AND_PRINT') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Form Validations
    if (!senderName.trim() || !senderPhone.trim() || !senderAddress.trim()) {
      setErrorMessage('Mohon lengkapi Data Pengirim (Nama, No HP, Alamat).');
      return;
    }

    if (
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !recipientAddress.trim()
    ) {
      setErrorMessage('Mohon lengkapi Data Penerima (Nama, No HP, Alamat).');
      return;
    }

    if (!selectedProvince || !selectedCity) {
      setErrorMessage(
        'Mohon pilih Provinsi dan Kota/Kabupaten tujuan penerima.'
      );
      return;
    }

    if (!itemName.trim()) {
      setErrorMessage('Mohon isi Nama Barang.');
      return;
    }

    if (parsedWeight <= 0) {
      setErrorMessage('Berat barang harus lebih besar dari 0 Kg.');
      return;
    }

    const parsedKoli = parseInt(koliCount, 10);
    if (isNaN(parsedKoli) || parsedKoli <= 0) {
      setErrorMessage('Jumlah koli minimal 1.');
      return;
    }

    if (paymentDeliveryMethod === 'COD' && parsedCodAmount <= 0) {
      setErrorMessage(
        'Untuk metode pembayaran COD, Nominal Tagihan Barang harus lebih besar dari Rp 0.'
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        senderName: senderName.trim(),
        senderPhone: senderPhone.trim(),
        senderAddress: senderAddress.trim(),

        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientProvince: selectedProvince,
        recipientCity: selectedCity,
        recipientAddress: recipientAddress.trim(),
        shareLocationUrl: shareLocationUrl.trim() || null,

        itemName: itemName.trim(),
        weightKg: parsedWeight,
        koliCount: parsedKoli,

        billingMode,
        paymentDeliveryMethod,
        codAmount: paymentDeliveryMethod === 'COD' ? parsedCodAmount : 0,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMessage(data.error || 'Gagal menyimpan manifest.');
      } else {
        const createdManifest = data.data;
        setLastCreatedResi(createdManifest.resiNumber);

        // Reset form inputs for fast re-entry
        setRecipientName('');
        setRecipientPhone('');
        setRecipientAddress('');
        setShareLocationUrl('');
        setItemName('');
        setWeightKg('1.0');
        setKoliCount('1');
        setNotes('');
        setCodAmount('0');

        if (action === 'INPUT_AND_PRINT') {
          setSuccessMessage(
            `Manifest ${createdManifest.resiNumber} berhasil dibuat! Membuka halaman cetak...`
          );
          window.open(
            `/manifest/print/${createdManifest.id}`,
            '_blank',
            'noopener,noreferrer'
          );
        } else {
          setSuccessMessage(
            `Manifest ${createdManifest.resiNumber} berhasil dibuat!`
          );
        }
      }
    } catch (err) {
      console.error('Error creating manifest:', err);
      setErrorMessage('Terjadi kesalahan koneksi saat menyimpan manifest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      {/* Top Banner Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between gap-4 text-emerald-300 text-sm shadow-md">
          <div className="flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-white underline shrink-0 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm shadow-md">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Container Grid Layout */}
      <div className="space-y-6">
        
        {/* ROW 1: 1. DATA PENGIRIM (LEFT CARD) & 2. DATA PENERIMA (RIGHT CARD) SIDE-BY-SIDE ON DESKTOP */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          
          {/* 1. DATA PENGIRIM CARD (LEFT) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
                <User className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="whitespace-nowrap">1. Data Pengirim (Sender)</span>
              </div>
            </div>

            {/* PILIH PELANGGAN (FULL WIDTH BELOW HEADING) */}
            {customers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Pilih Pelanggan Terdaftar (Opsional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={handleCustomerSelect}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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

            {/* SENDER HISTORY AUTOCOMPLETE SEARCH */}
            <div className="relative" ref={senderDropdownRef}>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-sky-400" />
                <span>Cari dari Riwayat Pengirim</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={senderSearchQuery}
                  onFocus={() => {
                    setShowSenderDropdown(true);
                    fetchSenderHistory(senderSearchQuery);
                  }}
                  onChange={(e) => {
                    setSenderSearchQuery(e.target.value);
                    setShowSenderDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (!showSenderDropdown) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSenderHighlightedIndex((prev) =>
                        prev < senderSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSenderHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : senderSuggestions.length - 1
                      );
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        senderHighlightedIndex >= 0 &&
                        senderHighlightedIndex < senderSuggestions.length
                      ) {
                        handleSelectSenderItem(senderSuggestions[senderHighlightedIndex]);
                      }
                    } else if (e.key === 'Escape') {
                      setShowSenderDropdown(false);
                    }
                  }}
                  placeholder="Cari nama atau nomor HP pengirim..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              {/* SENDER SUGGESTION PANEL */}
              {showSenderDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 max-h-64 overflow-y-auto animate-fadeIn">
                  {loadingSenderHistory ? (
                    <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Mencari riwayat pengirim...</span>
                    </div>
                  ) : senderSuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Tidak ada riwayat pengirim yang cocok.
                    </div>
                  ) : (
                    <div>
                      <div className="px-3 py-1.5 bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {senderSearchQuery.length >= 2 ? 'Hasil Pencarian Riwayat' : 'Riwayat Pengirim Terakhir'}
                      </div>
                      {senderSuggestions.map((item, idx) => (
                        <div
                          key={`${item.phone}-${idx}`}
                          onClick={() => handleSelectSenderItem(item)}
                          className={`p-3 cursor-pointer transition flex items-center justify-between text-xs ${
                            senderHighlightedIndex === idx
                              ? 'bg-sky-950/80 text-white'
                              : 'hover:bg-slate-900/90 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="font-mono text-[11px] text-sky-400 font-normal">
                                ({item.phone})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {item.address}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono shrink-0 ml-3">
                            {new Date(item.lastUsedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nama & No HP Pengirim Pair */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pengirim <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Toko Sentosa"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP Pengirim <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Alamat Lengkap Pengirim */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alamat Lengkap Pengirim <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Contoh: Jl. Industri No. 45, Bandung"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. DATA PENERIMA CARD (RIGHT) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="whitespace-nowrap">2. Data Penerima (Recipient)</span>
              </div>
            </div>

            {/* RECIPIENT HISTORY AUTOCOMPLETE SEARCH */}
            <div className="relative" ref={recipientDropdownRef}>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-sky-400" />
                <span>Cari dari Riwayat Penerima</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientSearchQuery}
                  onFocus={() => {
                    setShowRecipientDropdown(true);
                    fetchRecipientHistory(recipientSearchQuery);
                  }}
                  onChange={(e) => {
                    setRecipientSearchQuery(e.target.value);
                    setShowRecipientDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (!showRecipientDropdown) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setRecipientHighlightedIndex((prev) =>
                        prev < recipientSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setRecipientHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : recipientSuggestions.length - 1
                      );
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        recipientHighlightedIndex >= 0 &&
                        recipientHighlightedIndex < recipientSuggestions.length
                      ) {
                        handleSelectRecipientItem(
                          recipientSuggestions[recipientHighlightedIndex]
                        );
                      }
                    } else if (e.key === 'Escape') {
                      setShowRecipientDropdown(false);
                    }
                  }}
                  placeholder="Cari nama atau nomor HP penerima..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              {/* RECIPIENT SUGGESTION PANEL */}
              {showRecipientDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 max-h-64 overflow-y-auto animate-fadeIn">
                  {loadingRecipientHistory ? (
                    <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Mencari riwayat penerima...</span>
                    </div>
                  ) : recipientSuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Tidak ada riwayat penerima yang cocok.
                    </div>
                  ) : (
                    <div>
                      <div className="px-3 py-1.5 bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {recipientSearchQuery.length >= 2 ? 'Hasil Pencarian Riwayat' : 'Riwayat Penerima Terakhir'}
                      </div>
                      {recipientSuggestions.map((item, idx) => (
                        <div
                          key={`${item.phone}-${idx}`}
                          onClick={() => handleSelectRecipientItem(item)}
                          className={`p-3 cursor-pointer transition flex items-center justify-between text-xs ${
                            recipientHighlightedIndex === idx
                              ? 'bg-sky-950/80 text-white'
                              : 'hover:bg-slate-900/90 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="font-mono text-[11px] text-sky-400 font-normal">
                                ({item.phone})
                              </span>
                              {item.recipientProvinceArea && (
                                <span className="px-1.5 py-0.5 bg-sky-950 text-sky-300 border border-sky-800/60 rounded text-[9px] font-bold uppercase">
                                  {item.recipientProvinceArea}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {item.address}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono shrink-0 ml-3">
                            {new Date(item.lastUsedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RECIPIENT AREA NOTICE BANNER */}
            {recipientAreaNotice && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{recipientAreaNotice}</span>
              </div>
            )}

            {/* Nama & No HP Penerima Pair */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Penerima <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP Penerima <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Contoh: 08987654321"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* PROVINSI & KOTA/KABUPATEN DROPDOWNS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provinsi <span className="text-red-400">*</span>
                </label>
                {loadingRates ? (
                  <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Memuat area...</span>
                  </div>
                ) : shippingRates.length === 0 ? (
                  <div className="px-3.5 py-2 bg-slate-950 border border-red-800/60 rounded-xl text-red-400 text-xs font-medium">
                    Database ongkir belum tersedia.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Memuat kota...</span>
                  </div>
                ) : (
                  <select
                    required
                    disabled={!selectedProvince || availableCities.length === 0}
                    value={selectedCity}
                    onChange={handleCityChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
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

            {/* Alamat Lengkap Penerima */}
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Link Maps */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link Google Maps / Share Location (Opsional)
              </label>
              <input
                type="text"
                value={shareLocationUrl}
                onChange={(e) => setShareLocationUrl(e.target.value)}
                placeholder="Contoh: https://maps.app.goo.gl/xxx"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ROW 2: 3. DATA BARANG & RINCIAN ONGKIR (FULL WIDTH NEW ROW BELOW ROW 1) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>3. Data Barang & Rincian Ongkir</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Barang <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Contoh: Sparepart Mobil / Pakaian"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jumlah Koli <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={koliCount}
                onChange={(e) => setKoliCount(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* READ ONLY TARIF ONGKIR / KG FROM DATABASE ONGKIR MASTER */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Tarif Ongkir / Kg</span>
                <span className="text-[10px] text-emerald-400 font-mono font-normal">Database Rate</span>
              </label>
              <div className="px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-400 text-xs font-mono font-bold flex items-center justify-between">
                <span>
                  {currentRatePerKg > 0
                    ? `Rp ${currentRatePerKg.toLocaleString('id-ID')} / Kg`
                    : 'Pilih area tujuan'}
                </span>
                <Coins className="w-3.5 h-3.5 text-emerald-500/50" />
              </div>
            </div>

            {/* TOTAL ONGKIR DISPLAY */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Ongkos Kirim (Calculated)
              </label>
              <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Shipping Fee:
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  Rp {totalShippingFeePreview.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: 4. MODE PEMBAYARAN & CATATAN CARD (FULL WIDTH NEW ROW BELOW ROW 2) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800/60">
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
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  className="w-full px-3.5 py-2 bg-slate-950 border border-amber-800/60 rounded-xl text-amber-300 font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
    </div>
  );
}
