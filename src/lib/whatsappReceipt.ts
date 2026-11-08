import { ReceiptData } from "./receiptPrinter";

export function formatWhatsAppReceiptText(tx: ReceiptData, storeName = "FOCUS MARAJA"): string {
  const dateStr = new Date(tx.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = new Date(tx.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsList = tx.items
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.product.name}*\n   ${it.qty} x Rp ${it.sellingPrice.toLocaleString(
          "id-ID"
        )} = Rp ${it.subtotal.toLocaleString("id-ID")}`
    )
    .join("\n");

  const subtotal = tx.items.reduce((s, i) => s + i.subtotal, 0);

  let text = `*${storeName.toUpperCase()}*\n`;
  text += `_Fotokopi • ATK • Studio_\n`;
  text += `================================\n`;
  text += `*NOTA TRANSAKSI DIGITAL*\n`;
  text += `No. Transaksi : \`${tx.invoiceNumber}\`\n`;
  text += `Waktu         : ${dateStr}, ${timeStr} WIB\n`;
  text += `Kasir         : ${tx.cashier?.name || "Kasir"}\n`;
  text += `Metode Bayar  : *${tx.paymentMethod}*\n`;
  if (tx.customerName) {
    text += `Pelanggan     : ${tx.customerName}\n`;
  }
  text += `================================\n`;
  text += `*Rincian Belanja:*\n${itemsList}\n`;
  text += `--------------------------------\n`;

  if (tx.discountAmount && tx.discountAmount > 0) {
    text += `Subtotal  : Rp ${subtotal.toLocaleString("id-ID")}\n`;
    text += `Diskon    : - Rp ${tx.discountAmount.toLocaleString("id-ID")}\n`;
  }

  text += `*TOTAL     : Rp ${tx.totalAmount.toLocaleString("id-ID")}*\n`;
  text += `Bayar     : Rp ${tx.cashPaid.toLocaleString("id-ID")}\n`;
  text += `Kembalian : Rp ${tx.changeDue.toLocaleString("id-ID")}\n`;
  text += `================================\n`;
  text += `Terima kasih telah berbelanja di *${storeName}*!\n`;
  text += `_Simpan pesan ini sebagai bukti pembayaran resmi._`;

  return text;
}

export function openWhatsAppReceipt(tx: ReceiptData, phoneNumber?: string) {
  const message = formatWhatsAppReceiptText(tx);
  let cleanPhone = "";

  if (phoneNumber && phoneNumber.trim().length > 0) {
    let p = phoneNumber.trim().replace(/[^0-9]/g, "");
    if (p.startsWith("0")) {
      p = "62" + p.slice(1);
    } else if (p.startsWith("8")) {
      p = "62" + p;
    }
    cleanPhone = p;
  }

  const encodedMsg = encodeURIComponent(message);
  let url = `https://api.whatsapp.com/send?text=${encodedMsg}`;
  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  }

  window.open(url, "_blank");
}
