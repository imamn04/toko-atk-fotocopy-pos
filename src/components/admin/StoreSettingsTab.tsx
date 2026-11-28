"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  QrCode,
  CreditCard,
  Save,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Bot,
  Key,
  Trash2,
  Link as LinkIcon
} from "lucide-react";

interface StoreSettingData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  qrisImageUrl?: string | null;
  qrisRawPayload?: string | null;
  bankAccountInfo?: string | null;
  telegramBotPin?: string | null;
  telegramChatIds?: string | null;
}

export default function StoreSettingsTab() {
  const [settings, setSettings] = useState<StoreSettingData>({
    storeName: "FOCUS MARAJA",
    storeAddress: "Fotokopi – ATK – Studio",
    storePhone: "0812-3456-7890",
    qrisImageUrl: "",
    qrisRawPayload: "",
    bankAccountInfo: "",
    telegramBotPin: "889900",
    telegramChatIds: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings({
          storeName: json.data.storeName || "FOCUS MARAJA",
          storeAddress: json.data.storeAddress || "",
          storePhone: json.data.storePhone || "",
          qrisImageUrl: json.data.qrisImageUrl || "",
          qrisRawPayload: json.data.qrisRawPayload || "",
          bankAccountInfo: json.data.bankAccountInfo || "",
          telegramBotPin: json.data.telegramBotPin || "889900",
          telegramChatIds: json.data.telegramChatIds || "",
        });
      }
    } catch {
      setMsg({ type: "error", text: "Gagal memuat pengaturan toko." });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateWebhook = async () => {
    try {
      setSettingWebhook(true);
      const res = await fetch("/api/telegram/webhook?action=set_webhook");
      const json = await res.json();
      if (json.success) {
        setMsg({
          type: "success",
          text: "Webhook Telegram berhasil diaktifkan! Bot kini siap menerima chat.",
        });
        setTimeout(() => setMsg(null), 5000);
      } else {
        alert(json.message || "Gagal mengaktifkan webhook Telegram. Pastikan TELEGRAM_BOT_TOKEN sudah diisi di .env.");
      }
    } catch {
      alert("Terjadi kesalahan saat mengaktifkan webhook.");
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleClearTelegramOwners = () => {
    if (!confirm("Putuskan semua akun Telegram yang terhubung? Owner harus memasukkan PIN kembali.")) return;
    setSettings((prev) => ({ ...prev, telegramChatIds: "" }));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (JPG / PNG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setSettings((prev) => ({ ...prev, qrisImageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Pengaturan profil toko & QRIS berhasil disimpan!" });
        setTimeout(() => setMsg(null), 4000);
      } else {
        setMsg({ type: "error", text: json.message || "Gagal menyimpan pengaturan." });
      }
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan server saat menyimpan data." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        <p className="text-sm font-bold">Memuat konfigurasi toko...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-xs ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Informasi Toko & Struk */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Identitas Toko & Header Struk</h3>
                <p className="text-xs text-slate-500">Informasi ini tercetak pada struk belanja dan kop laporan</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Nama Toko / Usaha *
                </label>
                <input
                  type="text"
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  placeholder="Contoh: FOCUS MARAJA"
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Alamat / Sub-Judul Toko
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                    placeholder="Contoh: Jl. Kampus No. 12, Fotokopi – ATK – Studio"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  No. Telepon / WhatsApp Toko
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={settings.storePhone}
                    onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Info Rekening Bank Toko (Manual Transfer)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={settings.bankAccountInfo || ""}
                    onChange={(e) => setSettings({ ...settings, bankAccountInfo: e.target.value })}
                    placeholder="Contoh: BCA 8830123456 a.n FOCUS MARAJA"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Ditampilkan pada layar kasir jika pembeli memilih transfer bank manual.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan QRIS Toko (Pilihan A: Uang Langsung Masuk Rekening Toko) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">QRIS Dinamis / Merchant Toko</h3>
                <p className="text-xs text-slate-500">Uang pembayaran 100% langsung masuk ke rekening bank/merchant toko Anda</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Foto / Gambar QRIS Toko (JPG / PNG)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
                  {settings.qrisImageUrl ? (
                    <div className="relative w-32 h-32 bg-white rounded-xl p-2 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={settings.qrisImageUrl}
                        alt="QRIS Toko"
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-slate-200/70 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <QrCode className="w-10 h-10 mb-1 opacity-50" />
                      <span className="text-[10px] font-bold">Belum Ada QRIS</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs text-slate-600 font-medium">
                      Upload barcode QRIS toko Anda (dari BCA, Mandiri, BRI, GoPay Merchant, Dana Bisnis, dll).
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Gambar QRIS</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.qrisImageUrl && (
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, qrisImageUrl: "" })}
                          className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl font-bold transition"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  String Payload QRIS EMVCo (Opsional / Otomatisasi Nominal)
                </label>
                <textarea
                  rows={2}
                  value={settings.qrisRawPayload || ""}
                  onChange={(e) => setSettings({ ...settings, qrisRawPayload: e.target.value })}
                  placeholder="00020101021126590014ID.LINKAJA.WWW0118936000140000000000..."
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-500 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Jika Anda memiliki kode payload teks QRIS EMVCo toko, sistem kasir dapat meng-injeksi nominal belanja secara otomatis sehingga pembeli tidak perlu mengetik harga manual.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Asisten Bot Telegram Toko & Otorisasi Owner */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sky-600">
                <Bot className="w-5 h-5" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Asisten Bot Telegram Toko &amp; Otorisasi Owner
                </h3>
              </div>
              <button
                type="button"
                disabled={settingWebhook}
                onClick={handleActivateWebhook}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
                title="Daftarkan webhook URL domain ini ke Telegram API"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{settingWebhook ? "Menghubungkan..." : "⚡ Aktifkan Webhook Bot Telegram"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    PIN Rahasia Otorisasi Owner (6 Digit / Huruf)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={settings.telegramBotPin || ""}
                        onChange={(e) => setSettings({ ...settings, telegramBotPin: e.target.value })}
                        placeholder="Contoh: 889900"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm font-black tracking-widest text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ketikkan PIN ini saat pertama kali chat ke bot Telegram toko untuk mengaktifkan akses kontrol Owner.
                  </p>
                </div>

                <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl text-xs text-sky-950 space-y-1.5">
                  <span className="font-black block">📱 Cara Menghubungkan HP Owner ke Bot:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-900">
                    <li>Buka bot Telegram toko di aplikasi Telegram HP Anda.</li>
                    <li>Ketik <code>/start</code> lalu kirimkan <b>PIN Rahasia</b> di atas.</li>
                    <li>Bot akan otomatis mengenali akun Anda sebagai Owner resmi toko!</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      Akun Telegram Owner Terdaftar
                    </label>
                    {settings.telegramChatIds && (
                      <button
                        type="button"
                        onClick={handleClearTelegramOwners}
                        className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Putuskan Semua Akses</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl min-h-[90px] flex flex-col justify-center">
                    {settings.telegramChatIds ? (
                      <div className="flex flex-wrap gap-1.5">
                        {settings.telegramChatIds.split(",").filter(Boolean).map((id, idx) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold shadow-2xs"
                          >
                            <span>Owner #{idx + 1}: <b>{id}</b></span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic text-center">
                        Belum ada akun Telegram yang terdaftar. Chat bot di Telegram &amp; ketik PIN untuk menghubungkan.
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Seluruh Chat ID di atas memiliki hak akses untuk meminta laporan omzet, status kasir, dan mendownload backup database sewaktu-waktu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-extrabold rounded-2xl transition shadow-md shadow-emerald-500/25 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Semua Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  );
}

