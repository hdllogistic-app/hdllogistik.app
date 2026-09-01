'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Printer,
  Share2,
  ArrowLeft,
  CreditCard,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface InvoiceDetailData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: Array<{
    id: string;
    no: number;
    manifestId: string | null;
    resiNumber: string;
    date: string;
    description: string;
    senderName: string;
    recipientName: string;
    area: string;
    weightKg: number;
    koliCount: number;
    unitPrice: number;
    qty: number;
    amount: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    receivedByName: string | null;
    referenceNumber: string | null;
    notes: string | null;
    voidReason: string | null;
    voidedAt: string | null;
    voidedByName: string | null;
  }>;
}

interface InvoiceDetailViewProps {
  invoiceId: string;
}

export function InvoiceDetailView({ invoiceId }: InvoiceDetailViewProps) {
  const [detail, setDetail] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}`);
      const data = await res.json();

      if (data.success) {
        setDetail(data.invoice);
      } else {
        setErrorMessage(data.error || 'Gagal memuat detail invoice.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!detail) return;
    const phone = detail.customer.phone ? detail.customer.phone.replace(/\D/g, '') : '';
    const message = `HDL LOGISTIK INVOICE PENAGIHAN\nNo. Invoice: ${detail.invoiceNumber}\nTanggal: ${detail.invoiceDate}\nCustomer: ${detail.customer.name}\nTotal Tagihan: Rp ${detail.total.toLocaleString('id-ID')}\nSisa Tagihan (Outstanding): Rp ${detail.outstandingAmount.toLocaleString('id-ID')}\nStatus: ${detail.status}`;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    setShareSuccess('Rincian tagihan invoice dibuka di WhatsApp.');
  };

  const handleVoidInvoice = async () => {
    if (!detail) return;
    if (detail.payments.length > 0) {
      alert('Invoice yang sudah memiliki transaksi pembayaran tidak dapat dibatalkan langsung.');
      return;
    }

    const reason = window.prompt('Masukkan alasan pembatalan (VOID) invoice ini:');
    if (!reason || !reason.trim()) return;

    setVoiding(true);
    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VOID', reason: reason.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        fetchDetail();
      } else {
        alert(data.error || 'Gagal membatalkan invoice.');
      }
    } catch {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span>Memuat detail invoice penagihan...</span>
      </div>
    );
  }

  if (errorMessage || !detail) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link
          href="/finance/invoices"
          className="inline-flex items-center gap-2 text-xs text-sky-400 hover:underline font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Invoice</span>
        </Link>
        <div className="p-4 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
          {errorMessage || 'Invoice tidak ditemukan.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Action Toolbar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <Link
          href="/finance/invoices"
          className="inline-flex items-center gap-2 text-xs text-sky-400 hover:underline font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Invoice</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {detail.status !== 'PAID' && detail.status !== 'CANCELLED' && detail.payments.length === 0 && (
            <button
              onClick={handleVoidInvoice}
              disabled={voiding}
              className="px-3.5 py-2 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>Void Invoice</span>
            </button>
          )}

          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan WA</span>
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

      {shareSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareSuccess}</span>
        </div>
      )}

      {/* Printable Invoice Document Box */}
      <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-black rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl print:shadow-none print:text-black">
        {/* Invoice Header / Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800 print:border-black pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white print:text-black tracking-tight">
              HDL LOGISTIK
            </h1>
            <p className="text-xs text-sky-400 print:text-slate-600 font-semibold uppercase tracking-wider">
              INVOICE PENAGIHAN REKAP MANIFEST
            </p>
            <p className="text-[11px] text-slate-400 print:text-slate-600">
              Jasa Pengiriman & Ekspedisi Logistik Terpadu
            </p>
          </div>

          <div className="text-right space-y-1 text-xs font-mono">
            <div className="text-base font-bold text-sky-400 print:text-black">
              {detail.invoiceNumber}
            </div>
            <div className="text-slate-300 print:text-slate-800">Tanggal: {detail.invoiceDate}</div>
            <div className="text-amber-400 print:text-slate-800 font-bold">
              Jatuh Tempo: {detail.dueDate}
            </div>
            <div className="pt-1">
              {detail.status === 'PAID' ? (
                <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                  LUNAS (PAID)
                </span>
              ) : detail.status === 'PARTIAL' ? (
                <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[10px] font-bold">
                  PARTIAL
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded text-[10px] font-bold">
                  {detail.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Billing Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 print:bg-slate-100 p-4 rounded-xl border border-slate-800/80 print:border-slate-300 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 mb-1">
              DITAGIHKAN KEPADA (BILL TO):
            </div>
            <div className="text-sm font-bold text-white print:text-black">{detail.customer.name}</div>
            {detail.customer.code && (
              <div className="font-mono text-sky-400 print:text-slate-700">Kode: {detail.customer.code}</div>
            )}
            {detail.customer.phone && (
              <div className="text-slate-300 print:text-slate-800">Telp: {detail.customer.phone}</div>
            )}
            {detail.customer.address && (
              <div className="text-slate-400 print:text-slate-700 mt-1">{detail.customer.address}</div>
            )}
          </div>

          <div className="text-right space-y-1 font-mono">
            <div className="text-slate-400 print:text-slate-600">Rincian Ringkasan Tagihan:</div>
            <div>Jumlah Resi: <strong>{detail.items.length} Resi</strong></div>
            <div>Total Tagihan: <strong>Rp {detail.total.toLocaleString('id-ID')}</strong></div>
            <div>Sudah Dibayar: <strong className="text-emerald-400 print:text-black">Rp {detail.paidAmount.toLocaleString('id-ID')}</strong></div>
            <div className="text-sm font-bold text-red-400 print:text-black pt-1 border-t border-slate-800 print:border-slate-400">
              Outstanding: Rp {detail.outstandingAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 print:text-black border-collapse">
            <thead className="bg-slate-950 print:bg-slate-200 text-slate-400 print:text-slate-800 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800 print:border-black">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Nomor Resi</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Penerima & Area</th>
                <th className="p-3 text-center">Berat & Koli</th>
                <th className="p-3 text-right">Tarif Ongkir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-300 font-medium">
              {detail.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 text-center font-mono text-slate-500 print:text-slate-700">
                    {item.no}
                  </td>
                  <td className="p-3 font-mono font-bold text-sky-400 print:text-black whitespace-nowrap">
                    {item.resiNumber}
                  </td>
                  <td className="p-3 font-mono text-slate-400 print:text-slate-700 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-white print:text-black">{item.recipientName}</div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">{item.area}</div>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-300 print:text-black whitespace-nowrap">
                    {item.weightKg} kg ({item.koliCount} koli)
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black whitespace-nowrap">
                    Rp {item.amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-t border-slate-800 print:border-black pt-4 text-xs font-mono">
          <div className="max-w-md space-y-1 text-slate-400 print:text-slate-700">
            {detail.notes && <div><strong>Catatan:</strong> {detail.notes}</div>}
            <div className="text-[10px] italic">
              Pembayaran dapat ditransfer ke rekening resmi HDL LOGISTIK. Bukti pembayaran mohon dikonfirmasikan ke bagian Finance.
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-right">
            <div className="flex justify-between text-slate-400 print:text-slate-700">
              <span>Subtotal Ongkir:</span>
              <span>Rp {detail.subtotal.toLocaleString('id-ID')}</span>
            </div>
            {detail.discount > 0 && (
              <div className="flex justify-between text-amber-400 print:text-black">
                <span>Diskon:</span>
                <span>-Rp {detail.discount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white print:text-black pt-1 border-t border-slate-800 print:border-black">
              <span>Total Tagihan:</span>
              <span>Rp {detail.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Payment History Section inside detail */}
        {detail.payments.length > 0 && (
          <div className="pt-4 border-t border-slate-800 print:border-black space-y-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-800">
              RIWAYAT PEMBAYARAN INVOICE:
            </div>
            <div className="space-y-1.5">
              {detail.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 bg-slate-950 print:bg-slate-100 rounded-lg border border-slate-800 print:border-slate-300 flex justify-between items-center font-mono text-[11px]"
                >
                  <div>
                    <span className="font-bold text-emerald-400 print:text-black">
                      Rp {p.amount.toLocaleString('id-ID')}
                    </span>{' '}
                    ({p.method}) • {new Date(p.paidAt).toLocaleDateString('id-ID')}
                    {p.receivedByName && <span className="text-slate-400"> • Dicatat oleh: {p.receivedByName}</span>}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[9px] font-bold">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
