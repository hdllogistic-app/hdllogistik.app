'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Award,
  Loader2,
  Eye,
  AlertCircle,
  Package,
} from 'lucide-react';
import {
  TeamMonitoringSummaryDTO,
  OverallMonitoringSummaryDTO,
} from '@/modules/monitoring/services/delivery-monitoring.service';
import { DetailDeliveryModal } from './DetailDeliveryModal';

interface DriverTeamOption {
  id: string;
  employeeCode: string;
  fullName: string;
}

export function DeliveryMonitoringView() {
  // Get Today's Date in Asia/Jakarta (YYYY-MM-DD)
  const getTodayJakartaDateStr = () => {
    const now = new Date();
    const jakartaDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return jakartaDate.toISOString().split('T')[0];
  };

  const [dateStr, setDateStr] = useState<string>(getTodayJakartaDateStr());
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [driverTeams, setDriverTeams] = useState<DriverTeamOption[]>([]);
  const [teams, setTeams] = useState<TeamMonitoringSummaryDTO[]>([]);
  const [summary, setSummary] = useState<OverallMonitoringSummaryDTO>({
    totalDelivery: 0,
    totalTtd: 0,
    totalPending: 0,
    achievement: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal Control
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [detailEmployeeName, setDetailEmployeeName] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Fetch Drivers for Team Filter
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch('/api/manifests/resources');
        const data = await res.json();
        if (data.success && Array.isArray(data.drivers)) {
          setDriverTeams(
            data.drivers.map((d: any) => ({
              id: d.id,
              employeeCode: d.employeeCode,
              fullName: d.fullName,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load driver teams options:', err);
      }
    }
    fetchDrivers();
  }, []);

  // Fetch Main Delivery Monitoring Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('date', dateStr);
    if (selectedTeamId && selectedTeamId !== 'ALL') params.set('teamId', selectedTeamId);
    if (searchQuery && searchQuery.trim() !== '') params.set('search', searchQuery.trim());

    try {
      const res = await fetch(`/api/monitoring/delivery?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSummary(
          data.summary || {
            totalDelivery: 0,
            totalTtd: 0,
            totalPending: 0,
            achievement: 0,
          }
        );
        setTeams(data.teams || []);
      } else {
        setErrorMessage(data.error || 'Data monitoring delivery gagal dimuat.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [dateStr, selectedTeamId, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date Quick Navigation Helpers
  const handleOffsetDate = (offsetDays: number) => {
    const current = new Date(`${dateStr}T00:00:00+07:00`);
    current.setDate(current.getDate() + offsetDays);
    const newDateStr = current.toISOString().split('T')[0];
    setDateStr(newDateStr);
  };

  const handleResetToToday = () => {
    setDateStr(getTodayJakartaDateStr());
  };

  // Open Detail Modal Helper
  const openDetailModal = (team: TeamMonitoringSummaryDTO) => {
    setDetailEmployeeId(team.employeeId);
    setDetailEmployeeName(team.employeeName);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner Error Notification */}
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
            <Activity className="w-6 h-6 text-sky-400" />
            <span>Delivery Monitoring</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau progress delivery dan TTD berdasarkan team.
          </p>
        </div>

        {/* Date Quick Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => handleOffsetDate(-1)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handleResetToToday}
            className="px-3 py-1.5 bg-sky-950 text-sky-300 hover:text-white rounded-lg border border-sky-800/60 font-bold transition"
          >
            Hari Ini
          </button>

          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <button
            onClick={() => handleOffsetDate(1)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition flex items-center gap-1"
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* TOTAL DELIVERY */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Delivery</div>
            <div className="text-xl font-bold font-mono text-white">
              {summary.totalDelivery.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* TOTAL TTD */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total TTD</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {summary.totalTtd.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* TOTAL PENDING */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Pending</div>
            <div className="text-xl font-bold font-mono text-amber-300">
              {summary.totalPending.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* ACHIEVEMENT TTD */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Achievement TTD</div>
            <div
              className={`text-xl font-bold font-mono ${
                summary.achievement >= 95
                  ? 'text-emerald-400'
                  : summary.achievement >= 90
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }`}
            >
              {summary.achievement.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Filter Team / Driver</span>
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">-- Semua Team Driver --</option>
            {driverTeams.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.employeeCode})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Cari Team / Kode Driver</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama driver atau kode team..."
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Monitoring Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span>Memuat data monitoring delivery...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Belum ada data delivery pada tanggal ini.</p>
            <p>Silakan pilih tanggal lain atau atur ulang filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Nama Team</th>
                  <th className="p-4 text-center">Total Delivery</th>
                  <th className="p-4 text-center">Total TTD</th>
                  <th className="p-4 text-center">Total Pending</th>
                  <th className="p-4 text-center">Achievement</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {teams.map((t) => (
                  <tr key={t.employeeId} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(`${dateStr}T00:00:00+07:00`).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{t.employeeName}</span>
                        <span className="font-mono text-[10px] text-sky-400 font-normal px-1.5 py-0.5 bg-sky-950 border border-sky-800/60 rounded">
                          {t.employeeCode}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => openDetailModal(t)}
                        className="font-mono font-bold text-white hover:text-sky-400 underline decoration-sky-500/50"
                      >
                        {t.totalDelivery}
                      </button>
                    </td>

                    <td className="p-4 text-center font-mono font-bold text-emerald-400">
                      {t.totalTtd}
                    </td>

                    <td className="p-4 text-center font-mono font-bold text-amber-300">
                      {t.totalPending}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                          t.achievement >= 95
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : t.achievement >= 90
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                        }`}
                      >
                        {t.achievement.toFixed(2)}%
                      </span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => openDetailModal(t)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailDeliveryModal
        employeeId={detailEmployeeId}
        employeeName={detailEmployeeName}
        dateStr={dateStr}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailEmployeeId(null);
          setDetailEmployeeName(null);
        }}
      />
    </div>
  );
}
