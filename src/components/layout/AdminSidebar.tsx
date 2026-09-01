'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Search,
  Truck,
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  CalendarCheck,
  Award,
  Users,
  Database,
  UserCheck,
  Car,
  Settings,
  User,
} from 'lucide-react';

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
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href;
  };

  const navSections: NavSection[] = [
    {
      title: 'OPERASIONAL',
      items: [
        { label: 'Dashboard', href: '/', exact: true },
        { label: 'Input Manifest', href: '/manifest/input', exact: true },
        { label: 'Rincian Manifest', href: '/manifest', exact: true },
        { label: 'Cek Manifest', href: '/manifest/check', badge: 'TRACK', exact: true },
        { label: 'Monitoring Delivery', href: '/monitoring/delivery', exact: true },
      ],
    },
    {
      title: 'FINANCE & CASHFLOW',
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
      title: 'PENGATURAN',
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
    <aside className="w-64 border-r border-[#262626] bg-[#151515] p-4 hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        {/* Navigation Sections */}
        <nav className="space-y-5 text-xs">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-lg font-medium transition flex items-center justify-between ${
                      active
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold shadow-sm'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          active
                            ? 'bg-amber-400 text-[#151515]'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
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
      </div>

      {/* Bottom User Profile Card */}
      <div className="pt-4 border-t border-neutral-800/80">
        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0 text-xs">
            AD
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-bold text-white block truncate">Admin Operational</span>
            <span className="text-[10px] text-neutral-400 font-mono block">HDL Admin Web</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
