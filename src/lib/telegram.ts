// Utility Helper untuk Integrasi Telegram Bot Toko Interaktif & Otomatisasi Backup
// FOCUS MARAJA - Owner Remote Dashboard & Realtime Bot Assistant
import { prisma } from "@/lib/prisma";
import zlib from "zlib";

export function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

// Ambil konfigurasi Telegram Toko (PIN & Daftar Chat ID Owner Terdaftar)
export async function getTelegramConfig(): Promise<{
  pin: string;
  chatIds: string[];
}> {
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { id: "default" },
    });

    const pin = setting?.telegramBotPin?.trim() || process.env.TELEGRAM_BOT_PIN || "889900";
    const rawIds = setting?.telegramChatIds || "";

    const idSet = new Set<string>();

    // Tambahkan dari .env jika ada
    if (process.env.TELEGRAM_CHAT_ID) {
      idSet.add(process.env.TELEGRAM_CHAT_ID.trim());
    }

    // Tambahkan dari database
    rawIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .forEach((id) => idSet.add(id));

    return {
      pin,
      chatIds: Array.from(idSet),
    };
  } catch (err) {
    console.error("Error reading telegram config:", err);
    const envChatId = process.env.TELEGRAM_CHAT_ID ? [process.env.TELEGRAM_CHAT_ID.trim()] : [];
    return {
      pin: process.env.TELEGRAM_BOT_PIN || "889900",
      chatIds: envChatId,
    };
  }
}

// Cek apakah chat ID terdaftar sebagai Owner
export async function isTelegramOwner(chatId: string | number): Promise<boolean> {
  const { chatIds } = await getTelegramConfig();
  return chatIds.includes(String(chatId).trim());
}

// Daftarkan Chat ID Owner baru ke database setelah verifikasi PIN
export async function registerTelegramOwner(chatId: string | number): Promise<boolean> {
  const cId = String(chatId).trim();
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { id: "default" },
    });

    const currentList = (setting?.telegramChatIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!currentList.includes(cId)) {
      currentList.push(cId);
      await prisma.storeSetting.upsert({
        where: { id: "default" },
        update: { telegramChatIds: currentList.join(",") },
        create: {
          id: "default",
          telegramChatIds: currentList.join(","),
          telegramBotPin: "889900",
        },
      });
    }
    return true;
  } catch (err) {
    console.error("Error registering telegram owner:", err);
    return false;
  }
}

