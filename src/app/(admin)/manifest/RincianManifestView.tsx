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
import { SchedulingModal } from './SchedulingModal';
import { EditManifestModal } from './EditManifestModal';
import { EditSchedulingModal } from './EditSchedulingModal';
import { VoidManifestModal } from './VoidManifestModal';

interface RincianManifestViewProps {
  userRole: string;
}

export function RincianManifestView({ userRole }: RincianManifestViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters State
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

  // Selection & Scheduling Mode State
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

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Fetch Available Areas Options
  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await fetch('/api/manifests/areas');
        const data = await res.json();
        if (data.success && Array.isArray(data.areas)) {
          setAvailableAreas(data.areas);
        }
      } catch (err) {
        console.error('Failed to fetch manifest areas:', err);
      }
    }
    fetchAreas();
  }, []);

  // Sync Filters to URL params
  const syncParamsToUrl = useCallback(
    (newArea: string, newStatus: string, newSearch: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newArea !== 'ALL') params.set('area', newArea);
      if (newStatus !== 'ALL') params.set('status', newStatus);
      if (newSearch.trim()) params.set('search', newSearch.trim());
      if (newPage > 1) params.set('page', String(newPage));

      const queryStr = params.toString();
      router.replace(queryStr ? `/manifest?${queryStr}` : '/manifest');
    },
    [router]
  );

  // Main Data & Summary Fetcher
  const fetchManifests = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (area !== 'ALL') params.set('area', area);
      if (status !== 'ALL') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));

      const res = await fetch(`/api/manifests?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        setErrorMessage(data.error || 'Gagal memuat data manifest.');
        setManifests([]);
      } else {
        setManifests(data.data.manifests || []);
        setSummary(data.data.summary);
        setTotalPages(data.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching manifests:', err);
      setErrorMessage('Terjadi kesalahan koneksi saat memuat data manifest.');
      setManifests([]);
    } finally {
      setLoading(false);
    }
  }, [area, status, search, page]);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  // Handlers for Filters
  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setArea(val);
    setPage(1);
    syncParamsToUrl(val, status, search, 1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatus(val);
    setPage(1);
    syncParamsToUrl(area, val, search, 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    syncParamsToUrl(area, status, val, 1);
  };

  // Toggle Selection Mode
  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setIsSelectionMode(true);
      setSelectedIds(new Set());
    }
  };

  // Select Single Checkbox (Only READY manifests are selectable)
  const handleToggleSelectOne = (id: string, mStatus: string) => {
    if (mStatus !== 'READY') return;
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

  // Select All Filter Results Action
  const handleSelectAllFilterResults = async () => {
    setLoadingSelection(true);
    try {
      const params = new URLSearchParams();
      if (area !== 'ALL') params.set('area', area);
      if (status !== 'ALL') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/manifests/eligible-selection?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.eligibleIds)) {
        setSelectedIds(new Set(data.eligibleIds));
      }
    } catch (err) {
      console.error('Failed to select all filter results:', err);
    } finally {
      setLoadingSelection(false);
    }
  };

  // Reset Selection
  const handleResetSelection = () => {
    setSelectedIds(new Set());
  };

  // Modal Actions
  const handleSchedulingSuccess = (info: { count: number; driverName: string; vehiclePlate: string; vehicleType: string }) => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setSuccessFeedback(`Berhasil menjadwalkan ${info.count} manifest ke driver ${info.driverName}!`);
    fetchManifests();
  };

  const handleEditDataSuccess = (message: string) => {
    setSuccessFeedback(message || 'Data manifest berhasil diperbarui.');
    fetchManifests();
  };

  const handleEditSchedulingSuccess = (message: string) => {
    setSuccessFeedback(message || 'Penjadwalan manifest berhasil diperbarui.');
    fetchManifests();
  };

  const handleVoidSuccess = (message: string) => {
    setSuccessFeedback(message || 'Manifest berhasil dibatalkan (void).');
    fetchManifests();
  };

  const openEditDataModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setEditingManifest(m);
    setIsEditDataModalOpen(true);
  };

  const openEditSchedulingModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setEditingSchedulingManifest(m);
    setIsEditSchedulingModalOpen(true);
  };

  const openVoidModal = (m: ManifestListItemDTO) => {
    setActiveMenuId(null);
    setVoidingManifest(m);
    setIsVoidModalOpen(true);
  };

  const formatDateStr = (dateVal: Date | string) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    return d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-[#171717]">
      {/* Top Banner Success Feedback */}
      {successFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-emerald-800 text-sm">
          <div className="flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successFeedback}</span>
          </div>
          <button
            onClick={() => setSuccessFeedback(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 underline shrink-0 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top Banner Error Feedback */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header & Main Scheduling Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E8E7E3] p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#171717]" />
            <span>Rincian Manifest & Operasional</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Kelola manifest pengiriman, penjadwalan driver/armada, edit data, dan soft void.
          </p>
        </div>

        {/* Global Penjadwalan Trigger Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isSelectionMode ? (
            <button
              onClick={handleToggleSelectionMode}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#171717] hover:bg-[#262626] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Penjadwalan Driver & Armada</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleToggleSelectionMode}
                className="px-4 py-2.5 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] text-xs font-bold rounded-xl border border-[#E8E7E3] transition"
              >
                Batal Selection
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={() => setIsSchedulingModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>Proses Penjadwalan ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SELECTION MODE TOOLBAR */}
      {isSelectionMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold font-mono border border-amber-300 rounded-lg">
              {selectedIds.size} Manifest Dipilih
            </span>
            <span className="text-xs text-neutral-700">
              Pilih manifest berstatus <strong className="text-emerald-700">READY</strong> untuk dijadwalkan.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSelectAllFilterResults}
              disabled={loadingSelection}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-[#171717] text-xs font-semibold rounded-xl border border-[#E8E7E3] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loadingSelection ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-700" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5 text-neutral-700" />
              )}
              <span>Pilih Semua Hasil Filter</span>
            </button>

            <button
              onClick={handleResetSelection}
              disabled={selectedIds.size === 0}
              className="px-3.5 py-1.5 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] text-xs font-semibold rounded-xl border border-[#E8E7E3] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
              <span>Reset Pilihan</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#E8E7E3] p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Area Filter */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-700" />
            <span>Filter Wilayah / Area</span>
          </label>
          <select
            value={area}
            onChange={handleAreaChange}
            className="w-full px-3 py-2 bg-[#FBFBFA] border border-[#E8E7E3] rounded-xl text-[#171717] text-xs font-semibold focus:ring-1 focus:ring-[#171717] focus:outline-none"
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
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-700" />
            <span>Status Delivery</span>
          </label>
          <select
            value={status}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 bg-[#FBFBFA] border border-[#E8E7E3] rounded-xl text-[#171717] text-xs font-semibold focus:ring-1 focus:ring-[#171717] focus:outline-none"
          >
            <option value="ALL">-- Semua Status --</option>
            <option value="READY">READY (Belum Penugasan)</option>
            <option value="ASSIGNED">ASSIGNED (Sudah Penugasan)</option>
            <option value="IN_DELIVERY">IN_DELIVERY (Dalam Pengiriman)</option>
            <option value="SUCCESS">SUCCESS (Terkirim)</option>
            <option value="CANCELLED">CANCELLED / VOID</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-neutral-700" />
            <span>Cari Resi / Pengirim / Penerima</span>
          </label>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Ketik nomor resi, nama pengirim, atau penerima..."
            className="w-full px-3.5 py-2 bg-[#FBFBFA] border border-[#E8E7E3] rounded-xl text-[#171717] text-xs font-medium focus:ring-1 focus:ring-[#171717] focus:outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E8E7E3] rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-[#F6F5F1] text-[#171717] rounded-xl border border-[#E8E7E3]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Total Manifest</div>
            <div className="text-lg font-bold font-mono text-[#171717]">
              {summary.totalCount.toLocaleString('id-ID')} Resi
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E8E7E3] rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-[#F6F5F1] text-[#171717] rounded-xl border border-[#E8E7E3]">
            <Weight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Total Berat</div>
            <div className="text-lg font-bold font-mono text-[#171717]">
              {summary.totalWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2 })} Kg
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E8E7E3] rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-[#F6F5F1] text-emerald-700 rounded-xl border border-[#E8E7E3]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Total Ongkos Kirim</div>
            <div className="text-lg font-bold font-mono text-emerald-700">
              Rp {summary.totalShippingFee.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E8E7E3] rounded-2xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-[#F6F5F1] text-[#171717] rounded-xl border border-[#E8E7E3]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Total Tagihan Penerima</div>
            <div className="text-lg font-bold font-mono text-[#171717]">
              Rp {summary.totalRecipientBill.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white border border-[#E8E7E3] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#171717]" />
            <p className="text-xs font-semibold">Memuat data manifest...</p>
          </div>
        ) : manifests.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 space-y-2">
            <Package className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="text-sm font-bold text-[#171717]">Tidak Ada Manifest</p>
            <p className="text-xs text-neutral-400">
              Tidak ada data manifest yang sesuai dengan filter atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E8E7E3] text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
                  {isSelectionMode && (
                    <th className="py-3.5 px-4 w-10 text-center">Pilih</th>
                  )}
                  <th className="py-3.5 px-4">Tanggal / Resi</th>
                  <th className="py-3.5 px-4">Area / Wilayah</th>
                  <th className="py-3.5 px-4">Pengirim & Penerima</th>
                  <th className="py-3.5 px-4">Barang / Koli / Berat</th>
                  <th className="py-3.5 px-4">Biaya & COD</th>
                  <th className="py-3.5 px-4">Status & Driver</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8]">
                {manifests.map((m) => {
                  const isChecked = selectedIds.has(m.id);
                  const isSelectable = m.deliveryStatus === 'READY';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[#F9F8F6] transition ${
                        isChecked ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      {isSelectionMode && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={!isSelectable}
                            onClick={() => handleToggleSelectOne(m.id, m.deliveryStatus)}
                            className="p-1 rounded text-neutral-700 disabled:opacity-30"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-400" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Tanggal & Resi */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-[#171717] text-sm">{m.resiNumber}</div>
                        <div className="text-[10px] text-neutral-500 font-sans">
                          {formatDateStr(m.date)}
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-4 font-semibold text-neutral-700">
                        {m.recipientProvinceArea || '-'}
                      </td>

                      {/* Pengirim & Penerima */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#171717]">{m.recipientName}</div>
                        <div className="text-[10px] text-neutral-500 truncate max-w-[180px]">
                          Dari: {m.senderName} ({m.senderPhone})
                        </div>
                      </td>

                      {/* Barang & Koli */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#171717]">{m.itemName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {m.koliCount} Koli • {m.weightKg} kg
                        </div>
                      </td>

                      {/* Biaya */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-[#171717]">Rp {m.totalShippingFee.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-emerald-700">
                          {m.paymentDeliveryMethod}
                          {m.codAmount > 0 ? ` (Rp ${m.codAmount.toLocaleString('id-ID')})` : ''}
                        </div>
                      </td>

                      {/* Status & Driver */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            m.deliveryStatus === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.deliveryStatus === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : m.deliveryStatus === 'ASSIGNED' || m.deliveryStatus === 'IN_DELIVERY'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {m.deliveryStatus}
                        </span>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Driver: <strong className="text-[#171717]">{m.driver?.fullName || '-'}</strong>
                        </div>
                      </td>

                      {/* Dropdown Action Menu */}
                      <td className="py-3 px-4 text-center relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId((prev) => (prev === m.id ? null : m.id))
                          }
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition"
                        >
                          <MoreVertical className="w-4 h-4 text-[#171717]" />
                        </button>

                        {activeMenuId === m.id && (
                          <div className="absolute right-4 top-10 z-30 w-44 bg-white border border-[#E8E7E3] rounded-xl shadow-xl p-1 text-left space-y-0.5 animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => openEditDataModal(m)}
                              className="w-full px-3 py-2 text-xs font-semibold text-[#171717] hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-neutral-700" />
                              <span>Edit Data Manifest</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditSchedulingModal(m)}
                              className="w-full px-3 py-2 text-xs font-semibold text-[#171717] hover:bg-neutral-100 rounded-lg flex items-center gap-2 transition"
                            >
                              <UserCog className="w-3.5 h-3.5 text-neutral-700" />
                              <span>Edit Penjadwalan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openVoidModal(m)}
                              className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition"
                            >
                              <Ban className="w-3.5 h-3.5 text-red-500" />
                              <span>Soft Void Manifest</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#FAFAFA] border-t border-[#E8E7E3] flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-mono">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  syncParamsToUrl(area, status, search, p);
                }}
                className="p-2 rounded-xl bg-white border border-[#E8E7E3] text-[#171717] disabled:opacity-40 hover:bg-neutral-100 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  syncParamsToUrl(area, status, search, p);
                }}
                className="p-2 rounded-xl bg-white border border-[#E8E7E3] text-[#171717] disabled:opacity-40 hover:bg-neutral-100 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isSchedulingModalOpen && (
        <SchedulingModal
          isOpen={isSchedulingModalOpen}
          area={area}
          selectedManifests={manifests.filter((m) => selectedIds.has(m.id))}
          onClose={() => setIsSchedulingModalOpen(false)}
          onSuccess={handleSchedulingSuccess}
        />
      )}

      {editingManifest && (
        <EditManifestModal
          isOpen={isEditDataModalOpen}
          manifest={editingManifest}
          onClose={() => {
            setIsEditDataModalOpen(false);
            setEditingManifest(null);
          }}
          onSuccess={handleEditDataSuccess}
        />
      )}

      {editingSchedulingManifest && (
        <EditSchedulingModal
          isOpen={isEditSchedulingModalOpen}
          manifest={editingSchedulingManifest}
          onClose={() => {
            setIsEditSchedulingModalOpen(false);
            setEditingSchedulingManifest(null);
          }}
          onSuccess={handleEditSchedulingSuccess}
        />
      )}

      {voidingManifest && (
        <VoidManifestModal
          isOpen={isVoidModalOpen}
          manifest={voidingManifest}
          onClose={() => {
            setIsVoidModalOpen(false);
            setVoidingManifest(null);
          }}
          onSuccess={handleVoidSuccess}
        />
      )}
    </div>
  );
}
