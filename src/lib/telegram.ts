// Utility Helper untuk Integrasi Notifikasi Telegram Bot Toko
// FOCUS MARAJA - Owner Instant Alert

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "8771561240:AAF226M2nkBXmSaIKParl3lZT0I8M0KqO08";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6263058970";

export async function sendTelegramMessage(text: string): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("Telegram bot token or chat ID is missing");
      return false;
    }

    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to send telegram message:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending telegram message:", error);
    return false;
  }
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

