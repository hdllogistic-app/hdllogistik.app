'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Eye,
  CreditCard,
  Ban,
  Calendar,
  UserCheck,
  CheckSquare,
  Square,
  Printer,
  Download,
  Share2,
  Building2,
} from 'lucide-react';

interface UnbilledResiItem {
  manifestId: string;
  resiNumber: string;
  date: string;
  senderName: string;
  recipientName: string;
  recipientArea: string;
  weightKg: number;
  koliCount: number;
  totalShippingFee: number;
  paymentDeliveryMethod: string;
  customerId: string | null;
  customerName: string;
  customerCode: string | null;
}

interface InvoiceListItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerCode: string | null;
  itemCount: number;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

export function InvoiceView() {
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

  const getDueDateStr = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 + 14 * 24) * 60 * 60 * 1000);
    return jkt.toISOString().split('T')[0];
  };

  const [activeTab, setActiveTab] = useState<'UNBILLED' | 'INVOICES'>('UNBILLED');

  // Common Date Filter
  const [startDate, setStartDate] = useState<string>(getStartOfMonthStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // Tab 1: Unbilled Resi State
  const [unbilledItems, setUnbilledItems] = useState<UnbilledResiItem[]>([]);
  const [selectedManifestIds, setSelectedManifestIds] = useState<Set<string>>(new Set());
  const [unbilledSearch, setUnbilledSearch] = useState<string>('');
  const [unbilledPage, setUnbilledPage] = useState<number>(1);
  const [unbilledSummary, setUnbilledSummary] = useState({ totalUnbilledResi: 0, totalShippingFeeSum: 0 });

  // Tab 2: Invoices State
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoicePage, setInvoicePage] = useState<number>(1);
  const [invoiceSummary, setInvoiceSummary] = useState({
    totalInvoiceCount: 0,
    issuedCount: 0,
    partialCount: 0,
    paidCount: 0,
    cancelledCount: 0,
    totalInvoiceAmountSum: 0,
    totalPaidAmountSum: 0,
    totalOutstandingSum: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State: Create Invoice
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createInvoiceDate, setCreateInvoiceDate] = useState<string>(getTodayStr());
  const [createDueDate, setCreateDueDate] = useState<string>(getDueDateStr());
  const [createDiscount, setCreateDiscount] = useState<string>('0');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [submittingInvoice, setSubmittingInvoice] = useState<boolean>(false);

  // Modal State: Tentukan Customer (Legacy Link)
  const [customerOptions, setCustomerOptions] = useState<Array<{ id: string; customerCode: string; name: string }>>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [targetLinkItem, setTargetLinkItem] = useState<UnbilledResiItem | null>(null);
  const [selectedLinkCustomerId, setSelectedLinkCustomerId] = useState<string>('');
  const [submittingLink, setSubmittingLink] = useState<boolean>(false);

  // Modal State: Catat Pembayaran Invoice
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [targetPaymentInvoice, setTargetPaymentInvoice] = useState<InvoiceListItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [payDate, setPayDate] = useState<string>(getTodayStr());
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Fetch active customers for dropdown
  useEffect(() => {
    async function fetchActiveCustomers() {
      try {
        const res = await fetch('/api/manifests/customers');
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setCustomerOptions(data.customers);
        }
      } catch (err) {
        console.error('Failed to load active customers:', err);
      }
    }
    fetchActiveCustomers();
  }, []);

  // Fetch Unbilled Resi
  const fetchUnbilledResi = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (unbilledSearch.trim()) params.set('searchQuery', unbilledSearch.trim());
    params.set('page', String(unbilledPage));

    try {
      const res = await fetch(`/api/finance/invoices/unbilled-resi?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setUnbilledItems(data.items || []);
        setUnbilledSummary(data.summary || { totalUnbilledResi: 0, totalShippingFeeSum: 0 });
      } else {
        setErrorMessage(data.error || 'Gagal memuat resi unbilled.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, unbilledSearch, unbilledPage]);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (invoiceStatusFilter !== 'ALL') params.set('statusFilter', invoiceStatusFilter);
    if (invoiceSearch.trim()) params.set('searchQuery', invoiceSearch.trim());
    params.set('page', String(invoicePage));

    try {
      const res = await fetch(`/api/finance/invoices?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setInvoices(data.items || []);
        setInvoiceSummary(
          data.summary || {
            totalInvoiceCount: 0,
            issuedCount: 0,
            partialCount: 0,
            paidCount: 0,
            cancelledCount: 0,
            totalInvoiceAmountSum: 0,
            totalPaidAmountSum: 0,
            totalOutstandingSum: 0,
          }
        );
      } else {
        setErrorMessage(data.error || 'Gagal memuat daftar invoice.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, invoiceStatusFilter, invoiceSearch, invoicePage]);

  useEffect(() => {
    if (activeTab === 'UNBILLED') {
      fetchUnbilledResi();
    } else {
      fetchInvoices();
    }
  }, [activeTab, fetchUnbilledResi, fetchInvoices]);

  // Selection handlers for Tab 1
  const toggleSelectManifest = (manifestId: string) => {
    setSelectedManifestIds((prev) => {
      const next = new Set(prev);
      if (next.has(manifestId)) next.delete(manifestId);
      else next.add(manifestId);
      return next;
    });
  };

  const handleSelectAllUnbilled = () => {
    const allIds = unbilledItems.map((i) => i.manifestId);
    setSelectedManifestIds(new Set(allIds));
  };

  const handleResetSelection = () => {
    setSelectedManifestIds(new Set());
  };

  // Selected totals calculation
  const selectedItems = unbilledItems.filter((i) => selectedManifestIds.has(i.manifestId));
  const selectedTotalFee = selectedItems.reduce((sum, i) => sum + i.totalShippingFee, 0);

  // Validate Same Billing Party
  const handleOpenCreateInvoiceModal = () => {
    if (selectedManifestIds.size === 0) {
      setErrorMessage('Pilih minimal 1 resi untuk dibuatkan invoice.');
      return;
    }

    const customerIds = new Set(selectedItems.map((i) => i.customerId || i.senderName));
    if (customerIds.size > 1) {
      setErrorMessage('Resi yang dipilih berasal dari customer berbeda. Buat invoice secara terpisah.');
      return;
    }

    setCreateDiscount('0');
    setCreateNotes('');
    setIsCreateModalOpen(true);
  };

  const handleOpenLinkModal = (item: UnbilledResiItem) => {
    setTargetLinkItem(item);
    setSelectedLinkCustomerId(customerOptions[0]?.id || '');
    setIsLinkModalOpen(true);
  };

  const handleSaveLinkCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLinkItem || !selectedLinkCustomerId) return;

    setSubmittingLink(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/finance/invoices/manifests/${targetLinkItem.manifestId}/customer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedLinkCustomerId }),
      });

      const data = await res.json();
      if (data.success) {
        setIsLinkModalOpen(false);
        fetchUnbilledResi();
      } else {
        setErrorMessage(data.error || 'Gagal menghubungkan resi ke customer.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi saat menghubungkan customer.');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    const firstItem = selectedItems[0];
    const customerId = firstItem.customerId || '';

    setSubmittingInvoice(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          manifestIds: Array.from(selectedManifestIds),
          invoiceDate: createInvoiceDate,
          dueDate: createDueDate,
          discount: parseFloat(createDiscount) || 0,
          notes: createNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setSelectedManifestIds(new Set());
        setActiveTab('INVOICES');
        fetchInvoices();
      } else {
        setErrorMessage(data.error || 'Gagal membuat invoice.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat membuat invoice.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleOpenPaymentModal = (inv: InvoiceListItem) => {
    setTargetPaymentInvoice(inv);
    setPayAmount(String(inv.outstandingAmount));
    setPayMethod('CASH');
    setPayDate(getTodayStr());
    setPayRef('');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPaymentInvoice) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    if (amt > targetPaymentInvoice.outstandingAmount) {
      setErrorMessage(`Nominal pembayaran melebihi sisa tagihan (Rp ${targetPaymentInvoice.outstandingAmount.toLocaleString('id-ID')}).`);
      return;
    }

    setSubmittingPayment(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/finance/invoices/${targetPaymentInvoice.invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: payMethod,
          paidAt: payDate,
          referenceNumber: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsPaymentModalOpen(false);
        fetchInvoices();
      } else {
        setErrorMessage(data.error || 'Gagal mencatat pembayaran.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat mencatat pembayaran.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center justify-between gap-3 text-red-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline text-red-400">
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>Invoice Penagihan Customer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola penagihan resi customer dan pembayaran invoice.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('UNBILLED')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'UNBILLED'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resi Belum Diinvoice
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'INVOICES'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Invoice
          </button>
        </div>
      </div>

      {activeTab === 'UNBILLED' ? (
        /* TAB 1: RESI BELUM DIINVOICE */
        <div className="space-y-6">
          {/* Top Summary & Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Resi Unbilled Periode
                </div>
                <div className="text-lg font-bold font-mono text-amber-300">
                  {unbilledSummary.totalUnbilledResi} Resi
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Total Potential Revenue
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  Rp {unbilledSummary.totalShippingFeeSum.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Dipilih</div>
                <div className="text-sm font-bold font-mono text-sky-400">
                  {selectedManifestIds.size} Resi (Rp {selectedTotalFee.toLocaleString('id-ID')})
                </div>
              </div>

              <button
                disabled={selectedManifestIds.size === 0}
                onClick={handleOpenCreateInvoiceModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Invoice</span>
              </button>
            </div>
          </div>

          {/* Filter & Toolbar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Awal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Akhir:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <input
                type="text"
                value={unbilledSearch}
                onChange={(e) => setUnbilledSearch(e.target.value)}
                placeholder="Cari resi / pengirim..."
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAllUnbilled}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl border border-slate-700 transition"
              >
                Pilih Semua Hasil Filter
              </button>
              <button
                onClick={handleResetSelection}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl border border-slate-700 transition"
              >
                Reset Pilihan
              </button>
            </div>
          </div>

          {/* Table Unbilled */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <span>Memuat resi unbilled...</span>
              </div>
            ) : unbilledItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">
                  Tidak ada resi INVOICE unbilled pada periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-12 text-center">Pilih</th>
                      <th className="p-4">Nomor Resi</th>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Customer / Pengirim</th>
                      <th className="p-4">Penerima & Area</th>
                      <th className="p-4 text-center">Berat & Koli</th>
                      <th className="p-4 text-right">Ongkir</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {unbilledItems.map((item) => {
                      const isSelected = selectedManifestIds.has(item.manifestId);

                      return (
                        <tr
                          key={item.manifestId}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-sky-950/40' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleSelectManifest(item.manifestId)}
                              className="text-slate-400 hover:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                            {item.resiNumber}
                          </td>

                          <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                            {item.date}
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-white">{item.customerName}</div>
                            {item.customerId ? (
                              <div className="text-[10px] text-sky-400 font-mono">
                                Kode: {item.customerCode}
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-400 font-mono italic">
                                CUSTOMER BELUM DITENTUKAN
                              </div>
                            )}
                          </td>

                          <td className="p-4 max-w-xs">
                            <div className="font-bold text-white truncate">{item.recipientName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{item.recipientArea}</div>
                          </td>

                          <td className="p-4 text-center font-mono text-slate-300">
                            {item.weightKg} kg ({item.koliCount} koli)
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            Rp {item.totalShippingFee.toLocaleString('id-ID')}
                          </td>

                          <td className="p-4 text-center whitespace-nowrap space-x-1.5">
                            {item.customerId ? (
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                                TERHUBUNG
                              </span>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800/60 rounded text-[10px] font-bold">
                                  BELUM TERHUBUNG
                                </span>
                                <button
                                  onClick={() => handleOpenLinkModal(item)}
                                  className="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/60 rounded text-[10px] font-bold transition inline-block"
                                >
                                  Tentukan Customer
                                </button>
                              </>
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
        </div>
      ) : (
        /* TAB 2: DAFTAR INVOICE */
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-sky-950/60 text-sky-400 rounded-xl border border-sky-800/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Total Invoice</div>
                <div className="text-lg font-bold font-mono text-white">
                  {invoiceSummary.totalInvoiceCount} Invoice
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/40">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Belum Bayar</div>
                <div className="text-lg font-bold font-mono text-amber-300">
                  {invoiceSummary.issuedCount} Invoice
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/40">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Partial</div>
                <div className="text-lg font-bold font-mono text-indigo-300">
                  {invoiceSummary.partialCount} Invoice
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Lunas</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {invoiceSummary.paidCount} Invoice
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="p-2.5 bg-red-950/60 text-red-400 rounded-xl border border-red-800/40">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Outstanding</div>
                <div className="text-lg font-bold font-mono text-red-400">
                  Rp {invoiceSummary.totalOutstandingSum.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Tanggal Awal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">Status Invoice</label>
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
              >
                <option value="ALL">Semua Status</option>
                <option value="ISSUED">BELUM BAYAR (ISSUED)</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="PAID">LUNAS (PAID)</option>
                <option value="CANCELLED">VOID (CANCELLED)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">Cari Invoice / Customer</label>
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Cari no. invoice / customer..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>
          </div>

          {/* Table Invoices */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <span>Memuat daftar invoice...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">Belum ada invoice pada periode ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4">Invoice No</th>
                      <th className="p-4">Tanggal & Due Date</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4 text-center">Jumlah Resi</th>
                      <th className="p-4 text-right">Total Invoice</th>
                      <th className="p-4 text-right">Terbayar</th>
                      <th className="p-4 text-right">Outstanding</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                          <Link
                            href={`/finance/invoices/${inv.invoiceId}`}
                            className="hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>

                        <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                          <div>{inv.invoiceDate}</div>
                          <div className="text-[10px] text-amber-400">Due: {inv.dueDate}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-white">{inv.customerName}</div>
                          {inv.customerCode && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              ({inv.customerCode})
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center font-mono font-bold text-slate-300">
                          {inv.itemCount} Resi
                        </td>

                        <td className="p-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          Rp {inv.totalAmount.toLocaleString('id-ID')}
                        </td>

                        <td className="p-4 text-right font-mono text-emerald-400 whitespace-nowrap">
                          Rp {inv.paidAmount.toLocaleString('id-ID')}
                        </td>

                        <td className="p-4 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                          Rp {inv.outstandingAmount.toLocaleString('id-ID')}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          {inv.status === 'PAID' ? (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-bold">
                              LUNAS (PAID)
                            </span>
                          ) : inv.status === 'PARTIAL' ? (
                            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[10px] font-bold">
                              PARTIAL
                            </span>
                          ) : inv.status === 'ISSUED' ? (
                            <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/60 rounded text-[10px] font-bold">
                              ISSUED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold">
                              {inv.status}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap space-x-1.5">
                          <Link
                            href={`/finance/invoices/${inv.invoiceId}`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </Link>

                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar</span>
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
        </div>
      )}

      {/* Modal: Create Invoice */}
      {isCreateModalOpen && selectedItems.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>BUAT INVOICE PENAGIHAN</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{selectedItems[0].customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Resi Dipilih:</span>
                <span className="font-bold text-sky-400">{selectedItems.length} Resi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal Ongkir:</span>
                <span className="font-bold text-emerald-400">
                  Rp {selectedTotalFee.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tanggal Invoice *</label>
                  <input
                    type="date"
                    required
                    value={createInvoiceDate}
                    onChange={(e) => setCreateInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Jatuh Tempo (Due Date) *</label>
                  <input
                    type="date"
                    required
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Diskon (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={createDiscount}
                  onChange={(e) => setCreateDiscount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Catatan / Instruksi Pembayaran</label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Contoh: Pembayaran ke rekening BCA HDL LOGISTIK A/N..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingInvoice && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Proses Buat Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Catat Pembayaran Invoice */}
      {isPaymentModalOpen && targetPaymentInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>PEMBAYARAN INVOICE</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice No:</span>
                <span className="font-bold text-sky-400">{targetPaymentInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{targetPaymentInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Invoice:</span>
                <span>Rp {targetPaymentInvoice.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sudah Dibayar:</span>
                <span className="text-emerald-400">
                  Rp {targetPaymentInvoice.paidAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                <span className="text-red-400">Sisa Tagihan (Outstanding):</span>
                <span className="text-red-400">
                  Rp {targetPaymentInvoice.outstandingAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nominal Pembayaran (Rp) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={targetPaymentInvoice.outstandingAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Metode Pembayaran *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'TRANSFER')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="CASH">CASH (Tunai)</option>
                  <option value="TRANSFER">TRANSFER (Rekening Bank)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. Referensi / No. Bukti</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Contoh: TRF-BCA-987123"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Catatan</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingPayment && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Simpan Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tentukan Customer (Legacy Link) */}
      {isLinkModalOpen && targetLinkItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <span>TENTUKAN CUSTOMER PENAGIHAN</span>
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Resi:</span>
                <span className="font-bold text-sky-400">{targetLinkItem.resiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pengirim (History):</span>
                <span className="font-bold text-white">{targetLinkItem.senderName}</span>
              </div>
            </div>

            <form onSubmit={handleSaveLinkCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Customer Penagihan *
                </label>
                <select
                  required
                  value={selectedLinkCustomerId}
                  onChange={(e) => setSelectedLinkCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  <option value="">-- Pilih Customer Penagihan --</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerCode} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingLink || !selectedLinkCustomerId}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingLink && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Simpan Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
