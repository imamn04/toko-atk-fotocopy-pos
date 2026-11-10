// Generator & Helper QRIS Dinamis Nasional (Standar Bank Indonesia & EMVCo MPM)

/**
 * Menghitung CRC16 CCITT (Polynomial 0x1021, Initial 0xFFFF) standar Bank Indonesia
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

/**
 * Mengubah string QRIS statis toko menjadi QRIS Dinamis dengan menyematkan nominal belanja
 */
export function makeDynamicQris(staticQr: string, amount: number): string {
  if (!staticQr || typeof staticQr !== "string") return "";

  // Bersihkan karakter tak tampak
  let raw = staticQr.trim();

  // Hapus Tag 63 (CRC16) lama yang ada di 4 digit paling akhir
  // Biasanya berakhiran: 6304XXXX
  const crcIndex = raw.lastIndexOf("6304");
  if (crcIndex > -1) {
    raw = raw.substring(0, crcIndex);
  }

  // Ubah tipe QR dari Statis (010211) menjadi Dinamis (010212)
  raw = raw.replace("010211", "010212");

  // Hapus Tag 54 (Transaction Amount) lama jika sudah pernah ada untuk mencegah duplikasi
  const tag54Match = raw.match(/54(\d{2})/);
  if (tag54Match && tag54Match.index !== undefined) {
    const len = parseInt(tag54Match[1], 10);
    const start = tag54Match.index;
    const end = start + 4 + len;
    if (!isNaN(len) && end <= raw.length) {
      raw = raw.slice(0, start) + raw.slice(end);
    }
  }

  // Format nominal rupiah tanpa desimal
  const amountStr = Math.round(amount).toString();
  const amountLen = amountStr.length.toString().padStart(2, "0");
  const amountTag = `54${amountLen}${amountStr}`;

  // Pastikan mata uang Rupiah IDR (Tag 53: 5303360) dan Negara ID (Tag 58: 5802ID) ada
  // Jika belum ada Tag 54, sisipkan sebelum Tag 58
  const tag58Index = raw.indexOf("5802ID");
  if (tag58Index > -1) {
    raw = raw.slice(0, tag58Index) + amountTag + raw.slice(tag58Index);
  } else {
    raw += amountTag;
  }

  // Tambahkan tag CRC16 (6304)
  const toCalculate = raw + "6304";
  const checksum = calculateCRC16(toCalculate);

  return toCalculate + checksum;
}

