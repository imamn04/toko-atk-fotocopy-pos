import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTelegramBotToken,
  getTelegramConfig,
  isTelegramOwner,
  registerTelegramOwner,
  getMainMenuKeyboard,
  sendTelegramMessage,
  sendTelegramDocument,
  generateDatabaseBackupSql,
} from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body?.message || body?.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const rawText = message.text.trim();
    const cleanText = rawText.toLowerCase();
    const senderName = message.from?.first_name || message.chat?.first_name || "Bos";

    const { pin } = await getTelegramConfig();
    const isOwner = await isTelegramOwner(chatId);

    // 1. JIKA BELUM TERDAFTAR SEBAGAI OWNER:
    if (!isOwner) {
      // Periksa apakah pesan yang diketik adalah PIN yang benar
      if (rawText === pin || cleanText === pin.toLowerCase()) {
        await registerTelegramOwner(chatId);
        const welcomeText = `
🎉 <b>OTORISASI OWNER BERHASIL!</b>
━━━━━━━━━━━━━━━━━━━━━
Halo <b>${senderName}</b>! Akun Telegram Anda telah resmi terdaftar sebagai <b>OWNER / PENGELOLA UTAMA FOCUS MARAJA</b>.

Anda kini memiliki kendali penuh untuk:
• 📊 Cek omzet & laba realtime
• 👤 Pantau kasir yang sedang bertugas
• ⚠️ Cek stok barang menipis
• 🔍 Cek harga & sisa stok barang
• 💾 Download backup database toko kapan saja

Silakan gunakan tombol menu di bawah ini:
`.trim();

        await sendTelegramMessage(welcomeText, chatId, getMainMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      // Jika belum ketik PIN yang benar
      if (cleanText === "/start" || cleanText === "start") {
        const askPinText = `
🏢 <b>ASISTEN TOKO FOCUS MARAJA</b>
━━━━━━━━━━━━━━━━━━━━━
Halo <b>${senderName}</b>! Selamat datang di sistem Bot Asisten Toko Focus Maraja.

Akun Telegram Anda saat ini <b>belum terhubung</b> sebagai Owner.
Silakan ketik <b>PIN Rahasia Owner</b> untuk mengaktifkan akses Anda:
`.trim();
        await sendTelegramMessage(askPinText, chatId);
        return NextResponse.json({ ok: true });
      }

      // PIN salah
      const deniedText = `
⛔ <b>PIN SALAH / AKSES DITOLAK</b>
━━━━━━━━━━━━━━━━━━━━━
Kode yang Anda ketik salah. Silakan masukkan <b>PIN Rahasia Owner</b> yang benar untuk mengaktifkan akun ini.
`.trim();
      await sendTelegramMessage(deniedText, chatId);
      return NextResponse.json({ ok: true });
    }

    // 2. JIKA SUDAH TERDAFTAR SEBAGAI OWNER:
    // Menu Utama / Start
    if (cleanText === "/start" || cleanText === "/menu" || cleanText === "menu") {
      const menuText = `
🏢 <b>ASISTEN TOKO FOCUS MARAJA</b>
━━━━━━━━━━━━━━━━━━━━━
Halo Bos <b>${senderName}</b>! Sistem toko berjalan normal.
Silakan pilih menu di bawah ini untuk memantau toko:
`.trim();
      await sendTelegramMessage(menuText, chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // A. Cek Omzet Hari Ini
    if (
      cleanText.includes("omzet") ||
      cleanText.includes("hari ini") ||
      cleanText === "/omzet" ||
      cleanText === "/hari_ini"
    ) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { not: "VOIDED" },
        },
      });

      const totalTransactions = txs.length;
      let totalAmount = 0;
      let totalCash = 0;
      let totalQris = 0;
      let totalTransfer = 0;
      let totalCost = 0;

      for (const t of txs) {
        totalAmount += t.totalAmount;
        totalCost += t.totalCost;
        if (t.paymentMethod === "CASH") totalCash += t.totalAmount;
        else if (t.paymentMethod === "QRIS") totalQris += t.totalAmount;
        else if (t.paymentMethod === "TRANSFER") totalTransfer += t.totalAmount;
      }

      const grossProfit = totalAmount - totalCost;
      const marginPct = totalAmount > 0 ? ((grossProfit / totalAmount) * 100).toFixed(1) : "0.0";

      const timeStr = now.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const omzetText = `
📊 <b>LAPORAN OMZET PENJUALAN HARI INI</b>
━━━━━━━━━━━━━━━━━━━━━
🕒 <b>Update:</b> ${timeStr} WIB
🛒 <b>Transaksi Sukses:</b> <b>${totalTransactions} struk</b>

💵 <b>RINCIAN PENERIMAAN:</b>
• Tunai Laci (Cash): <b>Rp ${totalCash.toLocaleString("id-ID")}</b>
• QRIS Dinamis: <b>Rp ${totalQris.toLocaleString("id-ID")}</b>
${totalTransfer > 0 ? `• Transfer Bank: <b>Rp ${totalTransfer.toLocaleString("id-ID")}</b>\n` : ""}━━━━━━━━━━━━━━━━━━━━━
💰 <b>TOTAL OMZET: Rp ${totalAmount.toLocaleString("id-ID")}</b>
📈 <b>Estimasi Laba Kotor: +Rp ${grossProfit.toLocaleString("id-ID")} (${marginPct}%)</b>
━━━━━━━━━━━━━━━━━━━━━
<i>Data disinkronkan langsung dari kasir realtime.</i>
`.trim();

      await sendTelegramMessage(omzetText, chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // B. Cek Kasir yang Sedang Tugas (Shift Aktif)
    if (
      cleanText.includes("kasir") ||
      cleanText.includes("shift") ||
      cleanText === "/kasir" ||
      cleanText === "/shift"
    ) {
      const activeShift = await prisma.shift.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      if (!activeShift) {
        const noShiftText = `
🔴 <b>STATUS KASIR: TOKO SEDANG TUTUP</b>
━━━━━━━━━━━━━━━━━━━━━
Saat ini tidak ada kasir yang membuka shift aktif.
Semua shift sebelumnya telah ditutup.
`.trim();
        await sendTelegramMessage(noShiftText, chatId, getMainMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      const openTime = new Date(activeShift.openedAt).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const shiftName =
        activeShift.shiftType === "SHIFT_1"
          ? "Shift 1 (Pagi)"
          : activeShift.shiftType === "SHIFT_2"
          ? "Shift 2 (Siang)"
          : "Full Day";

      const totalShiftSales = (activeShift.totalCashSales || 0) + (activeShift.totalQrisSales || 0);

      const cashierText = `
👤 <b>KASIR AKTIF BERTUGAS SAAT INI</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama Kasir:</b> <b>${activeShift.cashierName}</b>
⏰ <b>Shift:</b> ${shiftName}
🕒 <b>Waktu Buka:</b> ${openTime} WIB

💵 <b>STATUS KASIR BERJALAN:</b>
• Modal Awal Laci: <b>Rp ${(activeShift.openingFloat || 0).toLocaleString("id-ID")}</b>
• Penjualan Tunai: <b>Rp ${(activeShift.totalCashSales || 0).toLocaleString("id-ID")}</b>
• Penjualan QRIS: <b>Rp ${(activeShift.totalQrisSales || 0).toLocaleString("id-ID")}</b>
• Transaksi Shift: <b>${activeShift.totalTransactions || 0} order</b>
━━━━━━━━━━━━━━━━━━━━━
💰 <b>Total Penjualan Shift: Rp ${totalShiftSales.toLocaleString("id-ID")}</b>
`.trim();

      await sendTelegramMessage(cashierText, chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // C. Cek Stok Menipis / Habis
    if (
      cleanText.includes("stok") ||
      cleanText.includes("habis") ||
      cleanText.includes("menipis") ||
      cleanText === "/habis" ||
      cleanText === "/stok"
    ) {
      const allActive = await prisma.product.findMany({
        where: { isActive: { not: false } },
        orderBy: { stock: "asc" },
      });

      const lowStockItems = allActive.filter((p) => p.stock <= p.minStock);

      if (lowStockItems.length === 0) {
        const safeText = `
✅ <b>SEMUA STOK BARANG AMAN!</b>
━━━━━━━━━━━━━━━━━━━━━
Tidak ada barang etalase yang menipis atau di bawah batas minimum stok saat ini.
`.trim();
        await sendTelegramMessage(safeText, chatId, getMainMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      let listText = `⚠️ <b>PERINGATAN STOK MENIPIS (${lowStockItems.length} Item):</b>\n━━━━━━━━━━━━━━━━━━━━━\n`;
      lowStockItems.slice(0, 15).forEach((p, idx) => {
        const statusEmoji = p.stock <= 0 ? "🔴 [HABIS]" : "🟡 [MENIPIS]";
        listText += `${idx + 1}. <b>${p.name}</b>\n   ${statusEmoji} Sisa: <b>${p.stock} pcs</b> (Min: ${p.minStock})\n`;
      });

      if (lowStockItems.length > 15) {
        listText += `\n<i>...dan ${lowStockItems.length - 15} barang lainnya. Cek lengkap di Admin Web.</i>\n`;
      }
      listText += `━━━━━━━━━━━━━━━━━━━━━\n<i>Segera lakukan kulakan ke distributor ATK.</i>`;

      await sendTelegramMessage(listText, chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // D. Backup Database Sewaktu-waktu (On-Demand Download)
    if (
      cleanText.includes("backup") ||
      cleanText === "/backup" ||
      cleanText === "download database"
    ) {
      await sendTelegramMessage(
        "⏳ <i>Sedang memproses dump database MySQL Focus Maraja terbaru... Mohon tunggu sebentar.</i>",
        chatId
      );

      const backup = await generateDatabaseBackupSql();

      const caption = `
💾 <b>BACKUP DATABASE FOCUS MARAJA</b>
━━━━━━━━━━━━━━━━━━━━━
📅 <b>Waktu:</b> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
📦 <b>Berkas:</b> <code>${backup.fileName}</code>
📊 <b>Ukuran:</b> ${backup.fileSizeStr}
🏷️ <b>Master Barang:</b> <b>${backup.totalProducts} item</b>
🛒 <b>Riwayat Transaksi:</b> <b>${backup.totalTransactions} transaksi</b>
━━━━━━━━━━━━━━━━━━━━━
🛡️ <i>File arsip .sql.gz ini terkompresi aman dan siap di-restore ke MySQL kapan saja jika dibutuhkan.</i>
`.trim();

      const sent = await sendTelegramDocument(chatId, backup.buffer, backup.fileName, caption);

      if (!sent) {
        await sendTelegramMessage("❌ Gagal mengirim file backup database ke Telegram.", chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // E. Cari Barang / Cek Harga
    if (cleanText.startsWith("/cari") || cleanText.startsWith("cari ") || cleanText === "🔍 cari barang") {
      let query = rawText.replace(/^\/?cari\s*/i, "").trim();

      if (!query) {
        const guideText = `
🔍 <b>PENCARIAN BARANG & HARGA:</b>
━━━━━━━━━━━━━━━━━━━━━
Silakan ketik perintah dengan nama barang yang dicari:
<code>/cari [nama barang]</code>

<i>Contoh:</i>
• <code>/cari Joyko</code>
• <code>/cari Kertas Folio</code>
• <code>/cari Lem</code>
`.trim();
        await sendTelegramMessage(guideText, chatId, getMainMenuKeyboard());
        return NextResponse.json({ ok: true });
      }

      const results = await prisma.product.findMany({
        where: {
          name: { contains: query },
          isActive: { not: false },
        },
        include: { category: true },
        take: 8,
      });

      if (results.length === 0) {
        await sendTelegramMessage(
          `🔍 Tidak ditemukan barang dengan kata kunci "<b>${query}</b>".`,
          chatId,
          getMainMenuKeyboard()
        );
        return NextResponse.json({ ok: true });
      }

      let resText = `🔍 <b>HASIL PENCARIAN "${query.toUpperCase()}" (${results.length} ditemukan):</b>\n━━━━━━━━━━━━━━━━━━━━━\n`;
      results.forEach((p, idx) => {
        resText += `<b>${idx + 1}. ${p.name}</b>\n`;
        resText += `• Kategori: <i>${p.category?.name || "Umum"}</i>\n`;
        resText += `• Sisa Stok: <b>${p.stock} pcs</b>\n`;
        resText += `• Harga Eceran: <b>Rp ${p.sellingPrice.toLocaleString("id-ID")}</b>\n`;
        if (p.hasPack && p.packPrice) {
          resText += `• Grosir (${p.packName || "Pack"} @${p.packQuantity}pcs): <b>Rp ${p.packPrice.toLocaleString("id-ID")}</b>\n`;
        }
        resText += `\n`;
      });

      await sendTelegramMessage(resText.trim(), chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // F. Bantuan
    if (cleanText.includes("bantuan") || cleanText === "/help" || cleanText === "help") {
      const helpText = `
⚙️ <b>PANDUAN PERINTAH BOT ASISTEN TOKO:</b>
━━━━━━━━━━━━━━━━━━━━━
Anda dapat mengetuk tombol menu atau mengetik perintah:

• <code>/omzet</code> – Cek total transaksi & keuntungan hari ini
• <code>/kasir</code> – Cek siapa kasir yang sedang bertugas
• <code>/habis</code> – Cek barang etalase yang stoknya menipis
• <code>/cari [nama]</code> – Cek harga eceran, grosir & sisa stok barang
• <code>/backup</code> – Ambil & download dump database terbaru (.sql.gz)
• <code>/menu</code> – Tampilkan kembali tombol pintasan menu
━━━━━━━━━━━━━━━━━━━━━
<i>Bot terhubung secara realtime dengan sistem kasir Focus Maraja.</i>
`.trim();
      await sendTelegramMessage(helpText, chatId, getMainMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // Default fallback
    const fallbackText = `
Halo Bos! Perintah tidak dikenali. Silakan gunakan tombol pintasan di bawah ini untuk melihat data toko:
`.trim();
    await sendTelegramMessage(fallbackText, chatId, getMainMenuKeyboard());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in Telegram webhook:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// GET: Cek status webhook & automasi pendaftaran ke Telegram BotFather API
export async function GET(req: Request) {
  const token = getTelegramBotToken();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Jika tombol pasang webhook ditekan dari dashboard
  if (action === "set_webhook") {
    if (!token) {
      return NextResponse.json({
        success: false,
        message: "TELEGRAM_BOT_TOKEN belum diset di server.",
      });
    }

    const host = req.headers.get("host") || "focusmaraja.my.id";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      const tgJson = await tgRes.json();
      return NextResponse.json({
        success: tgJson.ok,
        telegramResponse: tgJson,
        webhookUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    status: "Telegram Webhook Endpoint is Online",
    tokenConfigured: !!token,
  });
}
