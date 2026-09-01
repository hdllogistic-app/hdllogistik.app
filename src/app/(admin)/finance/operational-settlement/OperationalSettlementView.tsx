'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { OperationalExpenseCategory } from '@/generated/prisma/client';

interface ExpenseItem {
  id: string;
  date: string;
  category: OperationalExpenseCategory;
  amount: number;
  status: 'ACTIVE' | 'VOID';
  description: string;
  vehiclePlate: string | null;
  employeeName: string | null;
  createdByName: string;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
}

interface SummaryData {
  totalAmount: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  dailyAverage: number;
}

export function OperationalSettlementView() {
  const getTodayStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return jkt.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalAmount: 0,
    transactionCount: 0,
    topCategory: '-',
    topCategoryAmount: 0,
    dailyAverage: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Expense Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<OperationalExpenseCategory>('BBM');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addDescription, setAddDescription] = useState<string>('');
  const [addDate, setAddDate] = useState<string>(getTodayStr());
  const [saving, setSaving] = useState(false);

  // Void Expense Modal State
  const [voidingExpenseId, setVoidingExpenseId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voiding, setVoiding] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    try {
      const res = await fetch(`/api/finance/operational-settlement?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(
          data.summary || {
            totalAmount: 0,
            transactionCount: 0,
            topCategory: '-',
            topCategoryAmount: 0,
            dailyAverage: 0,
          }
        );
      } else {
        setErrorMessage(data.error || 'Gagal memuat pengeluaran operasional.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDescription.trim() || parseFloat(addAmount) <= 0) {
      setErrorMessage('Keterangan dan nominal pengeluaran wajib diisi dengan benar.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/finance/operational-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: addDate,
          category: addCategory,
          amount: parseFloat(addAmount),
          description: addDescription.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setAddAmount('');
        setAddDescription('');
        fetchExpenses();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan pengeluaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat menyimpan pengeluaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoidExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingExpenseId || !voidReason.trim()) return;

    setVoiding(true);
    try {
      const res = await fetch(`/api/finance/operational-settlement/${voidingExpenseId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voidReason: voidReason.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setVoidingExpenseId(null);
        setVoidReason('');
        fetchExpenses();
      } else {
        setErrorMessage(data.error || 'Gagal melakukan void pengeluaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setVoiding(false);
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
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>Operasional Settlement</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Input dan kontrol pengeluaran operasional harian.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Operasional</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Pengeluaran</div>
            <div className="text-lg font-bold font-mono text-white">
              Rp {summary.totalAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Jumlah Transaksi</div>
            <div className="text-lg font-bold font-mono text-sky-400">
              {summary.transactionCount} Transaksi
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Kategori Terbesar</div>
            <div className="text-sm font-bold text-amber-300 truncate max-w-[150px]">
              {summary.topCategory}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Rp {summary.topCategoryAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Rata-rata Harian</div>
            <div className="text-lg font-bold font-mono text-indigo-300">
              Rp {summary.dailyAverage.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Awal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Kategori</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">-- Semua Kategori --</option>
            <option value="BBM">BBM</option>
            <option value="E_TOLL">E-Toll & Tol</option>
            <option value="PARKING">Parkir & Retribusi</option>
            <option value="VEHICLE_SERVICE">Servis Kendaraan</option>
            <option value="MEAL">Konsumsi / Uang Makan</option>
            <option value="RENT">Sewa</option>
            <option value="UTILITY">Utility / Listrik / Internet</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">-- Semua Status --</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="VOID">VOID</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Cari Keterangan</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari keterangan..."
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>Memuat pengeluaran operasional...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Tidak ada data pengeluaran operasional.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4">Diinput Oleh</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-slate-800/40 transition ${e.status === 'VOID' ? 'opacity-50 line-through bg-slate-950/40' : ''}`}
                  >
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{e.date}</td>
                    <td className="p-4 font-bold text-emerald-400 whitespace-nowrap">{e.category}</td>
                    <td className="p-4 text-white max-w-xs truncate">{e.description}</td>
                    <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      Rp {e.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{e.createdByName}</td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {e.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[10px] font-bold">
                          VOID
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {e.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setVoidingExpenseId(e.id); setVoidReason(''); }}
                          className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-white rounded-lg border border-red-800/60 text-[11px] font-bold transition"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ Tambah Operasional</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tanggal *</label>
                <input
                  type="date"
                  required
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kategori *</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as OperationalExpenseCategory)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="BBM">BBM</option>
                  <option value="E_TOLL">E-Toll & Tol</option>
                  <option value="PARKING">Parkir & Retribusi</option>
                  <option value="VEHICLE_SERVICE">Servis Kendaraan</option>
                  <option value="MEAL">Uang Makan / Konsumsi</option>
                  <option value="RENT">Sewa Gudang / Operasional</option>
                  <option value="UTILITY">Utility / Listrik / Internet</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nominal (Rp) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Keterangan *</label>
                <textarea
                  rows={2}
                  required
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Contoh: Pengisian BBM solar armada Sumedang"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Expense Modal */}
      {voidingExpenseId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>Void Pengeluaran Operasional</span>
              </h3>
              <button onClick={() => setVoidingExpenseId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidExpense} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Apakah Anda yakin ingin membatalkan (void) transaksi pengeluaran ini? Pengeluaran yang di-void tidak akan dihitung dalam statistik.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alasan Void *</label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah input nominal / transaksi ganda"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingExpenseId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {voiding ? 'Memproses...' : 'Proses Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
