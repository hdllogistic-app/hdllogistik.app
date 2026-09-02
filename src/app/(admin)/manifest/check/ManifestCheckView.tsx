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
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  Loader2,
  Camera,
  X,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
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
    <div className="space-y-6 pb-12 text-slate-100 max-w-7xl mx-auto">
      {/* 1. SEARCH HEADER CARD */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
                INTERNAL SHIPMENT TRACKING
              </span>
              <h2 className="text-xl font-black text-white">CEK MANIFEST</h2>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Sumber Data: HDL LOGISTIK Database (Real-time)
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={inputResi}
              onChange={(e) => setInputResi(e.target.value)}
              placeholder="Masukkan Nomor Resi (Contoh: HDL2609010001)..."
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-base focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition placeholder:text-slate-500 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputResi.trim()}
            className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm rounded-xl shadow-lg shadow-sky-600/20 disabled:opacity-40 flex items-center justify-center gap-2 transition shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span>Cek Manifest</span>
          </button>
        </form>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 shadow-xl">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400 mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">Mencari data manifest {activeResi}...</p>
        </div>
      )}

      {/* NOT FOUND STATE */}
      {notFound && !loading && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nomor Resi Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Nomor resi <strong className="text-amber-400 font-mono">{activeResi}</strong> tidak ditemukan di database HDL LOGISTIK. Pastikan nomor resi ditulis dengan benar.
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && !notFound && (
        <div className="p-6 bg-red-950/60 border border-red-800/60 rounded-2xl text-red-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SEARCH RESULT DASHBOARD */}
      {trackingData && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* 2. RINGKASAN KIRIMAN CARD */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Package className="w-5 h-5 text-sky-400" />
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                RINGKASAN KIRIMAN
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">NOMOR RESI</span>
                <span className="font-bold text-sky-400 text-sm block truncate">
                  {trackingData.summary.resiNumber}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">CUSTOMER / PENGIRIM</span>
                <span className="font-bold text-white text-xs block truncate">
                  {trackingData.summary.customerName}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">NAMA BARANG</span>
                <span className="font-bold text-white text-xs block truncate">
                  {trackingData.summary.itemName}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">BERAT</span>
                <span className="font-bold text-white text-xs block">
                  {trackingData.summary.weightKg} kg
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">JUMLAH KOLI</span>
                <span className="font-bold text-sky-400 text-xs block">
                  {trackingData.summary.koliCount} Koli
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">METODE PEMBAYARAN</span>
                <span className="font-bold text-emerald-400 text-xs block uppercase">
                  {trackingData.summary.billingType}
                  {trackingData.summary.codAmount ? ` (Rp ${trackingData.summary.codAmount.toLocaleString('id-ID')})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 3. PENGIRIM & PENERIMA CARDS (SIDE BY SIDE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PENGIRIM CARD */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-sky-400" />
                  <h3 className="text-xs font-black text-sky-300 uppercase tracking-wider">PENGIRIM</h3>
                </div>
                {formatWaUrl(trackingData.sender.phone, trackingData.summary.resiNumber) && (
                  <a
                    href={formatWaUrl(trackingData.sender.phone, trackingData.summary.resiNumber)!}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Nama:</span>
                  <span className="font-bold text-white text-sm">{trackingData.sender.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">No. Telepon:</span>
                  <span className="font-mono text-slate-200">{trackingData.sender.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Area:</span>
                  <span className="font-semibold text-slate-200">{trackingData.sender.area || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Alamat:</span>
                  <p className="text-slate-300 leading-relaxed">{trackingData.sender.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* PENERIMA CARD */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider">PENERIMA</h3>
                </div>
                <div className="flex items-center gap-2">
                  {trackingData.recipient.shareLocationUrl && (
                    <a
                      href={trackingData.recipient.shareLocationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-800/80 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>📍 Buka Lokasi</span>
                    </a>
                  )}
                  {formatWaUrl(trackingData.recipient.phone, trackingData.summary.resiNumber) && (
                    <a
                      href={formatWaUrl(trackingData.recipient.phone, trackingData.summary.resiNumber)!}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/80 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Nama:</span>
                  <span className="font-bold text-white text-sm">{trackingData.recipient.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">No. Telepon:</span>
                  <span className="font-mono text-slate-200">{trackingData.recipient.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Area Tujuan:</span>
                  <span className="font-semibold text-slate-200">{trackingData.recipient.area || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">Alamat Alamat Tujuan:</span>
                  <p className="text-slate-300 leading-relaxed">{trackingData.recipient.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. CURRENT STATUS SUMMARY STRIP */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">NOMOR RESI</span>
                <span className="font-bold text-white">{trackingData.summary.resiNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">STATUS TERAKHIR</span>
                <span
                  className={`font-bold text-xs uppercase px-2 py-0.5 rounded inline-block mt-0.5 ${
                    trackingData.currentStatus.code === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : trackingData.currentStatus.isPending
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-sky-950 text-sky-400 border border-sky-800'
                  }`}
                >
                  {trackingData.currentStatus.title}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">DRIVER / TEAM</span>
                <span className="font-bold text-sky-300">{trackingData.currentStatus.driverName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">UPDATE TERAKHIR</span>
                <span className="font-bold text-slate-200">{formatWibDate(trackingData.currentStatus.lastUpdatedAt)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">LOKASI / AREA</span>
                <span className="font-bold text-white">{trackingData.currentStatus.area || '-'}</span>
              </div>
            </div>
          </div>

          {/* 5. TRACKING PROGRESS BAR (4 EXPEDITION STAGES) */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <span>PROGRES PENGIRIMAN</span>
              </h3>
              {trackingData.currentStatus.isPending && (
                <span className="px-3 py-1 bg-amber-950 border border-amber-800 text-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>PENDING: {trackingData.currentStatus.pendingReasonTitle || 'Alasan Operasional'}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {trackingData.progressStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className={`p-4 rounded-xl border relative space-y-2 transition ${
                    stage.completed
                      ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                      : stage.active
                      ? stage.isPending
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                        : 'bg-sky-950/40 border-sky-800/80 text-sky-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                      TAHAP {idx + 1}
                    </span>
                    {stage.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : stage.active ? (
                      stage.isPending ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                      )
                    ) : (
                      <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </div>

                  <h4 className="text-xs font-black text-white">{stage.label}</h4>

                  {stage.isPending && (
                    <span className="text-[10px] font-mono text-amber-400 font-bold block">
                      ⚠ {stage.pendingReasonTitle}
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-slate-400 block pt-1 border-t border-slate-800/60">
                    {stage.timestamp ? formatWibDate(stage.timestamp) : 'Menunggu Operasional'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. RIWAYAT PERJALANAN (VERTICAL TIMELINE WITH POD PHOTO PREVIEW) */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>RIWAYAT PERJALANAN (TIMELINE)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {trackingData.timeline.length} Aktivitas Terdaftar
              </span>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-800 space-y-8">
              {trackingData.timeline.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot Icon */}
                  <div
                    className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${
                      item.type === 'SUCCESS'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                        : item.type === 'PENDING'
                        ? 'bg-amber-950 border-amber-500 text-amber-400'
                        : item.type === 'SCHEDULED'
                        ? 'bg-sky-950 border-sky-500 text-sky-400'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    {item.type === 'SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : item.type === 'PENDING' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : item.type === 'SCHEDULED' ? (
                      <Calendar className="w-3.5 h-3.5" />
                    ) : (
                      <Truck className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="space-y-1 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        {item.title}
                      </h4>
                      <span className="text-[11px] font-mono text-sky-400 font-semibold">
                        {formatWibDate(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                    {item.driverName && (
                      <span className="text-[11px] font-mono text-slate-400 block pt-1">
                        Driver Operasional: <strong className="text-white">{item.driverName}</strong>
                      </span>
                    )}

                    {item.pendingReasonTitle && (
                      <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-200 text-xs font-mono font-semibold mt-2">
                        Alasan Pending: {item.pendingReasonTitle}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic font-mono pt-1">Catatan: {item.notes}</p>
                    )}

                    {/* FOTO POD / BUKTI TANDA TERIMA (IF SUCCESS EVENT WITH PROOF) */}
                    {item.type === 'SUCCESS' && trackingData.proof && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Camera className="w-4 h-4" />
                            <span>FOTO BUKTI TANDA TERIMA (POD)</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-300">
                            Diterima oleh: <strong className="text-white">{trackingData.proof.actualRecipientName}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleOpenPodModal(trackingData.proof!.deliveryId)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Lihat Foto POD</span>
                          </button>

                          <span className="text-[11px] text-slate-400 font-mono">
                            Waktu Serah Terima: {formatWibDate(trackingData.proof.receivedAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POD LIGHTBOX MODAL */}
      {isPodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>FOTO BUKTI TANDA TERIMA (POD)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPod && (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-300">Mengambil foto POD terenkripsi dari Cloudflare R2...</p>
              </div>
            )}

            {podError && !loadingPod && (
              <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{podError}</span>
              </div>
            )}

            {podSignedUrl && !loadingPod && (
              <div className="space-y-4">
                <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={podSignedUrl}
                    alt="Bukti TTD POD"
                    className="w-full h-full object-contain"
                  />
                </div>

                {trackingData?.proof && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Nama Penerima Aktual:</span>
                      <span className="font-bold text-white text-sm">{trackingData.proof.actualRecipientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Waktu Serah Terima:</span>
                      <span className="font-bold text-emerald-400">{formatWibDate(trackingData.proof.receivedAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
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
