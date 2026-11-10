<p align="center">
  <img src="public/brand/logo-white-bg.png" alt="FOCUS MARAJA Logo" width="120" style="border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
</p>

<h1 align="center">FOCUS MARAJA POS</h1>

<p align="center">
  <strong>Sistem Kasir Ritel (POS), Manajemen Inventaris ATK, Jasa Fotokopi & Backoffice Finansial Toko</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4.5_(Turbopack)-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-ORM-5a67d8?style=for-the-badge&logo=prisma" alt="Prisma ORM" />
  <img src="https://img.shields.io/badge/Database-MySQL_8.0_%7C_SQLite-4479A1?style=for-the-badge&logo=mysql" alt="Database" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker Ready" />
</p>

---

## 📖 Tentang Aplikasi

**FOCUS MARAJA POS** adalah sistem Point of Sale (POS) dan pengelolaan ritel *all-in-one* yang dirancang khusus untuk memenuhi kebutuhan operasional toko **Fotokopi, Alat Tulis Kantor (ATK), Percetakan Dokumen, dan Studio Foto**. 

Dibangun dengan arsitektur modern **Next.js 16 App Router**, performa tinggi **Turbopack**, antarmuka bersih standar industrial (*anti-slop*), serta keamanan berlapis (RBAC, HttpOnly JWT, Rate Limiting).

---

## ✨ Fitur Unggulan

### 1. 🛒 Layar Meja Kasir (POS Terminal)
* **Pencarian & Scan Barcode Instan:**
  * Kompatibel dengan **Barcode Scanner Laser USB (Hardware HID Buffer)** tanpa delay.
  * Mendukung **Kamera Scanner HP / Tablet** berbasis Web Audio beep interaktif.
  * Input manual cepat & auto-focus responsif.
* **Shortcut Keyboard Kasir Ritel:**
  * `F2` : Fokus ke kolom scan barcode
  * `F4` : Buka kalkulator cepat fotokopi & print
  * `F8` : Tahan / Simpan struk belanja (*Hold Order*)
  * `F9` : Buka daftar antrean struk tertahan
  * `F12` / `Enter` : Buka popup pembayaran
  * `ESC` : Batalkan modal / bersihkan input
* **Dukungan Multi-Satuan Grosir (Pcs vs Pack):**
  * Penjualan eceran satuan (Pcs) atau grosir (Pack/Lusin/Rim/Box) dengan pemotongan stok fisik otomatis.
* **Kalkulator Khusus Fotokopi & Cetak Dokumen:**
  * Perhitungan otomatis dokumen 1 sisi / 2 sisi (bolak-balik), laminating, jilid mika, dan jilid lakban langsung masuk ke keranjang belanja.
* **Opsi Pembayaran Lengkap:**
  * 💵 **Tunai (Cash):** Kalkulator uang diterima & perhitungan kembalian otomatis.
  * 📱 **QRIS Dinamis:** Generator QRIS nasional standar EMVCo Bank Indonesia dengan nominal belanja tertera langsung di QR.
  * 🏦 **Transfer Bank:** Informasi rekening resmi toko untuk transaksi non-tunai.
* **Penerbitan Bukti Transaksi:**
  * Cetak struk belanja termal printer (58mm / 80mm) dilengkapi barcode nomor nota.
  * Kirim nota digital otomatis ke WhatsApp pelanggan via URL wa.me resmi.
* **Manajemen Tutup Shift (Z-Report):**
  * Rekap modal kas awal laci, omzet tunai riil, omzet QRIS, dan audit selisih uang fisik laci kasir secara akurat.

---

### 2. 📊 Portal Backoffice Pemilik (Admin Portal)
* **Dashboard Finansial & Visual Grafik Interaktif:**
  * Metrik KPI: Total Omzet, Total Modal Pokok (HPP), Laba Bersih, Jumlah Transaksi, AOV (*Average Order Value*), dan Rasio Margin Keuntungan (%).
  * Grafik Recharts: Perbandingan tren omzet kontinu (*Bar Chart*) vs laba kotor (*Curve Area*).
  * Donut Chart: Porsi kontribusi omzet per kategori produk.
* **Rincian Arus Kas & Filter Metode Bayar:**
  * 3 Kartu Ringkasan Penerimaan: Total Tunai, Total QRIS, dan Total Transfer Bank.
  * Filter Cepat Tabel Transaksi: `[Semua]`, `[💵 Tunai]`, `[📱 QRIS]`, `[🏦 Transfer]`.
* **Fitur Batal Nota / Void Aman:**
  * Pembatalan transaksi salah input oleh kasir dengan pengembalian stok barang (*stock rollback*) otomatis ke database.
* **Manajemen Master Barang & Barcode:**
  * Tambah/edit produk, penentuan HPP & harga jual, stok minimum, dan multi-pack grosir.
  * Generator label stiker barcode produk siap cetak/tempel (Unduh resolusi tinggi format PNG & SVG).
  * Restock cepat stok barang masuk.
* **Paket Bundling Promo:**
  * Pembuatan paket hemat / bundling ATK dengan harga promosi dan barcode bundel khusus.
* **Pengeluaran & Belanja Toko (Expense Manager):**
  * Pencatatan pengeluaran operasional (kulakan stok, listrik/air, servis mesin, gaji karyawan) disertai filter tahunan dan bulanan.
