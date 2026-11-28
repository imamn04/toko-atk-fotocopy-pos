// Generator & Helper QRIS Dinamis Nasional (Standar Bank Indonesia & EMVCo MPM)

export interface TLVTag {
  tag: string;
  length: number;
  value: string;
}

/**
 * Menghitung CRC16 CCITT (Polynomial 0x1021, Initial 0xFFFF) standar Bank Indonesia & EMVCo
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
  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

/**
 * Mem-parse payload EMVCo MPM menjadi struktur Tag-Length-Value (TLV) sekuensial.
 * Mencegah kesalahan pemotongan regex (misalnya angka '54' di dalam nomor NMID atau ID Merchant).
 */
export function parseEMVCoTLV(payload: string): TLVTag[] {
  const tags: TLVTag[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) break;
    const tag = payload.substring(i, i + 2);
    const lengthStr = payload.substring(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0) break;
    const valueStart = i + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > payload.length) break;
    const value = payload.substring(valueStart, valueEnd);
    tags.push({ tag, length, value });
    i = valueEnd;
  }
  return tags;
}

/**
 * Mengubah string QRIS Statis toko menjadi QRIS Dinamis dengan menyematkan nominal belanja
 * Menggunakan rekonstruksi EMVCo TLV berstandar ASPI / Bank Indonesia.
 */
export function makeDynamicQris(staticQr: string, amount: number): string {
  if (!staticQr || typeof staticQr !== "string") return "";

  const clean = staticQr.trim();
  const parsed = parseEMVCoTLV(clean);

  // Jika format bukan EMVCo TLV standar, kembalikan teks aslinya
  if (parsed.length === 0) return staticQr;

  // Filter keluar Tag 63 (CRC16) lama
  const tags = parsed.filter((t) => t.tag !== "63");

  // Ubah Tag 01 (Point of Initiation Method) dari Statis (11) menjadi Dinamis (12)
  const tag01 = tags.find((t) => t.tag === "01");
  if (tag01) {
    tag01.value = "12";
    tag01.length = 2;
  }

  // Format nominal rupiah tanpa pecahan sen
  const amountStr = Math.round(amount).toString();
  const amountTag: TLVTag = {
    tag: "54",
    length: amountStr.length,
    value: amountStr,
  };

  // Sisipkan atau perbarui Tag 54 (Transaction Amount)
  const existing54Idx = tags.findIndex((t) => t.tag === "54");
  if (existing54Idx >= 0) {
    tags[existing54Idx] = amountTag;
  } else {
    // Menurut standar EMVCo, Tag 54 diletakkan setelah Tag 53 (Currency) atau sebelum Tag 58 (Country)
    const idx53 = tags.findIndex((t) => t.tag === "53");
    if (idx53 >= 0) {
      tags.splice(idx53 + 1, 0, amountTag);
    } else {
      const idx58 = tags.findIndex((t) => t.tag === "58");
      if (idx58 >= 0) {
        tags.splice(idx58, 0, amountTag);
      } else {
        tags.push(amountTag);
      }
    }
  }

  // Serialisasi kembali seluruh tag TLV secara berurutan
  let serialized = "";
  for (const t of tags) {
    const lenStr = t.length.toString().padStart(2, "0");
    serialized += `${t.tag}${lenStr}${t.value}`;
  }

  // Tambahkan tag CRC16 (6304) dan hitung checksum CCITT-16
  const payloadWithCrcTag = serialized + "6304";
  const checksum = calculateCRC16(payloadWithCrcTag);

  return payloadWithCrcTag + checksum;
}
