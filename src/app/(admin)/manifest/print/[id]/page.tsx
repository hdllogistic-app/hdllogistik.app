import React from 'react';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { BarcodeRenderer } from '@/components/BarcodeRenderer';
import { PrintTrigger } from './PrintTrigger';

interface PrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}

/**
 * Print Preview Page for Logistics Manifest.
 * Strictly READ-ONLY Server Component GET view.
 * Verifies DAL authorization (OWNER, ADMIN, OPS allowed; FINANCE & DRIVER blocked).
 * Does NOT mutate database on GET render or page refresh.
 */
export default async function ManifestPrintPage({ params, searchParams }: PrintPageProps) {
  const { id } = await params;
  const { autoprint } = await searchParams;

  // Server-side DAL Authorization (OWNER, ADMIN, OPS allowed; FINANCE & DRIVER blocked)
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  // Read-only query manifest from PostgreSQL
  const manifest = await prisma.manifest.findFirst({
    where: {
      OR: [{ id }, { resiNumber: id }],
    },
    include: {
      customer: true,
    },
  });

  if (!manifest) {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(manifest.date);

  const formattedShipping = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(manifest.totalShippingFee.toNumber());

  const formattedCOD = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(manifest.codAmount.toNumber());

  const formattedTotalBill = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(manifest.totalRecipientBill.toNumber());

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-6 md:p-10 print:p-0 print:bg-transparent">
      {/* Explicit Print Controls (Handles explicit POST to /api/manifests/[id]/print) */}
      <PrintTrigger manifestId={manifest.id} autoPrint={autoprint === '1'} />

      <div className="max-w-3xl mx-auto border-2 border-slate-900 p-6 md:p-8 space-y-6 print:border-black print:shadow-none shadow-xl rounded-xl print:rounded-none">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">HDL LOGISTIK</h1>
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
              Surat Jalan & Tanda Terima Pengiriman
            </p>
            <p className="text-xs text-slate-500 mt-1">Tanggal: {formattedDate}</p>
          </div>
          <div className="flex flex-col items-end">
            <BarcodeRenderer value={manifest.resiNumber} className="max-h-16" />
            <div className="text-sm font-mono font-bold tracking-widest mt-1">
              {manifest.resiNumber}
            </div>
          </div>
        </div>

        {/* Mode Pembayaran Badge */}
        <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg border border-slate-300 print:bg-slate-200">
          <span className="text-xs font-bold uppercase text-slate-700">Mode Penagihan:</span>
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded uppercase">
            {manifest.billingMode === 'DIRECT' ? 'Pembayaran Langsung (DIRECT)' : 'Tagihan Invoice (INVOICE)'}
          </span>
        </div>

        {/* Pengirim & Penerima Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b-2 border-slate-900 pb-6">
          {/* Section Pengirim */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-300 pb-1">
              Data Pengirim
            </h2>
            <div className="text-base font-bold text-slate-900">{manifest.senderName}</div>
            <div className="text-sm font-mono text-slate-700">HP: {manifest.senderPhone}</div>
            <div className="text-xs text-slate-600 whitespace-pre-wrap">{manifest.senderAddress}</div>
            {manifest.customer && (
              <div className="text-xs font-semibold text-blue-700">
                Kode Pelanggan: {manifest.customer.customerCode}
              </div>
            )}
          </div>

          {/* Section Penerima */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-300 pb-1">
              Data Penerima
            </h2>
            <div className="text-base font-bold text-slate-900">{manifest.recipientName}</div>
            <div className="text-sm font-mono text-slate-700">HP: {manifest.recipientPhone}</div>
            <div className="text-xs font-bold text-indigo-700 uppercase">
              Tujuan: {manifest.recipientProvinceArea}
            </div>
            <div className="text-xs text-slate-600 whitespace-pre-wrap">{manifest.recipientAddress}</div>
            {manifest.shareLocationUrl && (
              <div className="text-[10px] text-slate-500 truncate font-mono">
                Maps: {manifest.shareLocationUrl}
              </div>
            )}
          </div>
        </div>

        {/* Detail Barang Table */}
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Rincian Barang & Biaya
          </h2>
          <table className="w-full border-collapse border border-slate-900 text-sm">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-xs uppercase">
                <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                <th className="border border-slate-900 p-2 text-center">Koli</th>
                <th className="border border-slate-900 p-2 text-center">Berat (kg)</th>
                <th className="border border-slate-900 p-2 text-right">Tarif / kg</th>
                <th className="border border-slate-900 p-2 text-right">Total Ongkir</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 p-2 font-medium">{manifest.itemName}</td>
                <td className="border border-slate-900 p-2 text-center font-bold">{manifest.koliCount}</td>
                <td className="border border-slate-900 p-2 text-center font-bold">{manifest.weightKg.toString()}</td>
                <td className="border border-slate-900 p-2 text-right font-mono">
                  Rp {manifest.shippingRatePerKg.toNumber().toLocaleString('id-ID')}
                </td>
                <td className="border border-slate-900 p-2 text-right font-mono font-bold">
                  {formattedShipping}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ringkasan Biaya & COD */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 border border-slate-300 rounded-lg">
          <div>
            {manifest.notes && (
              <div className="text-xs text-slate-600">
                <span className="font-bold">Catatan:</span> {manifest.notes}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1">
              Metode Penyerahan: <span className="font-semibold text-slate-800">{manifest.paymentDeliveryMethod}</span>
            </div>
          </div>
          <div className="text-right mt-3 sm:mt-0 space-y-1">
            {manifest.codAmount.gt(0) && (
              <div className="text-xs text-slate-700">
                Nilai COD Barang: <span className="font-mono font-bold text-slate-900">{formattedCOD}</span>
              </div>
            )}
            <div className="text-sm font-black text-slate-900">
              Total Tagihan Penerima:{' '}
              <span className="text-lg font-mono text-blue-900">{formattedTotalBill}</span>
            </div>
          </div>
        </div>

        {/* Tanda Tangan Block */}
        <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8 border-t border-slate-200">
          <div className="space-y-12">
            <div>Pengirim / Petugas Gudang</div>
            <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-12">
            <div>Penerima Barang</div>
            <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
