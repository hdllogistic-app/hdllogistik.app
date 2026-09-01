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
  MapPin,
  Plus,
  Edit2,
  X,
} from 'lucide-react';
import {
  AttendanceItemDTO,
  PerTeamAttendanceSummaryDTO,
} from '@/modules/finance/services/attendance.service';

interface LocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
}

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

  // Master Location State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locName, setLocName] = useState<string>('');
  const [locLat, setLocLat] = useState<string>('');
  const [locLng, setLocLng] = useState<string>('');
  const [locRadius, setLocRadius] = useState<string>('100');
  const [submittingLoc, setSubmittingLoc] = useState<boolean>(false);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await fetch('/api/finance/attendance/locations');
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error('Failed to load work locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenLocationModal = () => {
    fetchLocations();
    setIsLocationModalOpen(true);
  };

  const handleEditLocation = (loc: LocationItem) => {
    setEditingLocId(loc.id);
    setLocName(loc.name);
    setLocLat(String(loc.latitude));
    setLocLng(String(loc.longitude));
    setLocRadius(String(loc.radiusMeters));
  };

  const handleResetLocForm = () => {
    setEditingLocId(null);
    setLocName('');
    setLocLat('');
    setLocLng('');
    setLocRadius('100');
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName || !locLat || !locLng || !locRadius) return;

    setSubmittingLoc(true);
    try {
      const url = editingLocId
        ? `/api/finance/attendance/locations/${editingLocId}`
        : '/api/finance/attendance/locations';
      const method = editingLocId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locName.trim(),
          latitude: Number(locLat),
          longitude: Number(locLng),
          radiusMeters: Number(locRadius),
        }),
      });

      const data = await res.json();
      if (data.success) {
        handleResetLocForm();
        fetchLocations();
      } else {
        alert(data.error || 'Gagal menyimpan lokasi.');
      }
    } catch {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setSubmittingLoc(false);
    }
  };

  const handleToggleLocActive = async (loc: LocationItem) => {
    try {
      const res = await fetch(`/api/finance/attendance/locations/${loc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !loc.active }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLocations();
      }
    } catch {
      console.error('Failed to toggle location active status');
    }
  };

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

        {/* Action Controls & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenLocationModal}
            className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Pengaturan Lokasi Absensi</span>
          </button>

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

      {/* Modal: Pengaturan Lokasi Absensi */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>PENGATURAN LOKASI ABSENSI (GEOFENCE)</span>
              </h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Create / Edit */}
            <form onSubmit={handleSaveLocation} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-sky-400 flex items-center justify-between">
                <span>{editingLocId ? 'Edit Lokasi Absensi' : 'Tambah Lokasi Absensi Baru'}</span>
                {editingLocId && (
                  <button type="button" onClick={handleResetLocForm} className="text-slate-400 hover:text-white underline text-[10px]">
                    Batal Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lokasi *</label>
                  <input
                    type="text"
                    required
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="Contoh: Gudang Utama HDL"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Radius Geofence (Meter) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={locRadius}
                    onChange={(e) => setLocRadius(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude (GPS) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    placeholder="-6.20000000"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude (GPS) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    placeholder="106.81666600"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingLoc}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  {submittingLoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingLocId ? 'Simpan Perubahan' : 'Tambah Lokasi'}</span>
                </button>
              </div>
            </form>

            {/* List Table */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-300">Daftar Lokasi Kerja Aktif</h4>
              {loadingLocations ? (
                <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Memuat lokasi absensi...</span>
                </div>
              ) : locations.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-950 rounded-xl">Belum ada lokasi terdaftar.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Nama Lokasi</th>
                        <th className="p-3">Koordinat (Lat, Lng)</th>
                        <th className="p-3 text-center">Radius</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {locations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-sans font-bold text-white whitespace-nowrap">{loc.name}</td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">{loc.latitude}, {loc.longitude}</td>
                          <td className="p-3 text-center font-bold text-emerald-400">{loc.radiusMeters}m</td>
                          <td className="p-3 text-center font-sans">
                            {loc.active ? (
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">AKTIF</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[10px] font-bold">NONAKTIF</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-sans space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleEditLocation(loc)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[10px] font-bold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleLocActive(loc)}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                loc.active
                                  ? 'bg-red-950 text-red-400 border border-red-800/60 hover:bg-red-900'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900'
                              }`}
                            >
                              {loc.active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
