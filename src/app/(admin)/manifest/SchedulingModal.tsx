'use client';

import React, { useState, useEffect } from 'react';
import { Truck, UserCheck, X, AlertCircle, Loader2 } from 'lucide-react';
import { ManifestListItemDTO } from '@/modules/manifest/services/list-manifests.service';

interface DriverResource {
  id: string;
  employeeCode: string;
  fullName: string;
}

interface VehicleResource {
  id: string;
  plateNumber: string;
  nameType: string;
}

interface SchedulingModalProps {
  isOpen: boolean;
  area: string;
  selectedManifests: ManifestListItemDTO[];
  onClose: () => void;
  onSuccess: (info: { count: number; driverName: string; vehiclePlate: string; vehicleType: string }) => void;
}

export function SchedulingModal({
  isOpen,
  area,
  selectedManifests,
  onClose,
  onSuccess,
}: SchedulingModalProps) {
  const [drivers, setDrivers] = useState<DriverResource[]>([]);
  const [vehicles, setVehicles] = useState<VehicleResource[]>([]);

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [loadingResources, setLoadingResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available drivers & vehicles
  useEffect(() => {
    if (isOpen) {
      async function loadResources() {
        setLoadingResources(true);
        setErrorMessage(null);
        try {
          const res = await fetch('/api/manifests/resources');
          const data = await res.json();
          if (data.success) {
            setDrivers(data.drivers || []);
            setVehicles(data.vehicles || []);
          } else {
            setErrorMessage(data.error || 'Gagal memuat daftar driver & kendaraan.');
          }
        } catch {
          setErrorMessage('Terjadi kesalahan koneksi ke server.');
        } finally {
          setLoadingResources(false);
        }
      }
      loadResources();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalWeight = selectedManifests.reduce((sum, m) => sum + m.weightKg, 0);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Derive area breakdown for selected manifests
  const areaCounts = selectedManifests.reduce((acc, m) => {
    const a = m.recipientProvinceArea || 'Wilayah Lain';
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueAreas = Object.keys(areaCounts);
  const isSingleArea = uniqueAreas.length === 1;
  const areaDisplayTitle = isSingleArea ? uniqueAreas[0] : `${uniqueAreas.length} Area Terpilih`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDriverId) {
      setErrorMessage('Pilih driver terlebih dahulu.');
      return;
    }

    if (!selectedVehicleId) {
      setErrorMessage('Pilih kendaraan terlebih dahulu.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/manifests/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: isSingleArea ? uniqueAreas[0] : 'MULTIPLE',
          manifestIds: selectedManifests.map((m) => m.id),
          driverId: selectedDriverId,
          vehicleId: selectedVehicleId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Gagal memproses penjadwalan.');
        setSubmitting(false);
        return;
      }

      onSuccess({
        count: data.scheduledCount,
        driverName: data.driverName,
        vehiclePlate: data.vehiclePlate,
        vehicleType: data.vehicleType,
      });

      onClose();
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              PENJADWALAN DRIVER & ARMADA
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Batch Context Summary Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400 font-medium">Area / Wilayah Tujuan:</span>
              <span className="text-sky-400 font-bold uppercase">{areaDisplayTitle}</span>
            </div>
            {!isSingleArea && (
              <div className="text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5 space-y-0.5 font-mono">
                {uniqueAreas.map((a) => (
                  <div key={a} className="flex justify-between">
                    <span>• {a}:</span>
                    <span>{areaCounts[a]} resi</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400 font-medium">Jumlah Manifest Dipilih:</span>
              <span className="text-white font-mono font-bold">{selectedManifests.length} Resi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Total Berat Pengiriman:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {totalWeight.toLocaleString('id-ID', { minimumFractionDigits: 2 })} Kg
              </span>
            </div>
          </div>

          {loadingResources ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span>Memuat data driver & kendaraan...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select Driver */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Driver <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- [ Pilih Driver Aktif ] --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Kendaraan / Armada <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- [ Pilih Kendaraan Aktif ] --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.nameType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Preview Card */}
              {selectedVehicle && (
                <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">No. Polisi (Plate):</span>
                    <span className="text-sky-300 font-mono font-bold">{selectedVehicle.plateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Jenis Kendaraan:</span>
                    <span className="text-white font-semibold">{selectedVehicle.nameType}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || loadingResources || !selectedDriverId || !selectedVehicleId}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>Konfirmasi Penjadwalan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
