"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  ShieldCheck,
  ShoppingCart,
  ArrowRight,
  AlertCircle,
  Loader2,
  Delete,
  Clock,
  Coins,
  Sun,
  Sunset,
  Zap,
  Check,
  ChevronDown,
  X,
  Keyboard,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Operator selection (Kasir vs Owner)
  const [selectedRole, setSelectedRole] = useState<"kasir" | "admin">("kasir");
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Input Mode: PIN Pad (Touchscreen/Mobile) vs Keyboard Form (PC Desktop)
  const [inputMode, setInputMode] = useState<"pin" | "form">("pin");
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shift & Cash Drawer Float settings
  const [selectedShift, setSelectedShift] = useState<"SHIFT_1" | "SHIFT_2" | "FULL">("SHIFT_1");
  const [initialCashFloat, setInitialCashFloat] = useState<number>(100000);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Digital Live Clock
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDateTime(new Date());
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener for numpad, enter, and backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inputMode === "pin") {
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          handlePinPress(e.key);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          handlePinBackspace();
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleLoginSubmit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setPin("");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, selectedRole, selectedShift, initialCashFloat, inputMode]);

  const handlePinPress = (digit: string) => {
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      // Auto submit jika mencapai 4 digit PIN
      if (nextPin.length === 4) {
        setTimeout(() => {
          executeLogin(selectedRole, nextPin);
        }, 120);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLoginSubmit = () => {
    const passToUse = inputMode === "pin" ? (pin || "1234") : customPassword;
    executeLogin(selectedRole, passToUse);
  };

  const executeLogin = async (role: "kasir" | "admin", pass: string) => {
    const username = role === "kasir" ? "kasir" : "admin";
    const finalPassword = pass || (role === "kasir" ? "kasir123" : "admin123");

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: finalPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "PIN atau sandi tidak sesuai.");
        setLoading(false);
        setPin("");
        return;
      }

      // Simpan data Shift & Modal Awal Kasir ke localStorage
      if (typeof window !== "undefined") {
        const shiftData = {
          shift: selectedShift,
          initialCashFloat: initialCashFloat,
          openedAt: new Date().toISOString(),
          cashierName: data.user?.name || username,
        };
        localStorage.setItem("pos_active_shift", JSON.stringify(shiftData));
      }

      // Berhasil login, arahkan ke rute tujuan
      router.push(data.redirect || "/pos");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung ke server.";
      setErrorMsg(msg);
      setLoading(false);
      setPin("");
    }
  };

  const formattedTime = currentDateTime
    ? currentDateTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const formattedDate = currentDateTime
    ? currentDateTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
    : "Memuat...";

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-100 via-stone-50 to-emerald-50/40 text-slate-800 flex flex-col justify-between font-sans selection:bg-emerald-600 selection:text-white relative">
      {/* ========================================================================= */}
      {/* 1. TOP MINIMALIST TERMINAL BAR (TERANG & BERSIH)                          */}
      {/* ========================================================================= */}
      <header className="w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-200/90 bg-white/90 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/logo-white-bg.png"
            alt="FOCUS MARAJA"
            className="w-10 h-10 rounded-2xl object-contain bg-white border border-slate-200 p-0.5 shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900">
                FOCUS MARAJA
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                POS-01
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden xs:block">Fotokopi • ATK • Studio • Terminal Kasir</p>
          </div>
        </div>

        {/* Live Clock & Shift Badge */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition text-[11px] font-bold shadow-2xs"
            title="Klik untuk mengubah shift dan modal kas laci"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-extrabold text-slate-900">
              {selectedShift === "SHIFT_1" ? "Shift 1 (Pagi)" : selectedShift === "SHIFT_2" ? "Shift 2 (Siang)" : "Full Shift"}
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-emerald-700 font-black hidden sm:inline">
              Kas: Rp {initialCashFloat.toLocaleString("id-ID")}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <div className="hidden md:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CENTER LOCKSCREEN / WORKSTATION CARD (TERANG, BERSIH, NYAMAN)          */}
      {/* ========================================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/80 p-6 sm:p-8 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Kartu & Pilihan Operator */}
          <div>
            {/* Logo FOCUS MARAJA */}
            <div className="flex flex-col items-center justify-center mb-4 text-center">
              <div className="p-2.5 bg-slate-950 rounded-2xl shadow-md border border-slate-800 mb-2">
                <img
                  src="/brand/logo-horizontal-dark.png"
                  alt="FOCUS MARAJA"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {selectedRole === "kasir" ? "Meja Kasir Penjualan (POS)" : "Portal Owner / Supervisor"}
              </h2>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Fotokopi • ATK • Studio
              </span>
            </div>

            {/* Tombol Profil Kasir vs Owner */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {/* Operator Kasir */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("kasir");
                  setPin("");
                  setErrorMsg(null);
                }}
                className={`p-3 rounded-2xl border-2 transition flex items-center gap-2.5 text-left ${
                  selectedRole === "kasir"
                    ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedRole === "kasir" ? "bg-emerald-600 text-white font-black shadow-xs" : "bg-slate-200 text-slate-600"
                }`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-xs text-slate-900 truncate">Budi Kasir</div>
                  <div className="text-[10px] text-emerald-700 font-bold">Staf Penjualan</div>
                </div>
              </button>

              {/* Operator Owner */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("admin");
                  setPin("");
                  setErrorMsg(null);
                }}
                className={`p-3 rounded-2xl border-2 transition flex items-center gap-2.5 text-left ${
                  selectedRole === "admin"
                    ? "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 text-slate-900 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedRole === "admin" ? "bg-indigo-600 text-white font-black shadow-xs" : "bg-slate-200 text-slate-600"
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-xs text-slate-900 truncate">Owner Toko</div>
                  <div className="text-[10px] text-indigo-700 font-bold">Admin/SPV</div>
                </div>
              </button>
            </div>

            {/* PETUNJUK PIN JELAS & BISA KLIK AUTOFILL */}
            <div className="mb-4 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  PIN Cepat: <strong className="text-amber-950 font-black font-mono text-sm">1234</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPin("1234");
                  setTimeout(() => {
                    executeLogin(selectedRole, "1234");
                  }, 100);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-lg transition active:scale-95 shadow-2xs shrink-0"
              >
                Isi 1234 &amp; Masuk
              </button>
            </div>
          </div>

          {/* Alert Error */}
          {errorMsg && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MODE A: TOUCHSCREEN PASSCODE PIN PAD (TERANG & RAMAH LAYAR SENTUH)    */}
          {/* ===================================================================== */}
          {inputMode === "pin" ? (
            <div>
              {/* 4 Bulatan PIN Indicator */}
              <div className="flex items-center justify-center gap-4 mb-4 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-150 ${
                        isFilled
                          ? "bg-emerald-600 scale-125 shadow-sm shadow-emerald-500/50 ring-2 ring-emerald-300"
                          : "border-2 border-slate-300 bg-slate-100"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Numpad Tombol Terang & Empuk (Touchscreen / HP / Tablet) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[280px] mx-auto mb-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"].map((key) => {
                  const isClear = key === "C";
                  const isDel = key === "DEL";

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isClear) setPin("");
                        else if (isDel) handlePinBackspace();
                        else handlePinPress(key);
                      }}
                      className={`h-12 sm:h-13 rounded-2xl font-black text-lg transition-all active:scale-90 flex items-center justify-center select-none shadow-xs ${
                        isClear
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold"
                          : isDel
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          : "bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 active:bg-emerald-600 active:text-white text-slate-900 border border-slate-200"
                      }`}
                    >
                      {isDel ? <Delete className="w-5 h-5" /> : key}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Utama Buka Kasir */}
              <button
                type="button"
                onClick={handleLoginSubmit}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuka Kasir...</span>
                  </>
                ) : (
                  <>
                    <span>BUKA KASIR (MASUK)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* =================================================================== */
            /* MODE B: STANDARD KEYBOARD INPUT (Untuk PC Desktop)                  */
            /* =================================================================== */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi / PIN Akun
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Masukkan sandi atau PIN (contoh: 1234)"
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-xl text-slate-900 font-bold text-sm focus:outline-none transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoginSubmit}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Masuk Register</span>}
              </button>
            </div>
          )}

          {/* Mode Switcher & 1-Click Fast Login Pill */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setInputMode(inputMode === "pin" ? "form" : "pin")}
              className="hover:text-emerald-700 transition flex items-center gap-1 font-bold text-[11px]"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{inputMode === "pin" ? "Ketik Keyboard" : "Gunakan PIN Pad"}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("kasir");
                  executeLogin("kasir", "1234");
                }}
                className="text-[11px] font-bold text-emerald-800 hover:underline bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
              >
                Kasir Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("admin");
                  executeLogin("admin", "1234");
                }}
                className="text-[11px] font-bold text-indigo-800 hover:underline bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200"
              >
                Owner Demo
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODAL POPUP PENGATURAN SHIFT & KAS AWAL LACI                           */}
      {/* ========================================================================= */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base text-slate-900">Shift &amp; Modal Kas Laci</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift Picker */}
            <div className="mb-4">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">
                Pilih Jadwal Shift
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShift("SHIFT_1")}
                  className={`p-2.5 rounded-2xl border text-center transition ${
                    selectedShift === "SHIFT_1"
                      ? "bg-amber-500 text-white font-black border-amber-500 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Sun className="w-4 h-4 mx-auto mb-1" />
                  <div className="text-xs font-bold">Shift 1</div>
                  <div className="text-[9px] opacity-80">Pagi</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShift("SHIFT_2")}
                  className={`p-2.5 rounded-2xl border text-center transition ${
                    selectedShift === "SHIFT_2"
                      ? "bg-indigo-600 text-white font-black border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Sunset className="w-4 h-4 mx-auto mb-1" />
                  <div className="text-xs font-bold">Shift 2</div>
                  <div className="text-[9px] opacity-80">Siang</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShift("FULL")}
                  className={`p-2.5 rounded-2xl border text-center transition ${
                    selectedShift === "FULL"
                      ? "bg-emerald-600 text-white font-black border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1" />
                  <div className="text-xs font-bold">Full</div>
                  <div className="text-[9px] opacity-80">Owner</div>
                </button>
              </div>
            </div>

            {/* Modal Uang Pecahan Kasir */}
            <div className="mb-5">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Modal Awal Uang Receh di Laci
              </label>
              <div className="relative mb-2">
                <span className="absolute left-3.5 top-2.5 font-black text-slate-500 text-sm">Rp</span>
                <input
                  type="number"
                  value={initialCashFloat}
                  onChange={(e) => setInitialCashFloat(Number(e.target.value) || 0)}
                  className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-slate-900 font-black text-base focus:outline-none"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInitialCashFloat(amt)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                      initialCashFloat === amt
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Rp {amt.toLocaleString("id-ID")}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShiftModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="w-full py-2.5 text-center text-[11px] text-slate-500 border-t border-slate-200/80 bg-white/60">
        &copy; 2026 FOCUS MARAJA • Fotokopi, ATK &amp; Studio • POS Terminal #01
      </footer>
    </div>
  );
}
