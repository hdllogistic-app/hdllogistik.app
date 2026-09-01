'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Loader2, AlertCircle } from 'lucide-react';

interface AttendanceItem {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  workLocationName: string;
  status: string;
  notes: string | null;
}

export default function HelperAttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/helper/attendance');
        const data = await res.json();
        if (data.success) {
          setAttendances(data.attendances || []);
        } else {
          setError(data.error || 'Gagal memuat absensi.');
        }
      } catch {
        setError('Terjadi kesalahan koneksi.');
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <span>Riwayat Kehadiran Helper</span>
        </h1>
        <p className="text-xs text-slate-400">Daftar Kehadiran Operasional (30 Hari Terakhir)</p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span>Memuat riwayat absensi...</span>
        </div>
      ) : attendances.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs space-y-2 bg-slate-900 border border-slate-800 rounded-2xl">
          <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="font-semibold text-slate-400">Belum ada riwayat absensi yang terverifikasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attendances.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>{item.date}</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Jam Masuk:</span>
                  <span className="text-emerald-400 font-bold">
                    {new Date(item.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Jam Pulang:</span>
                  <span className="text-amber-400 font-bold">
                    {item.clockOut
                      ? new Date(item.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>Lokasi: {item.workLocationName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