// Menu Tombol Keyboard Interaktif Telegram (Bisa Diklik Langsung di HP)
export function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: "📊 Omzet Hari Ini" }, { text: "👤 Kasir Aktif" }],
      [{ text: "⚠️ Cek Stok Menipis" }, { text: "💾 Backup Database" }],
      [{ text: "🔍 Cari Barang" }, { text: "⚙️ Bantuan" }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

// Kirim Pesan Teks (ke single chat ID atau broadcast ke semua owner)
export async function sendTelegramMessage(
  text: string,
  targetChatId?: string | number,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN belum diset di .env");
    return false;
  }

  const { chatIds } = await getTelegramConfig();
  const destinations = targetChatId ? [String(targetChatId)] : chatIds;

  if (destinations.length === 0) {
    console.warn("Tidak ada Chat ID Telegram tujuan yang terdaftar.");
    return false;
  }

  let allSuccess = true;
  for (const chatId of destinations) {
    try {
      const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      };
      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to send telegram message to ${chatId}:`, errText);
        allSuccess = false;
      }
    } catch (error) {
      console.error(`Error sending message to ${chatId}:`, error);
      allSuccess = false;
    }
  }

  return allSuccess;
}

// Kirim File Dokumen (.sql.gz) ke Telegram Chat
export async function sendTelegramDocument(
  chatId: string | number,
  fileBuffer: Buffer,
  fileName: string,
  caption?: string
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) return false;

  try {
    const endpoint = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append("chat_id", String(chatId));

    // Masukkan file buffer sebagai Blob
    const fileBlob = new Blob([fileBuffer], { type: "application/gzip" });
    formData.append("document", fileBlob, fileName);

    if (caption) {
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
    }

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to send telegram document:", err);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending telegram document:", error);
    return false;
  }
}

// Helper escape nilai untuk SQL dump
function sqlVal(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  const str = String(val).replace(/'/g, "''").replace(/\\/g, "\\\\");
  return `'${str}'`;
}

// Generator Dump Database Lengkap (Gzip Compressed .sql.gz)
export async function generateDatabaseBackupSql(): Promise<{
  buffer: Buffer;
  fileName: string;
  totalProducts: number;
  totalTransactions: number;
  fileSizeStr: string;
}> {
  const [
    storeSettings,
    users,
    categories,
    products,
    bundles,
    bundleItems,
    expenses,
    shifts,
    transactions,
    transactionItems,
  ] = await Promise.all([
    prisma.storeSetting.findMany(),
    prisma.user.findMany(),
    prisma.category.findMany(),
    prisma.product.findMany(),
    prisma.bundle.findMany(),
    prisma.bundleItem.findMany(),
    prisma.expense.findMany(),
    prisma.shift.findMany(),
    prisma.transaction.findMany(),
    prisma.transactionItem.findMany(),
  ]);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  const fileName = `db_focusmaraja_${dateStr}_${timeStr}.sql.gz`;

  let sql = `-- ==============================================================================
-- DATABASE DUMP: FOCUS MARAJA TOKO ATK & FOTOCOPY
-- Generated at: ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
-- Generator: Focus Maraja POS Native Engine
-- ==============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

`;

  // 1. StoreSetting
  if (storeSettings.length > 0) {
    sql += `-- Table: StoreSetting (${storeSettings.length} rows)\n`;
    for (const r of storeSettings) {
      sql += `INSERT INTO \`StoreSetting\` (\`id\`,\`storeName\`,\`storeAddress\`,\`storePhone\`,\`qrisImageUrl\`,\`qrisRawPayload\`,\`bankAccountInfo\`,\`telegramBotPin\`,\`telegramChatIds\`,\`updatedAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.storeName)},${sqlVal(r.storeAddress)},${sqlVal(r.storePhone)},${sqlVal(r.qrisImageUrl)},${sqlVal(r.qrisRawPayload)},${sqlVal(r.bankAccountInfo)},${sqlVal(r.telegramBotPin)},${sqlVal(r.telegramChatIds)},${sqlVal(r.updatedAt)}) ON DUPLICATE KEY UPDATE \`storeName\`=VALUES(\`storeName\`);\n`;
    }
    sql += "\n";
  }

  // 2. User
  if (users.length > 0) {
    sql += `-- Table: User (${users.length} rows)\n`;
    for (const r of users) {
      sql += `INSERT INTO \`User\` (\`id\`,\`name\`,\`username\`,\`password\`,\`role\`,\`createdAt\`,\`updatedAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.name)},${sqlVal(r.username)},${sqlVal(r.password)},${sqlVal(r.role)},${sqlVal(r.createdAt)},${sqlVal(r.updatedAt)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);\n`;
    }
    sql += "\n";
  }

  // 3. Category
  if (categories.length > 0) {
    sql += `-- Table: Category (${categories.length} rows)\n`;
    for (const r of categories) {
      sql += `INSERT INTO \`Category\` (\`id\`,\`name\`,\`createdAt\`,\`updatedAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.name)},${sqlVal(r.createdAt)},${sqlVal(r.updatedAt)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);\n`;
    }
    sql += "\n";
  }

  // 4. Product
  if (products.length > 0) {
    sql += `-- Table: Product (${products.length} rows)\n`;
    for (const r of products) {
      sql += `INSERT INTO \`Product\` (\`id\`,\`sku\`,\`barcode\`,\`name\`,\`categoryId\`,\`costPrice\`,\`sellingPrice\`,\`stock\`,\`minStock\`,\`unitMode\`,\`hasPack\`,\`packName\`,\`packQuantity\`,\`packPrice\`,\`packBarcode\`,\`isActive\`,\`createdAt\`,\`updatedAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.sku)},${sqlVal(r.barcode)},${sqlVal(r.name)},${sqlVal(r.categoryId)},${sqlVal(r.costPrice)},${sqlVal(r.sellingPrice)},${sqlVal(r.stock)},${sqlVal(r.minStock)},${sqlVal(r.unitMode)},${sqlVal(r.hasPack)},${sqlVal(r.packName)},${sqlVal(r.packQuantity)},${sqlVal(r.packPrice)},${sqlVal(r.packBarcode)},${sqlVal(r.isActive)},${sqlVal(r.createdAt)},${sqlVal(r.updatedAt)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);\n`;
    }
    sql += "\n";
  }

  // 5. Bundle & BundleItem
  if (bundles.length > 0) {
    sql += `-- Table: Bundle (${bundles.length} rows)\n`;
    for (const r of bundles) {
      sql += `INSERT INTO \`Bundle\` (\`id\`,\`name\`,\`barcode\`,\`price\`,\`isActive\`,\`createdAt\`,\`updatedAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.name)},${sqlVal(r.barcode)},${sqlVal(r.price)},${sqlVal(r.isActive)},${sqlVal(r.createdAt)},${sqlVal(r.updatedAt)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);\n`;
    }
    sql += "\n";
  }

  if (bundleItems.length > 0) {
    sql += `-- Table: BundleItem (${bundleItems.length} rows)\n`;
    for (const r of bundleItems) {
      sql += `INSERT INTO \`BundleItem\` (\`id\`,\`bundleId\`,\`productId\`,\`quantity\`) VALUES (${sqlVal(r.id)},${sqlVal(r.bundleId)},${sqlVal(r.productId)},${sqlVal(r.quantity)}) ON DUPLICATE KEY UPDATE \`quantity\`=VALUES(\`quantity\`);\n`;
    }
    sql += "\n";
  }

  // 6. Expense
  if (expenses.length > 0) {
    sql += `-- Table: Expense (${expenses.length} rows)\n`;
    for (const r of expenses) {
      sql += `INSERT INTO \`Expense\` (\`id\`,\`category\`,\`description\`,\`amount\`,\`date\`,\`recordedBy\`,\`createdAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.category)},${sqlVal(r.description)},${sqlVal(r.amount)},${sqlVal(r.date)},${sqlVal(r.recordedBy)},${sqlVal(r.createdAt)});\n`;
    }
    sql += "\n";
  }

  // 7. Shift
  if (shifts.length > 0) {
    sql += `-- Table: Shift (${shifts.length} rows)\n`;
    for (const r of shifts) {
      sql += `INSERT INTO \`Shift\` (\`id\`,\`userId\`,\`cashierName\`,\`shiftType\`,\`openedAt\`,\`closedAt\`,\`openingFloat\`,\`totalCashSales\`,\`totalQrisSales\`,\`totalTransactions\`,\`closingCash\`,\`status\`,\`notes\`) VALUES (${sqlVal(r.id)},${sqlVal(r.userId)},${sqlVal(r.cashierName)},${sqlVal(r.shiftType)},${sqlVal(r.openedAt)},${sqlVal(r.closedAt)},${sqlVal(r.openingFloat)},${sqlVal(r.totalCashSales)},${sqlVal(r.totalQrisSales)},${sqlVal(r.totalTransactions)},${sqlVal(r.closingCash)},${sqlVal(r.status)},${sqlVal(r.notes)});\n`;
    }
    sql += "\n";
  }

  // 8. Transaction & TransactionItem
  if (transactions.length > 0) {
    sql += `-- Table: Transaction (${transactions.length} rows)\n`;
    for (const r of transactions) {
      sql += `INSERT INTO \`Transaction\` (\`id\`,\`invoiceNumber\`,\`totalAmount\`,\`totalCost\`,\`paymentMethod\`,\`cashReceived\`,\`change\`,\`status\`,\`voidReason\`,\`cashierId\`,\`shiftId\`,\`createdAt\`) VALUES (${sqlVal(r.id)},${sqlVal(r.invoiceNumber)},${sqlVal(r.totalAmount)},${sqlVal(r.totalCost)},${sqlVal(r.paymentMethod)},${sqlVal(r.cashReceived)},${sqlVal(r.change)},${sqlVal(r.status)},${sqlVal(r.voidReason)},${sqlVal(r.cashierId)},${sqlVal(r.shiftId)},${sqlVal(r.createdAt)});\n`;
    }
    sql += "\n";
  }

  if (transactionItems.length > 0) {
    sql += `-- Table: TransactionItem (${transactionItems.length} rows)\n`;
    for (const r of transactionItems) {
      sql += `INSERT INTO \`TransactionItem\` (\`id\`,\`transactionId\`,\`productId\`,\`qty\`,\`price\`,\`costPrice\`,\`subtotal\`,\`unit\`,\`packQuantity\`) VALUES (${sqlVal(r.id)},${sqlVal(r.transactionId)},${sqlVal(r.productId)},${sqlVal(r.qty)},${sqlVal(r.price)},${sqlVal(r.costPrice)},${sqlVal(r.subtotal)},${sqlVal(r.unit)},${sqlVal(r.packQuantity)});\n`;
    }
    sql += "\n";
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n-- END OF BACKUP\n`;

  // Kompresi ke gzip
  const compressedBuffer = zlib.gzipSync(Buffer.from(sql, "utf-8"));
  const sizeKb = (compressedBuffer.length / 1024).toFixed(1);

  return {
    buffer: compressedBuffer,
    fileName,
    totalProducts: products.length,
    totalTransactions: transactions.length,
    fileSizeStr: `${sizeKb} KB`,
  };
}

export interface ShiftTelegramData {
  shiftId: string;
  cashierName: string;
  shiftType: string;
  openedAt: string;
  closedAt: string;
  openingFloat: number;
  totalCashSales: number;
  totalQrisSales: number;
  totalTransactions: number;
  expectedCash: number;
  closingCash: number;
  discrepancy: number;
  notes?: string | null;
}

// Broadcast Notifikasi Tutup Shift ke Seluruh Owner Terdaftar
export async function sendShiftCloseReport(data: ShiftTelegramData): Promise<boolean> {
  const discrepancyText =
    data.discrepancy === 0
      ? "✅ <b>PAS / KLOP (Rp 0)</b>"
      : data.discrepancy > 0
      ? `➕ <b>LEBIH: +Rp ${Math.abs(data.discrepancy).toLocaleString("id-ID")}</b>`
      : `⚠️ <b>KURANG: -Rp ${Math.abs(data.discrepancy).toLocaleString("id-ID")}</b>`;

  const shiftLabel =
    data.shiftType === "SHIFT_1"
      ? "Shift 1 (Pagi)"
      : data.shiftType === "SHIFT_2"
      ? "Shift 2 (Siang)"
      : "Full Day";

  const totalOmzet = data.totalCashSales + data.totalQrisSales;

  const message = `
🏢 <b>FOCUS MARAJA — LAPORAN TUTUP SHIFT KASIR</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Kasir:</b> ${data.cashierName}
⏰ <b>Shift:</b> ${shiftLabel}
🕒 <b>Waktu Tutup:</b> ${new Date(data.closedAt).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  })} WIB

