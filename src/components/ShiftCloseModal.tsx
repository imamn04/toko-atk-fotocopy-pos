"use client";

import React, { useState } from "react";
import {
  X,
  Coins,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Lock,
  EyeOff,
  Sparkles,
  Send
} from "lucide-react";
import { printShiftZReport, ShiftReportData } from "@/lib/receiptPrinter";

interface ShiftData {
  id: string;
  cashierName: string;
  shiftType: string;
  openingFloat: number;
  totalCashSales: number;
  totalQrisSales: number;
  totalTransactions: number;
  expectedCash: number;
  openedAt: string;
}

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftData: ShiftData | null;
  onShiftClosed: () => void;
}

export default function ShiftCloseModal({
  isOpen,
  onClose,
  shiftData,
  onShiftClosed,
}: ShiftCloseModalProps) {
  const [closingCash, setClosingCash] = useState<number | "">("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedSummary, setClosedSummary] = useState<ShiftReportData | null>(null);
  const [showDenomHelper, setShowDenomHelper] = useState(false);

  // Denominations for cash counting
  const [denoms, setDenoms] = useState<{ [key: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
  });

  if (!isOpen) return null;

  const enteredCash = typeof closingCash === "number" ? closingCash : 0;

  const handleDenomChange = (val: number, count: number) => {
    const updated = { ...denoms, [val]: Math.max(0, count) };
    setDenoms(updated);
    const sum = Object.entries(updated).reduce(
      (acc, [nom, qty]) => acc + Number(nom) * (Number(qty) || 0),
      0
    );
    setClosingCash(sum);
  };

  const handleSubmitClose = async () => {
    if (closingCash === "") {
      alert("Silakan masukkan nominal uang fisik di laci kasir terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pos/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE",
          shiftId: shiftData?.id,
          closingCash: enteredCash,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menutup shift kasir.");
        setIsSubmitting(false);
        return;
      }

      // Berhasil ditutup!
      const report: ShiftReportData = {
        id: json.data.id,
        cashierName: json.data.cashierName || shiftData?.cashierName || "Kasir",
        shiftType: json.data.shiftType || shiftData?.shiftType || "SHIFT_1",
        openedAt: json.data.openedAt || shiftData?.openedAt || new Date().toISOString(),
        closedAt: json.data.closedAt || new Date().toISOString(),
        openingFloat: json.data.openingFloat || shiftData?.openingFloat || 0,
        totalCashSales: json.data.totalCashSales || shiftData?.totalCashSales || 0,
        totalQrisSales: json.data.totalQrisSales || shiftData?.totalQrisSales || 0,
        totalTransactions: json.data.totalTransactions || shiftData?.totalTransactions || 0,
        expectedCash: json.data.expectedCash ?? 0,
        closingCash: json.data.closingCash ?? enteredCash,
        discrepancy: json.data.discrepancy ?? 0,
        notes: json.data.notes || notes,
      };

      setClosedSummary(report);

      // Cetak Struk Rekap Shift Thermal
      setTimeout(() => {
        printShiftZReport(report);
      }, 250);
    } catch (err: unknown) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pos_active_shift");
    }
    onShiftClosed();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Tutup Kasir (Blind Shift Closing)</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  ANTI-BOCOR
                </span>
              </div>
              <p className="text-xs text-slate-400">Hitung uang fisik di laci &amp; kirim laporan realtime ke Owner</p>
            </div>
          </div>
          {!closedSummary && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        {!closedSummary ? (
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Info Shift Bertugas */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Kasir Bertugas:</span>
                <span className="font-black text-slate-800 text-sm">{shiftData?.cashierName || "Kasir"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Shift:</span>
                <span className="font-bold text-slate-800">
                  {shiftData?.shiftType === "SHIFT_1"
                    ? "Shift 1 (Pagi)"
                    : shiftData?.shiftType === "SHIFT_2"
                    ? "Shift 2 (Siang)"
                    : "Full Day"}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Total Transaksi Sesi Ini:</span>
                <span className="font-black text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
                  {shiftData?.totalTransactions || 0} Penjualan
                </span>
              </div>
            </div>

            {/* Banner Blind Shift Closing Protocol */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
              <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-black block text-amber-950">Standar Blind Cash Count:</strong>
                Sistem sengaja menyembunyikan estimasi omzet tunai agar kasir menghitung fisik uang secara murni dan akurat. Rekap selisih akan otomatis dihitung dan dikirim ke Telegram Owner saat disubmit.
              </div>
            </div>

            {/* Input Nominal Fisik Kasir */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Total Uang Fisik di Laci Kasir (Rp) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowDenomHelper(!showDenomHelper)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{showDenomHelper ? "Tutup Hitung Lembaran" : "Kalkulator Lembaran"}</span>
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-black text-slate-400 select-none pointer-events-none">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-2.5 text-xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Kalkulator Lembaran Uang (Denominations) */}
              {showDenomHelper && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
                  <div className="text-[11px] font-black text-slate-600 mb-2 uppercase tracking-wide">
                    Hitung Jumlah Lembar Uang Pecahan:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500].map((val) => (
                      <div key={val} className="bg-white p-2 rounded-xl border border-slate-200 text-xs">
                        <div className="font-extrabold text-slate-700 mb-1">
                          {val >= 1000 ? `${val / 1000}rb` : `${val} koin`}
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={denoms[val] || ""}
                            onChange={(e) => handleDenomChange(val, parseInt(e.target.value) || 0)}
                            placeholder="0 lbr"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Catatan Penutupan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Catatan Shift / Keterangan (Opsional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Uang receh 2.000 sudah ditukar, ada nota servis mesin printer Rp 50.000..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white resize-none h-16"
              />
            </div>
          </div>
        ) : (
          /* Tampilan Selesai Ditutup & Laporan Z-Report Terbuka */
          <div className="p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900">Shift Kasir Berhasil Ditutup!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Laporan Z-Report telah dicetak &amp; otomatis dikirim ke Telegram Owner.
              </p>
            </div>

            {/* Kartu Hasil Rekapitulasi Z-Report */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span className="font-black text-slate-800">{closedSummary.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modal Awal Laci:</span>
                <span className="font-bold text-slate-800">
                  Rp {closedSummary.openingFloat.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penjualan Tunai (Cash):</span>
                <span className="font-black text-emerald-600">
                  Rp {closedSummary.totalCashSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penjualan QRIS:</span>
                <span className="font-black text-indigo-600">
                  Rp {closedSummary.totalQrisSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Uang Fisik Dihitung Kasir:</span>
                <span className="font-black text-slate-900 text-sm">
                  Rp {closedSummary.closingCash.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-black text-slate-700">Status Rekonsiliasi Kas:</span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                    closedSummary.discrepancy === 0
                      ? "bg-emerald-100 text-emerald-800"
                      : closedSummary.discrepancy > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {closedSummary.discrepancy === 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PAS (Rp 0)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        {closedSummary.discrepancy > 0 ? "+" : "-"}Rp{" "}
                        {Math.abs(closedSummary.discrepancy).toLocaleString("id-ID")}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => printShiftZReport(closedSummary)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Ulang Laporan Z-Report</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndLogout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Selesai &amp; Keluar Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer (Sebelum Ditutup) */}
        {!closedSummary && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmitClose}
              disabled={isSubmitting || closingCash === ""}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan & Mengirim..." : "Tutup Shift & Verifikasi"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
