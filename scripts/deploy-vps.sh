#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DEPLOYMENT OTOMATIS VPS UBUNTU 24.04 LTS
# PROJEK: POS KASIR TOKO ATK & FOTOCOPY (FOCUS MARAJA / DEVOS)
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=====================================================================${NC}"
echo -e "${CYAN}   🚀 DEPLOYMENT OTOMATIS POS TOKO ATK & FOTOCOPY (UBUNTU 24.04 VPS)   ${NC}"
echo -e "${CYAN}=====================================================================${NC}"

# 1. Pastikan dijalankan sebagai root
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${RED}[ERROR] Script ini wajib dijalankan sebagai root (atau gunakan sudo).${NC}"
  exit 1
fi

APP_DIR="/var/www/pos-atk"
REPO_URL="https://github.com/imamn04/toko-atk-fotocopy-pos.git"
SSH_PORT="20175"
APP_PORT="8087"

# 2. ALOKASI SWAP MEMORY 4GB (Mencegah VPS RAM kecil mengalami Out-Of-Memory saat build)
echo -e "\n${BLUE}[1/7] Memeriksa & Mengalokasikan Swap Memory 4GB...${NC}"
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$SWAP_TOTAL" -lt 2000 ]; then
  echo -e "${YELLOW}Swap saat ini (${SWAP_TOTAL}MB) kurang dari 2GB. Membuat swap 4GB...${NC}"
  swapoff -a 2>/dev/null || true
  rm -f /swapfile 2>/dev/null || true
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  sysctl vm.swappiness=20
  echo 'vm.swappiness=20' > /etc/sysctl.d/99-swappiness.conf
  echo -e "${GREEN}✓ Swap 4GB berhasil diaktifkan.${NC}"
else
  echo -e "${GREEN}✓ Swap memory sudah mencukupi (${SWAP_TOTAL}MB).${NC}"
fi

# 3. UPDATE SISTEM & INSTALL DEPENDENCY (Git, Curl, UFW, Nginx, Certbot)
echo -e "\n${BLUE}[2/7] Mengupdate Package System & Tool Pendukung...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git ufw nginx certbot python3-certbot-nginx

# 4. INSTALL DOCKER & DOCKER COMPOSE TERBARU (JIKA BELUM ADA)
echo -e "\n${BLUE}[3/7] Memeriksa Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker belum terpasang. Menginstall Docker Engine resmi...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}✓ Docker Engine berhasil terpasang.${NC}"
else
  echo -e "${GREEN}✓ Docker sudah terpasang: $(docker --version)${NC}"
fi

# Pastikan Docker Compose plugin aktif
if ! docker compose version &> /dev/null; then
  apt-get install -y docker-compose-plugin
fi
echo -e "${GREEN}✓ Docker Compose aktif: $(docker compose version)${NC}"

# 5. HARDENING FIREWALL (UFW) - JANGAN SAMPAI TERKUNCI DARI SSH!
echo -e "\n${BLUE}[4/7] Mengonfigurasi Firewall UFW...${NC}"
# Buka Port SSH custom (20175) dan default (22)
ufw allow ${SSH_PORT}/tcp comment "SSH Custom Port" || true
ufw allow 22/tcp comment "SSH Default" || true
# Buka Port HTTP, HTTPS & Port Aplikasi
ufw allow 80/tcp comment "Nginx HTTP" || true
ufw allow 443/tcp comment "Nginx HTTPS" || true
ufw allow ${APP_PORT}/tcp comment "Direct POS Port" || true
# Aktifkan UFW
echo "y" | ufw enable || true
echo -e "${GREEN}✓ Firewall UFW aktif dan port ${SSH_PORT}, 80, 443, & ${APP_PORT} terbuka.${NC}"

# 6. SINKRONISASI KODE APLIKASI
echo -e "\n${BLUE}[5/7] Mengambil Kode Aplikasi Terbaru dari GitHub...${NC}"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  echo "Folder repo sudah ada di $APP_DIR. Melakukan git pull..."
  cd "$APP_DIR"
  git reset --hard
  git pull origin main
else
  echo "Meng-clone repository ke $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 7. GENERATE SECURE .env PRODUCTION (JIKA BELUM ADA)
if [ ! -f "$APP_DIR/.env" ]; then
  echo -e "${YELLOW}Membuat file konfigurasi rahasia .env baru dengan password acak aman...${NC}"
  RAND_DB_ROOT=$(openssl rand -hex 16)
  RAND_DB_USER=$(openssl rand -hex 16)
  RAND_SECRET=$(openssl rand -hex 32)

  cat > "$APP_DIR/.env" <<EOF
