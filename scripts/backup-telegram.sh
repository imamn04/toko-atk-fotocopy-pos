#!/usr/bin/env bash
# ==============================================================================
# SCRIPT BACKUP DATABASE MYSQL KE TELEGRAM BOT
# TOKO ATK & FOTOCOPY (FOCUS MARAJA)
# ==============================================================================
set -euo pipefail

BOT_TOKEN="8771561240:AAF226M2nkBXmSaIKParl3lZT0I8M0KqO08"
CHAT_ID="6263058970"
BACKUP_DIR="/var/backups/pos-atk"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="db_focusmaraja_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

# Cari file .env untuk mengambil DB_PASSWORD
ENV_FILE="/var/www/pos-atk/.env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="/var/www/focusmaraja/.env"
fi

DB_PASS=$(grep DB_PASSWORD "$ENV_FILE" | head -n 1 | cut -d '=' -f2 | tr -d '\r"' || echo "")

echo "[1/3] Melakukan dump database MySQL..."
docker exec devos_pos_db mysqldump -upos_user -p"$DB_PASS" devos_pos 2>/dev/null | gzip > "$FILEPATH"

FILESIZE=$(ls -lh "$FILEPATH" | awk '{print $5}')
TOTAL_PRODUCTS=$(docker exec -i devos_pos_db mysql -upos_user -p"$DB_PASS" devos_pos -N -e "SELECT COUNT(*) FROM Product;" 2>/dev/null || echo "0")
TOTAL_TRANSACTIONS=$(docker exec -i devos_pos_db mysql -upos_user -p"$DB_PASS" devos_pos -N -e "SELECT COUNT(*) FROM Transaction;" 2>/dev/null || echo "0")

CAPTION="💾 *LAPORAN BACKUP DATABASE POS MARAJA*
📅 Tanggal: \`$(date +"%d-%m-%Y %H:%M WIB")\`
📦 File: \`${FILENAME}\` (${FILESIZE})
🏷️ Total Master Barang: *${TOTAL_PRODUCTS} item*
🛒 Total Riwayat Transaksi: *${TOTAL_TRANSACTIONS} transaksi*
🛡️ Status: *Database Aman & Terproteksi*"

echo "[2/3] Mengirim file backup ke Telegram..."
curl -s -F chat_id="$CHAT_ID" \
     -F document=@"$FILEPATH" \
     -F caption="$CAPTION" \
     -F parse_mode="Markdown" \
     "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" > /dev/null

echo "[3/3] Menghapus backup lokal yang berusia lebih dari 14 hari..."
find "$BACKUP_DIR" -type f -name "db_focusmaraja_*.sql.gz" -mtime +14 -delete || true

echo "✓ Backup berhasil dikirim ke Telegram!"
