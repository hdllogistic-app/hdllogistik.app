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
  UserCheck,
} from 'lucide-react';
import { OperationalExpenseCategory } from '@/generated/prisma/client';

interface ExpenseItem {
  id: string;
  date: string;
  category: OperationalExpenseCategory | 'KASBON';
  amount: number;
  status: 'ACTIVE' | 'VOID';
  description: string;
  vehiclePlate: string | null;
  employeeName: string | null;
  createdByName: string;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  type?: 'DISBURSEMENT' | 'REPAYMENT';
  repaymentSource?: string | null;
}

interface SummaryData {
  totalAmount: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  dailyAverage: number;
}

interface KasbonEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  division: string;
  phone: string | null;
  outstandingKasbon: number;
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

  // Add Expense / Kasbon Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<OperationalExpenseCategory | 'KASBON'>('BBM');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addDescription, setAddDescription] = useState<string>('');
  const [addDate, setAddDate] = useState<string>(getTodayStr());
  const [addEmployeeId, setAddEmployeeId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Kasbon Employees List
  const [kasbonEmployees, setKasbonEmployees] = useState<KasbonEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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

  const fetchKasbonEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('/api/finance/cash-advance/employees');
      const data = await res.json();
      if (data.success) {
        setKasbonEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch Kasbon employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenAddModal = (cat: OperationalExpenseCategory | 'KASBON' = 'BBM') => {
    setAddCategory(cat);
    setAddAmount('');
    setAddDescription('');
    setAddDate(getTodayStr());
    setAddEmployeeId('');
    setIsAddModalOpen(true);
    fetchKasbonEmployees();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addCategory === 'KASBON') {
      if (!addEmployeeId) {
        setErrorMessage('Pilih Karyawan penerima kasbon.');
        return;
      }
      if (parseFloat(addAmount) <= 0) {
        setErrorMessage('Nominal kasbon harus lebih dari Rp 0.');
        return;
      }
    } else {
      if (!addDescription.trim() || parseFloat(addAmount) <= 0) {
        setErrorMessage('Keterangan dan nominal pengeluaran wajib diisi dengan benar.');
        return;
      }
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
          employeeId: addCategory === 'KASBON' ? addEmployeeId : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setAddAmount('');
        setAddDescription('');
        setAddEmployeeId('');
        fetchExpenses();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan pengeluaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voidReason: voidReason.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setVoidingExpenseId(null);
        setVoidReason('');
        fetchExpenses();
      } else {
        setErrorMessage(data.error || 'Gagal membatalkan pengeluaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi server saat void.');
    } finally {
      setVoiding(false);
    }
  };

  const formatCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'BBM':
        return 'BBM';
      case 'E_TOLL':
        return 'E-Toll & Tol';
      case 'PARKING':
        return 'Parkir & Retribusi';
      case 'VEHICLE_SERVICE':
        return 'Servis Kendaraan';
      case 'MEAL':
        return 'Uang Makan / Konsumsi';
      case 'RENT':
        return 'Sewa Gudang / Operasional';
      case 'UTILITY':
        return 'Utility / Listrik / Internet';
      case 'KASBON':
        return 'Kasbon Karyawan';
      case 'OTHER':
        return 'Lainnya';
      default:
        return cat;
    }
  };

  const selectedEmployee = kasbonEmployees.find((e) => e.id === addEmployeeId);

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
            <Wallet className="w-6 h-6 text-sky-400" />
            <span>Operasional Settlement & Kasbon</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pencatatan pengeluaran operasional harian armada dan kasbon karyawan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('KASBON')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>+ Tambah Kasbon</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('BBM')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Operasional</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
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
          <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Jumlah Transaksi</div>
            <div className="text-lg font-bold font-mono text-white">
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
            <div className="text-sm font-bold text-amber-300 truncate">
              {formatCategoryLabel(summary.topCategory)}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Rp {summary.topCategoryAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Rata-Rata Harian</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
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
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Kategori Pengeluaran</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="BBM">BBM</option>
            <option value="E_TOLL">E-Toll & Tol</option>
            <option value="PARKING">Parkir & Retribusi</option>
            <option value="VEHICLE_SERVICE">Servis Kendaraan</option>
            <option value="MEAL">Uang Makan / Konsumsi</option>
            <option value="RENT">Sewa Gudang / Operasional</option>
            <option value="UTILITY">Utility / Listrik / Internet</option>
            <option value="KASBON">Kasbon Karyawan</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Status Transaksi</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="VOID">VOID</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Cari Keterangan / Nama</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi / karyawan..."
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Expense / Kasbon Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span>Memuat data pengeluaran operasional & kasbon...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">
              Belum ada transaksi operasional / kasbon pada periode ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Keterangan / Karyawan</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Petugas Input</th>
                  <th className="p-4 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{item.date}</td>

                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                          item.category === 'KASBON'
                            ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                            : 'bg-slate-800 text-sky-300 border-slate-700'
                        }`}
                      >
                        {formatCategoryLabel(item.category)}
                      </span>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-white truncate">{item.description}</div>
                      {item.employeeName && (
                        <div className="text-[10px] text-amber-400 font-semibold truncate">
                          Karyawan: {item.employeeName}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={item.category === 'KASBON' && item.type === 'REPAYMENT' ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.type === 'REPAYMENT' ? '-' : ''}Rp {item.amount.toLocaleString('id-ID')}
                      </span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      {item.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[10px] font-bold">
                          VOID
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center font-mono text-slate-400 whitespace-nowrap">
                      {item.createdByName}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      {item.status === 'ACTIVE' && item.category !== 'KASBON' && (
                        <button
                          onClick={() => setVoidingExpenseId(item.id)}
                          className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-lg transition text-[10px] font-bold flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Void</span>
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

      {/* Add Operasional / Kasbon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {addCategory === 'KASBON' ? (
                    <>
                      <UserCheck className="w-5 h-5 text-amber-400" />
                      <span>+ Tambah Kasbon Karyawan</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-sky-400" />
                      <span>+ Tambah Operasional</span>
                    </>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {addCategory === 'KASBON'
                    ? 'Pencatatan uang muka / kasbon karyawan (Driver & Helper).'
                    : 'Input pengeluaran kas operasional harian.'}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Kategori *</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="BBM">BBM</option>
                  <option value="E_TOLL">E-Toll & Tol</option>
                  <option value="PARKING">Parkir & Retribusi</option>
                  <option value="VEHICLE_SERVICE">Servis Kendaraan</option>
                  <option value="MEAL">Uang Makan / Konsumsi</option>
                  <option value="RENT">Sewa Gudang / Operasional</option>
                  <option value="UTILITY">Utility / Listrik / Internet</option>
                  <option value="KASBON">Kasbon Karyawan</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {addCategory === 'KASBON' ? (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pilih Driver / Helper *</label>
                  {loadingEmployees ? (
                    <div className="py-2 text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Memuat daftar karyawan...</span>
                    </div>
                  ) : (
                    <select
                      value={addEmployeeId}
                      onChange={(e) => setAddEmployeeId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Pilih Driver / Helper --</option>
                      {kasbonEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} — {emp.division} (Saldo Kasbon: Rp {emp.outstandingKasbon.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedEmployee && (
                    <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 font-mono">
                      Saldo Kasbon Saat Ini: <strong>Rp {selectedEmployee.outstandingKasbon.toLocaleString('id-ID')}</strong>
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {addCategory === 'KASBON' ? 'Nominal Kasbon (Rp) *' : 'Nominal Pengeluaran (Rp) *'}
                </label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  required
                  min={1}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {addCategory === 'KASBON' ? 'Catatan / Alasan Kasbon' : 'Keterangan Pengeluaran *'}
                </label>
                <textarea
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  required={addCategory !== 'KASBON'}
                  rows={2}
                  placeholder={addCategory === 'KASBON' ? 'Catatan kasbon (opsional)...' : 'Ketik keterangan pengeluaran...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                    addCategory === 'KASBON'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{addCategory === 'KASBON' ? 'Simpan Kasbon' : 'Simpan Pengeluaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidingExpenseId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                <span>Pembatalan (Void) Operasional</span>
              </h2>
              <button
                onClick={() => setVoidingExpenseId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Alasan Pembatalan (Void) *</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Ketik alasan pembatalan transaksi..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingExpenseId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {voiding && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Konfirmasi Void</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