# ==============================================================================
# CONFIG PRODUCTION OTOMATIS VPS
# ==============================================================================
DB_ROOT_PASSWORD=${RAND_DB_ROOT}
DB_PASSWORD=${RAND_DB_USER}
DATABASE_URL=mysql://pos_user:${RAND_DB_USER}@db:3306/devos_pos
NEXTAUTH_SECRET=${RAND_SECRET}
APP_PORT=${APP_PORT}
EOF
  chmod 600 "$APP_DIR/.env"
  echo -e "${GREEN}✓ File .env berhasil dibuat.${NC}"
else
  echo -e "${GREEN}✓ Menggunakan konfigurasi .env yang sudah ada.${NC}"
fi

# 8. KONFIGURASI NGINX REVERSE PROXY DENGAN GZIP / BROTLI
echo -e "\n${BLUE}[6/7] Mengonfigurasi Nginx Reverse Proxy...${NC}"
cat > /etc/nginx/sites-available/pos-atk <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name focusmaraja.my.id www.focusmaraja.my.id _;

    client_max_body_size 50M;

    # Gzip Compression untuk performa cepat di HP / Jaringan Seluler
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Aktifkan site Nginx dan buang default
ln -sf /etc/nginx/sites-available/pos-atk /etc/nginx/sites-enabled/pos-atk
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo -e "${GREEN}✓ Nginx Reverse Proxy aktif di Port 80.${NC}"

# 9. BUILD & JALANKAN CONTAINER DOCKER (APP + MYSQL)
echo -e "\n${BLUE}[7/7] Membangun dan Menjalankan Container (Next.js 16 + MySQL 8.0)...${NC}"
cd "$APP_DIR"
docker compose down || true
docker compose up -d --build

# Tunggu container sehat
echo "Menunggu inisialisasi database dan aplikasi..."
sleep 10
docker compose ps

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
DOMAIN="focusmaraja.my.id"

# Cek apakah domain focusmaraja.my.id sudah mengarah ke server ini
echo -e "\n${BLUE}Memeriksa status DNS domain ${DOMAIN}...${NC}"
RESOLVED_IP=$(getent ahosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -n 1 || true)
SSL_ACTIVE=false
if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
  echo -e "${GREEN}✓ Domain ${DOMAIN} sudah terhubung ke IP ${SERVER_IP}. Mengaktifkan SSL HTTPS...${NC}"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
  SSL_ACTIVE=true
else
  echo -e "${YELLOW}Domain ${DOMAIN} belum diarahkan ke IP ${SERVER_IP} (IP terdeteksi: ${RESOLVED_IP:-belum ada}).${NC}"
fi

echo -e "\n${CYAN}=====================================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT BERHASIL! APLIKASI SUDAH AKTIF DI VPS!${NC}"
echo -e "${CYAN}=====================================================================${NC}"
echo -e "Aplikasi dapat diakses melalui:"
if [ "$SSL_ACTIVE" = true ]; then
  echo -e "👉 ${GREEN}https://${DOMAIN}${NC} (SSL HTTPS Aman)"
else
  echo -e "👉 ${YELLOW}http://${DOMAIN}${NC} (Setelah DNS diarahkan)"
  echo -e "👉 ${YELLOW}http://${SERVER_IP}${NC} (Akses langsung via IP Server)"
fi
echo -e "👉 ${YELLOW}http://${SERVER_IP}:${APP_PORT}${NC} (Direct Port)"
echo ""
echo -e "Akun Login Default (Otomatis Dibuat):"
echo -e "👤 Admin / Owner:  ${GREEN}admin${NC}     | Password: ${GREEN}admin123${NC}"
echo -e "👤 Kasir Toko:     ${GREEN}kasir${NC}     | Password: ${GREEN}kasir123${NC}"
echo ""
echo -e "Langkah Terakhir Menghubungkan Domain focusmaraja.my.id:"
echo -e "1. Di panel domain Anda (Cloudflare / Niagahoster / Domainesia):"
echo -e "   - Buat DNS Record: Type 'A', Name '@', Value '${SERVER_IP}'"
echo -e "   - Buat DNS Record: Type 'A', Name 'www', Value '${SERVER_IP}'"
echo -e "2. Setelah DNS tersimpan, aktifkan SSL HTTPS di VPS dengan perintah:"
echo -e "   ${CYAN}certbot --nginx -d focusmaraja.my.id -d www.focusmaraja.my.id${NC}"
echo -e "${CYAN}=====================================================================${NC}"

