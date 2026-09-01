import React, { Suspense } from 'react';
import { ManifestCheckView } from './ManifestCheckView';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Cek Manifest / Internal Tracking | HDL LOGISTIK V2',
  description: 'Halaman pelacakan internal pengiriman resi manifest HDL LOGISTIK.',
};

export default function ManifestCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
          <p className="text-sm text-slate-400">Memuat halaman Cek Manifest...</p>
        </div>
      }
    >
      <ManifestCheckView />
    </Suspense>
  );
}
