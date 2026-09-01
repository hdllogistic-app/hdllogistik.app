'use client';

import React, { useState, useEffect } from 'react';
import { ManifestListItemDTO } from '@/modules/manifest/services/list-manifests.service';
import { X, Loader2, Save, AlertCircle, User, Truck } from 'lucide-react';

interface DriverOption {
  id: string;
  employeeCode: string;
  fullName: string;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  nameType: string;
}

interface EditSchedulingModalProps {
  manifest: ManifestListItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EditSchedulingModal({
  manifest,
  isOpen,
  onClose,
  onSuccess,
}: EditSchedulingModalProps) {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !manifest) return;

    setErrorMsg(null);
    setSelectedDriverId(manifest.driver?.id || '');
    setSelectedVehicleId(manifest.vehicle?.id || '');

    async function fetchResources() {
      setLoadingResources(true);
      try {
        const res = await fetch('/api/manifests/resources');
        const data = await res.json();
        if (data.success) {
          setDrivers(data.drivers || []);
          setVehicles(data.vehicles || []);
        }
      } catch (err) {
        console.error('Failed to load scheduling resources:', err);
      } finally {
        setLoadingResources(false);
      }
    }
    fetchResources();
  }, [isOpen, manifest]);

  if (!isOpen || !manifest) return null;

  const currentDriverName = manifest.driver ? manifest.driver.fullName : 'Belum Ditugaskan';
  const currentVehiclePlate = manifest.vehicle ? `${manifest.vehicle.plateNumber} — ${manifest.vehicle.nameType}` : 'Belum Ditugaskan';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedDriverId || !selectedVehicleId) {
      setErrorMsg('Pilih driver baru dan kendaraan baru.');
      return;
    }

    if (manifest.driver?.id === selectedDriverId && manifest.vehicle?.id === selectedVehicleId) {
      setErrorMsg('Tidak ada perubahan penjadwalan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/manifests/${manifest.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriverId,
          vehicleId: selectedVehicleId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Gagal mengubah penugasan penjadwalan.');
        setSubmitting(false);
        return;
      }

      onSuccess(`Penugasan resi ${manifest.resiNumber} berhasil di-reassign ke ${data.driverName} (${data.vehiclePlate}).`);
      onClose();
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Edit Penjadwalan (Reassignment)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Resi: <strong className="text-sky-400 font-mono">{manifest.resiNumber}</strong> ({manifest.recipientProvinceArea})
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

        {/* Current Assignment Display */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            Penugasan saat ini:
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Driver: <strong>{currentDriverName}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Armada: <strong>{currentVehiclePlate}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Driver Baru *</label>
            {loadingResources ? (
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Memuat driver...</span>
              </div>
            ) : (
              <select
                required
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">[ Pilih Driver Baru ]</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.employeeCode})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Armada / Kendaraan Baru *</label>
            {loadingResources ? (
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Memuat armada...</span>
              </div>
            ) : (
              <select
                required
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">[ Pilih Armada Baru ]</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} — {v.nameType}
                  </option>
                ))}
              </select>
            )}
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
              disabled={submitting || loadingResources}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Penugasan Ulang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