* **Kelola Karyawan & Hak Akses (RBAC):**
  * Pembedaan peran antara `ADMIN` (akses penuh) dan `KARYAWAN` (khusus terminal kasir).
  * Pengaturan PIN angka kasir 4–6 digit.
* **Ekspor Laporan Resmi:**
  * Ekspor pembukuan ke **Excel (.xlsx)** multi-kolom dan **PDF A4**.

---

### 3. 🛡️ Keamanan & Keandalan Sistem
* **Anti Brute-Force Rate Limiting:** Pembatasan otomatis jika terjadi 5 kali salah memasukkan PIN kasir dalam 1 menit.
* **HttpOnly JWT Session:** Token sesi terenkripsi dengan proteksi cookie `SameSite=Lax` dan `HttpOnly`.
* **Proteksi Middleware API:** Seluruh rute `/admin/*` dan `/api/admin/*` terkunci ketat dari akses publik tanpa sesi Administrator.
* **Git Hygiene:** Perlindungan file sensitif (`.env*` dan database lokal SQLite `dev.db`) yang terabaikan secara ketat oleh `.gitignore`.

---

## 🏗️ Struktur Arsitektur Repositori

```text
├── prisma/
│   ├── schema.prisma           # Skema MySQL Production (Docker VPS)
│   ├── schema.sqlite.prisma    # Skema SQLite Local Development
│   └── seed.ts                 # Idempotent Seed Data awal
├── public/
│   └── brand/                  # Identitas logo & brand FOCUS MARAJA
├── src/
│   ├── app/
│   │   ├── admin/page.tsx      # Backoffice Owner (Laporan, Stok, Shift, Finansial)
│   │   ├── pos/page.tsx        # Workstation Kasir POS Utama
│   │   ├── login/page.tsx      # Layar Login Akun & PIN Keypad
│   │   ├── api/
│   │   │   ├── admin/          # API Backoffice (Produk, Laporan, Bundling, Biaya)
│   │   │   ├── pos/            # API Kasir (Checkout, Shift, Produk POS)
│   │   │   └── auth/           # API Autentikasi (Login, Logout, Users)
│   ├── components/
│   │   ├── admin/              # Komponen modular tab backoffice
│   │   ├── CameraBarcodeScanner.tsx
│   │   ├── CopyPrintCalculatorModal.tsx
│   │   └── ShiftCloseModal.tsx
│   ├── lib/
│   │   ├── auth.ts             # JWT Token & Verifikasi Sesi
│   │   ├── qris.ts             # Generator QRIS Dinamis Standar Bank Indonesia
│   │   ├── receiptPrinter.ts   # Struk Termal Printer & Z-Report
│   │   └── whatsappReceipt.ts  # Format Nota WhatsApp Digital
│   └── middleware.ts           # Next.js Route & API Guard
├── docker-compose.yml          # Konfigurasi Container Multi-Service (App + MySQL)
├── Dockerfile                  # Multi-Stage Build Node.js Production
└── nginx-shopku.conf           # Konfigurasi Reverse Proxy Nginx & Gzip
```

---

## ⚡ Panduan Menjalankan Secara Lokal (Development)

Untuk menjalankan dan mengembangkan aplikasi di komputer laptop/PC Anda:

```bash
# 1. Kloning repositori
git clone https://github.com/imamn04/toko-atk-fotocopy-pos.git
cd toko-atk-fotocopy-pos

# 2. Pasang dependensi
npm install

# 3. Inisialisasi database lokal SQLite
npm run db:sqlite
npx prisma db push
npm run db:seed

# 4. Jalankan server development
npm run dev
```

Buka peramban Anda di: **`http://localhost:3000`**

### 🔑 Akun Bawaan (Default):
* **Owner / Administrator:** Username: `admin` | PIN / Sandi: `1234`
* **Kasir Penjualan:** Username: `kasir` | PIN Kasir: `1234`

---

## 🚀 Panduan Deployment Server VPS (Docker Compose)

### 1. Konfigurasi DNS Domain
Arahkan **A-Record** domain Anda ke IP Publik server VPS Ubuntu Anda:
* `@` ➔ `[IP Publik VPS]`
* `www` ➔ `[IP Publik VPS]`

### 2. Jalankan di Server VPS
Masuk ke terminal SSH server VPS Anda:

```bash
# Masuk ke direktori web
cd /var/www
git clone https://github.com/imamn04/toko-atk-fotocopy-pos.git
cd toko-atk-fotocopy-pos

# Buat file konfigurasi environment produksi lokal di VPS
cp .env.example .env.production
nano .env.production # Sesuaikan password database & secret token Anda

# Jalankan sistem dengan Docker Compose
docker compose up -d --build
```

### 3. Pembaruan Rutin di VPS (Update dari GitHub)
Saat ada pembaruan fitur baru dari GitHub, jalankan:

```bash
git fetch origin
git reset --hard origin/main
docker compose up -d --build
```

---

## 📄 Lisensi
Hak Cipta © 2026 **FOCUS MARAJA** (Fotokopi – ATK – Percetakan & Studio). Seluruh hak cipta dilindungi undang-undang.
