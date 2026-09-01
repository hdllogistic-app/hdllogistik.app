'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  DollarSign,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Clock,
  User,
} from 'lucide-react';
import {
  AttendanceItemDTO,
  PerTeamAttendanceSummaryDTO,
} from '@/modules/finance/services/attendance.service';

export function AttendanceView() {
  const getTodayStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return jkt.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');

  const [attendances, setAttendances] = useState<AttendanceItemDTO[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<PerTeamAttendanceSummaryDTO[]>([]);
  const [summary, setSummary] = useState({
    totalTeam: 0,
    presentCount: 0,
    otherStatusCount: 0,
    totalEarnedPeriod: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (divisionFilter !== 'ALL') params.set('division', divisionFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    try {
      const res = await fetch(`/api/finance/attendance?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAttendances(data.attendances || []);
        setTeamSummaries(data.teamSummaries || []);
        setSummary(
          data.summary || {
            totalTeam: 0,
            presentCount: 0,
            otherStatusCount: 0,
            totalEarnedPeriod: 0,
          }
        );
      } else {
        setErrorMessage(data.error || 'Gagal memuat data absensi.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, divisionFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-sky-400" />
            <span>Absensi Team & Akrual Gaji</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau kehadiran team dan estimasi penghasilan berdasarkan absensi.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'SUMMARY'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ringkasan Per Team
          </button>
          <button
            onClick={() => setActiveTab('DETAIL')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'DETAIL'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rincian Harian Absensi
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Team Aktif</div>
            <div className="text-lg font-bold font-mono text-white">
              {summary.totalTeam} Anggota
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Hadir</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {summary.presentCount} Presensi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Izin / Sakit / Alpa</div>
            <div className="text-lg font-bold font-mono text-amber-300">
              {summary.otherStatusCount} Presensi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Akrual Gaji Periode</div>
            <div className="text-lg font-bold font-mono text-indigo-300">
              Rp {summary.totalEarnedPeriod.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Awal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Divisi</label>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">-- Semua Divisi --</option>
            <option value="DRIVER">DRIVER</option>
            <option value="HELPER">HELPER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status Absensi</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">-- Semua Status --</option>
            <option value="PRESENT">HADIR (PRESENT)</option>
            <option value="LATE">TERLAMBAT (LATE)</option>
            <option value="PERMIT">IZIN (PERMIT)</option>
            <option value="SICK">SAKIT (SICK)</option>
            <option value="ABSENT">ALPA (ABSENT)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Cari Nama / Kode</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama team..."
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'SUMMARY' ? (
        /* PER-TEAM SUMMARY TABLE */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <span>Memuat ringkasan absensi team...</span>
            </div>
          ) : teamSummaries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <User className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Belum ada data absensi team pada periode ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Kode</th>
                    <th className="p-4">Nama Team</th>
                    <th className="p-4">Divisi</th>
                    <th className="p-4 text-center">Hari Hadir Eligible</th>
                    <th className="p-4 text-right">Tarif Harian</th>
                    <th className="p-4 text-right">Total Gaji Kotor</th>
                    <th className="p-4 text-right">Outstanding Kasbon</th>
                    <th className="p-4 text-right">Estimasi Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {teamSummaries.map((t) => (
                    <tr key={t.employeeId} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {t.employeeCode}
                      </td>
                      <td className="p-4 font-bold text-white whitespace-nowrap">{t.employeeName}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                          {t.division}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-400">
                        {t.eligibleDaysCount} Hari
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        Rp {t.dailySalaryRate.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        Rp {t.totalGrossSalary.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                        Rp {t.outstandingCashAdvance.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        Rp {t.netPreviewSalary.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* DETAIL HARIAN TABLE */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <span>Memuat rincian harian absensi...</span>
            </div>
          ) : attendances.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <CalendarCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Tidak ada rincian absensi harian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Kode Team</th>
                    <th className="p-4">Nama Team</th>
                    <th className="p-4">Divisi</th>
                    <th className="p-4 text-center">Status Absensi</th>
                    <th className="p-4">Jam Masuk</th>
                    <th className="p-4">Jam Keluar</th>
                    <th className="p-4 text-right">Penghasilan Hari Itu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {attendances.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{a.date}</td>
                      <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {a.employeeCode}
                      </td>
                      <td className="p-4 font-bold text-white whitespace-nowrap">{a.employeeName}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                          {a.division}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {a.status === 'PRESENT' ? (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                            HADIR (PRESENT)
                          </span>
                        ) : a.status === 'LATE' ? (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/60 rounded text-[10px] font-bold">
                            TERLAMBAT (LATE)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px] font-bold">
                            {a.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                        {a.clockIn ? new Date(a.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                      </td>
                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                        {a.clockOut ? new Date(a.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        Rp {a.earnedAmount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
