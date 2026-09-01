'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  X,
  UserCheck,
  ExternalLink,
  ShieldAlert,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';
import {
  formatWhatsAppUrl,
  sanitizeLocationUrl,
} from '@/modules/delivery/utils/delivery-utils';

interface DeliveryEventItem {
  id: string;
  status: string;
  notes: string | null;
  timestamp: string;
}

interface DeliveryDetailDTO {
  id: string;
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
  notes: string | null;
  status: string;
  pendingReason: string | null;
  pendingReasonTitle: string | null;
  pendingNotes: string | null;
  pendingAt: string | null;
  proof: {
    actualRecipientName: string;
    receivedAt: string;
    photoUrl: string;
    signatureUrl: string | null;
    notes: string | null;
  } | null;
  events?: DeliveryEventItem[];
}

export default function DriverDeliveryDetailPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>;
}) {
  const resolvedParams = use(params);
  const deliveryId = resolvedParams.deliveryId;
  const router = useRouter();

  const [delivery, setDelivery] = useState<DeliveryDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // TTD Modal State
  const [isTtdModalOpen, setIsTtdModalOpen] = useState<boolean>(false);
  const [actualRecipientName, setActualRecipientName] = useState<string>('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingTtd, setSubmittingTtd] = useState<boolean>(false);
  const [ttdModalError, setTtdModalError] = useState<string | null>(null);

  // Pending Modal State
  const [isPendingModalOpen, setIsPendingModalOpen] = useState<boolean>(false);
  const [pendingReasonCode, setPendingReasonCode] = useState<string>('RESCHEDULE');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [submittingPending, setSubmittingPending] = useState<boolean>(false);
  const [pendingModalError, setPendingModalError] = useState<string | null>(null);

  // General Notification State
  const [successBannerMessage, setSuccessBannerMessage] = useState<string | null>(null);

  const fetchDeliveryDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/driver/deliveries/${deliveryId}`);
      const data = await res.json();

      if (data.success && data.delivery) {
        setDelivery(data.delivery);
        if (data.delivery.recipientName) {
          setActualRecipientName(data.delivery.recipientName);
        }
      } else {
        setError(data.error || 'Gagal memuat detail pengiriman.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat memuat detail pengiriman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryDetail();
  }, [deliveryId]);

  // Handle Photo Select for TTD
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setTtdModalError('Ukuran foto terlalu besar. Maksimum ukuran file adalah 5 MB.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setTtdModalError('Format file tidak didukung. Pilih foto gambar JPEG, PNG, atau WEBP.');
      return;
    }

    setTtdModalError(null);
    setSelectedPhotoFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenTtdModal = () => {
    setTtdModalError(null);
    setSuccessBannerMessage(null);
    if (delivery?.recipientName) {
      setActualRecipientName(delivery.recipientName);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsTtdModalOpen(true);
  };

  const handleOpenPendingModal = () => {
    setPendingModalError(null);
    setSuccessBannerMessage(null);
    setPendingReasonCode('RESCHEDULE');
    setCustomReasonText('');
    setIsPendingModalOpen(true);
  };

  const handleProcessTtdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;

    const recipientClean = actualRecipientName.trim();
    if (!recipientClean) {
      setTtdModalError('Nama Penerima Aktual wajib diisi.');
      return;
    }
    if (!selectedPhotoFile) {
      setTtdModalError('Foto Bukti Tanda Terima wajib diambil.');
      return;
    }

    setSubmittingTtd(true);
    setTtdModalError(null);

    try {
      const formData = new FormData();
      formData.append('actualRecipientName', recipientClean);
      formData.append('photo', selectedPhotoFile);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            formData.append('latitude', position.coords.latitude.toString());
            formData.append('longitude', position.coords.longitude.toString());
            await submitTtdFormData(formData);
          },
          async () => {
            await submitTtdFormData(formData);
          },
          { timeout: 5000 }
        );
      } else {
        await submitTtdFormData(formData);
      }
    } catch {
      setTtdModalError('Terjadi kesalahan koneksi saat memproses tanda terima.');
      setSubmittingTtd(false);
    }
  };

  const submitTtdFormData = async (formData: FormData) => {
    try {
      const res = await fetch(`/api/driver/deliveries/${deliveryId}/ttd`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSuccessBannerMessage(data.message || 'Tanda Terima Berhasil Diproses!');
        setIsTtdModalOpen(false);
        fetchDeliveryDetail();
      } else {
        if (data.r2Unconfigured) {
          setTtdModalError(`DELIVERY PROOF R2 CONFIGURATION REQUIRED: ${data.error}`);
        } else {
          setTtdModalError(data.error || 'Gagal memproses tanda terima.');
        }
      }
    } catch {
      setTtdModalError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmittingTtd(false);
    }
  };

  const handleProcessPendingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;

    if (pendingReasonCode === 'OTHER' && !customReasonText.trim()) {
      setPendingModalError('Alasan Lainnya wajib diisi.');
      return;
    }

    setSubmittingPending(true);
    setPendingModalError(null);

    try {
      const res = await fetch(`/api/driver/deliveries/${deliveryId}/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonCode: pendingReasonCode,
          customReasonText: customReasonText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessBannerMessage(data.message || 'Delivery Pending Berhasil Dicatat!');
        setIsPendingModalOpen(false);
        fetchDeliveryDetail();
      } else {
        setPendingModalError(data.error || 'Gagal memproses delivery pending.');
      }
    } catch {
      setPendingModalError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmittingPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
        <span className="text-xs text-slate-400 font-mono">Memuat detail pengiriman...</span>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 space-y-4">
        <Link
          href="/driver/delivery"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Tugas</span>
        </Link>

        <div className="p-6 bg-red-950/60 border border-red-800/60 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
          <h2 className="text-sm font-bold text-red-200">Gagal Memuat Pengiriman</h2>
          <p className="text-xs text-red-300">{error || 'Data tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  const waUrl = formatWhatsAppUrl(delivery.recipientPhone, delivery.resiNumber);
  const safeLocUrl = sanitizeLocationUrl(delivery.shareLocationUrl);
  const isEligibleForActions = delivery.status !== 'SUCCESS' && delivery.status !== 'CANCELLED';

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={() => router.push('/driver/delivery')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Daftar Tugas</span>
        </button>

        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
            delivery.status === 'SUCCESS'
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
              : delivery.status === 'PENDING'
              ? 'bg-amber-950 text-amber-300 border-amber-800/60'
              : 'bg-sky-950 text-sky-400 border-sky-800/60'
          }`}
        >
          {delivery.status === 'SUCCESS'
            ? 'SUDAH TTD (SUCCESS)'
            : delivery.status === 'PENDING'
            ? 'PENDING'
            : 'SIAP DIANTAR'}
        </span>
      </div>

      {/* Resi Info Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">
            NOMOR RESI
          </span>
        </div>
        <h1 className="text-xl font-black text-white font-mono tracking-wider">
          {delivery.resiNumber}
        </h1>
      </div>

      {/* Success Notification Banner */}
      {successBannerMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Berhasil!</span>
            <span>{successBannerMessage}</span>
          </div>
        </div>
      )}

      {/* PENDING SUMMARY CARD (If Status PENDING) */}
      {delivery.status === 'PENDING' && delivery.pendingReasonTitle && (
        <div className="p-4 bg-amber-950/50 border border-amber-800/70 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>STATUS CURRENT: PENDING</span>
          </div>
          <div className="text-xs space-y-1 font-mono text-amber-200">
            <div>
              Alasan: <strong className="text-white">{delivery.pendingReasonTitle}</strong>
            </div>
            {delivery.pendingNotes && (
              <div>
                Catatan: <span className="text-slate-300">{delivery.pendingNotes}</span>
              </div>
            )}
            {delivery.pendingAt && (
              <div className="text-[10px] text-amber-400/80">
                Dicatat: {new Date(delivery.pendingAt).toLocaleString('id-ID')} WIB
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: DATA PENERIMA & QUICK ACTIONS */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          DATA PENERIMA
        </h2>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Nama Tujuan</span>
          <span className="text-base font-bold text-white block">{delivery.recipientName}</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Telepon</span>
          <div className="flex items-center gap-2 text-sm font-mono text-slate-200">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>{delivery.recipientPhone || '-'}</span>
          </div>
        </div>

        {/* Quick Action Row */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <button
              disabled
              className="h-11 bg-slate-950 text-slate-600 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp (Tidak Ada)</span>
            </button>
          )}

          {safeLocUrl ? (
            <a
              href={safeLocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 bg-sky-950/80 hover:bg-sky-900 text-sky-400 border border-sky-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
            >
              <MapPin className="w-4 h-4" />
              <span>Buka Lokasi</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          ) : (
            <button
              disabled
              className="h-11 bg-slate-950 text-slate-600 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <MapPin className="w-4 h-4" />
              <span>Lokasi (Tidak Ada)</span>
            </button>
          )}
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">
            Alamat & Area Pengiriman
          </span>
          <p className="text-xs text-slate-200 leading-relaxed font-semibold">
            {delivery.recipientAddress}
          </p>
          <span className="text-[11px] font-mono font-bold text-sky-400 block pt-0.5">
            Area: {delivery.recipientArea}
          </span>
        </div>
      </div>

      {/* SECTION 2: DATA BARANG */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          DETAIL BARANG
        </h2>

        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 col-span-3">
            <span className="text-[10px] text-slate-500 font-sans block font-semibold">Nama Barang</span>
            <span className="font-bold text-white">{delivery.itemName}</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-sans block font-semibold">Berat</span>
            <span className="font-bold text-emerald-400">{delivery.weightKg} Kg</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-sans block font-semibold">Jumlah</span>
            <span className="font-bold text-sky-400">{delivery.koliCount} Koli</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-sans block font-semibold">Catatan</span>
            <span className="text-[11px] text-slate-300">{delivery.notes || '-'}</span>
          </div>
        </div>
      </div>

      {/* PROOF RECORD CARD (If SUCCESS) */}
      {delivery.status === 'SUCCESS' && delivery.proof && (
        <div className="p-5 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-800/60 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-emerald-800/40 pb-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              INFORMASI TANDA TERIMA (SUDAH TTD)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Nama Penerima Aktual:</span>
              <span className="font-bold text-white text-sm">{delivery.proof.actualRecipientName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Waktu Serah Terima:</span>
              <span className="font-bold text-emerald-400">
                {new Date(delivery.proof.receivedAt).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RIWAYAT DELIVERY */}
      {delivery.events && delivery.events.length > 0 && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              RIWAYAT DELIVERY
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {delivery.events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    ev.status === 'SUCCESS'
                      ? 'bg-emerald-400'
                      : ev.status === 'PENDING'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-white">{ev.status}</span>
                    <span className="text-slate-500">
                      {new Date(ev.timestamp).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>
                  {ev.notes && <p className="text-[11px] text-slate-400 leading-normal">{ev.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BUTTONS */}
      <div className="pt-2">
        {isEligibleForActions ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleOpenTtdModal}
              className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ TANDA TERIMA</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPendingModal}
              className="py-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-600/30 transition flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>! PENDING</span>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center font-bold text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>✓ TANDA TERIMA SELESAI</span>
            </div>
            {delivery.proof && (
              <p className="text-[11px] font-mono text-slate-300">
                Diterima oleh: {delivery.proof.actualRecipientName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* MOBILE SHEET / MODAL 1: PROSES TANDA TERIMA */}
      {isTtdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>PROSES TANDA TERIMA</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTtdModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Resi:</span>
                <span className="font-bold text-emerald-400">{delivery.resiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tujuan:</span>
                <span className="font-bold text-white">{delivery.recipientName}</span>
              </div>
            </div>

            {ttdModalError && (
              <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{ttdModalError}</span>
              </div>
            )}

            <form onSubmit={handleProcessTtdSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nama Penerima Aktual *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={actualRecipientName}
                  onChange={(e) => setActualRecipientName(e.target.value)}
                  placeholder="Contoh: BUDI / SECURITY / IBU ANI"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">
                  Foto Bukti Tanda Terima * (Maks 5 MB)
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {photoPreviewUrl ? (
                  <div className="space-y-2 text-center">
                    <div className="relative w-full h-48 mx-auto border-2 border-emerald-500/80 rounded-xl overflow-hidden shadow-lg bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreviewUrl}
                        alt="Preview Bukti TTD"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs"
                      >
                        Ambil Ulang
                      </button>
                      <span className="px-3 py-1.5 bg-emerald-950 text-emerald-400 font-bold rounded-xl text-xs border border-emerald-800/60">
                        Foto Siap
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl bg-slate-950/60 flex flex-col items-center justify-center space-y-2 transition group"
                  >
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Ambil Foto Bukti Tanda Terima</span>
                    <span className="text-[10px] text-slate-400">
                      Gunakan kamera HP atau pilih foto penerima
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTtdModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTtd || !selectedPhotoFile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-40 flex items-center gap-2"
                >
                  {submittingTtd && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Proses Tanda Terima</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE SHEET / MODAL 2: DELIVERY PENDING */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>DELIVERY PENDING</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPendingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Resi:</span>
                <span className="font-bold text-amber-400">{delivery.resiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tujuan:</span>
                <span className="font-bold text-white">{delivery.recipientName}</span>
              </div>
            </div>

            {pendingModalError && (
              <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{pendingModalError}</span>
              </div>
            )}

            <form onSubmit={handleProcessPendingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Alasan Pending *
                </label>
                <select
                  value={pendingReasonCode}
                  onChange={(e) => setPendingReasonCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                >
                  <option value="RESCHEDULE">Reschedule</option>
                  <option value="RECIPIENT_UNREACHABLE">Penerima Tidak Bisa Dihubungi</option>
                  <option value="RECIPIENT_REQUEST_RETURN">Penerima Meminta Retur</option>
                  <option value="RECIPIENT_REJECTED">Penerima Menolak</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              {pendingReasonCode === 'OTHER' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Alasan Lainnya * (Maks 250 karakter)
                  </label>
                  <textarea
                    required
                    maxLength={250}
                    rows={3}
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Tuliskan alasan delivery pending..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPendingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPending}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-40 flex items-center gap-2"
                >
                  {submittingPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Pending</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
