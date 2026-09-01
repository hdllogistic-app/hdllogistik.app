'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Edit2,
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
} from 'lucide-react';

interface CustomerItem {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  active: boolean;
  totalManifests: number;
  totalInvoices: number;
  createdAt: string;
}

export function CustomerSettingsView() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('searchQuery', searchQuery.trim());

    try {
      const res = await fetch(`/api/settings/customers?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        setErrorMessage(data.error || 'Gagal memuat data customer.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormCode(`CUST${String(customers.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormCode(c.customerCode);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormAddress(c.address);
    setFormActive(c.active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const isEdit = !!editingCustomer;
    const url = isEdit ? `/api/settings/customers/${editingCustomer.id}` : '/api/settings/customers';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerCode: formCode.trim(),
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          address: formAddress.trim(),
          active: formActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Data customer berhasil disimpan.');
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan customer.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-bold mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pengaturan System</span>
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-sky-400" />
            <span>Master Data Customer Penagihan</span>
          </h1>
          <p className="text-xs text-slate-400">
            Kelola kode customer, nama penagihan invoice, kontak, dan alamat penagihan resmi.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Customer Baru</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline text-red-400">
            Tutup
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs underline text-emerald-400">
            Tutup
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode / nama customer / phone..."
            className="w-full bg-transparent border-none text-white focus:outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="text-slate-400 font-mono text-xs">
          Total: <strong className="text-white">{customers.length}</strong> Customer
        </div>
      </div>

      {/* Customer List Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span>Memuat master customer...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="font-semibold text-slate-400">Belum ada customer terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-xl space-y-3 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800/60 font-mono text-[10px] font-bold rounded">
                      {c.customerCode}
                    </span>
                    {c.active ? (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold rounded">
                        AKTIF
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded">
                        NON-AKTIF
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">{c.name}</h3>
                </div>

                <button
                  onClick={() => handleOpenEditModal(c)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl transition"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.phone}</span>
                </div>

                {c.email && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.email}</span>
                  </div>
                )}

                <div className="flex items-start gap-2 text-slate-400 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{c.address}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div>Manifest: <strong className="text-sky-400">{c.totalManifests}</strong></div>
                <div>Invoice: <strong className="text-emerald-400">{c.totalInvoices}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <span>{editingCustomer ? 'EDIT CUSTOMER' : 'TAMBAH CUSTOMER BARU'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kode Customer *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: CUST001"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Penagihan / Customer *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: PT HUTAMA DAYA LOGISTIK"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">No. HP / Telepon *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Penagihan</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="finance@company.com"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alamat Penagihan Resmi *</label>
                <textarea
                  rows={3}
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Alamat lengkap untuk penagihan invoice..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              {editingCustomer && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-active"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-sky-600 focus:ring-0"
                  />
                  <label htmlFor="chk-active" className="text-slate-300 font-semibold cursor-pointer">
                    Status Customer Aktif
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
