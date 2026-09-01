'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Award,
} from 'lucide-react';
import { CategoryBreakdownItem } from '@/modules/finance/services/cashflow.service';

interface CashflowSummary {
  revenue: number;
  directRevenue: number;
  invoiceRevenue: number;
  operationalExpense: number;
  salaryExpense: number;
  operatingProfit: number;
  isProfit: boolean;
  netCashMovement: number;
}

export function CashflowView() {
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

  const [summary, setSummary] = useState<CashflowSummary>({
    revenue: 0,
    directRevenue: 0,
    invoiceRevenue: 0,
    operationalExpense: 0,
    salaryExpense: 0,
    operatingProfit: 0,
    isProfit: true,
    netCashMovement: 0,
  });

  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCashflowData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);

    try {
      const res = await fetch(`/api/finance/cashflow?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSummary(data.summary);
        setCategoryBreakdown(data.categoryBreakdown || []);
      } else {
        setErrorMessage(data.error || 'Gagal memuat data cashflow.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCashflowData();
  }, [fetchCashflowData]);

  // Quick Preset Handlers
  const applyPreset = (preset: 'TODAY' | 'MONTH' | 'LAST_MONTH') => {
    const now = new Date();
    const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    if (preset === 'TODAY') {
      const t = jkt.toISOString().split('T')[0];
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'MONTH') {
      setStartDate(getStartOfMonthStr());
      setEndDate(jkt.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const prevMonthLastDay = new Date(jkt.getFullYear(), jkt.getMonth(), 0);
      const prevMonthFirstDay = new Date(jkt.getFullYear(), jkt.getMonth() - 1, 1);

      setStartDate(prevMonthFirstDay.toISOString().split('T')[0]);
      setEndDate(prevMonthLastDay.toISOString().split('T')[0]);
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
            <TrendingUp className="w-6 h-6 text-sky-400" />
            <span>Cashflow & Laba Rugi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau omzet, biaya operasional, biaya team, dan laba rugi.
          </p>
        </div>

        {/* Date Filter & Presets */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => applyPreset('TODAY')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg border border-slate-800 transition"
          >
            Hari Ini
          </button>
          <button
            onClick={() => applyPreset('MONTH')}
            className="px-2.5 py-1 bg-sky-950 text-sky-300 hover:text-white font-bold rounded-lg border border-sky-800/60 transition"
          >
            Bulan Ini
          </button>
          <button
            onClick={() => applyPreset('LAST_MONTH')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg border border-slate-800 transition"
          >
            Bulan Lalu
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none"
            />
            <span className="text-slate-500 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Financial Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* OMZET / REVENUE */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Total Omzet / Revenue</span>
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/60">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            Rp {summary.revenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-slate-800/80">
            <div>• Direct Realized: Rp {summary.directRevenue.toLocaleString('id-ID')}</div>
            <div>• Invoice Realized: Rp {summary.invoiceRevenue.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* OPERASIONAL */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Biaya Operasional</span>
            <div className="p-2 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/60">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            Rp {summary.operationalExpense.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            Pengeluaran harian kendaraan, BBM, tol & gudang.
          </p>
        </div>

        {/* BIAYA GAJI / TEAM */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Biaya Gaji Team</span>
            <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/60">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            Rp {summary.salaryExpense.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            Akrual gaji disetujui untuk driver, helper & admin.
          </p>
        </div>

        {/* LABA / RUGI OPERASIONAL */}
        <div
          className={`p-5 rounded-2xl border shadow-lg space-y-2 ${
            summary.isProfit
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider">
              {summary.isProfit ? 'LABA OPERASIONAL' : 'RUGI OPERASIONAL'}
            </span>
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {summary.isProfit ? '' : '-'}Rp {Math.abs(summary.operatingProfit).toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] opacity-80 pt-1 border-t border-current/20">
            Formula: Revenue - Operasional - Gaji Team
          </div>
        </div>
      </div>

      {/* Expense Ranking & Net Cash Movement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Pengeluaran Ranking */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Peringkat Pengeluaran Operasional (Top Expense)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: Rp {summary.operationalExpense.toLocaleString('id-ID')}
            </span>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span>Memuat rincian pengeluaran...</span>
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Belum ada data pengeluaran operasional pada periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">{item.categoryName}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Rp {item.amount.toLocaleString('id-ID')}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({item.percentage}%)
                      </span>
                    </span>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Net Cash Movement Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>Net Cash Movement</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Arus Kas Masuk (Real Inflow):</span>
                <span className="font-mono font-bold text-emerald-400">
                  Rp {summary.revenue.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Arus Kas Keluar Operasional:</span>
                <span className="font-mono font-bold text-amber-300">
                  Rp {summary.operationalExpense.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Bersih Pergerakan Kas (Net Cash)
            </div>
            <div className="text-xl font-bold font-mono text-white">
              Rp {summary.netCashMovement.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
