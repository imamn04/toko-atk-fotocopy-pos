import Link from "next/link";
import { ShoppingCart, ShieldCheck, ScanBarcode, BarChart3, Package, ArrowRight, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
              A
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide">DEVOS ATK & FOTOCOPY</h1>
              <p className="text-xs text-slate-400">Point of Sale & Realtime Inventory System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk (Login)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Role Selection */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700 mb-6">
          <ScanBarcode className="w-4 h-4 text-blue-400" />
          <span>Mendukung Pemindaian Cepat USB Barcode Scanner & Pengurangan Stok Atomik</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white max-w-2xl leading-tight">
          Sistem Kasir & Manajemen Stok Retail ATK Modern
        </h2>
        <p className="text-slate-400 text-sm md:text-base mt-4 max-w-xl">
          Sistem Point of Sale terpadu dengan 2 hak akses ketat (Admin & Karyawan Kasir), auto-generate barcode, restock masuk, dan laporan omzet laba berkala.
        </p>

        {/* 2 Role Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full text-left">
          {/* Role Karyawan / Kasir */}
          <Link
            href="/pos"
            className="group relative bg-slate-800/80 hover:bg-slate-800 border-2 border-blue-500/30 hover:border-blue-500 p-8 rounded-2xl transition duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Layar Kasir (POS)</h3>
                <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md">
                  Role: KARYAWAN
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Scan barcode barang fisik otomatis, tabel belanja instan, kalkulasi kembalian tunai, cetak struk thermal, dan kurangi sisa stok barang di database server realtime.
              </p>
            </div>

            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mt-6 group-hover:translate-x-1 transition">
              <span>Buka Layar Kasir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Role Admin / Pemilik Toko */}
          <Link
            href="/admin"
            className="group relative bg-slate-800/80 hover:bg-slate-800 border-2 border-emerald-500/30 hover:border-emerald-500 p-8 rounded-2xl transition duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Backoffice & Manajemen</h3>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md">
                  Role: ADMIN
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Kelola master produk, auto-generate barcode stiker fisik, restock barang masuk, pantau alert stok kritis, dan ekspor laporan penjualan (Excel & PDF A4).
              </p>
            </div>

            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mt-6 group-hover:translate-x-1 transition">
              <span>Buka Backoffice Admin</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Highlight Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full text-center">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <ScanBarcode className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-200">Barcode Instant</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Auto-focus scanner USB</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <Package className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-200">Stok Atomik</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Prisma Safe Transaction</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-200">HPP & Omzet</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Laba bersih otomatis</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <ShieldCheck className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-200">RBAC Terproteksi</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Karyawan terisolasi dari laba</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        &copy; 2026 Sistem Kasir & Manajemen Stok Toko ATK • Next.js & Prisma ORM
      </footer>
    </div>
  );
}
