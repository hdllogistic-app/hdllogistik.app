'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();

  const isItemActive = (item: NavItem) => {
    return pathname === item.href;
  };

  const navSections: NavSection[] = [
    {
      title: 'Operasional',
      items: [
        { label: 'Dashboard', href: '/', exact: true },
        { label: 'Input Manifest', href: '/manifest/input', exact: true },
        { label: 'Rincian Manifest', href: '/manifest', exact: true },
        { label: 'Cek Manifest', href: '/manifest/check', badge: 'TRACK', exact: true },
        { label: 'Monitoring Delivery', href: '/monitoring/delivery', exact: true },
      ],
    },
    {
      title: 'Finance & Cashflow',
      items: [
        { label: 'Operasional Settlement', href: '/finance/operational-settlement', exact: true },
        { label: 'Payment', href: '/finance/payment', exact: true },
        { label: 'Invoice Penagihan', href: '/finance/invoices', exact: true },
        { label: 'Cashflow', href: '/finance/cashflow', exact: true },
        { label: 'Absensi', href: '/finance/attendance', exact: true },
        { label: 'Salary Closing', href: '/finance/salary-closing', exact: true },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { label: 'Master Customer', href: '/settings/customers', exact: true },
        { label: 'Database Ongkir', href: '/settings/shipping-rates', exact: true },
        { label: 'Pengaturan Team', href: '/settings/team', exact: true },
        { label: 'Pengaturan Armada', href: '/settings/vehicles', exact: true },
        { label: 'Pengaturan Akun', href: '/settings/accounts', exact: true },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/40 p-4 hidden md:block shrink-0">
      <nav className="space-y-4 text-sm">
        {navSections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md font-medium transition flex items-center justify-between ${
                    active
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        active
                          ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
