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
  Lock
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

  if (!isOpen) return null;

  const expectedCash = (shiftData?.openingFloat || 0) + (shiftData?.totalCashSales || 0);
  const enteredCash = typeof closingCash === "number" ? closingCash : 0;
  const discrepancy = enteredCash - expectedCash;

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
        expectedCash: json.data.expectedCash || expectedCash,
        closingCash: json.data.closingCash || enteredCash,
        discrepancy: json.data.discrepancy ?? discrepancy,
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
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">Tutup Kasir &amp; Rekap Laci (Shift)</h3>
              <p className="text-xs text-slate-400">Pencocokan uang fisik kasir &amp; cetak laporan Z-Report</p>
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
            {/* Info Shift Aktif */}
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
              <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between">
                <span className="text-slate-500">Total Transaksi Hari Ini:</span>
                <span className="font-black text-slate-900">{shiftData?.totalTransactions || 0} Penjualan</span>
              </div>
            </div>

            {/* Rekap Finansial Sistem */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Modal Awal Laci (Kas Masuk):</span>
                <span className="font-bold text-slate-900">
                  Rp {(shiftData?.openingFloat || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Penjualan Tunai / Cash (+):</span>
                <span className="font-bold text-emerald-600">
                  Rp {(shiftData?.totalCashSales || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Penjualan QRIS / Non-Tunai:</span>
                <span className="font-bold text-indigo-600">
                  Rp {(shiftData?.totalQrisSales || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-emerald-50/70 px-3 rounded-xl border border-emerald-100">
                <span className="font-black text-emerald-950">Uang Tunai di Laci Seharusnya:</span>
                <span className="font-black text-emerald-700 text-sm">
                  Rp {expectedCash.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Input Uang Fisik Kasir */}
            <div>
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                Hitung Fisik Uang di Laci Kasir (Rp) *
              </label>
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
                  className="w-full pl-12 pr-4 py-2.5 text-xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Status Selisih */}
              {closingCash !== "" && (
                <div
                  className={`mt-2.5 p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    discrepancy === 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : discrepancy > 0
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {discrepancy === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {discrepancy === 0
                        ? "Uang Pas Sempurna (Klop)"
                        : discrepancy > 0
                        ? "Selisih Lebih (Kelebihan Uang)"
                        : "Selisih Kurang (Kurang Uang)"}
                    </span>
                  </div>
                  <span className="font-black text-sm">
                    {discrepancy === 0
                      ? "Rp 0"
                      : `${discrepancy > 0 ? "+" : "-"}Rp ${Math.abs(discrepancy).toLocaleString("id-ID")}`}
                  </span>
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
                placeholder="Misal: Uang receh 2000 habis, setor ke brankas Rp 400.000..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white resize-none h-16"
              />
            </div>
          </div>
        ) : (
          /* Tampilan Selesai Ditutup */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900">Shift Berhasil Ditutup!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Laporan Z-Report telah dicetak otomatis ke thermal printer.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span className="font-bold text-slate-800">{closedSummary.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Omzet Tunai:</span>
                <span className="font-bold text-emerald-600">Rp {closedSummary.totalCashSales.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uang Fisik Disetor:</span>
                <span className="font-bold text-slate-900">Rp {closedSummary.closingCash.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                <span>Selisih:</span>
                <span className={closedSummary.discrepancy === 0 ? "text-emerald-600" : "text-rose-600"}>
                  {closedSummary.discrepancy === 0 ? "PAS" : `Rp ${closedSummary.discrepancy.toLocaleString("id-ID")}`}
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
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Kembali ke Kasir
            </button>
            <button
              type="button"
              onClick={handleSubmitClose}
              disabled={isSubmitting || closingCash === ""}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? "Memproses..." : "Tutup Shift & Cetak Z-Report"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

