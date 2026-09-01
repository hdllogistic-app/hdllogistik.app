'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  Lock,
  UserX,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AccountItem {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  division: string;
  employeeActive: boolean;
  userId: string | null;
  loginId: string | null;
  role: string | null;
  userActive: boolean | null;
  accountStatus: 'BELUM PUNYA AKUN' | 'AKTIF' | 'NONAKTIF';
}

export function AccountSettingsView() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State: Create Account
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [targetCreateEmp, setTargetCreateEmp] = useState<AccountItem | null>(null);
  const [createLoginId, setCreateLoginId] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createConfirm, setCreateConfirm] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState<boolean>(false);
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Modal State: Reset Password
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [targetResetAccount, setTargetResetAccount] = useState<AccountItem | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [submittingReset, setSubmittingReset] = useState<boolean>(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('searchQuery', searchQuery.trim());
    if (statusFilter !== 'ALL') params.set('statusFilter', statusFilter);
    if (roleFilter !== 'ALL') params.set('roleFilter', roleFilter);

    try {
      const res = await fetch(`/api/settings/accounts?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAccounts(data.accounts || []);
      } else {
        setErrorMessage(data.error || 'Gagal memuat daftar akun.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenCreateModal = (emp: AccountItem) => {
    setTargetCreateEmp(emp);
    setCreateLoginId(`${emp.employeeCode.toLowerCase()}`);
    setCreatePassword('');
    setCreateConfirm('');
    setShowCreatePassword(false);
    setShowCreateConfirm(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCreateEmp) return;

    if (createPassword !== createConfirm) {
      setErrorMessage('Konfirmasi password tidak cocok.');
      return;
    }

    if (createPassword.length < 12) {
      setErrorMessage('Password minimal 12 karakter.');
      return;
    }

    setSubmittingCreate(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/settings/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: targetCreateEmp.employeeId,
          loginId: createLoginId.trim(),
          password: createPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Akun berhasil dibuat.');
        setIsCreateModalOpen(false);
        fetchAccounts();
      } else {
        setErrorMessage(data.error || 'Gagal membuat akun.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat membuat akun.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleToggleActiveStatus = async (account: AccountItem) => {
    if (!account.userId) return;
    const nextActive = !account.userActive;
    const confirmMsg = nextActive
      ? `Aktifkan kembali akun login ${account.loginId}?`
      : `Nonaktifkan akun login ${account.loginId}? User tidak akan dapat login lagi.`;

    if (!window.confirm(confirmMsg)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/settings/accounts/${account.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Status akun berhasil diperbarui.');
        fetchAccounts();
      } else {
        setErrorMessage(data.error || 'Gagal mengubah status akun.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    }
  };

  const handleOpenResetModal = (account: AccountItem) => {
    setTargetResetAccount(account);
    setResetNewPassword('');
    setShowResetPassword(false);
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetAccount || !targetResetAccount.userId) return;

    if (resetNewPassword.length < 12) {
      setErrorMessage('Password baru minimal 12 karakter.');
      return;
    }

    setSubmittingReset(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/settings/accounts/${targetResetAccount.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Password berhasil di-reset.');
        setIsResetModalOpen(false);
      } else {
        setErrorMessage(data.error || 'Gagal mereset password.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat mereset password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-bold mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pengaturan System</span>
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-sky-400" />
            <span>HDL LOGISTIK — Pengaturan Akun Login</span>
          </h1>
          <p className="text-xs text-slate-400">
            Kelola akses login akun Admin dan Driver operasional.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline text-red-400">
            Tutup
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs underline text-emerald-400">
            Tutup
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-400 mb-1">Cari Kode / Nama / Login ID</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status Akun</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNLINKED">Belum Punya Akun</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Role Akun</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
          >
            <option value="ALL">Semua Role</option>
            <option value="DRIVER">DRIVER</option>
            <option value="HELPER">HELPER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      {/* Account Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span>Memuat data akun team...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <UserCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Tidak ada akun yang sesuai kriteria filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Kode Team</th>
                  <th className="p-4">Nama Employee</th>
                  <th className="p-4">Divisi</th>
                  <th className="p-4">Login ID</th>
                  <th className="p-4">Role Akun</th>
                  <th className="p-4 text-center">Status Akun</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {accounts.map((acc) => (
                  <tr key={acc.employeeId} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {acc.employeeCode}
                    </td>

                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      {acc.fullName}
                    </td>

                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      {acc.division}
                    </td>

                    <td className="p-4 font-mono text-white whitespace-nowrap">
                      {acc.loginId || '-'}
                    </td>

                    <td className="p-4 font-mono whitespace-nowrap">
                      {acc.role ? (
                        <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded text-[10px] font-bold">
                          {acc.role}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      {acc.accountStatus === 'AKTIF' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                          AKTIF
                        </span>
                      ) : acc.accountStatus === 'NONAKTIF' ? (
                        <span className="px-2.5 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[10px] font-bold">
                          NONAKTIF
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold">
                          BELUM PUNYA AKUN
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap space-x-1.5">
                      {!acc.userId ? (
                        acc.division === 'DRIVER' || acc.division === 'ADMIN' || acc.division === 'HELPER' ? (
                          <button
                            onClick={() => handleOpenCreateModal(acc)}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Akun</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">Tidak Didukung V1</span>
                        )
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenResetModal(acc)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Password</span>
                          </button>

                          {acc.role !== 'OWNER' && (
                            <button
                              onClick={() => handleToggleActiveStatus(acc)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 ${
                                acc.userActive
                                  ? 'bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/60'
                                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60'
                              }`}
                            >
                              {acc.userActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Account */}
      {isCreateModalOpen && targetCreateEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-400" />
                <span>BUAT AKUN TEAM LOGIN</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Kode Team:</span>
                <span className="font-bold text-sky-400">{targetCreateEmp.employeeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Employee:</span>
                <span className="font-bold text-white">{targetCreateEmp.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Divisi (Role Akun):</span>
                <span className="font-bold text-emerald-400">{targetCreateEmp.division}</span>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Login ID / Username *</label>
                <input
                  type="text"
                  required
                  value={createLoginId}
                  onChange={(e) => setCreateLoginId(e.target.value.toLowerCase())}
                  placeholder="Contoh: aji001"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password Awal * (Min 12 Karakter)</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Minimal 12 karakter..."
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    aria-label={showCreatePassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Konfirmasi Password *</label>
                <div className="relative">
                  <input
                    type={showCreateConfirm ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={createConfirm}
                    onChange={(e) => setCreateConfirm(e.target.value)}
                    placeholder="Ketik ulang password..."
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateConfirm(!showCreateConfirm)}
                    aria-label={showCreateConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                  >
                    {showCreateConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingCreate && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Buat Akun Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isResetModalOpen && targetResetAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>RESET PASSWORD AKUN</span>
              </h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Login ID:</span>
                <span className="font-bold text-sky-400">{targetResetAccount.loginId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama:</span>
                <span className="font-bold text-white">{targetResetAccount.fullName}</span>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password Baru * (Min 12 Karakter)</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    aria-label={showResetPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingReset && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
