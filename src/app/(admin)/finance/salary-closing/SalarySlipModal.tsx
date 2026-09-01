'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Share2, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface SalarySlipData {
  payoutId: string;
  payoutNumber: string;
  employeeName: string;
  employeeCode: string;
  division: string;
  phone: string | null;
  periodStart: string;
  periodEnd: string;
  entriesCount: number;
  grossAmount: number;
  cashAdvanceDeduction: number;
  netAmount: number;
  paymentMethod: string;
  processedByName: string;
  createdAt: string;
}

interface SalarySlipModalProps {
  payoutId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SalarySlipModal({ payoutId, isOpen, onClose }: SalarySlipModalProps) {
  const [slip, setSlip] = useState<SalarySlipData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!payoutId || !isOpen) return;

    async function fetchSlip() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/finance/salary-closing/${payoutId}/pdf`);
        const data = await res.json();
        if (data.success) {
          setSlip(data.slip);
        } else {
          setErrorMsg(data.error || 'Gagal memuat slip gaji.');
        }
      } catch {
        setErrorMsg('Terjadi kesalahan koneksi.');
      } finally {
        setLoading(false);
      }
    }

    fetchSlip();
  }, [payoutId, isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!slip) return;
    const phone = slip.phone ? slip.phone.replace(/\D/g, '') : '';
    const message = `Slip gaji HDL LOGISTIK periode ${slip.periodStart} s/d ${slip.periodEnd}.\nNama: ${slip.employeeName} (${slip.employeeCode})\nNet Salary: Rp ${slip.netAmount.toLocaleString('id-ID')}\nNo. Slip: ${slip.payoutNumber}`;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    setShareSuccess('Pesan slip gaji dibuka di WhatsApp. Silakan unduh/lampirkan PDF.');
  };

  if (!isOpen || !payoutId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Slip Gaji HDL LOGISTIK</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {shareSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Memuat slip gaji...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
            {errorMsg}
          </div>
        ) : slip ? (
          /* Printable Slip Box */
          <div className="space-y-4 text-xs font-sans p-4 bg-slate-950 print:bg-white border border-slate-800 print:border-black rounded-xl">
            {/* Slip Branding */}
            <div className="text-center border-b border-slate-800 print:border-black pb-3">
              <h2 className="text-base font-bold text-white print:text-black tracking-tight">
                HDL LOGISTIK
              </h2>
              <div className="text-[11px] font-bold text-sky-400 print:text-black uppercase tracking-wider">
                SLIP GAJI TEAM OPERASIONAL
              </div>
              <div className="text-[10px] text-slate-400 print:text-slate-600 font-mono mt-0.5">
                No. Slip: {slip.payoutNumber}
              </div>
            </div>

            {/* Employee & Period Details */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800/60 print:border-slate-300">
              <div>
                <div className="text-slate-400 print:text-slate-600">Nama Team:</div>
                <div className="font-bold text-white print:text-black">{slip.employeeName}</div>
              </div>
              <div>
                <div className="text-slate-400 print:text-slate-600">Kode & Divisi:</div>
                <div className="font-bold text-white print:text-black">
                  {slip.employeeCode} ({slip.division})
                </div>
              </div>
              <div>
                <div className="text-slate-400 print:text-slate-600">Periode Gaji:</div>
                <div className="font-mono text-slate-200 print:text-black">
                  {slip.periodStart} s/d {slip.periodEnd}
                </div>
              </div>
              <div>
                <div className="text-slate-400 print:text-slate-600">Total Entry Presensi:</div>
                <div className="font-bold text-emerald-400 print:text-black">
                  {slip.entriesCount} Hari Eligible
                </div>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="space-y-2 border-t border-b border-slate-800 print:border-black py-3 font-mono">
              <div className="flex justify-between text-slate-300 print:text-black">
                <span>Gaji Kotor (Gross Salary):</span>
                <span>Rp {slip.grossAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-amber-400 print:text-black">
                <span>Potongan Kasbon (CashAdvance):</span>
                <span>-Rp {slip.cashAdvanceDeduction.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-400 print:text-black pt-1 border-t border-slate-800/60 print:border-slate-400">
                <span>Gaji Bersih (Net Salary):</span>
                <span>Rp {slip.netAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Footer Identity */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 print:text-slate-600 pt-1 font-mono">
              <div>Metode: {slip.paymentMethod}</div>
              <div>Diproses: {slip.processedByName}</div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons (Hidden on print) */}
        {slip && (
          <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Slip (WA)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Save PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
