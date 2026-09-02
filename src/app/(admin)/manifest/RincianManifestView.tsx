'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  Weight,
  Coins,
  Receipt,
  Search,
  Filter,
  Calendar,
  Truck,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  MoreVertical,
  Edit,
  UserCog,
  Ban,
  RotateCcw,
} from 'lucide-react';
import {
  ManifestListItemDTO,
  ManifestSummaryDTO,
} from '@/modules/manifest/services/list-manifests.service';
import { getTodayJakartaStr } from '@/modules/manifest/utils/date-utils';
import { SchedulingModal } from './SchedulingModal';
import { EditManifestModal } from './EditManifestModal';
import { EditSchedulingModal } from './EditSchedulingModal';
import { VoidManifestModal } from './VoidManifestModal';

interface RincianManifestViewProps {
  userRole: string;
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const mIdx = parseInt(m, 10) - 1;
  return `${d} ${months[mIdx] || m} ${y}`;
}

export function RincianManifestView({ userRole }: RincianManifestViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayStr = getTodayJakartaStr();

  // Filters State (Default Today in Asia/Jakarta)
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || todayStr);
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || todayStr);
  const [area, setArea] = useState<string>(searchParams.get('area') || 'ALL');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);

  // Available Areas Options
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Data & Summary State
  const [manifests, setManifests] = useState<ManifestListItemDTO[]>([]);
  const [summary, setSummary] = useState<ManifestSummaryDTO>({
    totalCount: 0,
    totalWeightKg: 0,
    totalShippingFee: 0,
    totalRecipientBill: 0,
  });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selection & Scheduling Mode State (Starts with 0 selected by default)
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingSelection, setLoadingSelection] = useState<boolean>(false);

  // Modals Control
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState<boolean>(false);

  const [editingManifest, setEditingManifest] = useState<ManifestListItemDTO | null>(null);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState<boolean>(false);

  const [editingSchedulingManifest, setEditingSchedulingManifest] = useState<ManifestListItemDTO | null>(null);
  const [isEditSchedulingModalOpen, setIsEditSchedulingModalOpen] = useState<boolean>(false);

  const [voidingManifest, setVoidingManifest] = useState<ManifestListItemDTO | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState<boolean>(false);

  // Action Menu Open State per Row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Success Feedback
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Fetch Available Areas for Dropdown
  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await fetch('/api/manifests/areas');
        const data = await res.json();
        if (data.success && Array.isArray(data.areas)) {
          setAvailableAreas(data.areas);
        }
      } catch (err) {
        console.error('Failed to load area options:', err);
      }
    }
    fetchAreas();
  }, []);

  // Fetch Manifests Data & Summary matching filters
  const fetchData = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setErrorMessage('Tanggal awal tidak boleh melebihi tanggal akhir.');
      setManifests([]);
      setSummary({
        totalCount: 0,
        totalWeightKg: 0,
        totalShippingFee: 0,
        totalRecipientBill: 0,
      });
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (area && area !== 'ALL') params.set('area', area);
    if (search && search.trim() !== '') params.set('search', search.trim());
    if (status && status !== 'ALL') params.set('status', status);
    params.set('page', String(page));
    params.set('limit', '25');

    try {
      const res = await fetch(`/api/manifests?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setManifests(data.manifests || []);
        setSummary(
          data.summary || {
            totalCount: 0,
            totalWeightKg: 0,
            totalShippingFee: 0,
            totalRecipientBill: 0,
          }
        );
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setErrorMessage(data.error || 'Gagal mengambil data manifest.');
        setManifests([]);
        setSummary({
          totalCount: 0,
          totalWeightKg: 0,
          totalShippingFee: 0,
          totalRecipientBill: 0,
        });
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, area, search, status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL Query Params on filter change
  const updateQueryParams = (
    newStartDate: string,
    newEndDate: string,
    newArea: string,
    newSearch: string,
    newStatus: string,
    newPage: number
  ) => {
    const params = new URLSearchParams();
    if (newStartDate) params.set('startDate', newStartDate);
    if (newEndDate) params.set('endDate', newEndDate);
    if (newArea && newArea !== 'ALL') params.set('area', newArea);
    if (newSearch && newSearch.trim() !== '') params.set('search', newSearch.trim());
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);
    if (newPage > 1) params.set('page', String(newPage));

    router.replace(`/manifest?${params.toString()}`);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setPage(1);
    updateQueryParams(newStart, endDate, area, search, status, 1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    setPage(1);
    updateQueryParams(startDate, newEnd, area, search, status, 1);
  };

  const handleTodayReset = () => {
    const t = getTodayJakartaStr();
    setStartDate(t);
    setEndDate(t);
    setPage(1);
    updateQueryParams(t, t, area, search, status, 1);
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newArea = e.target.value;
    setArea(newArea);
    setPage(1);
    updateQueryParams(startDate, endDate, newArea, search, status, 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    setPage(1);
    updateQueryParams(startDate, endDate, area, newSearch, status, 1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setPage(1);
    updateQueryParams(startDate, endDate, area, search, newStatus, 1);
  };

  // Toggle Selection Mode (Starts EMPTY by default)
  const handleToggleSelectionMode = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set()); // Default 0 selected
    } else {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  };

  // Action: Select All Filtered Eligible Manifests across ALL pages
  const handleSelectAllFilterResults = async () => {
    setLoadingSelection(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (area && area !== 'ALL') params.set('area', area);
      if (search && search.trim() !== '') params.set('search', search.trim());
      if (status && status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/manifests/eligible-selection?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.manifestIds)) {
        setSelectedIds(new Set(data.manifestIds));
      }
    } catch (err) {
      console.error('Failed to select all eligible manifests:', err);
    } finally {
      setLoadingSelection(false);
    }
  };

  const handleResetSelection = () => {
    setSelectedIds(new Set());
  };

  // Toggle single manifest checkbox in table
  const handleToggleSelectManifest = (id: string, isEligible: boolean) => {
    if (!isEligible) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get selected manifest DTOs from available page/cache or fetch if needed
  const selectedManifestsList = manifests.filter((m) => selectedIds.has(m.id));

  // Open Edit Data Modal
  const openEditDataModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setEditingManifest(m);
    setIsEditDataModalOpen(true);
  };

  // Open Edit Scheduling Modal
  const openEditSchedulingModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setEditingSchedulingManifest(m);
    setIsEditSchedulingModalOpen(true);
  };

  // Open Void Modal
  const openVoidModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setVoidingManifest(m);
    setIsVoidModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner Success Feedback */}
      {successFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between gap-4 text-emerald-300 text-sm">
          <div className="flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successFeedback}</span>
          </div>
          <button
            onClick={() => setSuccessFeedback(null)}
            className="text-xs text-emerald-400 hover:text-white underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top Banner Error Feedback */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header & Main Scheduling Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-sky-400" />
            <span>Rincian Manifest & Operasional</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola manifest pengiriman, penjadwalan driver/armada, edit data, dan soft void.
          </p>
        </div>

        {/* Global Penjadwalan Trigger Button (ALWAYS ENABLED - NO AREA MANDATORY) */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isSelectionMode ? (
            <button
              onClick={handleToggleSelectionMode}
              className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Penjadwalan Driver & Armada</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectionMode}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Batal Selection
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={() => setIsSchedulingModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>Proses Penjadwalan ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SELECTION MODE TOOLBAR (When Selection Mode is Active) */}
      {isSelectionMode && (
        <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-sky-900/80 text-sky-300 text-xs font-bold font-mono border border-sky-700 rounded-lg">
              {selectedIds.size} Manifest Dipilih
            </span>
            <span className="text-xs text-slate-300">
              Pilih manifest berstatus <strong className="text-emerald-400">READY</strong> untuk dijadwalkan.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSelectAllFilterResults}
              disabled={loadingSelection}
              className="px-3.5 py-1.5 bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-xs font-semibold rounded-xl border border-sky-700/60 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loadingSelection ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5" />
              )}
              <span>Pilih Semua Hasil Filter</span>
            </button>

            <button
              onClick={handleResetSelection}
              disabled={selectedIds.size === 0}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pilihan</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Tanggal Awal */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Tanggal Awal</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Tanggal Akhir */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Tanggal Akhir</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Tombol [ Hari Ini ] quick reset */}
          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={handleTodayReset}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
              title="Reset filter tanggal ke Hari Ini"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Hari Ini</span>
            </button>
          </div>

          {/* Area Filter */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Wilayah / Area</span>
            </label>
            <select
              value={area}
              onChange={handleAreaChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">-- Semua Area --</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Status Delivery</span>
            </label>
            <select
              value={status}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">-- Semua Status --</option>
              <option value="READY">READY (Belum Penugasan)</option>
              <option value="ASSIGNED">ASSIGNED (Sudah Penugasan)</option>
              <option value="IN_DELIVERY">IN_DELIVERY (Dalam Pengiriman)</option>
              <option value="SUCCESS">SUCCESS (Terkirim)</option>
              <option value="CANCELLED">CANCELLED / VOID</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Cari Resi / Pengirim / Penerima</span>
          </label>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Ketik nomor resi, nama pengirim, atau penerima..."
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Manifest</div>
            <div className="text-lg font-bold font-mono text-white">
              {summary.totalCount.toLocaleString('id-ID')} Resi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <Weight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Berat (Kg)</div>
            <div className="text-lg font-bold font-mono text-white">
              {summary.totalWeightKg.toLocaleString('id-ID')} Kg
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Ongkos Kirim</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              Rp {summary.totalShippingFee.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Tagihan Penerima</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              Rp {summary.totalRecipientBill.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Manifest Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            <span className="text-xs font-semibold">Memuat data manifest...</span>
          </div>
        ) : manifests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            {startDate === endDate
              ? `Belum ada manifest pada tanggal ${formatDateIndo(startDate)}.`
              : `Belum ada manifest pada rentang tanggal ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                <tr>
                  {isSelectionMode && <th className="p-4 text-center w-10">Select</th>}
                  <th className="p-4">No. Resi & Date</th>
                  <th className="p-4">Pengirim</th>
                  <th className="p-4">Penerima & Area</th>
                  <th className="p-4">Detail Barang</th>
                  <th className="p-4">Ongkir & Tagihan</th>
                  <th className="p-4">Metode Bayar</th>
                  <th className="p-4">Status Delivery</th>
                  <th className="p-4">Driver & Armada</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {manifests.map((m) => {
                  const isEligible = m.deliveryStatus === 'READY' && m.manifestStatus !== 'VOID';
                  const isSelected = selectedIds.has(m.id);
                  const isVoid = m.manifestStatus === 'VOID';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-sky-950/30' : ''
                      } ${isVoid ? 'opacity-50 bg-slate-950/40' : ''}`}
                    >
                      {/* Checkbox Column in Selection Mode */}
                      {isSelectionMode && (
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            disabled={!isEligible}
                            onClick={() => handleToggleSelectManifest(m.id, isEligible)}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-sky-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* No. Resi & Date */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                          <span>{m.resiNumber}</span>
                          {isVoid && (
                            <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[9px]">
                              VOID
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(m.date).toLocaleDateString('id-ID')}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-white">{m.senderName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{m.senderPhone}</div>
                      </td>

                      {/* Recipient & Area */}
                      <td className="p-4">
                        <div className="font-bold text-white">{m.recipientName}</div>
                        <div className="text-[10px] text-slate-400 max-w-[180px] truncate">
                          {m.recipientAddress}
                        </div>
                        <div className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">
                          {m.recipientProvinceArea}
                        </div>
                      </td>

                      {/* Item Details */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-white">{m.itemName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {m.weightKg} Kg • {m.koliCount} Koli
                        </div>
                      </td>

                      {/* Ongkir & Tagihan */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold font-mono text-emerald-400">
                          Rp {m.totalShippingFee.toLocaleString('id-ID')}
                        </div>
                        {m.totalRecipientBill > 0 && (
                          <div className="text-[10px] font-mono text-amber-400">
                            Bill: Rp {m.totalRecipientBill.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {m.paymentDeliveryMethod}
                        </span>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {m.billingMode}
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="p-4 whitespace-nowrap">
                        {m.deliveryStatus === 'READY' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            READY
                          </span>
                        )}
                        {m.deliveryStatus === 'ASSIGNED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ASSIGNED
                          </span>
                        )}
                        {m.deliveryStatus === 'IN_DELIVERY' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            IN_DELIVERY
                          </span>
                        )}
                        {m.deliveryStatus === 'SUCCESS' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            SUCCESS
                          </span>
                        )}
                        {m.deliveryStatus === 'CANCELLED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            CANCELLED
                          </span>
                        )}
                      </td>

                      {/* Driver & Vehicle */}
                      <td className="p-4 whitespace-nowrap">
                        {m.driver ? (
                          <div>
                            <div className="font-bold text-slate-200">{m.driver.fullName}</div>
                            {m.vehicle && (
                              <div className="text-[10px] text-sky-400 font-mono">
                                {m.vehicle.plateNumber} ({m.vehicle.nameType})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Belum ditugaskan</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === m.id ? null : m.id)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === m.id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl z-50 divide-y divide-slate-800/60 animate-fadeIn">
                              <div className="py-1 text-xs">
                                {/* Edit Data */}
                                <button
                                  type="button"
                                  disabled={isVoid || m.deliveryStatus === 'IN_DELIVERY' || m.deliveryStatus === 'SUCCESS' || m.deliveryStatus === 'CANCELLED'}
                                  onClick={() => openEditDataModal(m)}
                                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Edit className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Edit Data</span>
                                </button>

                                {/* Edit Penjadwalan */}
                                <button
                                  type="button"
                                  disabled={isVoid || m.deliveryStatus !== 'ASSIGNED'}
                                  onClick={() => openEditSchedulingModal(m)}
                                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <UserCog className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Edit Penjadwalan</span>
                                </button>
                              </div>

                              <div className="py-1 text-xs">
                                {/* Void Manifest */}
                                <button
                                  type="button"
                                  disabled={isVoid || m.deliveryStatus === 'IN_DELIVERY' || m.deliveryStatus === 'SUCCESS' || m.deliveryStatus === 'CANCELLED'}
                                  onClick={() => openVoidModal(m)}
                                  className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/40 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Void Manifest</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Halaman <strong className="text-white font-mono">{page}</strong> dari{' '}
              <strong className="text-white font-mono">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const newP = page - 1;
                  setPage(newP);
                  updateQueryParams(startDate, endDate, area, search, status, newP);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const newP = page + 1;
                  setPage(newP);
                  updateQueryParams(startDate, endDate, area, search, status, newP);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isSchedulingModalOpen && (
        <SchedulingModal
          isOpen={isSchedulingModalOpen}
          area={area}
          selectedManifests={selectedManifestsList}
          onClose={() => setIsSchedulingModalOpen(false)}
          onSuccess={(info) => {
            setIsSchedulingModalOpen(false);
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            setSuccessFeedback(
              `Berhasil menjadwalkan ${info.count} manifest ke Driver ${info.driverName} (${info.vehiclePlate}).`
            );
            fetchData();
          }}
        />
      )}

      {isEditDataModalOpen && editingManifest && (
        <EditManifestModal
          isOpen={isEditDataModalOpen}
          manifest={editingManifest}
          onClose={() => {
            setIsEditDataModalOpen(false);
            setEditingManifest(null);
          }}
          onSuccess={(msg) => {
            setIsEditDataModalOpen(false);
            setEditingManifest(null);
            setSuccessFeedback(msg);
            fetchData();
          }}
        />
      )}

      {isEditSchedulingModalOpen && editingSchedulingManifest && (
        <EditSchedulingModal
          isOpen={isEditSchedulingModalOpen}
          manifest={editingSchedulingManifest}
          onClose={() => {
            setIsEditSchedulingModalOpen(false);
            setEditingSchedulingManifest(null);
          }}
          onSuccess={(msg) => {
            setIsEditSchedulingModalOpen(false);
            setEditingSchedulingManifest(null);
            setSuccessFeedback(msg);
            fetchData();
          }}
        />
      )}

      {isVoidModalOpen && voidingManifest && (
        <VoidManifestModal
          isOpen={isVoidModalOpen}
          manifest={voidingManifest}
          onClose={() => {
            setIsVoidModalOpen(false);
            setVoidingManifest(null);
          }}
          onSuccess={(msg) => {
            setIsVoidModalOpen(false);
            setVoidingManifest(null);
            setSuccessFeedback(msg);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
