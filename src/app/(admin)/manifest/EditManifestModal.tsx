'use client';

import React, { useState, useEffect } from 'react';
import { ManifestListItemDTO } from '@/modules/manifest/services/list-manifests.service';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';

interface ShippingRateOption {
  id: string;
  province: string;
  city: string;
  ratePerKg: number;
}

interface EditManifestModalProps {
  manifest: ManifestListItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EditManifestModal({
  manifest,
  isOpen,
  onClose,
  onSuccess,
}: EditManifestModalProps) {
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(false);

  // Form Fields
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currentRatePerKg, setCurrentRatePerKg] = useState<number>(0);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shareLocationUrl, setShareLocationUrl] = useState('');

  const [itemName, setItemName] = useState('');
  const [weightKg, setWeightKg] = useState<string>('1');
  const [koliCount, setKoliCount] = useState<string>('1');
  const [billingMode, setBillingMode] = useState<'DIRECT' | 'INVOICE'>('DIRECT');
  const [paymentDeliveryMethod, setPaymentDeliveryMethod] = useState<'CASH' | 'DFOD' | 'COD'>('CASH');
  const [codAmount, setCodAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch active shipping rates master
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  // Populate form fields from manifest
  useEffect(() => {
    if (!manifest || !isOpen) return;

    setErrorMsg(null);
    setSenderName(manifest.senderName || '');
    setSenderPhone(manifest.senderPhone || '');
    setSenderAddress(''); // Optional if available, or fetch full details
    setRecipientName(manifest.recipientName || '');
    setRecipientPhone(manifest.recipientPhone || '');
    setRecipientAddress(manifest.recipientAddress || '');
    setShareLocationUrl('');
    setItemName(manifest.itemName || '');
    setWeightKg(String(manifest.weightKg || 1));
    setKoliCount(String(manifest.koliCount || 1));
    setBillingMode((manifest.billingMode as 'DIRECT' | 'INVOICE') || 'DIRECT');
    setPaymentDeliveryMethod((manifest.paymentDeliveryMethod as 'CASH' | 'DFOD' | 'COD') || 'CASH');
    setCodAmount(String(manifest.codAmount || 0));

    // Parse area "CITY, PROVINCE"
    const parts = (manifest.recipientProvinceArea || '').split(',');
    if (parts.length >= 2) {
      const city = parts[0].trim().toUpperCase();
      const prov = parts.slice(1).join(',').trim().toUpperCase();
      setSelectedProvince(prov);
      setSelectedCity(city);
    } else {
      setSelectedProvince('');
      setSelectedCity('');
    }
    setCurrentRatePerKg(manifest.shippingRatePerKg || 0);
  }, [manifest, isOpen]);

  if (!isOpen || !manifest) return null;

  const availableProvinces = Array.from(new Set(shippingRates.map((r) => r.province))).sort();
  const availableCities = shippingRates
    .filter((r) => r.province === selectedProvince)
    .sort((a, b) => a.city.localeCompare(b.city));

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    setSelectedProvince(prov);
    setSelectedCity('');
    setCurrentRatePerKg(0);
  };

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

  const numericWeight = parseFloat(weightKg) || 0;
  const numericCOD = parseFloat(codAmount) || 0;
  const totalShippingFeePreview = Math.max(0, numericWeight * currentRatePerKg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !senderName.trim() ||
      !senderPhone.trim() ||
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !selectedProvince ||
      !selectedCity ||
      !itemName.trim()
    ) {
      setErrorMsg('Mohon lengkapi semua field wajib.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/manifests/${manifest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientProvince: selectedProvince,
          recipientCity: selectedCity,
          recipientAddress: recipientAddress.trim() || 'Alamat Penerima',
          itemName: itemName.trim(),
          weightKg: numericWeight,
          koliCount: parseInt(koliCount, 10),
          billingMode,
          paymentDeliveryMethod,
          codAmount: paymentDeliveryMethod === 'COD' ? numericCOD : 0,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Gagal memperbarui data manifest.');
        setSubmitting(false);
        return;
      }

      onSuccess(`Data manifest ${manifest.resiNumber} berhasil diperbarui.`);
      onClose();
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAssigned = manifest.deliveryStatus === 'ASSIGNED';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Edit Data Manifest</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800 rounded-md">
                {manifest.resiNumber}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Status Delivery: <strong className="text-emerald-400">{manifest.deliveryStatus}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isAssigned && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300">
            <strong>Catatan Safety ASSIGNED:</strong> Perubahan Provinsi/Kota tidak diizinkan saat penugasan driver aktif.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Nama Pengirim *</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">No. HP Pengirim *</label>
              <input
                type="text"
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Nama Penerima *</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">No. HP Penerima *</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* PROVINSI & KOTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Provinsi *</label>
              <select
                required
                disabled={isAssigned || loadingRates}
                value={selectedProvince}
                onChange={handleProvinceChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">[ Pilih Provinsi ]</option>
                {availableProvinces.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Kota / Kabupaten *</label>
              <select
                required
                disabled={isAssigned || !selectedProvince || availableCities.length === 0}
                value={selectedCity}
                onChange={handleCityChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">[ Pilih Kota / Kabupaten ]</option>
                {availableCities.map((r) => (
                  <option key={r.id} value={r.city}>
                    {r.city} (Rp {r.ratePerKg.toLocaleString('id-ID')}/kg)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Nama Barang *</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Berat Total (Kg) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Jumlah Koli *</label>
              <input
                type="number"
                min="1"
                required
                value={koliCount}
                onChange={(e) => setKoliCount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Metode Pembayaran *</label>
              <select
                value={paymentDeliveryMethod}
                onChange={(e) => setPaymentDeliveryMethod(e.target.value as 'CASH' | 'DFOD' | 'COD')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="CASH">CASH (Bayar Pengirim)</option>
                <option value="DFOD">DFOD (Bayar Penerima)</option>
                <option value="COD">COD (Barang + Ongkir)</option>
              </select>
            </div>
            {paymentDeliveryMethod === 'COD' && (
              <div>
                <label className="block font-semibold text-amber-300 mb-1">Nominal COD (Rp) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-800/60 rounded-xl text-amber-300 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Total Ongkir Calculated:</span>
            <span className="text-emerald-400 font-bold">Rp {totalShippingFeePreview.toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