📊 <b>RINGKASAN PENJUALAN:</b>
• Transaksi Sukses: <b>${data.totalTransactions} order</b>
• Omzet Tunai (Cash): <b>Rp ${data.totalCashSales.toLocaleString("id-ID")}</b>
• Omzet QRIS / Transfer: <b>Rp ${data.totalQrisSales.toLocaleString("id-ID")}</b>
━━━━━━━━━━━━━━━━━━━━━
💰 <b>Total Omzet Shift: Rp ${totalOmzet.toLocaleString("id-ID")}</b>

💵 <b>REKONSILIASI KAS LACI (BLIND CLOSING):</b>
• Kas Modal Awal: <b>Rp ${data.openingFloat.toLocaleString("id-ID")}</b>
• Kas Tunai Seharusnya: <b>Rp ${data.expectedCash.toLocaleString("id-ID")}</b>
• Uang Fisik Dihitung Kasir: <b>Rp ${data.closingCash.toLocaleString("id-ID")}</b>
• Status Selisih: ${discrepancyText}
${data.notes ? `\n📝 <b>Catatan Kasir:</b> <i>${data.notes}</i>` : ""}
━━━━━━━━━━━━━━━━━━━━━
<i>Laporan otomatis dikirim secara realtime dari Sistem POS Focus Maraja.</i>
`.trim();

  return sendTelegramMessage(message);
}
