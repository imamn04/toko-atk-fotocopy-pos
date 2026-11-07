#!/bin/sh
set -e

echo "=== Inisialisasi Devos Toko ATK & Fotocopy POS ==="

# Cek apakah menggunakan MySQL
case "$DATABASE_URL" in
  mysql*)
    echo "[1/3] Menunggu service database MySQL..."
    node scripts/wait-for-db.js
    echo "[2/3] Sinkronisasi tabel database dengan Prisma..."
    npx prisma db push --skip-generate --accept-data-loss || true
    echo "[3/3] Memeriksa data awal pengguna & master barang ATK..."
    node scripts/seed-db.js || true
    ;;
  *)
    echo "[1/2] Menyiapkan database lokal..."
    npx prisma db push --skip-generate --accept-data-loss || true
    echo "[2/2] Memeriksa data awal pengguna & master barang ATK..."
    node scripts/seed-db.js || true
    ;;
esac

echo "=== Menjalankan Server POS Toko ATK (Port: $PORT) ==="
exec node server.js

