'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Calendar,
  Users,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  History,
  FileText,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';
import { SalaryClosingPreviewDTO } from '@/modules/finance/services/salary-closing.service';
import { SalarySlipModal } from './SalarySlipModal';

interface PayoutHistoryItem {
  id: string;
  payoutNumber: string;
  employeeName: string;
  employeeCode: string;
  division: string;
  phone: string | null;
  periodStart: string;
  periodEnd: string;
  itemCount: number;
  grossAmount: number;
  cashAdvanceDeduction: number;
  netAmount: number;
  status: string;
  processedByName: string;
  createdAt: string;
}

export function SalaryClosingView() {
  const getTodayStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return jkt.toISOString().split('T')[0];
  };

  const getStartOfMonthStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return `${jkt.getFullYear()}-${String(jkt.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [startDate, setStartDate] = useState<string>(getStartOfMonthStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const [previewList, setPreviewList] = useState<SalaryClosingPreviewDTO[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());

  // Custom deductions state per employee: map employeeId -> custom deduction amount
  const [customDeductionsMap, setCustomDeductionsMap] = useState<Record<string, number>>({});

  const [historyList, setHistoryList] = useState<PayoutHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'CLOSING' | 'HISTORY'>('CLOSING');

  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Selected Slip Modal State
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);

  // Fetch Salary Preview
  const fetchPreview = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoadingPreview(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/finance/salary-closing/preview?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();

      if (data.success) {
        const list: SalaryClosingPreviewDTO[] = data.preview || [];
        setPreviewList(list);
        setSelectedEmpIds(new Set()); // Default selection = 0

        // Initialize custom deductions map with default min(gross, outstanding)
        const initialMap: Record<string, number> = {};
        for (const item of list) {
          initialMap[item.employeeId] = item.cashAdvanceDeduction;
        }
        setCustomDeductionsMap(initialMap);
      } else {
        setErrorMessage(data.error || 'Gagal memuat preview salary closing.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi saat memuat preview.');
    } finally {
      setLoadingPreview(false);
    }
  }, [startDate, endDate]);

  // Fetch Closing History
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/finance/salary-closing/history');
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.payouts || []);
      }
    } catch (err) {
      console.error('Failed to fetch closing history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Toggle Selection
  const toggleSelectEmp = (empId: string) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const eligibleIds = previewList
      .filter((p) => !p.alreadyClosed && p.salaryEntriesCount > 0)
      .map((p) => p.employeeId);
    setSelectedEmpIds(new Set(eligibleIds));
  };

  const handleResetSelection = () => {
    setSelectedEmpIds(new Set());
  };

  const handleDeductionChange = (empId: string, valStr: string, gross: number, outstanding: number) => {
    const val = parseFloat(valStr);
    const maxAllowed = Math.min(gross, outstanding);

    if (isNaN(val) || val < 0) {
      setCustomDeductionsMap((prev) => ({ ...prev, [empId]: 0 }));
      return;
    }

    const capped = Math.min(val, maxAllowed);
    setCustomDeductionsMap((prev) => ({ ...prev, [empId]: capped }));
  };

  const handleOpenConfirmModal = () => {
    if (selectedEmpIds.size === 0) {
      setErrorMessage('Pilih minimal 1 anggota team untuk diproses closing salary.');
      return;
    }
    setErrorMessage(null);
    setIsConfirmModalOpen(true);
  };

  // Execute Salary Closing Transaction
  const handleExecuteClosing = async () => {
    setClosing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const deductionsPayload: Record<string, number> = {};
    for (const empId of Array.from(selectedEmpIds)) {
      if (customDeductionsMap[empId] !== undefined) {
        deductionsPayload[empId] = customDeductionsMap[empId];
      }
    }

    try {
      const res = await fetch('/api/finance/salary-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          employeeIds: Array.from(selectedEmpIds),
          customDeductions: deductionsPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsConfirmModalOpen(false);
        setSuccessMessage(`Berhasil memproses closing salary untuk ${data.count} team.`);
        fetchPreview();
        fetchHistory();
      } else {
        setErrorMessage(data.error || 'Gagal memproses closing salary.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi server saat closing salary.');
    } finally {
      setClosing(false);
    }
  };

  // Selected totals for footer action bar
  const selectedPreviews = previewList.filter((p) => selectedEmpIds.has(p.employeeId));
  const selectedTotalGross = selectedPreviews.reduce((sum, p) => sum + p.grossSalary, 0);
  const selectedTotalDeduction = selectedPreviews.reduce((sum, p) => {
    const ded = customDeductionsMap[p.employeeId] !== undefined ? customDeductionsMap[p.employeeId] : p.cashAdvanceDeduction;
    return sum + ded;
  }, 0);
  const selectedTotalNet = selectedTotalGross - selectedTotalDeduction;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between gap-4 text-emerald-300 text-sm">
          <div className="flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-white underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

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
            <FileCheck className="w-6 h-6 text-sky-400" />
            <span>Salary Closing & Potongan Kasbon</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tutup periode gaji team, hitung potongan kasbon otomatis, dan terbitkan slip gaji.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('CLOSING')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'CLOSING'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Preview & Closing Gaji
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'HISTORY'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Riwayat Closing & Slip
          </button>
        </div>
      </div>

      {activeTab === 'CLOSING' ? (
        <div className="space-y-6">
          {/* Period Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Periode Awal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Periode Akhir:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <button
                onClick={fetchPreview}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition"
              >
                Muat Preview
              </button>
            </div>

            {/* Selection Toolbar Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Pilih Semua Eligible
              </button>
              <button
                onClick={handleResetSelection}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Reset Pilihan
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loadingPreview ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <span>Mengkalkulasi preview gaji team...</span>
              </div>
            ) : previewList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">
                  Tidak ada entry gaji eligible pada periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-12 text-center">Pilih</th>
                      <th className="p-4">Kode & Team</th>
                      <th className="p-4">Divisi</th>
                      <th className="p-4 text-center">Hari Presensi</th>
                      <th className="p-4 text-right">Hak Gaji (Gross)</th>
                      <th className="p-4 text-right">Saldo Kasbon</th>
                      <th className="p-4 text-right">Potongan Kasbon</th>
                      <th className="p-4 text-right">Gaji Dibayarkan (Net)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {previewList.map((p) => {
                      const isSelected = selectedEmpIds.has(p.employeeId);
                      const isDisableSelect = p.alreadyClosed || p.salaryEntriesCount === 0;

                      const currentDeduction =
                        customDeductionsMap[p.employeeId] !== undefined
                          ? customDeductionsMap[p.employeeId]
                          : p.cashAdvanceDeduction;

                      const currentNet = Math.max(0, p.grossSalary - currentDeduction);

                      return (
                        <tr
                          key={p.employeeId}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-sky-950/40' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <button
                              disabled={isDisableSelect}
                              onClick={() => toggleSelectEmp(p.employeeId)}
                              className="text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{p.employeeName}</span>
                              <span className="font-mono text-[10px] text-sky-400 font-normal">
                                ({p.employeeCode})
                              </span>
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                              {p.division}
                            </span>
                          </td>

                          <td className="p-4 text-center font-mono font-bold text-emerald-400">
                            {p.salaryEntriesCount} Hari
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                            Rp {p.grossSalary.toLocaleString('id-ID')}
                          </td>

                          <td className="p-4 text-right font-mono text-amber-400 whitespace-nowrap">
                            Rp {p.outstandingCashAdvance.toLocaleString('id-ID')}
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            {p.alreadyClosed ? (
                              <span className="font-mono text-slate-500">
                                Rp {currentDeduction.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <input
                                type="number"
                                value={currentDeduction}
                                onChange={(e) =>
                                  handleDeductionChange(
                                    p.employeeId,
                                    e.target.value,
                                    p.grossSalary,
                                    p.outstandingCashAdvance
                                  )
                                }
                                min={0}
                                max={Math.min(p.grossSalary, p.outstandingCashAdvance)}
                                className="w-32 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-right font-mono font-bold text-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            )}
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            Rp {currentNet.toLocaleString('id-ID')}
                          </td>

                          <td className="p-4 text-center whitespace-nowrap">
                            {p.alreadyClosed ? (
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded text-[10px] font-bold">
                                SUDAH CLOSING
                              </span>
                            ) : p.salaryEntriesCount > 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                                ELIGIBLE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold">
                                KOSONG
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Execution Action Footer Bar */}
          {selectedEmpIds.size > 0 && (
            <div className="sticky bottom-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4 text-slate-300">
                <span className="font-bold text-white">
                  Dipilih: <strong className="text-sky-400 font-mono">{selectedEmpIds.size}</strong> Team
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Gross: <strong className="font-mono text-white">Rp {selectedTotalGross.toLocaleString('id-ID')}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Potongan Kasbon: <strong className="font-mono text-amber-300">Rp {selectedTotalDeduction.toLocaleString('id-ID')}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Net Payout: <strong className="font-mono text-emerald-400 font-bold">Rp {selectedTotalNet.toLocaleString('id-ID')}</strong>
                </span>
              </div>

              <button
                onClick={handleOpenConfirmModal}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 shrink-0"
              >
                <FileCheck className="w-4 h-4" />
                <span>Proses Salary Closing ({selectedEmpIds.size})</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Closing History Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loadingHistory ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <span>Memuat riwayat closing salary...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Belum ada riwayat closing salary.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">No. Payout</th>
                    <th className="p-4">Nama Team</th>
                    <th className="p-4">Divisi</th>
                    <th className="p-4">Periode</th>
                    <th className="p-4 text-right">Gaji Kotor</th>
                    <th className="p-4 text-right">Potongan Kasbon</th>
                    <th className="p-4 text-right">Gaji Dibayarkan</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {item.payoutNumber}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-white">{item.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.employeeCode}</div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                          {item.division}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                        {item.periodStart} s/d {item.periodEnd}
                      </td>

                      <td className="p-4 text-right font-mono text-white whitespace-nowrap">
                        Rp {item.grossAmount.toLocaleString('id-ID')}
                      </td>

                      <td className="p-4 text-right font-mono text-amber-300 whitespace-nowrap">
                        Rp {item.cashAdvanceDeduction.toLocaleString('id-ID')}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        Rp {item.netAmount.toLocaleString('id-ID')}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedPayoutId(item.id);
                            setIsSlipModalOpen(true);
                          }}
                          className="px-3 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/60 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Slip Gaji</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Final Confirmation Breakdown Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span>Konfirmasi Final Salary Closing</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Periode: <strong className="text-white font-mono">{startDate} s/d {endDate}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Kode & Team</th>
                    <th className="p-3 text-right">Hak Gaji</th>
                    <th className="p-3 text-right">Saldo Kasbon</th>
                    <th className="p-3 text-right">Potongan Kasbon</th>
                    <th className="p-3 text-right">Gaji Dibayarkan</th>
                    <th className="p-3 text-right">Sisa Kasbon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {selectedPreviews.map((p) => {
                    const ded =
                      customDeductionsMap[p.employeeId] !== undefined
                        ? customDeductionsMap[p.employeeId]
                        : p.cashAdvanceDeduction;
                    const net = Math.max(0, p.grossSalary - ded);
                    const rem = Math.max(0, p.outstandingCashAdvance - ded);

                    return (
                      <tr key={p.employeeId}>
                        <td className="p-3 font-bold text-white">
                          {p.employeeName} ({p.employeeCode})
                        </td>
                        <td className="p-3 text-right font-mono">Rp {p.grossSalary.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-mono text-slate-400">Rp {p.outstandingCashAdvance.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-300">Rp {ded.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">Rp {net.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-mono text-slate-400">Rp {rem.toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Hak Gaji Kotor:</span>
                  <strong className="font-mono text-white">Rp {selectedTotalGross.toLocaleString('id-ID')}</strong>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Total Potongan Kasbon:</span>
                  <strong className="font-mono">Rp {selectedTotalDeduction.toLocaleString('id-ID')}</strong>
                </div>
                <div className="flex justify-between text-emerald-400 text-sm font-bold pt-1.5 border-t border-slate-800">
                  <span>Total Pengeluaran Kas Gaji (Net):</span>
                  <strong className="font-mono">Rp {selectedTotalNet.toLocaleString('id-ID')}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={handleExecuteClosing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {closing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Proses Salary Closing ({selectedEmpIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {isSlipModalOpen && selectedPayoutId && (
        <SalarySlipModal
          isOpen={isSlipModalOpen}
          payoutId={selectedPayoutId}
          onClose={() => {
            setIsSlipModalOpen(false);
            setSelectedPayoutId(null);
          }}
        />
      )}
    </div>
  );
}
