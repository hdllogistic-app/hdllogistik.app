'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  X,
  Edit2,
  Power,
} from 'lucide-react';

interface ShippingRateDTO {
  id: string;
  province: string;
  city: string;
  ratePerKg: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SummaryDTO {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
}

export function ShippingRateSettingsView({ userRole }: { userRole: string }) {
  const [rates, setRates] = useState<ShippingRateDTO[]>([]);
  const [summary, setSummary] = useState<SummaryDTO>({
    totalCount: 0,
    activeCount: 0,
    inactiveCount: 0,
  });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateDTO | null>(null);
  const [formProvince, setFormProvince] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formRatePerKg, setFormRatePerKg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirm Deactivate State
  const [confirmTarget, setConfirmTarget] = useState<ShippingRateDTO | null>(null);

  const canMutate = userRole === 'OWNER' || userRole === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/settings/shipping-rates?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRates(data.rates || []);
        setSummary(data.summary || { totalCount: 0, activeCount: 0, inactiveCount: 0 });
      } else {
        setErrorMessage(data.error || 'Gagal mengambil data tarif ongkir.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = () => {
    setEditingRate(null);
    setFormProvince('');
    setFormCity('');
    setFormRatePerKg('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (r: ShippingRateDTO) => {
    setEditingRate(r);
    setFormProvince(r.province);
    setFormCity(r.city);
    setFormRatePerKg(String(r.ratePerKg));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const rateNum = Number(formRatePerKg);
    if (!rateNum || rateNum <= 0) {
      setFormError('Tarif ongkir per kg harus berupa angka lebih besar dari Rp 0.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingRate) {
        // PATCH Edit
        const res = await fetch(`/api/settings/shipping-rates/${editingRate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ratePerKg: rateNum,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || 'Gagal memperbarui tarif.');
          setSubmitting(false);
          return;
        }
        setSuccessMessage(`Tarif ongkir ${editingRate.city}, ${editingRate.province} berhasil diperbarui.`);
      } else {
        // POST Create
        const res = await fetch('/api/settings/shipping-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            province: formProvince,
            city: formCity,
            ratePerKg: rateNum,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || 'Gagal menambahkan tarif.');
          setSubmitting(false);
          return;
        }
        setSuccessMessage(`Tarif ongkir ${data.rate.city}, ${data.rate.province} berhasil ditambahkan.`);
      }

      setIsFormOpen(false);
      fetchData();
    } catch {
      setFormError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    if (!confirmTarget) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/settings/shipping-rates/${confirmTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !confirmTarget.active,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage(
          `Status tarif ${confirmTarget.city}, ${confirmTarget.province} berhasil diubah menjadi ${
            !confirmTarget.active ? 'AKTIF' : 'NONAKTIF'
          }.`
        );
        fetchData();
      } else {
        setErrorMessage(data.error || 'Gagal mengubah status tarif.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
      setConfirmTarget(null);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* 3 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Area</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{summary.totalCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Area Aktif</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{summary.activeCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Area Nonaktif</div>
            <div className="text-2xl font-bold text-slate-300 font-mono mt-0.5">{summary.inactiveCount}</div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Provinsi / Kota..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-400" /> Status:
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tarif Ongkir</span>
          </button>
        )}
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="p-3.5">Provinsi</th>
                <th className="p-3.5">Kota / Kabupaten</th>
                <th className="p-3.5 text-right">Tarif Ongkir / Kg</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Terakhir Diperbarui</th>
                {canMutate && <th className="p-3.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={canMutate ? 6 : 5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                      <span>Memuat data tarif ongkir...</span>
                    </div>
                  </td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={canMutate ? 6 : 5} className="p-12 text-center text-slate-500">
                    Belum ada database ongkir. Tambahkan area tujuan dan tarif ongkir.
                  </td>
                </tr>
              ) : (
                rates.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white uppercase">{r.province}</td>
                    <td className="p-3.5 font-bold text-sky-300 uppercase">{r.city}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      Rp {r.ratePerKg.toLocaleString('id-ID')} / kg
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          r.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {r.active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(r.updatedAt))}
                    </td>
                    {canMutate && (
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            title="Edit Tarif"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(r)}
                            title={r.active ? 'Nonaktifkan Area' : 'Aktifkan Area'}
                            className={`p-1.5 rounded-lg transition ${
                              r.active
                                ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 border border-amber-800/40'
                                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingRate ? 'EDIT TARIF ONGKIR' : 'TAMBAH TARIF ONGKIR'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={submitting}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provinsi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingRate || submitting}
                  value={formProvince}
                  onChange={(e) => setFormProvince(e.target.value)}
                  placeholder="Contoh: JAWA BARAT"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kota / Kabupaten <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingRate || submitting}
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="Contoh: SUMEDANG"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tarif Ongkir / Kg (Rp) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  disabled={submitting}
                  value={formRatePerKg}
                  onChange={(e) => setFormRatePerKg(e.target.value)}
                  placeholder="Contoh: 5000"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold text-emerald-400 focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DEACTIVATE / ACTIVATE MODAL */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {confirmTarget.active ? 'Nonaktifkan Tarif Ongkir?' : 'Aktifkan Tarif Ongkir?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmTarget.active
                ? `Nonaktifkan tarif ${confirmTarget.city}, ${confirmTarget.province}? Area ini tidak akan tersedia untuk penentuan tarif otomatis manifest baru, tetapi histori lama tetap tersimpan.`
                : `Aktifkan kembali tarif ${confirmTarget.city}, ${confirmTarget.province}? Area ini akan tersedia kembali untuk pengiriman baru.`}
            </p>
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={submitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleToggleActiveStatus}
                disabled={submitting}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2 ${
                  confirmTarget.active ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmTarget.active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
