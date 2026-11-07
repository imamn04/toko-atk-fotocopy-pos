# Devos POS - Sistem Kasir & Inventaris Toko ATK & Fotocopy

Aplikasi Point of Sale (POS) dan Manajemen Stok modern untuk toko Alat Tulis Kantor (ATK) dan layanan Jasa Fotocopy & Percetakan. Dibangun dengan **Next.js 16 (App Router)**, **Tailwind CSS**, **Prisma ORM**, **MySQL 8.0**, dan **Caddy (Auto HTTPS SSL)**.

---

## 🌟 Fitur Utama

- **Layar Kasir (POS):**
  - Pemindaian cepat dengan Barcode Scanner USB & Kamera HP.
  - Shortcut keyboard kasir standar ritel (`F2`, `F4`, `F8`, `F9`, `F12`).
  - Fitur Tahan & Panggil Struk Belanja (*Hold Orders*).
  - Cetak struk belanja thermal (58mm / 80mm) & QRIS bayar.
- **Backoffice Owner / Admin:**
  - Manajemen master data produk ATK & varian jasa fotocopy/jilid/laminating.
  - Auto-generate barcode 13 digit (EAN13/CODE128).
  - Preview & Unduh gambar barcode (**PNG Resolusi Tinggi** & **SVG Vektor**).
  - Cetak label stiker barcode siap tempel di rak atau kemasan barang.
  - Peringatan stok kritis (*low stock alert*) & restock instan.
  - Grafik omzet & laba berkala + ekspor laporan ke Excel (.xlsx) dan PDF A4.
- **Keamanan & Multi-Role (RBAC):**
  - Role **Owner (Admin)**: Akses penuh ke master data, laporan laba, dan manajemen karyawan.
  - Role **Kasir**: Terisolasi hanya untuk layar kasir penjualan, tidak bisa melihat modal/HPP dan keuntungan toko.
  - Touchscreen PIN Keypad (PIN Cepat `1234`) dan Keyboard form login.

---

## 🚀 Panduan Deployment VPS Ubuntu (Docker Compose)

### 1. Setting DNS Domain (`shopku.my.id`)
Buka panel DNS management domain Anda (misal di Sumopod), tambahkan **2 A-Record**:
- **Host:** `@` ➔ **Target:** `[IP Publik VPS Ubuntu Anda]`
- **Host:** `www` ➔ **Target:** `[IP Publik VPS Ubuntu Anda]`

---

### 2. Jalankan di Server VPS Ubuntu

Masuk ke terminal VPS Anda (misal di `/var/www/TokoATK`):

```bash
# 1. Pastikan izin akses folder
sudo chown -R $USER:$USER /var/www/TokoATK
cd /var/www/TokoATK

# 2. Clone repository ke folder ini
git clone https://github.com/imamn04/toko-atk-fotocopy-pos.git .

# 3. Salin environment produksi
cp .env.production .env

# 4. Jalankan aplikasi dengan Docker Compose
docker compose up -d --build
```

### 3. Selesai!
- Caddy akan otomatis mengurus sertifikat **SSL Gratis (HTTPS)** ke Let's Encrypt.
- Buka browser di **`https://shopku.my.id`**.

---

## 🔐 Akun Default Sistem

| Role | Username | Password | PIN Cepat |
| :--- | :--- | :--- | :--- |
| **Owner (Admin)** | `admin` | `admin123` | `1234` |
| **Kasir** | `kasir` | `kasir123` | `1234` |

---

## 💻 Jalankan Lokal (Development)

Jika ingin menjalankan aplikasi secara lokal di komputer laptop/PC:

```bash
# Install dependencies
npm install

# Setup database lokal SQLite
npm run db:sqlite
npx prisma db push
npm run db:seed

# Jalankan server development
npm run dev
```
Akses di: `http://localhost:3000`
