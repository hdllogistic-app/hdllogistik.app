'use client';

import React, { useState } from 'react';
import { ManifestListItemDTO } from '@/modules/manifest/services/list-manifests.service';
import { X, Loader2, AlertTriangle, Ban } from 'lucide-react';

interface VoidManifestModalProps {
  manifest: ManifestListItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function VoidManifestModal({
  manifest,
  isOpen,
  onClose,
  onSuccess,
}: VoidManifestModalProps) {
  const [voidReason, setVoidReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !manifest) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!voidReason.trim()) {
      setErrorMsg('Alasan void wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/manifests/${manifest.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voidReason: voidReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Gagal membatalkan / void manifest.');
        setSubmitting(false);
        return;
      }

      onSuccess(`Manifest resi ${manifest.resiNumber} telah berhasil di-void.`);
      setVoidReason('');
      onClose();
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-bold text-white">Konfirmasi Void Manifest</h3>
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
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
          <p className="text-slate-300 font-medium">
            Anda akan melakukan <strong>Soft Void</strong> pada Manifest:
          </p>
          <p className="font-mono text-sky-400 font-bold">• Resi: {manifest.resiNumber}</p>
          <p className="text-slate-400">• Area: {manifest.recipientProvinceArea}</p>
          <p className="text-slate-400">• Barang: {manifest.itemName} ({manifest.weightKg} kg)</p>
          <p className="text-red-400 font-semibold text-[11px] pt-1">
            * Penugasan driver aktif (jika ada) akan dibatalkan secara aman. Data historis finansial tetap aman.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Alasan Void Manifest <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Contoh: Salah input / Pengiriman dibatalkan customer / Resi duplikat..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
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
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Ban className="w-3.5 h-3.5" />
              <span>Void Manifest</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
