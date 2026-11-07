"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, RefreshCw, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { playBeepSound } from "@/lib/sound";

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScanSuccess,
}: CameraBarcodeScannerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const [scannerReady, setScannerReady] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const lastScannedTimeRef = useRef<number>(0);

  // Penanganan saat barcode berhasil terdeteksi
  const handleDecoded = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Debounce 1.5 detik agar tidak ter-scan berulang-ulang
      if (now - lastScannedTimeRef.current < 1500) return;
      lastScannedTimeRef.current = now;

      // Haptic getar HP & bunyi beep kasir
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(100);
        } catch {
          // ignore
        }
      }
      playBeepSound();

      setScannedCode(decodedText);

      setTimeout(() => {
        onScanSuccess(decodedText);
      }, 400);
    },
    [onScanSuccess]
  );

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isCancelled = false;

    async function initScanner() {
      try {
        setErrorMessage(null);
        setScannedCode(null);
        setScannerReady(false);

        const devices = await Html5Qrcode.getCameras();
        if (isCancelled) return;

        if (devices && devices.length > 0) {
          setCameras(devices);

          // Coba temukan kamera belakang utama
          const backCam = devices.find((d) => {
            const lbl = (d.label || "").toLowerCase();
            return (
              (lbl.includes("back") || lbl.includes("belakang") || lbl.includes("wide") || lbl.includes("0")) &&
              !lbl.includes("tele") &&
              !lbl.includes("ultra")
            );
          }) || devices[devices.length - 1];

          setSelectedCameraId(backCam.id);

          html5QrCode = new Html5Qrcode("camera-scanner-view", {
            verbose: false,
            // JANGAN gunakan useBarCodeDetectorIfSupported di iOS Safari karena melempar TypeError pada 1D barcode
          });

          scannerRef.current = html5QrCode;

          // Gunakan camera ID atau facingMode: environment
          const cameraConfig = backCam?.id ? backCam.id : { facingMode: "environment" };

          await html5QrCode.start(
            cameraConfig,
            {
              fps: 12, // 12 FPS optimal untuk decoding tanpa memberatkan CPU mobile
              // Tidak menggunakan qrbox ketat agar full-frame dipindai (quiet zone tidak terpotong)
              aspectRatio: 1.333333,
            },
            (text) => handleDecoded(text),
            () => {} // Abaikan frame kosong saat mengamati
          );

          if (!isCancelled) {
            isRunningRef.current = true;
            setScannerReady(true);
          }
        } else {
          setErrorMessage("Tidak ada perangkat kamera yang terdeteksi di perangkat Anda.");
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : "Gagal mengaktifkan kamera";
        setErrorMessage("Izin kamera ditolak atau sedang digunakan aplikasi lain: " + msg);
      }
    }

    initScanner();

    return () => {
      isCancelled = true;
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            isRunningRef.current = false;
          })
          .catch((e) => console.warn("Stop scanner error:", e));
      }
    };
  }, [isOpen, handleDecoded]);

  // Ganti Kamera Manual
  const handleSwitchCamera = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (scannerRef.current && isRunningRef.current) {
      try {
        setScannerReady(false);
        await scannerRef.current.stop();
        await scannerRef.current.start(
          newCamId,
          {
            fps: 12,
            aspectRatio: 1.333333,
          },
          (text) => handleDecoded(text),
          () => {}
        );
        setScannerReady(true);
      } catch (e) {
        console.warn("Gagal beralih kamera:", e);
      }
    }
  };

  // Submit barcode manual dari modal
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playBeepSound();
    onScanSuccess(manualInput.trim());
    setManualInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-700/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Style Animasi Laser Bergerak */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes sweepLaser {
              0% { top: 15%; opacity: 0.9; }
              50% { top: 85%; opacity: 1; }
              100% { top: 15%; opacity: 0.9; }
            }
            .animate-laser-sweep {
              animation: sweepLaser 2s ease-in-out infinite;
            }
          `
        }} />

        {/* Header Modal */}
        <div className="bg-slate-950/90 px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Pemindai Barcode Kamera HP</h3>
              <p className="text-[11px] text-slate-400">
                {scannerReady ? "Kamera Aktif • Arahkan ke Barcode" : "Menghubungkan ke Lensa Kamera..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Scanner Kamera */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-inner">
            <div id="camera-scanner-view" className="w-full h-full object-cover" />

            {/* Kotak Bidik Target & Garis Laser Bergerak */}
            <div className="absolute inset-4 pointer-events-none flex flex-col items-center justify-center">
              {/* Sudut-sudut Target Bidik (Reticle Corner) */}
              <div className="absolute top-2 left-2 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Garis Laser Bergerak Naik Turun */}
              <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_14px_#f43f5e] animate-laser-sweep">
                <div className="w-full h-full bg-rose-400 blur-xs" />
              </div>

              {/* Status Sukses Scan */}
              {scannedCode && (
                <div className="absolute inset-0 bg-emerald-600/60 backdrop-blur-xs flex items-center justify-center animate-in zoom-in-75 duration-150">
                  <div className="px-5 py-2.5 bg-white text-emerald-900 rounded-2xl shadow-2xl flex items-center gap-2 font-mono font-black text-sm border-2 border-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{scannedCode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 text-left w-full">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pemilih Lensa Kamera (Penting untuk HP multi-kamera) */}
          {cameras.length > 1 && (
            <div className="mt-3 w-full bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block font-semibold mb-0.5">
                  Lensa Kamera: (Ganti jika buram saat didekatkan)
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${cam.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Form Input Manual Darurat (Anti-Gagal Jika Layar Monitor Silau) */}
          <form onSubmit={handleManualSubmit} className="mt-3 w-full flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <input
              type="text"
              placeholder="Atau ketik/paste barcode di sini..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono font-bold placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0"
            >
              <span>Input</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Tips Pemindaian Barcode */}
          <div className="mt-2.5 text-[11px] text-slate-400 flex items-center gap-1.5 w-full bg-slate-800/40 p-2 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Tips: Beri jarak 15–25 cm. Jika memotret layar monitor, kurangi kecerahan monitor agar tidak silau/pantul.</span>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">EAN-13 • CODE-128 • QR</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
