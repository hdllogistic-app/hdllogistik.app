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

  const [historyList, setHistoryList] = useState<PayoutHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'CLOSING' | 'HISTORY'>('CLOSING');

  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setPreviewList(data.preview || []);
        setSelectedEmpIds(new Set()); // Default selection = 0
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

  // Execute Salary Closing Transaction
  const handleExecuteClosing = async () => {
    if (selectedEmpIds.size === 0) {
      setErrorMessage('Pilih minimal 1 anggota team untuk diproses closing salary.');
      return;
    }

    const selectedPreviews = previewList.filter((p) => selectedEmpIds.has(p.employeeId));
    const totalGross = selectedPreviews.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDeduction = selectedPreviews.reduce(
      (sum, p) => sum + p.cashAdvanceDeduction,
      0
    );
    const totalNet = selectedPreviews.reduce((sum, p) => sum + p.netSalary, 0);

    const confirmMsg = `Closing salary periode ${startDate} s/d ${endDate}?\n\n` +
      `• Jumlah Team Dipilih: ${selectedEmpIds.size} Anggota\n` +
      `• Total Gross Salary: Rp ${totalGross.toLocaleString('id-ID')}\n` +
      `• Total Potongan Kasbon: Rp ${totalDeduction.toLocaleString('id-ID')}\n` +
      `• Total Net Salary: Rp ${totalNet.toLocaleString('id-ID')}`;

    if (!window.confirm(confirmMsg)) return;

    setClosing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/finance/salary-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          employeeIds: Array.from(selectedEmpIds),
        }),
      });

      const data = await res.json();
      if (data.success) {
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
  const selectedTotalNet = selectedPreviews.reduce((sum, p) => sum + p.netSalary, 0);

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
            <span>Salary Closing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tutup periode gaji team dan buat slip salary.
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
                      <th className="p-4 text-right">Gaji Kotor</th>
                      <th className="p-4 text-right">Potongan Kasbon</th>
                      <th className="p-4 text-right">Gaji Bersih (Net)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {previewList.map((p) => {
                      const isSelected = selectedEmpIds.has(p.employeeId);
                      const isDisableSelect = p.alreadyClosed || p.salaryEntriesCount === 0;

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

                          <td className="p-4 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                            Rp {p.cashAdvanceDeduction.toLocaleString('id-ID')}
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            Rp {p.netSalary.toLocaleString('id-ID')}
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

            {/* Closing Execution Action Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div className="text-slate-400">
                Dipilih: <strong className="text-white">{selectedEmpIds.size}</strong> Team | Net
                Salary Total:{' '}
                <strong className="text-emerald-400">
                  Rp {selectedTotalNet.toLocaleString('id-ID')}
                </strong>
              </div>

              <button
                disabled={selectedEmpIds.size === 0 || closing}
                onClick={handleExecuteClosing}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center gap-2 disabled:opacity-40"
              >
                {closing && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <FileCheck className="w-4 h-4" />
                <span>Closing Salary ({selectedEmpIds.size} Team)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loadingHistory ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <span>Memuat riwayat salary closing...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Belum ada riwayat salary closing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">No. Payout / Slip</th>
                    <th className="p-4">Nama Team</th>
                    <th className="p-4">Periode</th>
                    <th className="p-4 text-center">Jumlah Hari</th>
                    <th className="p-4 text-right">Gaji Kotor</th>
                    <th className="p-4 text-right">Potongan Kasbon</th>
                    <th className="p-4 text-right">Gaji Bersih</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {h.payoutNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{h.employeeName}</div>
                        <div className="text-[10px] text-slate-400">({h.employeeCode})</div>
                      </td>
                      <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                        {h.periodStart} s/d {h.periodEnd}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-400">
                        {h.itemCount} Hari
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        Rp {h.grossAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono text-amber-300 whitespace-nowrap">
                        Rp {h.cashAdvanceDeduction.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        Rp {h.netAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                          {h.status}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedPayoutId(h.id);
                            setIsSlipModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 mx-auto"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Slip Gaji (PDF)</span>
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

      {/* Salary Slip Modal */}
      <SalarySlipModal
        payoutId={selectedPayoutId}
        isOpen={isSlipModalOpen}
        onClose={() => {
          setIsSlipModalOpen(false);
          setSelectedPayoutId(null);
        }}
      />
    </div>
  );
}
