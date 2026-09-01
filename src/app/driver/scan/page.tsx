'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Barcode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Truck,
  MapPin,
  Package,
  Keyboard,
  X,
  ShieldAlert,
  ChevronRight,
  Zap,
  ZapOff,
  Clock,
  UserCheck,
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface ScanResiPreview {
  resiNumber: string;
  deliveryId: string;
  manifestId: string;
  recipientName: string;
  recipientArea: string;
  recipientAddress: string;
  itemName: string;
  weightKg: number;
  koliCount: number;
  status: string;
  isEligibleForScan: boolean;
  isPendingRescan?: boolean;
  lastPendingReasonTitle?: string | null;
  previousDriverName?: string | null;
  isAssignedToSelf: boolean;
  isAssignedToOther: boolean;
  otherDriverName: string | null;
  statusMessage: string;
}

export default function DriverScanPage() {
  const router = useRouter();

  // Camera & Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Torch / Flashlight State
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Lock / Debounce state for scanning
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [scannedResi, setScannedResi] = useState<string | null>(null);
  const [detectedBadge, setDetectedBadge] = useState<boolean>(false);

  // Focus Helper Timer (>5 seconds warning)
  const [showSlowScanTip, setShowSlowScanTip] = useState<boolean>(false);

  // Resi Preview State
  const [preview, setPreview] = useState<ScanResiPreview | null>(null);
  const [loadingLookup, setLoadingLookup] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Assignment State
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignedDeliveryId, setAssignedDeliveryId] = useState<string | null>(null);

  // Manual Input State
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [manualResiInput, setManualResiInput] = useState<string>('');

  // Hard Stop Camera Streams & Detach Video Elements
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const startCameraSession = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak didukung oleh browser Anda.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        try {
          await videoRef.current.play();
        } catch (e) {
          console.log('Video play error ignored:', e);
        }
        setCameraActive(true);
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        // @ts-ignore
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        // @ts-ignore
        if (capabilities.torch) {
          setTorchSupported(true);
        }
      }
    } catch (err: any) {
      console.error('Camera Access Error:', err);
      setCameraError(
        'Kamera dibutuhkan untuk scan barcode. Aktifkan izin kamera pada browser lalu coba kembali.'
      );
    }
  };

  // 1. Start Camera Stream on Mount & Clean up on Unmount
  useEffect(() => {
    startCameraSession();

    return () => {
      stopCamera();
    };
  }, []);

  // 5-second slow scan tip timer
  useEffect(() => {
    let timer: any = null;
    if (cameraActive && !isLocked) {
      timer = setTimeout(() => {
        setShowSlowScanTip(true);
      }, 5000);
    } else {
      setShowSlowScanTip(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cameraActive, isLocked]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.error('Torch Toggle Error:', e);
      }
    }
  };

  // 2. Barcode Scanner Engine: Native BarcodeDetector + ZXing Fallback
  useEffect(() => {
    let intervalId: any = null;

    if (cameraActive && !isLocked) {
      let isNativeDetectorAvailable = false;

      // Primary: Native Browser BarcodeDetector API
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39'],
          });
          isNativeDetectorAvailable = true;

          intervalId = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4 && !isLocked) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue;
                  if (rawVal && rawVal.trim().toUpperCase().startsWith('HDL')) {
                    handleBarcodeDetected(rawVal.trim());
                  }
                }
              } catch (err) {
                // Ignore detection frame error
              }
            }
          }, 200);
        } catch (e) {
          isNativeDetectorAvailable = false;
        }
      }

      // Secondary Fallback Engine: @zxing/library
      if (!isNativeDetectorAvailable && videoRef.current) {
        try {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const codeReader = new BrowserMultiFormatReader(hints);
          codeReader
            .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
              if (result && !isLocked) {
                const text = result.getText();
                if (text && text.trim().toUpperCase().startsWith('HDL')) {
                  handleBarcodeDetected(text.trim());
                }
              }
            })
            .catch((e) => {
              console.log('ZXing decode init error:', e);
            });
        } catch (err) {
          console.error('ZXing Engine Error:', err);
        }
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraActive, isLocked]);

  const handleBarcodeDetected = (rawResi: string) => {
    if (isLocked) return;
    setIsLocked(true); // Lock scanner immediately to prevent duplicate requests

    // HARD-STOP CAMERA IMMEDIATELY ON DETECTION
    stopCamera();

    const cleanResi = rawResi.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setScannedResi(cleanResi);
    setDetectedBadge(true);

    // Vibration Feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch (e) {}
    }

    performLookup(cleanResi);
  };

  const performLookup = async (resi: string) => {
    setLoadingLookup(true);
    setLookupError(null);
    setPreview(null);
    setAssignSuccessMessage(null);
    setAssignError(null);

    try {
      const res = await fetch(`/api/driver/scan/lookup?resi=${encodeURIComponent(resi)}`);
      const data = await res.json();

      if (data.success) {
        setPreview(data);
      } else {
        setLookupError(data.error || 'Resi tidak ditemukan.');
      }
    } catch {
      setLookupError('Terjadi kesalahan koneksi saat mencari resi.');
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!scannedResi) return;

    setAssigning(true);
    setAssignError(null);

    try {
      const res = await fetch('/api/driver/scan/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resiNumber: scannedResi }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.alreadyAssignedToSelf && !data.isPendingReactivation) {
          setAssignSuccessMessage('Paket ini sudah ada di Delivery Anda.');
        } else {
          setAssignSuccessMessage(data.message || `✓ PAKET MASUK DELIVERY: ${scannedResi}`);
        }
        setAssignedDeliveryId(data.deliveryId || null);
        setPreview(null);
      } else {
        setAssignError(data.error || 'Gagal menjadwalkan paket.');
      }
    } catch {
      setAssignError('Terjadi kesalahan koneksi saat menjadwalkan paket.');
    } finally {
      setAssigning(false);
    }
  };

  const handleScanNext = () => {
    setIsLocked(false);
    setDetectedBadge(false);
    setScannedResi(null);
    setPreview(null);
    setLookupError(null);
    setAssignSuccessMessage(null);
    setAssignError(null);
    setAssignedDeliveryId(null);
    setManualResiInput('');
    setIsManualOpen(false);
    setShowSlowScanTip(false);
    startCameraSession();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualResiInput.trim()) return;
    const clean = manualResiInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setIsManualOpen(false);
    handleBarcodeDetected(clean);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={() => router.push('/driver')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Menu Utama</span>
        </button>

        <h1 className="text-sm font-black text-white flex items-center gap-1.5">
          <Barcode className="w-4 h-4 text-sky-400" />
          <span>SCAN PAKET RESI</span>
        </h1>
      </div>

      {/* SUCCESS ASSIGNMENT CARD */}
      {assignSuccessMessage && (
        <div className="p-5 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-800/80 rounded-2xl space-y-3 shadow-2xl">
          <div className="flex items-center gap-3 text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <span className="block font-black text-white text-base">{assignSuccessMessage}</span>
              <span className="text-xs text-emerald-300 font-mono">Resi: {scannedResi}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/50">
            <button
              type="button"
              onClick={handleScanNext}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Paket Berikutnya</span>
            </button>

            {assignedDeliveryId ? (
              <Link
                href={`/driver/delivery/${assignedDeliveryId}`}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Truck className="w-4 h-4 text-sky-400" />
                <span>Buka Delivery</span>
              </Link>
            ) : (
              <Link
                href="/driver/delivery"
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Truck className="w-4 h-4 text-sky-400" />
                <span>Daftar Delivery</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* CAMERA SCANNER VIEWPORT WITH WIDE 1D SCAN BOX & TORCH */}
      {!assignSuccessMessage && (
        <div className="relative w-full aspect-[4/3] bg-black border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

          {/* WIDE 1D BARCODE SCANNER OVERLAY BOX (~90% WIDTH) */}
          <div className="absolute inset-0 border-[3px] border-sky-400/30 rounded-2xl pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="w-[92%] h-28 border-2 border-sky-400 rounded-2xl bg-sky-500/10 relative flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.4)]">
              <div className="w-full h-0.5 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse" />
              <span className="absolute bottom-2 text-[10px] font-bold text-sky-200 tracking-wider uppercase bg-slate-950/80 px-2 py-0.5 rounded">
                Arahkan barcode ke dalam kotak
              </span>
            </div>

            <span className="text-[11px] font-bold text-slate-200 bg-slate-950/90 px-3.5 py-1 rounded-full mt-3 border border-slate-800 shadow-md">
              {detectedBadge
                ? `✓ Barcode ditemukan: ${scannedResi}`
                : isLocked
                ? 'Scanning Diproses...'
                : 'Mencari barcode...'}
            </span>
          </div>

          {/* Flashlight Torch Toggle */}
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`absolute top-3 right-3 p-2.5 rounded-full border shadow-xl transition ${
                torchOn
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <Camera className="w-10 h-10 text-red-400 mb-1" />
              <p className="text-xs text-red-200 font-semibold">{cameraError}</p>
            </div>
          )}
        </div>
      )}

      {/* FOCUS UX TIPS & SLOW SCAN ASSISTANT */}
      {!assignSuccessMessage && (
        <div className="space-y-2">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold">💡 Jaga jarak ±15–30 cm dari barcode.</span>
            {torchSupported && (
              <span className="text-slate-400 font-mono text-[10px]">
                {torchOn ? 'Flash On' : 'Gunakan Flash jika gelap'}
              </span>
            )}
          </div>

          {showSlowScanTip && !isLocked && (
            <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-center justify-between animate-fadeIn">
              <span>Sulit membaca barcode? Dekatkan kamera atau gunakan input manual.</span>
              <button
                type="button"
                onClick={() => setIsManualOpen(true)}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] shrink-0 ml-2"
              >
                Manual
              </button>
            </div>
          )}
        </div>
      )}

      {/* MANUAL RESI INPUT TRIGGER */}
      {!assignSuccessMessage && (
        <div className="flex justify-between items-center px-1 pt-1">
          <span className="text-xs text-slate-400 font-semibold">Barcode rusak / pudar?</span>
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
          >
            <Keyboard className="w-4 h-4" />
            <span>Masukkan Nomor Resi Manual</span>
          </button>
        </div>
      )}

      {/* RESI PREVIEW CARD & CONFIRMATION */}
      {loadingLookup && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
          <span className="text-xs text-slate-400 font-mono">Mencari data resi {scannedResi}...</span>
        </div>
      )}

      {lookupError && !loadingLookup && (
        <div className="p-5 bg-red-950/60 border border-red-800/60 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{lookupError}</span>
          </div>
          <button
            type="button"
            onClick={handleScanNext}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-800"
          >
            Scan Lagi
          </button>
        </div>
      )}

      {preview && !loadingLookup && !assignSuccessMessage && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {preview.isPendingRescan ? 'PAKET PENDING TERDETEKSI' : 'BARCODE TERDETEKSI'}
              </span>
              <span className="text-base font-black text-sky-400 font-mono tracking-wider">
                {preview.resiNumber}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                preview.status === 'PENDING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  : preview.isEligibleForScan
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {preview.status}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Penerima</span>
              <span className="font-bold text-white text-sm">{preview.recipientName}</span>
            </div>

            <div className="flex items-start gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>
                {preview.recipientAddress} ({preview.recipientArea})
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span>Barang: <strong className="text-white">{preview.itemName}</strong></span>
              <span>•</span>
              <span>{preview.weightKg} kg</span>
              <span>•</span>
              <span>{preview.koliCount} koli</span>
            </div>

            {/* Pending Extra Metadata */}
            {preview.isPendingRescan && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1 text-amber-200 text-xs font-mono">
                {preview.lastPendingReasonTitle && (
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-sans font-bold">Pending Terakhir:</span>
                    <strong className="text-white font-bold">{preview.lastPendingReasonTitle}</strong>
                  </div>
                )}
                {preview.previousDriverName && (
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-sans font-bold">Driver Sebelumnya:</span>
                    <span className="text-white font-bold">{preview.previousDriverName}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] font-semibold text-sky-300 pt-1">
              {preview.statusMessage}
            </p>
          </div>

          {assignError && (
            <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{assignError}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleScanNext}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
            >
              Batal
            </button>

            {preview.isEligibleForScan && (
              <button
                type="button"
                disabled={assigning}
                onClick={handleConfirmAssignment}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 disabled:opacity-40 flex items-center justify-center gap-2 transition"
              >
                {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {preview.isPendingRescan
                    ? preview.isAssignedToSelf
                      ? 'Mulai Delivery Ulang'
                      : 'Jadwalkan Delivery Ulang'
                    : 'Jadwalkan ke Saya'}
                </span>
              </button>
            )}

            {!preview.isEligibleForScan && preview.isAssignedToSelf && (
              <Link
                href={`/driver/delivery/${preview.deliveryId}`}
                className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20"
              >
                <span>Buka Detail</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* MANUAL INPUT MODAL / DRAWER */}
      {isManualOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-sky-400" />
                <span>INPUT RESI MANUAL</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nomor Resi *
                </label>
                <input
                  type="text"
                  required
                  value={manualResiInput}
                  onChange={(e) => setManualResiInput(e.target.value)}
                  placeholder="Contoh: HDL2608310001"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-base uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!manualResiInput.trim()}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 disabled:opacity-40"
                >
                  Cari Resi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
