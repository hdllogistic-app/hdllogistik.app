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
} from 'lucide-react';
import {
  ManifestListItemDTO,
  ManifestSummaryDTO,
} from '@/modules/manifest/services/list-manifests.service';
import { SchedulingModal } from './SchedulingModal';

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

  // Selection & Scheduling Mode State (Persists across pagination)
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFullWeight, setSelectedFullWeight] = useState<number>(0);
  const [selectedFullShippingFee, setSelectedFullShippingFee] = useState<number>(0);
  const [loadingSelection, setLoadingSelection] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
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
        setSummary(data.summary || {
          totalCount: 0,
          totalWeightKg: 0,
          totalShippingFee: 0,
          totalRecipientBill: 0,
        });
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setErrorMessage(data.error || 'Gagal mengambil data manifest.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [area, search, status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL Query Params on filter change
  const updateQueryParams = (newArea: string, newSearch: string, newStatus: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newArea && newArea !== 'ALL') params.set('area', newArea);
    if (newSearch && newSearch.trim() !== '') params.set('search', newSearch.trim());
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);
    if (newPage > 1) params.set('page', String(newPage));

    router.replace(`/manifest?${params.toString()}`);
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newArea = e.target.value;
    setArea(newArea);
    setPage(1);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setSelectedFullWeight(0);
    setSelectedFullShippingFee(0);
    updateQueryParams(newArea, search, status, 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    setPage(1);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setSelectedFullWeight(0);
    setSelectedFullShippingFee(0);
    updateQueryParams(area, newSearch, status, 1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setPage(1);
    updateQueryParams(area, search, newStatus, 1);
  };

  // Fetch Full Eligible Selection across ALL pages for active filter
  const fetchFullEligibleSelection = useCallback(async () => {
    if (area === 'ALL' || !area) return;

    setLoadingSelection(true);
    try {
      const params = new URLSearchParams();
      params.set('area', area);
      if (search && search.trim() !== '') params.set('search', search.trim());

      const res = await fetch(`/api/manifests/eligible-selection?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.manifestIds)) {
        setSelectedIds(new Set(data.manifestIds));
        setSelectedFullWeight(data.totalWeight || 0);
        setSelectedFullShippingFee(data.totalShippingFee || 0);
      }
    } catch (err) {
      console.error('Failed to load eligible selection:', err);
    } finally {
      setLoadingSelection(false);
    }
  }, [area, search]);

  // Toggle Selection Mode
  const handleToggleSelectionMode = async () => {
    if (area === 'ALL' || !area) return;

    if (!isSelectionMode) {
      setIsSelectionMode(true);
      await fetchFullEligibleSelection();
    } else {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      setSelectedFullWeight(0);
      setSelectedFullShippingFee(0);
    }
  };

  const handleSelectAllEligible = async () => {
    await fetchFullEligibleSelection();
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setSelectedFullWeight(0);
    setSelectedFullShippingFee(0);
  };

  const handleToggleRow = (item: ManifestListItemDTO) => {
    if (item.deliveryStatus !== 'READY') return;
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
      setSelectedFullWeight((prev) => Math.max(0, prev - item.weightKg));
      setSelectedFullShippingFee((prev) => Math.max(0, prev - item.totalShippingFee));
    } else {
      next.add(item.id);
      setSelectedFullWeight((prev) => prev + item.weightKg);
      setSelectedFullShippingFee((prev) => prev + item.totalShippingFee);
    }
    setSelectedIds(next);
  };

  const canScheduleRole = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'OPS';

  // Selected manifests for modal context
  const selectedManifestsList = manifests.filter((m) => selectedIds.has(m.id));

  return (
    <div className="space-y-6">
      {/* Top Banner Success Notification */}
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

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 SUMMARY CARDS — DYNAMICALLY REFLECTS ACTIVE FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Manifest */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Manifest
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">
              {summary.totalCount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Total Berat */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Weight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Berat
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">
              {summary.totalWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2 })} <span className="text-sm font-sans font-normal text-slate-400">Kg</span>
            </div>
          </div>
        </div>

        {/* Total Ongkir */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Ongkir
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
              Rp {summary.totalShippingFee.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Total Tagihan */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tagihan
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono mt-0.5">
              Rp {summary.totalRecipientBill.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR & CONTROLS */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Area Filter (PRIMARY) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-sky-400" /> Area:
              </span>
              <select
                value={area}
                onChange={handleAreaChange}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="ALL">-- Semua Area / Wilayah --</option>
                {availableAreas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              <select
                value={status}
                onChange={handleStatusChange}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="READY">READY (Siap Dijadwalkan)</option>
                <option value="ASSIGNED">ASSIGNED (Sudah Dijadwalkan)</option>
                <option value="IN_DELIVERY">IN_DELIVERY (Pengiriman)</option>
                <option value="SUCCESS">SUCCESS (Selesai)</option>
                <option value="PENDING">PENDING (Tertunda)</option>
                <option value="CANCELLED">CANCELLED (Batal)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Cari Resi, Pengirim, Penerima..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Button: Penjadwalan */}
          {canScheduleRole && (
            <div className="flex flex-col items-end gap-1 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleToggleSelectionMode}
                disabled={area === 'ALL' || !area || loadingSelection}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 w-full lg:w-auto ${
                  isSelectionMode
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                    : area === 'ALL' || !area
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                }`}
              >
                {loadingSelection ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                <span>{isSelectionMode ? 'Batal Mode Penjadwalan' : 'Penjadwalan Driver'}</span>
              </button>

              {area === 'ALL' && (
                <span className="text-[11px] text-slate-500 font-medium italic">
                  Pilih Area / Wilayah Tujuan terlebih dahulu.
                </span>
              )}
            </div>
          )}
        </div>

        {/* SELECTION BAR CONTROLS (FULL FILTER SCOPE PERSISTS ACROSS PAGINATION) */}
        {isSelectionMode && (
          <div className="p-3 bg-slate-950 border border-sky-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sky-400 uppercase tracking-wider">
                Mode Seleksi Penjadwalan (Area {area}):
              </span>
              <button
                type="button"
                onClick={handleSelectAllEligible}
                disabled={loadingSelection}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
              >
                Pilih Semua Eligible ({area})
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={loadingSelection}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
              >
                Batalkan Semua
              </button>
            </div>

            {/* Selected Summary Bar */}
            <div className="flex items-center gap-4">
              <div className="text-slate-300">
                Dipilih: <span className="font-mono font-bold text-white">{selectedIds.size} Resi</span>
              </div>
              <div className="text-slate-300">
                Total Berat: <span className="font-mono font-bold text-indigo-300">{selectedFullWeight.toFixed(2)} Kg</span>
              </div>
              <div className="text-slate-300">
                Total Ongkir: <span className="font-mono font-bold text-emerald-400">Rp {selectedFullShippingFee.toLocaleString('id-ID')}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={selectedIds.size === 0 || loadingSelection}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Jadwalkan ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MANIFEST DATA TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-300">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                {isSelectionMode && (
                  <th className="p-3.5 w-10 text-center">
                    <span className="sr-only">Seleksi</span>
                  </th>
                )}
                <th className="p-3.5">Nomor Resi</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Pengirim</th>
                <th className="p-3.5">Penerima</th>
                <th className="p-3.5">Area Tujuan</th>
                <th className="p-3.5 text-center">Berat</th>
                <th className="p-3.5 text-center">Koli</th>
                <th className="p-3.5 text-right">Total Ongkir</th>
                <th className="p-3.5 text-center">Metode</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Driver</th>
                <th className="p-3.5">Kendaraan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={isSelectionMode ? 13 : 12} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                      <span>Memuat data rincian manifest...</span>
                    </div>
                  </td>
                </tr>
              ) : manifests.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 13 : 12} className="p-12 text-center text-slate-500">
                    Tidak ada data manifest yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                manifests.map((m) => {
                  const isEligible = m.deliveryStatus === 'READY';
                  const isChecked = selectedIds.has(m.id);

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {isSelectionMode && (
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(m)}
                            disabled={!isEligible}
                            className={`p-1 rounded transition ${
                              !isEligible
                                ? 'text-slate-700 cursor-not-allowed'
                                : isChecked
                                ? 'text-sky-400 hover:text-sky-300'
                                : 'text-slate-500 hover:text-white'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-sky-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-3.5 font-mono font-bold text-white tracking-wider">
                        <a
                          href={`/manifest/print/${m.resiNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-sky-400 underline decoration-slate-700"
                        >
                          {m.resiNumber}
                        </a>
                      </td>
                      <td className="p-3.5 text-slate-400 whitespace-nowrap">
                        {new Intl.DateTimeFormat('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }).format(new Date(m.date))}
                      </td>
                      <td className="p-3.5 text-slate-200">{m.senderName}</td>
                      <td className="p-3.5 text-slate-200">{m.recipientName}</td>
                      <td className="p-3.5 font-bold text-indigo-400 uppercase">{m.recipientProvinceArea}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-200">{m.weightKg} kg</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-200">{m.koliCount}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        Rp {m.totalShippingFee.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono font-semibold text-[11px]">
                          {m.paymentDeliveryMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            m.deliveryStatus === 'READY'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : m.deliveryStatus === 'ASSIGNED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : m.deliveryStatus === 'IN_DELIVERY'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : m.deliveryStatus === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {m.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-200 whitespace-nowrap">
                        {m.driver ? (
                          <span className="text-white font-bold">{m.driver.fullName}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium text-slate-200 whitespace-nowrap">
                        {m.vehicle ? (
                          <div>
                            <div className="font-mono font-bold text-sky-300">{m.vehicle.plateNumber}</div>
                            <div className="text-[10px] text-slate-400">{m.vehicle.nameType}</div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Halaman <span className="font-bold text-white">{page}</span> dari <span className="font-bold text-white">{totalPages}</span> ({summary.totalCount} total item)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                updateQueryParams(area, search, status, prev);
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                updateQueryParams(area, search, status, next);
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* BULK SCHEDULING MODAL */}
      <SchedulingModal
        isOpen={isModalOpen}
        area={area}
        selectedManifests={selectedManifestsList}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(info) => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
          setSelectedFullWeight(0);
          setSelectedFullShippingFee(0);
          setSuccessFeedback(
            `${info.count} manifest berhasil dijadwalkan ke ${info.driverName} — ${info.vehiclePlate} (${info.vehicleType}).`
          );
          fetchData();
        }}
      />
    </div>
  );
}
