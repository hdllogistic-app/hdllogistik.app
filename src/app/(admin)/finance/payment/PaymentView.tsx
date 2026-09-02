'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { getTodayJakartaStr } from '@/modules/manifest/utils/date-utils';

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

function formatDateIndo(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const mIdx = parseInt(m, 10) - 1;
  return `${d} ${months[mIdx] || m} ${y}`;
}

export function PaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayStr = getTodayJakartaStr();

  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || todayStr);
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || todayStr);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('statusFilter') || 'ALL');
  const [serviceFilter, setServiceFilter] = useState<string>(searchParams.get('serviceFilter') || 'ALL');
  const [settlementFilter, setSettlementFilter] = useState<string>(searchParams.get('settlementFilter') || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('searchQuery') || '');
  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);

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

  const updateQueryParams = (
    newStart: string,
    newEnd: string,
    newStatus: string,
    newService: string,
    newSettlement: string,
    newSearch: string,
    newPage: number
  ) => {
    const params = new URLSearchParams();
    if (newStart) params.set('startDate', newStart);
    if (newEnd) params.set('endDate', newEnd);
    if (newStatus !== 'ALL') params.set('statusFilter', newStatus);
    if (newService !== 'ALL') params.set('serviceFilter', newService);
    if (newSettlement !== 'ALL') params.set('settlementFilter', newSettlement);
    if (newSearch.trim()) params.set('searchQuery', newSearch.trim());
    if (newPage > 1) params.set('page', String(newPage));

    router.replace(`/finance/payment?${params.toString()}`);
  };

  const fetchPayments = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setErrorMessage('Tanggal awal tidak boleh melebihi tanggal akhir.');
      setItems([]);
      setSummary({
        totalResi: 0,
        unadjustedCount: 0,
        adjustedCount: 0,
        totalSettledRevenue: 0,
        cashRevenue: 0,
        transferRevenue: 0,
      });
      setPagination({
        page: 1,
        limit: 25,
        totalResi: 0,
        totalPages: 1,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
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
        setErrorMessage(data.error || 'Gagal mengambil data payment resi.');
        setItems([]);
        setSummary({
          totalResi: 0,
          unadjustedCount: 0,
          adjustedCount: 0,
          totalSettledRevenue: 0,
          cashRevenue: 0,
          transferRevenue: 0,
        });
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

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    setCurrentPage(1);
    updateQueryParams(val, endDate, statusFilter, serviceFilter, settlementFilter, searchQuery, 1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDate(val);
    setCurrentPage(1);
    updateQueryParams(startDate, val, statusFilter, serviceFilter, settlementFilter, searchQuery, 1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    setCurrentPage(1);
    updateQueryParams(startDate, endDate, val, serviceFilter, settlementFilter, searchQuery, 1);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setServiceFilter(val);
    setCurrentPage(1);
    updateQueryParams(startDate, endDate, statusFilter, val, settlementFilter, searchQuery, 1);
  };

  const handleSettlementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSettlementFilter(val);
    setCurrentPage(1);
    updateQueryParams(startDate, endDate, statusFilter, serviceFilter, val, searchQuery, 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);
    updateQueryParams(startDate, endDate, statusFilter, serviceFilter, settlementFilter, val, 1);
  };

  const handleOpenAdjustmentModal = (item: PaymentListItemDTO, isEdit: boolean) => {
    setActiveMenuResiId(null);
    setTargetItem(item);
    setIsEditMode(isEdit);
    setFormService(item.paymentDeliveryMethod === 'COD' ? 'COD' : 'DFOD');
    setFormShippingFee(String(item.shippingFee));
    setFormCodAmount(item.paymentDeliveryMethod === 'COD' ? String(item.codAmount) : '');
    setFormSettlementMethod(
      item.latestSettlementMethod === 'TRANSFER' ? 'TRANSFER' : 'CASH'
    );
    setFormReason('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsAdjModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;

    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('manifestId', targetItem.manifestId);
    formData.append('newPaymentDeliveryMethod', formService);
    formData.append('newShippingFee', formShippingFee);
    if (formService === 'COD') {
      formData.append('newCodAmount', formCodAmount);
    }
    formData.append('settlementMethod', formSettlementMethod);
    formData.append('reason', formReason);
    if (selectedFile) {
      formData.append('proofFile', selectedFile);
    }

    try {
      const url = isEditMode
        ? `/api/finance/payment/adjustments/${targetItem.latestAdjustmentId}`
        : '/api/finance/payment';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setIsAdjModalOpen(false);
        fetchPayments();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan adjustment.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (manifestId: string) => {
    setActiveMenuResiId(null);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryData(null);

    try {
      const res = await fetch(`/api/finance/payment/manifests/${manifestId}/history`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data);
      } else {
        setErrorMessage(data.error || 'Gagal memuat history adjustment.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewProof = async (adjId: string) => {
    setLoadingProof(true);
    try {
      const res = await fetch(`/api/finance/payment/adjustments/${adjId}/proof`);
      const data = await res.json();
      if (data.success && data.signedUrl) {
        setViewingProofUrl(data.signedUrl);
      } else {
        alert(data.error || 'Bukti transfer tidak dapat ditampilkan.');
      }
    } catch {
      alert('Gagal mengambil bukti transfer.');
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
            onChange={handleStartDateChange}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status Adjustment</label>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
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
            onChange={handleServiceChange}
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
            onChange={handleSettlementChange}
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
            onChange={handleSearchChange}
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
            <p className="font-semibold text-slate-400">
              {startDate === endDate
                ? `Belum ada resi Payment pada periode ${formatDateIndo(startDate)}.`
                : `Belum ada resi Payment pada periode ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}.`}
            </p>
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
                  <th className="p-4 text-center">Service</th>
                  <th className="p-4 text-right">Ongkir</th>
                  <th className="p-4 text-right">Bill Penerima</th>
                  <th className="p-4 text-center">Status Pay</th>
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
      </div>

      {/* Adjustment Form Modal */}
      {isAdjModalOpen && targetItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>{isEditMode ? 'Edit Adjustment Payment' : 'Form Adjustment Payment'}</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Resi: <strong className="text-sky-400 font-mono">{targetItem.resiNumber}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAdjModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Metode Delivery Service</label>
                <select
                  value={formService}
                  onChange={(e) => setFormService(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="DFOD">DFOD (Ongkir dibayar Penerima)</option>
                  <option value="COD">COD (Ongkir + Barang dibayar Penerima)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nominal Ongkir (Rp)</label>
                  <input
                    type="number"
                    value={formShippingFee}
                    onChange={(e) => setFormShippingFee(e.target.value)}
                    required
                    min={0}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nominal COD Barang (Rp)</label>
                  <input
                    type="number"
                    value={formCodAmount}
                    onChange={(e) => setFormCodAmount(e.target.value)}
                    disabled={formService !== 'COD'}
                    placeholder={formService === 'COD' ? '0' : 'Tidak berlaku'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Metode Settlement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSettlementMethod('CASH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formSettlementMethod === 'CASH'
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSettlementMethod('TRANSFER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      formSettlementMethod === 'TRANSFER'
                        ? 'bg-indigo-950 border-indigo-700 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>TRANSFER (Upload Bukti)</span>
                  </button>
                </div>
              </div>

              {formSettlementMethod === 'TRANSFER' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Upload Bukti Transfer (JPG/PNG/WEBP max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                  />
                  {filePreviewUrl && (
                    <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={filePreviewUrl} alt="Preview Bukti" className="object-cover w-full h-full" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Catatan / Alasan Adjustment</label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  required
                  rows={2}
                  placeholder="Ketik catatan atau alasan adjustment..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isEditMode ? 'Update Adjustment' : 'Simpan Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-400" />
                  <span>Timeline & History Adjustment Resi</span>
                </h2>
                {historyData && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Resi: <strong className="text-sky-400 font-mono">{historyData.manifest.resiNumber}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span className="text-xs font-semibold">Memuat history adjustment...</span>
              </div>
            ) : historyData ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Initial State */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Data Awal Manifest</div>
                  <div className="font-semibold text-slate-300">
                    Layanan: <strong className="text-white">{historyData.manifest.initialDeliveryMethod}</strong> •
                    Ongkir: <strong className="text-emerald-400 font-mono">Rp {historyData.manifest.initialShippingFee.toLocaleString('id-ID')}</strong> •
                    COD: <strong className="text-amber-400 font-mono">Rp {historyData.manifest.initialCodAmount.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Adjustments Timeline */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Adjustment</div>
                  {historyData.adjustments.map((adj) => (
                    <div key={adj.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-800/60 pb-1.5">
                        <span>{new Date(adj.createdAt).toLocaleString('id-ID')}</span>
                        <span className="text-sky-400 font-bold">{adj.correctedByName} ({adj.correctedByRole})</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Sebelum:</span>
                          <span>{adj.previousDeliveryMethod || '-'} • Rp {adj.previousShippingFee?.toLocaleString('id-ID') || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Sesudah:</span>
                          <span className="text-emerald-400 font-semibold">{adj.newDeliveryMethod || '-'} • Rp {adj.newShippingFee?.toLocaleString('id-ID') || 0}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/40">
                        <strong>Alasan:</strong> {adj.reason}
                      </div>

                      {adj.transferProofObjectKey && (
                        <button
                          type="button"
                          onClick={() => handleViewProof(adj.id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Transfer</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Proof View Modal */}
      {viewingProofUrl && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Bukti Transfer Settlement</span>
              </h3>
              <button
                onClick={() => setViewingProofUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative max-h-[70vh] rounded-xl overflow-hidden border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewingProofUrl} alt="Bukti Transfer" className="object-contain w-full h-full max-h-[70vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
