"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const lastScannedTimeRef = useRef<number>(0);

  // Callback penanganan scan sukses
  const handleDecoded = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Debounce 1.5 detik agar tidak men-scan dobel bertubi-tubi
      if (now - lastScannedTimeRef.current < 1500) return;
      lastScannedTimeRef.current = now;

      // Haptic feedback & efek suara scanner kasir
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(80);
        } catch {
          // ignore
        }
      }
      playBeepSound();

      setScannedCode(decodedText);

      setTimeout(() => {
        onScanSuccess(decodedText);
      }, 350);
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

        const devices = await Html5Qrcode.getCameras();
        if (isCancelled) return;

        if (devices && devices.length > 0) {
          setCameras(devices);

          // PILIH KAMERA TERBAIK:
          // Di iPhone / Android multi-kamera, hindari kamera "telephoto" / "tele" / "ultra-wide"
          // karena telephoto tidak bisa fokus dekat pada barcode. Pilih kamera "wide" / "main" / kamera belakang utama.
          let bestCam = devices[0].id;
          const wideOrBackCam = devices.find((d) => {
            const lbl = (d.label || "").toLowerCase();
            return (
              (lbl.includes("back") || lbl.includes("belakang") || lbl.includes("wide") || lbl.includes("0")) &&
              !lbl.includes("tele") &&
              !lbl.includes("ultra")
            );
          });

          if (wideOrBackCam) {
            bestCam = wideOrBackCam.id;
          } else {
            // Fallback kamera belakang terakhir jika tidak ada nama
            bestCam = devices[devices.length - 1].id;
          }

          setSelectedCameraId(bestCam);

          html5QrCode = new Html5Qrcode("camera-scanner-view", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true, // Gunakan hardware detector native browser (iOS Safari / Chrome)
            },
          });

          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            bestCam,
            {
              fps: 20,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                // Kotak bidik fleksibel: lebar 85%, tinggi 55% untuk membaca barcode 1D garis
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                return {
                  width: Math.min(Math.floor(viewfinderWidth * 0.88), 340),
                  height: Math.min(Math.floor(minEdge * 0.6), 200),
                };
              },
              aspectRatio: 1.333333,
            },
            (text) => handleDecoded(text),
            () => {} // Abaikan frame kosong
          );
          isRunningRef.current = true;
        } else {
          setErrorMessage("Tidak ada perangkat kamera yang terdeteksi di laptop/HP Anda.");
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : "Gagal mengaktifkan kamera";
        setErrorMessage("Izin kamera belum aktif atau sedang digunakan aplikasi lain: " + msg);
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
        await scannerRef.current.stop();
        await scannerRef.current.start(
          newCamId,
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.min(Math.floor(viewfinderWidth * 0.88), 340),
                height: Math.min(Math.floor(minEdge * 0.6), 200),
              };
            },
            aspectRatio: 1.333333,
          },
          (text) => handleDecoded(text),
          () => {}
        );
      } catch (e) {
        console.warn("Gagal beralih kamera:", e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-700/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Style Animasi Laser Bergerak */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes sweepLaser {
              0% { top: 12%; opacity: 0.9; }
              50% { top: 88%; opacity: 1; }
              100% { top: 12%; opacity: 0.9; }
            }
            .animate-laser-sweep {
              animation: sweepLaser 2s ease-in-out infinite;
            }
          `
        }} />

        {/* Header Modal */}
        <div className="bg-slate-950/80 px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Pemindai Barcode Kamera</h3>
              <p className="text-[11px] text-slate-400">Arahkan barcode fisik tepat di garis laser pemindai</p>
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
              <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Garis Laser Bergerak Naik Turun */}
              <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-laser-sweep">
                <div className="w-full h-full bg-rose-400 blur-xs" />
              </div>

              {/* Status Sukses Scan */}
              {scannedCode && (
                <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center animate-in zoom-in-75 duration-150">
                  <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-xl flex items-center gap-2 font-mono font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-white" />
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
                  Pilih Lensa Kamera (Gunakan Kamera Belakang Biasa / Wide):
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

          {/* Tips Pemindaian Barcode */}
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5 w-full bg-slate-800/40 p-2 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Posisikan barcode sejajar horizontal pada garis laser merah, jarak 10–20 cm dari lensa.</span>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
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
