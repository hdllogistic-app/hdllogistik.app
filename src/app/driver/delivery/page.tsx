'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Truck,
  MapPin,
  ChevronRight,
  Loader2,
  Navigation,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react';

interface DriverDeliveryItem {
  deliveryId: string;
  manifestId: string;
  resiNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientArea: string;
  recipientAddress: string;
  shareLocationUrl: string | null;
  itemName: string;
  weightKg: number;
  koliCount: number;
  status: string;
  pendingReason: string | null;
  pendingReasonTitle: string | null;
  pendingNotes: string | null;
  pendingAt: string | null;
  assignedAt: string;
  hasProof: boolean;
}

interface DeliverySummary {
  totalPackages: number;
  deliveryCount: number;
  successCount: number;
  pendingCount: number;
}

function DriverDeliveryListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from URL query params or defaults
  const queryDate = searchParams.get('date');
  const queryFilter = (searchParams.get('filter') || 'all').toLowerCase() as 'all' | 'success' | 'pending';

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'success' | 'pending'>(queryFilter);

  const [deliveries, setDeliveries] = useState<DriverDeliveryItem[]>([]);
  const [summary, setSummary] = useState<DeliverySummary>({
    totalPackages: 0,
    deliveryCount: 0,
    successCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const fetchDeliveries = async (dateVal?: string, tabVal?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateVal) params.set('date', dateVal);
      if (tabVal) params.set('filter', tabVal);

      const res = await fetch(`/api/driver/deliveries?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setDeliveries(data.deliveries || []);
        if (data.summary) {
          setSummary({
            totalPackages: data.summary.totalPackages ?? 0,
            deliveryCount: data.summary.deliveryCount ?? data.summary.totalDeliveries ?? 0,
            successCount: data.summary.successCount ?? 0,
            pendingCount: data.summary.pendingCount ?? 0,
          });
        }
        if (data.selectedDate) {
          setSelectedDate(data.selectedDate);
        }
      } else {
        setError(data.error || 'Gagal memuat daftar pengiriman.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat memuat daftar pengiriman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries(queryDate || undefined, queryFilter);
  }, [queryDate, queryFilter]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) return;

    setSelectedDate(newDate);
    startTransition(() => {
      router.push(`/driver/delivery?date=${newDate}&filter=${activeTab}`);
    });
  };

  const handleTabChange = (tab: 'all' | 'success' | 'pending') => {
    setActiveTab(tab);
    startTransition(() => {
      const dateQuery = selectedDate ? `date=${selectedDate}&` : '';
      router.push(`/driver/delivery?${dateQuery}filter=${tab}`);
    });
  };

  const formatDisplayDate = (isoDateStr: string) => {
    if (!isoDateStr) return 'Pilih Tanggal';
    const [year, month, day] = isoDateStr.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    return dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Date Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            <span>Pengiriman</span>
          </h1>
          <p className="text-[11px] text-slate-400">Daftar resi tugas pengiriman driver</p>
        </div>

        {/* Date Selector Trigger */}
        <div className="relative">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-sky-300 cursor-pointer transition shadow-md">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>{formatDisplayDate(selectedDate)}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* FILTER TABS (Mutually Exclusive Badges) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeTab === 'all'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Delivery</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-md text-[10px] font-mono">
            {summary.deliveryCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('success')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeTab === 'success'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Success</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-md text-[10px] font-mono">
            {summary.successCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending</span>
          <span className="px-1.5 py-0.2 bg-black/30 rounded-md text-[10px] font-mono">
            {summary.pendingCount}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span>Memuat data pengiriman...</span>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-xs space-y-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="font-bold text-slate-300 text-sm">
            {activeTab === 'success'
              ? 'Belum ada tanda terima berhasil.'
              : activeTab === 'pending'
              ? 'Tidak ada delivery pending.'
              : summary.totalPackages > 0
              ? 'Semua pengiriman pada tanggal ini sudah diproses.'
              : 'Belum ada pengiriman pada tanggal ini.'}
          </p>
          <p className="text-slate-500 text-[11px]">
            {activeTab === 'all' && summary.totalPackages > 0
              ? 'Lihat tab Success TTD atau Pending untuk melihat riwayat pengiriman.'
              : 'Gunakan pemilih tanggal di atas untuk melihat riwayat tanggal lain.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((item) => (
            <div
              key={item.deliveryId}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg hover:border-slate-700 transition"
            >
              {/* Top Row: Resi & Status */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="font-mono font-black text-sky-400 text-sm">{item.resiNumber}</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'SUCCESS' || item.hasProof
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : item.status === 'PENDING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                  }`}
                >
                  {item.status === 'SUCCESS' || item.hasProof
                    ? 'SUDAH TTD'
                    : item.status === 'PENDING'
                    ? 'PENDING'
                    : 'BELUM TTD'}
                </span>
              </div>

              {/* Recipient Info */}
              <div className="space-y-1 text-xs">
                <div className="font-bold text-white text-sm">{item.recipientName}</div>
                <div className="text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    {item.recipientAddress} ({item.recipientArea})
                  </span>
                </div>
              </div>

              {/* Pending Reason Compact Badge if Pending */}
              {item.status === 'PENDING' && item.pendingReasonTitle && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-[11px] font-semibold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Pending: <strong>{item.pendingReasonTitle}</strong>
                    {item.pendingNotes ? ` - ${item.pendingNotes}` : ''}
                  </span>
                </div>
              )}

              {/* Cargo Details */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="truncate max-w-[160px]">
                  Barang: <strong className="text-white">{item.itemName}</strong>
                </span>
                <span className="font-bold text-slate-300">
                  {item.weightKg} kg • {item.koliCount} koli
                </span>
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between pt-1">
                {item.shareLocationUrl ? (
                  <a
                    href={item.shareLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Buka Maps</span>
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">No Maps Link</span>
                )}

                <Link
                  href={`/driver/delivery/${item.deliveryId}`}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-sky-600/20"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DriverDeliveryListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <DriverDeliveryListContent />
    </Suspense>
  );
}
