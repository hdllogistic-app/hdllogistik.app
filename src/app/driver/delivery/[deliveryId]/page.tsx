'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Navigation, Package, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface DeliveryDetailData {
  id: string;
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
  proof: {
    actualRecipientName: string;
    receivedAt: string;
    photoUrl: string;
    signatureUrl: string | null;
    notes: string | null;
  } | null;
}

export default function DriverDeliveryDetailPage() {
  const params = useParams();
  const deliveryId = params?.deliveryId as string;

  const [detail, setDetail] = useState<DeliveryDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      if (!deliveryId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/driver/deliveries/${deliveryId}`);
        const data = await res.json();
        if (data.success) {
          setDetail(data.delivery);
        } else {
          setError(data.error || 'Gagal memuat detail delivery.');
        }
      } catch {
        setError('Terjadi kesalahan koneksi.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [deliveryId]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/driver/delivery"
          className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-white">Detail Pengiriman</h1>
          <p className="text-[11px] text-slate-400 font-mono">ID: {deliveryId}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span>Memuat detail pengiriman...</span>
        </div>
      ) : !detail ? (
        <div className="p-12 text-center text-slate-500 text-xs">Data tidak ditemukan.</div>
      ) : (
        <div className="space-y-4">
          {/* Card 1: Resi & Status */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">Nomor Resi:</span>
              <span className="font-mono font-black text-sky-400 text-base">{detail.resiNumber}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-xs text-slate-400 font-bold">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  detail.status === 'SUCCESS'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                }`}
              >
                {detail.status === 'SUCCESS' ? 'SUDAH TTD (SELESAI)' : detail.status}
              </span>
            </div>
          </div>

          {/* Card 2: Recipient Details */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Data Penerima</h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Nama Penerima:</span>
                <span className="font-bold text-white text-sm">{detail.recipientName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Nomor Telepon:</span>
                <a
                  href={`tel:${detail.recipientPhone}`}
                  className="font-mono text-sky-400 font-bold flex items-center gap-1.5 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{detail.recipientPhone}</span>
                </a>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Alamat & Area:</span>
                <div className="text-slate-200 flex items-start gap-1.5 mt-0.5 leading-relaxed">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    {detail.recipientAddress} ({detail.recipientArea})
                  </span>
                </div>
              </div>

              {detail.shareLocationUrl && (
                <div className="pt-2">
                  <a
                    href={detail.shareLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Petunjuk Lokasi (Google Maps)</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Cargo Details */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              <span>Detail Barang & Muatan</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Nama Barang</span>
                <span className="font-bold text-white">{detail.itemName}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Berat Total</span>
                <span className="font-bold text-sky-400 font-mono">{detail.weightKg} kg</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Jumlah Koli</span>
                <span className="font-bold text-sky-400 font-mono">{detail.koliCount} koli</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Catatan Resi</span>
                <span className="font-medium text-slate-300">{detail.notes || '-'}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Delivery Proof if exists */}
          {detail.proof && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-2 text-xs">
              <h3 className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Bukti Pengiriman (TTD)</span>
              </h3>
              <div className="text-slate-300 font-mono text-[11px] space-y-1">
                <div>Penerima: <strong className="text-white">{detail.proof.actualRecipientName}</strong></div>
                <div>Waktu: {detail.proof.receivedAt}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
