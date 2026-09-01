'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Package,
  User,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  Camera,
  X,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  FileText,
  Calendar,
} from 'lucide-react';

interface ManifestTrackingData {
  summary: {
    resiNumber: string;
    customerName: string;
    itemName: string;
    weightKg: number;
    koliCount: number;
    billingType: string;
    codAmount: number | null;
    createdAt: string;
  };
  sender: {
    name: string;
    phone: string;
    area: string;
    address: string;
  };
  recipient: {
    name: string;
    phone: string;
    area: string;
    address: string;
    shareLocationUrl: string | null;
  };
  currentStatus: {
    code: string;
    title: string;
    driverName: string;
    lastUpdatedAt: string;
    area: string;
    isPending: boolean;
    pendingReasonTitle: string | null;
  };
  progressStages: Array<{
    id: string;
    label: string;
    completed: boolean;
    active: boolean;
    isPending?: boolean;
    pendingReasonTitle?: string | null;
    timestamp: string | null;
  }>;
  timeline: Array<{
    id: string;
    title: string;
    description: string;
    notes?: string | null;
    timestamp: string;
    type: 'CREATED' | 'SCHEDULED' | 'IN_DELIVERY' | 'PENDING' | 'SUCCESS' | 'CANCELLED';
    driverName?: string | null;
    pendingReasonTitle?: string | null;
  }>;
  proof: {
    id: string;
    deliveryId: string;
    actualRecipientName: string;
    receivedAt: string;
    driverName?: string | null;
  } | null;
}

