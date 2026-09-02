import React from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeaderToolbar } from '@/components/layout/AdminHeaderToolbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans antialiased">
      {/* Desktop Sidebar - Sole Main Brand Area */}
      <AdminSidebar />

      {/* Main Content Area with Top Search Header */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Horizontal Utility / Search Header */}
        <AdminHeaderToolbar />

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
