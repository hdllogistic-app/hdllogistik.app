'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Upload,
  Eye,
  History,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react';
import { PaymentListItemDTO } from '@/modules/payment/services/payment.service';

interface TimelineAdjustment {
  id: string;
  createdAt: string;
  correctedByName: string;
  correctedByRole: string;
  previousDeliveryMethod: string | null;
  newDeliveryMethod: string | null;
  previousShippingFee: number | null;
  newShippingFee: number | null;
  previousCodAmount: number | null;
  newCodAmount: number | null;
  settlementMethod: string | null;
  transferProofObjectKey: string | null;
  reason: string;
}

interface TimelineTransaction {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  receivedByName: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
}

interface HistoryData {
  manifest: {
    id: string;
    resiNumber: string;
    billingMode: string;
    initialDeliveryMethod: string;
    initialShippingFee: number;
    initialCodAmount: number;
  };
  adjustments: TimelineAdjustment[];
  transactions: TimelineTransaction[];
}

export function PaymentView() {
  const getTodayStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return jkt.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [settlementFilter, setSettlementFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [items, setItems] = useState<PaymentListItemDTO[]>([]);
  const [summary, setSummary] = useState({
    totalResi: 0,
    unadjustedCount: 0,
    adjustedCount: 0,
    totalSettledRevenue: 0,
    cashRevenue: 0,
    transferRevenue: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalResi: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dropdown Action Menu State
  const [activeMenuResiId, setActiveMenuResiId] = useState<string | null>(null);

  // Modal State: Adjustment / Edit Adjustment
  const [isAdjModalOpen, setIsAdjModalOpen] = useState<boolean>(false);
  const [targetItem, setTargetItem] = useState<PaymentListItemDTO | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Form Fields
  const [formService, setFormService] = useState<'DFOD' | 'COD'>('DFOD');
  const [formShippingFee, setFormShippingFee] = useState<string>('');
  const [formCodAmount, setFormCodAmount] = useState<string>('');
  const [formSettlementMethod, setFormSettlementMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [formReason, setFormReason] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // History Timeline Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Proof View Signed URL Modal
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState<boolean>(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (statusFilter !== 'ALL') params.set('statusFilter', statusFilter);
    if (serviceFilter !== 'ALL') params.set('serviceFilter', serviceFilter);
    if (settlementFilter !== 'ALL') params.set('settlementFilter', settlementFilter);
    if (searchQuery.trim()) params.set('searchQuery', searchQuery.trim());
    params.set('page', String(currentPage));

    try {
      const res = await fetch(`/api/finance/payment?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setItems(data.items || []);
        setSummary(
          data.summary || {
            totalResi: 0,
            unadjustedCount: 0,
            adjustedCount: 0,
            totalSettledRevenue: 0,
            cashRevenue: 0,
            transferRevenue: 0,
          }
        );
        setPagination(
          data.pagination || {
            page: 1,
            limit: 25,
            totalResi: 0,
            totalPages: 1,
          }
        );
      } else {
        setErrorMessage(data.error || 'Gagal memuat data payment resi.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, serviceFilter, settlementFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenAdjustmentModal = (item: PaymentListItemDTO, edit: boolean = false) => {
    setTargetItem(item);
    setIsEditMode(edit);

    if (edit) {
      setFormService(item.paymentDeliveryMethod === 'COD' ? 'COD' : 'DFOD');
      setFormShippingFee(String(item.shippingFee));
      setFormCodAmount(String(item.codAmount));
      setFormSettlementMethod(
        item.latestSettlementMethod === 'TRANSFER' ? 'TRANSFER' : 'CASH'
      );
      setFormReason('Koreksi adjustment pembayaran');
    } else {
      setFormService(item.paymentDeliveryMethod === 'COD' ? 'COD' : 'DFOD');
      setFormShippingFee(String(item.shippingFee));
      setFormCodAmount(String(item.codAmount));
      setFormSettlementMethod('CASH');
      setFormReason('Adjustment pembayaran awal');
    }

    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsAdjModalOpen(true);
    setActiveMenuResiId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file melebihi batas 5 MB.');
      return;
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;

    const fee = parseFloat(formShippingFee);
    if (isNaN(fee) || fee < 0) {
      setErrorMessage('Revisi ongkir harus berupa angka valid >= 0.');
      return;
    }

    const cod = formService === 'COD' ? parseFloat(formCodAmount) : 0;
    if (formService === 'COD' && (isNaN(cod) || cod < 0)) {
      setErrorMessage('Nominal COD harus berupa angka valid >= 0.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    if (isEditMode) {
      formData.append('adjustmentId', targetItem.latestAdjustmentId || '');
    } else {
      formData.append('manifestId', targetItem.manifestId);
    }
    formData.append('newPaymentDeliveryMethod', formService);
    formData.append('newShippingFee', String(fee));
    formData.append('newCodAmount', String(cod));
    formData.append('settlementMethod', formSettlementMethod);
    formData.append('reason', formReason.trim() || 'Adjustment pembayaran');

    if (selectedFile) {
      formData.append('proofFile', selectedFile);
    }

    try {
      const endpoint = isEditMode
        ? `/api/finance/payment/${targetItem.latestAdjustmentId}`
        : '/api/finance/payment';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setIsAdjModalOpen(false);
        fetchPayments();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan adjustment pembayaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (manifestId: string) => {
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryData(null);
    setActiveMenuResiId(null);

    try {
      const res = await fetch(`/api/finance/payment/${manifestId}/history`);
      const data = await res.json();

      if (data.success) {
        setHistoryData(data);
      } else {
        setErrorMessage(data.error || 'Gagal memuat riwayat adjustment.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewProof = async (adjId: string) => {
    setLoadingProof(true);
    setViewingProofUrl(null);
    try {
      const res = await fetch(`/api/finance/payment/proof/${adjId}`);
      const data = await res.json();

      if (data.success && data.url) {
        setViewingProofUrl(data.url);
      } else if (data.isR2Missing) {
        alert('R2 PRODUCTION CONFIGURATION REQUIRED: Infrastruktur Cloudflare R2 belum dikonfigurasi di environment server.');
      } else {
        alert(data.error || 'Bukti transfer tidak dapat dimuat.');
      }
    } catch {
      alert('Gagal mengambil presigned URL bukti transfer.');
    } finally {
      setLoadingProof(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-sky-400" />
            <span>Payment & Settlement Resi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola adjustment dan settlement pembayaran setiap resi.
          </p>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Resi Periode</div>
            <div className="text-lg font-bold font-mono text-white">
              {summary.totalResi} Resi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Belum Adjustment</div>
            <div className="text-lg font-bold font-mono text-amber-300">
              {summary.unadjustedCount} Resi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Success Adjustment</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {summary.adjustedCount} Resi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Omzet Tersettlement</div>
            <div className="text-lg font-bold font-mono text-indigo-300">
              Rp {summary.totalSettledRevenue.toLocaleString('id-ID')}
            </div>
            <div className="text-[9px] font-mono text-slate-400 space-x-2 pt-0.5">
              <span>CASH: Rp {summary.cashRevenue.toLocaleString('id-ID')}</span>
              <span>TRF: Rp {summary.transferRevenue.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Awal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status Adjustment</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNADJUSTED">Belum Adjustment</option>
            <option value="SUCCESS_ADJUSTMENT">Success Adjustment</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Layanan Service</label>
          <select
            value={serviceFilter}
            onChange={(e) => { setServiceFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">Semua Layanan</option>
            <option value="DFOD">DFOD</option>
            <option value="COD">COD</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Settlement Payment</label>
          <select
            value={settlementFilter}
            onChange={(e) => { setSettlementFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">Semua Settlement</option>
            <option value="CASH">CASH</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Cari Resi / Nama</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Cari resi / pengirim..."
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Payment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span>Memuat data payment resi...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Belum ada data payment pada periode ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Nomor Resi</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Pengirim / Penerima</th>
                  <th className="p-4">Area</th>
                  <th className="p-4 text-center">Layanan</th>
                  <th className="p-4 text-right">Ongkir (Revenue)</th>
                  <th className="p-4 text-right">Tagihan Total</th>
                  <th className="p-4 text-center">Status Payment</th>
                  <th className="p-4 text-center">Settlement</th>
                  <th className="p-4 text-center">Adjustment</th>
                  <th className="p-4 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {items.map((i) => (
                  <tr key={i.manifestId} className="hover:bg-slate-800/40 transition relative">
                    <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {i.resiNumber}
                    </td>

                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{i.date}</td>

                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-white truncate">{i.senderName}</div>
                      <div className="text-[10px] text-slate-400 truncate">ke {i.recipientName}</div>
                    </td>

                    <td className="p-4 text-slate-300 max-w-[120px] truncate">{i.area}</td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded text-[10px] font-bold">
                        {i.paymentDeliveryMethod}
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      Rp {i.shippingFee.toLocaleString('id-ID')}
                    </td>

                    <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      Rp {i.totalRecipientBill.toLocaleString('id-ID')}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                        {i.paymentStatus}
                      </span>
                    </td>

                    <td className="p-4 text-center font-mono font-bold whitespace-nowrap">
                      {i.latestSettlementMethod ? (
                        <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[10px]">
                          {i.latestSettlementMethod}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      {i.adjustmentStatus === 'SUCCESS_ADJUSTMENT' ? (
                        <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SUCCESS ADJUSTMENT</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">
                          BELUM ADJUSTMENT
                        </span>
                      )}
                    </td>

                    {/* Action Dropdown Menu */}
                    <td className="p-4 text-center relative whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() =>
                            setActiveMenuResiId(
                              activeMenuResiId === i.manifestId ? null : i.manifestId
                            )
                          }
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuResiId === i.manifestId && (
                          <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-40 py-1.5 text-xs text-left">
                            {i.adjustmentStatus === 'UNADJUSTED' ? (
                              <button
                                onClick={() => handleOpenAdjustmentModal(i, false)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-900 text-emerald-400 font-bold flex items-center gap-2"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>Adjustment</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenHistoryModal(i.manifestId)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-900 text-sky-400 font-semibold flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Lihat History Adjustment</span>
                                </button>
                                <button
                                  onClick={() => handleOpenAdjustmentModal(i, true)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-900 text-amber-400 font-semibold flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Edit Adjustment</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Database Pagination */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Menampilkan Halaman <strong className="text-white">{pagination.page}</strong> dari{' '}
            <strong className="text-white">{pagination.totalPages}</strong> (Total {pagination.totalResi} Resi)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 disabled:opacity-30"
            >
              Sebelumnya
            </button>

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 disabled:opacity-30"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {isAdjModalOpen && targetItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>{isEditMode ? 'EDIT ADJUSTMENT PAYMENT' : 'ADJUSTMENT PAYMENT'}</span>
              </h3>
              <button onClick={() => setIsAdjModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Current Resi Details */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Resi:</span>
                <span className="font-mono font-bold text-sky-400">{targetItem.resiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pengirim / Penerima:</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {targetItem.senderName} → {targetItem.recipientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Area & Berat:</span>
                <span>{targetItem.area} ({targetItem.weightKg} kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Layanan & Status Saat Ini:</span>
                <span className="font-bold text-amber-300">
                  {targetItem.paymentDeliveryMethod} ({targetItem.paymentStatus})
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
              {/* Service Method Selection */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Metode Layanan *</label>
                <select
                  value={formService}
                  onChange={(e) => setFormService(e.target.value as 'DFOD' | 'COD')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="DFOD">DFOD (Delivery Fee on Delivery)</option>
                  <option value="COD">COD (Cash on Delivery)</option>
                </select>
              </div>

              {/* Revised Shipping Fee */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Revisi Ongkir (HDL Logistik Revenue) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formShippingFee}
                  onChange={(e) => setFormShippingFee(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              {/* COD Amount (If Service = COD) */}
              {formService === 'COD' && (
                <div>
                  <label className="block font-semibold text-amber-400 mb-1">
                    Nominal COD Barang (Titipan Pengirim - Bukan Revenue) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCodAmount}
                    onChange={(e) => setFormCodAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-mono font-bold text-sm"
                  />
                </div>
              )}

              {/* Settlement Payment Method */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Metode Pembayaran Settlement *
                </label>
                <select
                  value={formSettlementMethod}
                  onChange={(e) => setFormSettlementMethod(e.target.value as 'CASH' | 'TRANSFER')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="CASH">CASH (Tunai)</option>
                  <option value="TRANSFER">TRANSFER (Rekening Bank)</option>
                </select>
              </div>

              {/* Transfer Proof Upload (If TRANSFER) */}
              {formSettlementMethod === 'TRANSFER' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Bukti Transfer (Screenshot/Foto) - OPTIONAL
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700"
                  />
                  {filePreviewUrl && (
                    <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreviewUrl}
                        alt="Preview Bukti"
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {selectedFile?.name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alasan / Catatan *</label>
                <input
                  type="text"
                  required
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>{isEditMode ? 'Simpan Koreksi' : 'Simpan Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Timeline Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                <span>Riwayat Timeline Adjustment</span>
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span>Memuat riwayat adjustment...</span>
              </div>
            ) : historyData ? (
              <div className="space-y-4 text-xs">
                {/* Initial Resi State */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-slate-300">
                  <div className="text-[10px] uppercase font-bold text-sky-400">
                    Awal Pembuatan Resi ({historyData.manifest.resiNumber})
                  </div>
                  <div>Metode Layanan: {historyData.manifest.initialDeliveryMethod}</div>
                  <div>Ongkir Awal: Rp {historyData.manifest.initialShippingFee.toLocaleString('id-ID')}</div>
                </div>

                {/* Adjustments Timeline */}
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {historyData.adjustments.map((a, idx) => (
                    <div key={a.id} className="relative pl-8 space-y-1">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                          <span>
                            Adjustment #{idx + 1} oleh {a.correctedByName} ({a.correctedByRole})
                          </span>
                          <span>{new Date(a.createdAt).toLocaleString('id-ID')}</span>
                        </div>

                        <div className="space-y-0.5 font-mono">
                          <div>
                            Layanan: <span className="text-slate-400">{a.previousDeliveryMethod}</span>{' '}
                            → <strong className="text-emerald-400">{a.newDeliveryMethod}</strong>
                          </div>
                          <div>
                            Ongkir: Rp {a.previousShippingFee?.toLocaleString('id-ID')} →{' '}
                            <strong className="text-emerald-400">
                              Rp {a.newShippingFee?.toLocaleString('id-ID')}
                            </strong>
                          </div>
                          <div>Settlement: {a.settlementMethod}</div>
                          <div className="text-slate-400">Catatan: {a.reason}</div>
                        </div>

                        {a.transferProofObjectKey && (
                          <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-mono">Bukti Transfer (R2 Object Key)</span>
                            <button
                              onClick={() => handleViewProof(a.id)}
                              className="px-2.5 py-1 bg-sky-950 text-sky-400 border border-sky-800 rounded-lg text-[10px] font-bold hover:bg-sky-900 flex items-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat Bukti</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transactions Status */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Status Transaksi Keuangan Ledger
                  </div>
                  {historyData.transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center font-mono text-[11px]">
                      <div>
                        Rp {t.amount.toLocaleString('id-ID')} ({t.method})
                      </div>
                      <div>
                        {t.status === 'POSTED' ? (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                            POSTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-bold">
                            VOID ({t.voidReason || 'Koreksi'})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Viewing Modal */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Bukti Transfer (Presigned Private R2 URL)</span>
              </h3>
              <button onClick={() => setViewingProofUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingProofUrl}
              alt="Bukti Transfer R2"
              className="max-h-[400px] mx-auto rounded-xl border border-slate-800 object-contain"
            />

            <div className="pt-2">
              <button
                onClick={() => setViewingProofUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