export function ManifestCheckView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inputResi, setInputResi] = useState<string>('');
  const [activeResi, setActiveResi] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [trackingData, setTrackingData] = useState<ManifestTrackingData | null>(null);

  // POD Lightbox Modal State
  const [isPodModalOpen, setIsPodModalOpen] = useState<boolean>(false);
  const [loadingPod, setLoadingPod] = useState<boolean>(false);
  const [podSignedUrl, setPodSignedUrl] = useState<string | null>(null);
  const [podError, setPodError] = useState<string | null>(null);

  // Read resi from query params on load
  useEffect(() => {
    const resiFromUrl = searchParams.get('resi');
    if (resiFromUrl && resiFromUrl.trim()) {
      const clean = resiFromUrl.trim().toUpperCase();
      setInputResi(clean);
      fetchTracking(clean);
    }
  }, [searchParams]);

  const fetchTracking = async (resi: string) => {
    if (!resi) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setHasSearched(true);
    setTrackingData(null);
    setActiveResi(resi);

    try {
      const res = await fetch(`/api/manifests/check?resi=${encodeURIComponent(resi)}`);
      const data = await res.json();

      if (data.success && data.data) {
        setTrackingData(data.data);
      } else {
        if (data.notFound) {
          setNotFound(true);
        } else {
          setError(data.error || 'Gagal mengambil data tracking.');
        }
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat mencari resi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputResi.trim()) return;
    const clean = inputResi.trim().toUpperCase();
    router.push(`/manifest/check?resi=${encodeURIComponent(clean)}`);
    fetchTracking(clean);
  };

  const handleOpenPodModal = async (deliveryId: string) => {
    setIsPodModalOpen(true);
    setLoadingPod(true);
    setPodSignedUrl(null);
    setPodError(null);

    try {
      const res = await fetch(`/api/manifests/check/proof?deliveryId=${encodeURIComponent(deliveryId)}`);
      const data = await res.json();

      if (data.success && data.signedUrl) {
        setPodSignedUrl(data.signedUrl);
      } else {
        setPodError(data.error || 'Gagal memuat foto POD.');
      }
    } catch {
      setPodError('Terjadi kesalahan koneksi saat mengambil foto POD.');
    } finally {
      setLoadingPod(false);
    }
  };

  const formatWibDate = (isoStr?: string | null) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  const formatWaUrl = (phone?: string | null, resi?: string) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    if (clean.length < 10) return null;
    const text = encodeURIComponent(`Halo, mengenai pengiriman HDL LOGISTIK Resi: ${resi || ''}`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#171717] font-sans antialiased p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. PAGE TITLE & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717]">Cek Manifest</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Pantau perjalanan kiriman dan bukti tanda terima.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HDL LOGISTIK Real-time Engine</span>
        </div>
      </div>

      {/* 2. SEARCH BAR CARD */}
      <div className="bg-white border border-[#E8E6E1] rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
            <input
              type="text"
              required
              value={inputResi}
              onChange={(e) => setInputResi(e.target.value)}
              placeholder="Masukkan Nomor Resi (Contoh: HDL2609010001)..."
              className="w-full pl-12 pr-4 py-3 bg-[#FBFBFA] border border-[#E8E6E1] rounded-xl text-[#171717] font-mono font-bold text-base focus:bg-white focus:border-[#171717] focus:ring-0 transition placeholder:text-neutral-400 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputResi.trim()}
            className="w-full sm:w-auto px-7 py-3 bg-[#171717] hover:bg-[#262626] text-white font-medium text-sm rounded-xl shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 transition shrink-0"
          >
            <span>Cek Resi</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </button>
        </form>
      </div>

      {/* 3. EMPTY INITIAL STATE (BEFORE SEARCH) */}
      {!hasSearched && !loading && (
        <div className="bg-white border border-[#E8E6E1] rounded-2xl p-16 text-center space-y-4 shadow-sm max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 bg-[#F6F5F1] text-[#171717] rounded-2xl flex items-center justify-center mx-auto border border-[#E8E6E1]">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#171717]">Cek Perjalanan Manifest</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Masukkan nomor resi untuk melihat status, riwayat perjalanan, dan bukti tanda terima secara langsung.
            </p>
          </div>
        </div>
      )}

      {/* 4. SKELETON LOADING STATE */}
      {loading && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4 pt-4">
              <div className="h-12 bg-neutral-100 rounded"></div>
              <div className="h-12 bg-neutral-100 rounded"></div>
              <div className="h-12 bg-neutral-100 rounded"></div>
              <div className="h-12 bg-neutral-100 rounded"></div>
            </div>
          </div>
        </div>
      )}

      {/* 5. NOT FOUND STATE */}
      {notFound && !loading && (
        <div className="bg-white border border-[#E8E6E1] rounded-2xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#171717]">Manifest Tidak Ditemukan</h3>
            <p className="text-sm text-neutral-500">
              Nomor resi <strong className="font-mono text-[#171717]">{activeResi}</strong> tidak terdaftar di database HDL LOGISTIK. Periksa kembali nomor resi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setInputResi('');
              setHasSearched(false);
            }}
            className="px-5 py-2.5 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] font-semibold text-xs rounded-xl transition border border-[#E8E6E1]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 6. ERROR STATE */}
      {error && !loading && !notFound && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 7. TRACKING RESULT DASHBOARD */}
      {trackingData && !loading && (
        <div className="space-y-6">
          {/* RESULT HERO CARD WITH HORIZONTAL STEPPER */}
          <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
            {/* HERO HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EEE8] pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono text-[#171717] tracking-tight">
                    {trackingData.summary.resiNumber}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono px-3 py-1 rounded-full uppercase border ${
                      trackingData.currentStatus.code === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : trackingData.currentStatus.isPending
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    {trackingData.currentStatus.title}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Penerima: <strong className="text-[#171717] font-semibold">{trackingData.recipient.name}</strong> • Area Tujuan: <strong className="text-[#171717] font-semibold">{trackingData.recipient.area || '-'}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">
                  Driver Operasional
                </span>
                <span className="text-sm font-bold text-[#171717] block">
                  {trackingData.currentStatus.driverName}
                </span>
              </div>
            </div>

            {/* HORIZONTAL TRACKING STEPPER */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Status Alur Pengiriman
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                {trackingData.progressStages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-xl border relative space-y-2 transition ${
                      stage.completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : stage.active
                        ? stage.isPending
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-[#F6F5F1] border-[#171717] text-[#171717]'
                        : 'bg-white border-[#E8E6E1] text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                        0{idx + 1}
                      </span>
                      {stage.completed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : stage.active ? (
                        <div className="w-5 h-5 rounded-full bg-[#171717] text-amber-400 flex items-center justify-center">
                          <Truck className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-neutral-200"></div>
                      )}
                    </div>

                    <h4 className="text-xs font-bold">{stage.label}</h4>

                    {stage.isPending && (
                      <span className="text-[10px] text-amber-700 font-bold block">
                        ⚠ {stage.pendingReasonTitle}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-neutral-400 block pt-1 border-t border-neutral-200">
                      {stage.timestamp ? formatWibDate(stage.timestamp) : 'Menunggu'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ASYMMETRIC TOP INFORMATION GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LEFT LARGE CARD (INFORMASI KIRIMAN - 2 COLUMNS SPAN) */}
            <div className="md:col-span-2 bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-[#F0EEE8] pb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#171717]" />
                <span>INFORMASI KIRIMAN</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Nama Barang</span>
                  <span className="font-bold text-[#171717] text-sm block mt-0.5">{trackingData.summary.itemName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Berat Paket</span>
                  <span className="font-bold text-[#171717] text-sm block mt-0.5">{trackingData.summary.weightKg} kg</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Jumlah Koli</span>
                  <span className="font-bold text-[#171717] text-sm block mt-0.5">{trackingData.summary.koliCount} Koli</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Customer</span>
                  <span className="font-semibold text-neutral-700 block mt-0.5">{trackingData.summary.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Metode Bayar</span>
                  <span className="font-semibold text-emerald-700 uppercase block mt-0.5">
                    {trackingData.summary.billingType}
                    {trackingData.summary.codAmount ? ` (Rp ${trackingData.summary.codAmount.toLocaleString('id-ID')})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Waktu Dibuat</span>
                  <span className="font-mono text-neutral-600 block mt-0.5">{formatWibDate(trackingData.summary.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT SMALL CARD (STATUS TERAKHIR SUMMARY) */}
            <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-[#F0EEE8] pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#171717]" />
                <span>STATUS TERAKHIR</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Status Operasional</span>
                  <span className="font-bold text-[#171717] text-sm block">{trackingData.currentStatus.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Driver Bertugas</span>
                  <span className="font-semibold text-neutral-700 block">{trackingData.currentStatus.driverName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-semibold">Pembaruan Terakhir</span>
                  <span className="font-mono text-neutral-600 block">{formatWibDate(trackingData.currentStatus.lastUpdatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SENDER / RECIPIENT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PENGIRIM */}
            <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#F0EEE8] pb-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-700" />
                  <span>PENGIRIM</span>
                </h3>
                {formatWaUrl(trackingData.sender.phone, trackingData.summary.resiNumber) && (
                  <a
                    href={formatWaUrl(trackingData.sender.phone, trackingData.summary.resiNumber)!}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] border border-[#E8E6E1] rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <span>WhatsApp</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Nama</span>
                  <span className="font-bold text-[#171717] text-sm">{trackingData.sender.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">No. Telepon</span>
                  <span className="font-mono text-neutral-700">{trackingData.sender.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Alamat</span>
                  <p className="text-neutral-600 leading-relaxed">{trackingData.sender.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* PENERIMA */}
            <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#F0EEE8] pb-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>PENERIMA</span>
                </h3>
                <div className="flex items-center gap-2">
                  {trackingData.recipient.shareLocationUrl && (
                    <a
                      href={trackingData.recipient.shareLocationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] border border-[#E8E6E1] rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>Buka Lokasi</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                    </a>
                  )}
                  {formatWaUrl(trackingData.recipient.phone, trackingData.summary.resiNumber) && (
                    <a
                      href={formatWaUrl(trackingData.recipient.phone, trackingData.summary.resiNumber)!}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-[#F6F5F1] hover:bg-[#E8E6E1] text-[#171717] border border-[#E8E6E1] rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <span>WhatsApp</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Nama</span>
                  <span className="font-bold text-[#171717] text-sm">{trackingData.recipient.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">No. Telepon / Area</span>
                  <span className="font-mono text-neutral-700">
                    {trackingData.recipient.phone || '-'} • {trackingData.recipient.area || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Alamat Tujuan</span>
                  <p className="text-neutral-600 leading-relaxed">{trackingData.recipient.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER MAIN GRID: LEFT 65% TIMELINE, RIGHT 35% POD CARD */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* LEFT 65% (8/12 COLUMNS): RIWAYAT PERJALANAN TIMELINE */}
            <div className="md:col-span-8 bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#F0EEE8] pb-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#171717]" />
                  <span>RIWAYAT PERJALANAN</span>
                </h3>
                <span className="text-xs font-mono text-neutral-400">
                  {trackingData.timeline.length} Aktivitas
                </span>
              </div>

              <div className="relative pl-6 border-l border-[#E8E6E1] space-y-6">
                {trackingData.timeline.map((item) => (
                  <div key={item.id} className="relative">
                    {/* Timeline Node */}
                    <div
                      className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                        item.type === 'SUCCESS'
                          ? 'bg-emerald-500 border-white ring-2 ring-emerald-200'
                          : item.type === 'PENDING'
                          ? 'bg-amber-500 border-white ring-2 ring-amber-200'
                          : item.type === 'SCHEDULED'
                          ? 'bg-[#171717] border-white'
                          : 'bg-neutral-300 border-white'
                      }`}
                    ></div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
                          {item.title}
                        </h4>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {formatWibDate(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed">{item.description}</p>

                      {item.driverName && (
                        <span className="text-[11px] font-mono text-neutral-400 block pt-0.5">
                          Driver: <strong className="text-[#171717]">{item.driverName}</strong>
                        </span>
                      )}

                      {item.pendingReasonTitle && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-mono font-semibold mt-1">
                          Alasan Pending: {item.pendingReasonTitle}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT 35% (4/12 COLUMNS): BUKTI TANDA TERIMA (POD CARD) */}
            <div className="md:col-span-4 bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-[#F0EEE8] pb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>BUKTI TANDA TERIMA</span>
              </h3>

              {trackingData.proof ? (
                <div className="space-y-4">
                  {/* PHOTO THUMBNAIL BOX */}
                  <div className="relative w-full h-48 bg-[#F6F5F1] rounded-xl border border-[#E8E6E1] overflow-hidden flex items-center justify-center group shadow-inner">
                    <div className="text-center p-4">
                      <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-[#171717] block">Bukti Foto POD</span>
                      <span className="text-[10px] text-neutral-400 block font-mono">Tersimpan di Cloudflare R2</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Diterima Oleh</span>
                      <span className="font-bold text-[#171717] text-sm">{trackingData.proof.actualRecipientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Waktu Serah Terima</span>
                      <span className="font-mono text-emerald-700 font-semibold">{formatWibDate(trackingData.proof.receivedAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Driver Bertugas</span>
                      <span className="font-semibold text-neutral-700">{trackingData.proof.driverName || '-'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPodModal(trackingData.proof!.deliveryId)}
                    className="w-full py-2.5 bg-[#171717] hover:bg-[#262626] text-white font-medium text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <span>Lihat Foto</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2 bg-[#F6F5F1] rounded-xl border border-[#E8E6E1]">
                  <Camera className="w-6 h-6 text-neutral-400 mx-auto" />
                  <span className="text-xs font-semibold text-neutral-500 block">Foto POD belum tersedia</span>
                  <p className="text-[11px] text-neutral-400">Bukti TTD foto akan muncul setelah pengiriman sukses.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POD LIGHTBOX MODAL */}
      {isPodModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171717]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E6E1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#F0EEE8] pb-3">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Foto Bukti Tanda Terima (POD)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="text-neutral-400 hover:text-[#171717] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPod && (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-700 mx-auto" />
                <p className="text-xs text-neutral-500">Memuat foto POD terenkripsi dari R2...</p>
              </div>
            )}

            {podError && !loadingPod && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{podError}</span>
              </div>
            )}

            {podSignedUrl && !loadingPod && (
              <div className="space-y-4">
                <div className="relative w-full h-80 bg-neutral-900 rounded-xl overflow-hidden border border-[#E8E6E1] shadow-inner flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={podSignedUrl}
                    alt="Bukti TTD POD"
                    className="w-full h-full object-contain"
                  />
                </div>

                {trackingData?.proof && (
                  <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[#E8E6E1] grid grid-cols-2 gap-2 text-xs font-mono text-neutral-700">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans uppercase">Penerima Aktual</span>
                      <span className="font-bold text-[#171717] text-sm">{trackingData.proof.actualRecipientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans uppercase">Waktu Serah Terima</span>
                      <span className="font-bold text-emerald-700">{formatWibDate(trackingData.proof.receivedAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="px-5 py-2 bg-[#171717] hover:bg-[#262626] text-white font-medium rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
