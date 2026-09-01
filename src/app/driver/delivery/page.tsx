'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, MapPin, ChevronRight, Loader2, Navigation, AlertCircle } from 'lucide-react';

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
  assignedAt: string;
  hasProof: boolean;
}

export default function DriverDeliveryListPage() {
  const [deliveries, setDeliveries] = useState<DriverDeliveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeliveries() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/driver/deliveries');
        const data = await res.json();
        if (data.success) {
          setDeliveries(data.deliveries || []);
        } else {
          setError(data.error || 'Gagal memuat pengiriman.');
        }
      } catch {
        setError('Terjadi kesalahan koneksi.');
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            <span>Pengiriman Hari Ini</span>
          </h1>
          <p className="text-xs text-slate-400">Daftar resi tugas pengiriman Anda</p>
        </div>
        <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-mono font-bold text-sky-400">
          {deliveries.length} Paket
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span>Memuat tugas pengiriman...</span>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs space-y-2 bg-slate-900 border border-slate-800 rounded-2xl">
          <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="font-semibold text-slate-400">Belum ada tugas pengiriman hari ini.</p>
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
                <span className="font-mono font-bold text-sky-400 text-sm">{item.resiNumber}</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : item.status === 'IN_DELIVERY'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  }`}
                >
                  {item.status === 'SUCCESS' ? 'SUDAH TTD' : item.status}
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

              {/* Cargo Badge */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span>Barang: <strong className="text-white">{item.itemName}</strong></span>
                <span>•</span>
                <span>{item.weightKg} kg</span>
                <span>•</span>
                <span>{item.koliCount} koli</span>
              </div>

              {/* Action Buttons */}
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
