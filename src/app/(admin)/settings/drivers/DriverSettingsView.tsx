'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
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

interface DriverDTO {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  division: string;
  dailySalaryRate: number;
  joinDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SummaryDTO {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
}

export function DriverSettingsView({ userRole }: { userRole: string }) {
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
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
  const [editingDriver, setEditingDriver] = useState<DriverDTO | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().substring(0, 10));
  const [formSalaryRate, setFormSalaryRate] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirm Deactivate State
  const [confirmTarget, setConfirmTarget] = useState<DriverDTO | null>(null);

  const canMutate = userRole === 'OWNER' || userRole === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/settings/drivers?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setDrivers(data.drivers || []);
        setSummary(data.summary || { totalCount: 0, activeCount: 0, inactiveCount: 0 });
      } else {
        setErrorMessage(data.error || 'Gagal mengambil data driver.');
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
    setEditingDriver(null);
    setFormCode('');
    setFormName('');
    setFormPhone('');
    setFormJoinDate(new Date().toISOString().substring(0, 10));
    setFormSalaryRate('0');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (d: DriverDTO) => {
    setEditingDriver(d);
    setFormCode(d.employeeCode);
    setFormName(d.fullName);
    setFormPhone(d.phone);
    setFormJoinDate(new Date(d.joinDate).toISOString().substring(0, 10));
    setFormSalaryRate(String(d.dailySalaryRate));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    setSubmitting(true);

    try {
      if (editingDriver) {
        // PATCH Edit
        const res = await fetch(`/api/settings/drivers/${editingDriver.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formName,
            phone: formPhone,
            joinDate: formJoinDate,
            dailySalaryRate: Number(formSalaryRate) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || 'Gagal memperbarui driver.');
          setSubmitting(false);
          return;
        }
        setSuccessMessage(`Driver ${editingDriver.fullName} (${editingDriver.employeeCode}) berhasil diperbarui.`);
      } else {
        // POST Create
        const res = await fetch('/api/settings/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeCode: formCode,
            fullName: formName,
            phone: formPhone,
            joinDate: formJoinDate,
            dailySalaryRate: Number(formSalaryRate) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || 'Gagal menambahkan driver.');
          setSubmitting(false);
          return;
        }
        setSuccessMessage(`Driver ${data.driver.fullName} (${data.driver.employeeCode}) berhasil ditambahkan.`);
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
      const res = await fetch(`/api/settings/drivers/${confirmTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !confirmTarget.active,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage(
          `Status driver ${confirmTarget.fullName} berhasil diubah menjadi ${
            !confirmTarget.active ? 'AKTIF' : 'NONAKTIF'
          }.`
        );
        fetchData();
      } else {
        setErrorMessage(data.error || 'Gagal mengubah status driver.');
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
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Driver</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{summary.totalCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Aktif</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{summary.activeCount}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Nonaktif</div>
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
              placeholder="Cari Kode, Nama, No. HP..."
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Driver</span>
          </button>
        )}
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="p-3.5">Kode Driver</th>
                <th className="p-3.5">Nama Driver</th>
                <th className="p-3.5">No. HP</th>
                <th className="p-3.5">Tanggal Bergabung</th>
                <th className="p-3.5 text-right">Gaji Harian</th>
                <th className="p-3.5 text-center">Status</th>
                {canMutate && <th className="p-3.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={canMutate ? 7 : 6} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                      <span>Memuat data driver...</span>
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={canMutate ? 7 : 6} className="p-12 text-center text-slate-500">
                    Belum ada driver. Tambahkan driver untuk digunakan dalam penjadwalan.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-sky-300 uppercase">{d.employeeCode}</td>
                    <td className="p-3.5 font-bold text-white">{d.fullName}</td>
                    <td className="p-3.5 font-mono text-slate-300">{d.phone}</td>
                    <td className="p-3.5 text-slate-400">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(d.joinDate))}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      Rp {d.dailySalaryRate.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          d.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {d.active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    {canMutate && (
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(d)}
                            title="Edit Driver"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(d)}
                            title={d.active ? 'Nonaktifkan Driver' : 'Aktifkan Driver'}
                            className={`p-1.5 rounded-lg transition ${
                              d.active
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
                {editingDriver ? 'EDIT DRIVER' : 'TAMBAH DRIVER'}
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
                  Kode Driver <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingDriver || submitting}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Contoh: DRV001"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Driver <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: AJI SAPUTRA"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tanggal Bergabung <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={submitting}
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gaji Harian (Rp)
                </label>
                <input
                  type="number"
                  disabled={submitting}
                  value={formSalaryRate}
                  onChange={(e) => setFormSalaryRate(e.target.value)}
                  placeholder="Contoh: 150000"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-2"
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
              {confirmTarget.active ? 'Nonaktifkan Driver?' : 'Aktifkan Driver?'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmTarget.active
                ? `Nonaktifkan driver ${confirmTarget.fullName} (${confirmTarget.employeeCode})? Driver tidak akan muncul dalam penjadwalan baru, tetapi histori delivery tetap tersimpan.`
                : `Aktifkan kembali driver ${confirmTarget.fullName} (${confirmTarget.employeeCode})? Driver akan tersedia kembali untuk penjadwalan baru.`}
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
