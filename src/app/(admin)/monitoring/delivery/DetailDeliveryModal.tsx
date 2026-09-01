'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  Truck,
} from 'lucide-react';
import { DetailDeliveryItemDTO } from '@/modules/monitoring/services/delivery-monitoring.service';

interface DetailDeliveryModalProps {
  employeeId: string | null;
  employeeName: string | null;
  dateStr: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailDeliveryModal({
  employeeId,
  employeeName,
  dateStr,
  isOpen,
  onClose,
}: DetailDeliveryModalProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TTD' | 'PENDING'>('ALL');
  const [page, setPage] = useState<number>(1);

  const [deliveries, setDeliveries] = useState<DetailDeliveryItemDTO[]>([]);
  const [summary, setSummary] = useState({ totalDelivery: 0, totalTtd: 0, totalPending: 0 });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDetailData = useCallback(async () => {
    if (!employeeId || !isOpen) return;

    setLoading(true);
    setErrorMsg(null);

    const params = new URLSearchParams();
    params.set('date', dateStr);
    params.set('status', statusFilter);
    params.set('page', String(page));

    try {
      const res = await fetch(`/api/monitoring/delivery/${employeeId}?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setDeliveries(data.deliveries || []);
        setSummary(data.summary || { totalDelivery: 0, totalTtd: 0, totalPending: 0 });
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setErrorMsg(data.error || 'Gagal memuat detail delivery.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, dateStr, statusFilter, page, isOpen]);

  useEffect(() => {
    fetchDetailData();
  }, [fetchDetailData]);

  if (!isOpen || !employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              <span>Detail Delivery — {employeeName}</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Tanggal: {new Date(`${dateStr}T00:00:00+07:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Badges & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 bg-slate-900 text-slate-300 rounded-lg border border-slate-800 font-bold">
              Total: {summary.totalDelivery}
            </span>
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60 font-bold">
              TTD: {summary.totalTtd}
            </span>
            <span className="px-2.5 py-1 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/60 font-bold">
              Pending: {summary.totalPending}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition ${statusFilter === 'ALL' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Semua
            </button>
            <button
              onClick={() => { setStatusFilter('TTD'); setPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition ${statusFilter === 'TTD' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              TTD
            </button>
            <button
              onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
              className={`px-3 py-1 rounded-lg font-bold transition ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Pending
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Detail Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
              <span>Memuat detail data delivery...</span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <Package className="w-8 h-8 mx-auto text-slate-600 mb-1" />
              <p className="font-semibold text-slate-400">Tidak ada data delivery.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">No. Resi</th>
                    <th className="p-3">Penerima & Alamat</th>
                    <th className="p-3">Area Tujuan</th>
                    <th className="p-3">Status Delivery</th>
                    <th className="p-3">Status TTD</th>
                    <th className="p-3">Waktu TTD</th>
                    <th className="p-3">Armada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {deliveries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/60 transition">
                      <td className="p-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                        <a
                          href={`/manifest/print/${item.manifestId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{item.resiNumber}</span>
                          <ExternalLink className="w-3 h-3 text-sky-500" />
                        </a>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-white">{item.recipientName}</div>
                        <div className="text-[10px] text-slate-400 max-w-[200px] truncate">
                          {item.recipientAddress}
                        </div>
                      </td>

                      <td className="p-3 font-bold text-sky-300 uppercase text-[11px]">
                        {item.recipientProvinceArea}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                          {item.deliveryStatus}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {item.ttdStatus === 'TTD' ? (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>TTD</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/60 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {item.ttdReceivedAt
                          ? new Date(item.ttdReceivedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) + ' WIB'
                          : '-'}
                      </td>

                      <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {item.vehiclePlate || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition disabled:opacity-40 flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
