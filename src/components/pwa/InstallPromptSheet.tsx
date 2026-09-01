'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';

export function InstallPromptSheet() {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already running as Standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      return; // DO NOT show install sheet when already installed standalone
    }

    // 2. Check Local Persistence Dismissal (3 Days suppression if "Nanti" clicked)
    const lastDismissed = localStorage.getItem('hdl_install_dismissed_at');
    if (lastDismissed) {
      const elapsedMs = Date.now() - parseInt(lastDismissed, 10);
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      if (elapsedMs < THREE_DAYS_MS) {
        return;
      }
    }

    // 3. Detect iOS UserAgent
    const ua = window.navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIos(iosDevice);

    if (iosDevice) {
      // Show iOS instructions on first mobile visit
      setShowPrompt(true);
    } else {
      // Android / Desktop Chrome: Listen to beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('hdl_install_dismissed_at', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-slate-950/90 backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom))] animate-slideUp">
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl relative text-slate-100">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center shrink-0 border border-sky-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
              PWA INSTALLATION
            </span>
            <h3 className="text-sm font-black text-white">INSTALL HDL LOGISTIK</h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Pasang HDL LOGISTIK di layar utama HP agar lebih cepat dan nyaman digunakan seperti aplikasi.
        </p>

        {isIos ? (
          /* iOS Safari Installation Steps */
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-sky-800">
                1
              </span>
              <span>
                Tekan tombol <strong className="text-white">Bagikan (Share)</strong> <Share className="w-3.5 h-3.5 inline text-sky-400 ml-1" />
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-sky-800">
                2
              </span>
              <span>
                Pilih <strong className="text-white font-bold">&quot;Tambah ke Layar Utama&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline text-sky-400 ml-1" />
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-sky-800">
                3
              </span>
              <span>Tekan <strong className="text-white">Tambah</strong> di sudut kanan atas</span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
          >
            Nanti
          </button>

          {!isIos && deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Install Sekarang</span>
            </button>
          ) : isIos ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Mengerti</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
