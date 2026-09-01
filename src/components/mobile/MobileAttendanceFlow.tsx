'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  RefreshCw,
  UserCheck,
  Building,
} from 'lucide-react';

interface WorkLocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

interface AttendanceStatus {
  id: string;
  clockIn: string;
  clockOut: string | null;
  workLocationName: string;
  distanceMeters: number;
  status: string;
  photoUrl: string | null;
}

export function MobileAttendanceFlow({ roleTitle }: { roleTitle: 'DRIVER' | 'HELPER' }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [statusData, setStatusData] = useState<AttendanceStatus | null>(null);
  const [locations, setLocations] = useState<WorkLocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // GPS Geolocation State
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Photo Selfie Capture State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAttendanceStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/mobile/attendance/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data.attendance || null);
        setLocations(data.activeLocations || []);
        if (data.activeLocations?.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data.activeLocations[0].id);
        }
      } else {
        setErrorMessage(data.error || 'Gagal mengambil status absensi.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const getGPSLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Browser Anda tidak mendukung fitur lokasi GPS.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setGpsLoading(false);
      },
      (error) => {
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Akses GPS ditolak. Silakan izinkan akses lokasi di browser HP Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan GPS habis.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchAttendanceStatus();
    getGPSLocation();
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress & convert to Base64 JPEG data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoDataUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClockIn = async () => {
    if (userLat === null || userLng === null) {
      alert('Lokasi GPS wajib terdeteksi sebelum melakukan Absen Masuk.');
      getGPSLocation();
      return;
    }
    if (!photoDataUrl) {
      alert('Foto Selfie wajib diambil terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/mobile/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLat,
          longitude: userLng,
          photoUrl: photoDataUrl,
          workLocationId: selectedLocationId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Absen Masuk Berhasil!');
        setPhotoDataUrl(null);
        fetchAttendanceStatus();
      } else {
        setErrorMessage(data.error || 'Gagal melakukan Absen Masuk.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (userLat === null || userLng === null) {
      alert('Lokasi GPS wajib terdeteksi sebelum melakukan Absen Pulang.');
      getGPSLocation();
      return;
    }
    if (!photoDataUrl) {
      alert('Foto Selfie wajib diambil terlebih dahulu sebelum Absen Pulang.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/mobile/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLat,
          longitude: userLng,
          photoUrl: photoDataUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Absen Pulang Berhasil!');
        setPhotoDataUrl(null);
        fetchAttendanceStatus();
      } else {
        setErrorMessage(data.error || 'Gagal melakukan Absen Pulang.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span>Memuat data absensi mobile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              ABSENSI OPERASIONAL {roleTitle}
            </h2>
          </div>
          <button
            onClick={() => {
              fetchAttendanceStatus();
              getGPSLocation();
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Sistem Absensi Geofencing GPS & Verifikasi Selfie Foto.
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Status Today Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            STATUS HARI INI
          </span>
          {statusData?.clockOut ? (
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full text-[10px] font-bold">
              SUDAH PULANG
            </span>
          ) : statusData?.clockIn ? (
            <span className="px-2.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-800/60 rounded-full text-[10px] font-bold">
              SUDAH MASUK (HADIR)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/60 rounded-full text-[10px] font-bold">
              BELUM ABSEN
            </span>
          )}
        </div>

        {statusData ? (
          <div className="grid grid-cols-2 gap-3 font-mono text-xs text-slate-200">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block font-sans font-semibold">
                Jam Masuk:
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                {new Date(statusData.clockIn).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                {statusData.workLocationName} ({statusData.distanceMeters}m)
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block font-sans font-semibold">
                Jam Pulang:
              </span>
              <span className="text-amber-400 font-bold text-sm">
                {statusData.clockOut
                  ? new Date(statusData.clockOut).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                {statusData.clockOut ? 'Telah Absen Pulang' : 'Belum Absen Pulang'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Anda belum mencatat absensi kehadiran untuk hari ini.
          </p>
        )}
      </div>

      {/* GPS Status Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>GEOFENCE GPS DISPATCH</span>
          </span>
          <button
            onClick={getGPSLocation}
            disabled={gpsLoading}
            className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1"
          >
            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Cek Ulang GPS</span>
          </button>
        </div>

        {gpsError ? (
          <div className="p-2.5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs">
            {gpsError}
          </div>
        ) : gpsLoading ? (
          <div className="p-3 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>Mencari koordinat GPS HP...</span>
          </div>
        ) : userLat !== null && userLng !== null ? (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Latitude:</span>
              <span className="font-bold text-white">{userLat.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Longitude:</span>
              <span className="font-bold text-white">{userLng.toFixed(6)}</span>
            </div>
          </div>
        ) : null}

        {/* Work Location Selector */}
        {!statusData?.clockIn && locations.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pilih Lokasi Kerja Terdekat *</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} (Radius {loc.radiusMeters}m)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Camera Selfie Capture & Action Controls */}
      {(!statusData?.clockIn || !statusData?.clockOut) && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>VERIFIKASI FOTO SELFIE ABSENSI</span>
          </h3>

          <input
            type="file"
            accept="image/*"
            capture="user"
            ref={fileInputRef}
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {photoDataUrl ? (
            <div className="space-y-2 text-center">
              <div className="relative w-40 h-40 mx-auto border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoDataUrl}
                  alt="Selfie Absensi"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-400 underline font-bold"
              >
                Ambil Ulang Foto Selfie
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl bg-slate-950/60 flex flex-col items-center justify-center space-y-2 transition group"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">Ambil Foto Selfie Sekarang</span>
              <span className="text-[10px] text-slate-400">
                Wajib mengambil foto wajah di lokasi kerja
              </span>
            </button>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {!statusData?.clockIn ? (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={submitting || userLat === null || !photoDataUrl}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>ABSEN MASUK SEKARANG</span>
              </button>
            ) : !statusData?.clockOut ? (
              <button
                type="button"
                onClick={handleClockOut}
                disabled={submitting || userLat === null || !photoDataUrl}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <span>ABSEN PULANG SEKARANG</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-center text-emerald-400 text-xs font-bold">
                Semua absensi hari ini telah lengkap tersimpan. Terima kasih!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
