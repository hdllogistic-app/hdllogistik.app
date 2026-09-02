'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FilePlus,
  Receipt,
  Search,
  Truck,
  Wallet,
  CreditCard,
  FileText,
  BarChart3,
  CalendarCheck,
  DollarSign,
  Settings,
  Users,
  Database,
  UserCog,
  Car,
  Shield,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SubMenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  exact?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: SubMenuItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();

  // Accordion Group State: Only ONE main group open at a time
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Full Sidebar Minimize State
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Auto-expand group based on active route
  useEffect(() => {
    if (pathname.startsWith('/finance')) {
      setOpenGroup('FINANCE');
    } else if (
      pathname === '/manifest/input' ||
      pathname === '/manifest' ||
      pathname.startsWith('/manifest/check') ||
      pathname === '/monitoring/delivery'
    ) {
      setOpenGroup('OPERASIONAL');
    } else if (pathname.startsWith('/settings')) {
      setOpenGroup('PENGATURAN');
    } else {
      setOpenGroup(null);
    }
  }, [pathname]);

  // Read saved collapsed state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hdl_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebarCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hdl_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroup((prev) => (prev === groupId ? null : groupId));
  };

  const isSubActive = (item: SubMenuItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  };

  const menuGroups: MenuGroup[] = [
    {
      id: 'OPERASIONAL',
      label: 'Operasional',
      icon: Package,
      items: [
        { label: 'Input Manifest', href: '/manifest/input', icon: FilePlus, exact: true },
        { label: 'Rincian Manifest', href: '/manifest', icon: Receipt, exact: true },
        { label: 'Cek Manifest', href: '/manifest/check', icon: Search, badge: 'TRACK', exact: true },
        { label: 'Monitoring Delivery', href: '/monitoring/delivery', icon: Truck, exact: true },
      ],
    },
    {
      id: 'FINANCE',
      label: 'Finance & Cashflow',
      icon: Wallet,
      items: [
        { label: 'Operasional Settlement', href: '/finance/operational-settlement', icon: Receipt, exact: true },
        { label: 'Payment', href: '/finance/payment', icon: CreditCard, exact: true },
        { label: 'Invoice Penagihan', href: '/finance/invoices', icon: FileText, exact: true },
        { label: 'Cashflow', href: '/finance/cashflow', icon: BarChart3, exact: true },
        { label: 'Absensi', href: '/finance/attendance', icon: CalendarCheck, exact: true },
        { label: 'Salary Closing', href: '/finance/salary-closing', icon: DollarSign, exact: true },
      ],
    },
    {
      id: 'PENGATURAN',
      label: 'Pengaturan',
      icon: Settings,
      items: [
        { label: 'Master Customer', href: '/settings/customers', icon: Users, exact: true },
        { label: 'Database Ongkir', href: '/settings/shipping-rates', icon: Database, exact: true },
        { label: 'Pengaturan Team', href: '/settings/team', icon: UserCog, exact: true },
        { label: 'Pengaturan Armada', href: '/settings/vehicles', icon: Car, exact: true },
        { label: 'Pengaturan Akun', href: '/settings/accounts', icon: Shield, exact: true },
      ],
    },
  ];

  const isDashboardActive = pathname === '/';

  return (
    <aside
      className={`border-r border-slate-800 bg-slate-950/60 p-3 hidden md:flex flex-col justify-between shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] overflow-y-auto`}
    >
      <div className="space-y-4">
        {/* Collapse Control Toggle Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'} pt-1 pb-2 border-b border-slate-800/80`}>
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Menu Navigasi
            </span>
          )}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shadow-sm"
            title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 text-xs">
          {/* STANDALONE DASHBOARD ITEM */}
          <Link
            href="/"
            title={isCollapsed ? 'Dashboard' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition ${
              isCollapsed ? 'justify-center' : ''
            } ${
              isDashboardActive
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${isDashboardActive ? 'text-sky-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          {/* ACCORDION MENU GROUPS */}
          {menuGroups.map((group) => {
            const isOpen = openGroup === group.id;
            const hasActiveChild = group.items.some((item) => isSubActive(item));

            return (
              <div key={group.id} className="pt-1">
                {/* Group Accordion Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setOpenGroup(group.id);
                    } else {
                      toggleGroup(group.id);
                    }
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`submenu-${group.id}`}
                  title={isCollapsed ? group.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    isOpen || hasActiveChild
                      ? 'bg-slate-900 text-white border border-slate-800 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <group.icon
                      className={`w-4 h-4 shrink-0 ${
                        hasActiveChild ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{group.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-sky-400' : '-rotate-90'
                      }`}
                    />
                  )}
                </button>

                {/* Submenu Drawer (Visible when Expanded and Sidebar is not Collapsed) */}
                {isOpen && !isCollapsed && (
                  <div
                    id={`submenu-${group.id}`}
                    className="pl-3 mt-1 space-y-1 border-l border-slate-800 ml-4 animate-fadeIn"
                  >
                    {group.items.map((sub) => {
                      const active = isSubActive(sub);
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition ${
                            active
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold shadow-sm'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                              }`}
                            />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {sub.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="pt-3 border-t border-slate-800/80 mt-auto">
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
          } rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-xs shrink-0">
              HG
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-slate-200 block truncate leading-tight">
                  Hadi Gustian
                </span>
                <span className="text-[10px] text-sky-400 font-mono font-medium block truncate">
                  OWNER
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Keluar dari Admin Web"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
