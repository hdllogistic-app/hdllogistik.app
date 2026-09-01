import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { InstallPromptSheet } from '@/components/pwa/InstallPromptSheet';

export const metadata: Metadata = {
  title: 'HDL LOGISTIK V2',
  description: 'Web Application Operasional Perusahaan Logistik HDL LOGISTIK',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HDL LOGISTIK',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-sky-500 selection:text-white bg-slate-950 text-slate-100">
        <ServiceWorkerRegister />
        {children}
        <InstallPromptSheet />
      </body>
    </html>
  );
}
