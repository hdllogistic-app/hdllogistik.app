'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PrintTriggerProps {
  manifestId: string;
  autoPrint?: boolean;
}

export function PrintTrigger({ manifestId, autoPrint }: PrintTriggerProps) {
  const router = useRouter();
  const [printing, setPrinting] = useState(false);
  const hasAutoPrintedRef = useRef(false);

  const handleExecutePrint = async () => {
    if (printing) return;
    setPrinting(true);

    try {
      // Explicit POST to log print request and create audit log
      await fetch(`/api/manifests/${manifestId}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Trigger browser print dialog
      window.print();
    } catch (err) {
      console.error('Failed to log print request:', err);
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    if (autoPrint && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;

      // Immediately consume and normalize URL to strip ?autoprint=1
      // Prevents re-triggering auto-print or extra logging on browser refresh
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      const timer = setTimeout(() => {
        handleExecutePrint();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print:hidden">
      <button
        onClick={() => router.back()}
        disabled={printing}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali</span>
      </button>

      <button
        onClick={handleExecutePrint}
        disabled={printing}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
      >
        {printing ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        <span>Cetak Resi (Print)</span>
      </button>
    </div>
  );
}
