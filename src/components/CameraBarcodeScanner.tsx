"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw, AlertCircle } from "lucide-react";

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode: Html5Qrcode | null = null;

    async function initScanner() {
      try {
        setErrorMessage(null);
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const defaultCam = devices[devices.length - 1].id; // Back camera jika HP
          setSelectedCameraId(defaultCam);

          html5QrCode = new Html5Qrcode("camera-scanner-view", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.UPC_A,
            ],
            verbose: false,
          });

          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            defaultCam,
            {
              fps: 15,
              qrbox: { width: 260, height: 160 },
              aspectRatio: 1.333333,
            },
            (decodedText) => {
              if (onScanSuccess) {
                onScanSuccess(decodedText);
              }
            },
            () => {
              // Ignore frame read failures
            }
          );
          isRunningRef.current = true;
        } else {
          setErrorMessage("Tidak ada perangkat kamera yang terdeteksi di laptop/HP.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengaktifkan kamera";
        setErrorMessage("Izin kamera ditolak atau kamera sedang digunakan: " + msg);
      }
    }

    initScanner();

    return () => {
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
  }, [isOpen, onScanSuccess]);

  // Ganti Kamera
  const handleSwitchCamera = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (scannerRef.current && isRunningRef.current) {
      await scannerRef.current.stop();
      await scannerRef.current.start(
        newCamId,
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        () => {}
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-extrabold text-sm">Pemindai Barcode Kamera</h3>
              <p className="text-[11px] text-slate-400">Arahkan barcode fisik ke dalam kotak pemindai</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Scanner Kamera */}
        <div className="p-4 bg-slate-900 flex flex-col items-center">
          <div className="relative w-full max-w-[340px] aspect-4/3 bg-black rounded-2xl overflow-hidden border-2 border-blue-500 shadow-inner">
            <div id="camera-scanner-view" className="w-full h-full" />

            {/* Garis Animasi Laser Pemindai */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] pointer-events-none animate-pulse" />
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pemilih Kamera (Jika ada beberapa webcam) */}
          {cameras.length > 1 && (
            <div className="mt-3 flex items-center gap-2 w-full max-w-[340px]">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCameraId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Kamera ${cam.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Mendukung: EAN-13, CODE-128, QR Code</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

