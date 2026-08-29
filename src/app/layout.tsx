import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HDL LOGISTIK V2',
  description: 'Web Application Operasional Perusahaan Logistik HDL LOGISTIK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
