'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, KeyRound, LogOut, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';

interface HelperProfileInfo {
  employeeName: string;
  loginId: string;
  role: string;
}

export default function HelperProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<HelperProfileInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Change Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submittingPassword, setSubmittingPassword] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/helper/attendance');
        const data = await res.json();
        if (data.success && data.helperName) {
          setProfile({
            employeeName: data.helperName,
            loginId: 'Helper Account',
            role: 'HELPER',
          });
        }
      } catch (err) {
        console.error('Failed to load helper profile info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Keluar dari aplikasi Helper?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage('Password baru minimal 12 karakter.');
      return;
    }

    setSubmittingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Password berhasil diperbarui.');
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(data.error || 'Gagal mengubah password.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat mengubah password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          <span>Profil Helper</span>
        </h1>
        <p className="text-xs text-slate-400">Informasi akun operasional & keamanan</p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center justify-between">
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
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs underline text-emerald-400">
            Tutup
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : profile?.employeeName || 'Helper'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-emerald-400 font-bold">Role: HELPER</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setIsPasswordModalOpen(true);
            }}
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <KeyRound className="w-4 h-4" />
            <span>Ubah Password Akun</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>UBAH PASSWORD AKUN HELPER</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Password Saat Ini *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Password Baru * (Min 12 Karakter)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
