import JsBarcode from "jsbarcode";

export interface ReceiptData {
  invoiceNumber: string;
  totalAmount: number;
  totalCost?: number;
  discountAmount?: number;
  cashPaid: number;
  changeDue: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  cashier?: {
    name: string;
  };
  items: {
    product: {
      name: string;
    };
    qty: number;
    sellingPrice: number;
    subtotal: number;
  }[];
}

export interface ShiftReportData {
  id: string;
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
  status?: string;
  notes?: string;
}

export function printThermalReceipt(tx: ReceiptData, storeInfo?: { name?: string; address?: string; phone?: string }) {
  const storeName = storeInfo?.name || "FOCUS MARAJA";
  const storeAddress = storeInfo?.address || "Fotokopi – ATK – Studio";
  const storePhone = storeInfo?.phone || "Layanan Cepat & Akurat";

  // Generate Barcode SVG untuk No. Invoice struk
  let barcodeSvg = "";
  try {
    const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(tempSvg, tx.invoiceNumber, {
      format: "CODE128",
      width: 1.1,
      height: 28,
      displayValue: true,
      fontSize: 9,
      margin: 0,
      font: "monospace",
    });
    barcodeSvg = tempSvg.outerHTML;
  } catch (err) {
    console.warn("Barcode render in receipt failed, fallback to text:", err);
  }

  const itemsHtml = tx.items
    .map(
      (it) => `
      <div class="receipt-item">
        <div class="item-name">${it.product.name}</div>
        <div class="item-meta">
          <span>${it.qty} x Rp ${it.sellingPrice.toLocaleString("id-ID")}</span>
          <span class="item-subtotal">Rp ${it.subtotal.toLocaleString("id-ID")}</span>
        </div>
      </div>
    `
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Izinkan browser membuka jendela popup untuk mencetak struk.");
    return;
  }

  // Desain Struk Ramping Standar Thermal 58mm (Anti-Melebar di A4)
  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk - ${tx.invoiceNumber}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            justify-content: center;
          }
          .receipt-container {
            width: 58mm !important;
            max-width: 58mm !important;
            min-width: 58mm !important;
            margin: 0 auto;
            padding: 4mm 2.5mm;
            font-size: 10px;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          
          .store-title {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.3px;
            margin-bottom: 1px;
            text-transform: uppercase;
          }
          .store-sub {
            font-size: 9px;
            color: #222;
          }

          .dashed-line {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-line {
            border-top: 1.5px solid #000;
            margin: 4px 0;
          }

          .info-table {
            width: 100%;
            font-size: 9.5px;
            margin: 2px 0;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 1px 0;
            vertical-align: top;
          }

          .receipt-item {
            margin-bottom: 4px;
          }
          .item-name {
            font-weight: bold;
            font-size: 10px;
            word-break: break-word;
          }
          .item-meta {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            margin-top: 0.5px;
          }
          .item-subtotal {
            font-weight: bold;
          }

          .summary-table {
            width: 100%;
            font-size: 10px;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 1.5px 0;
          }
          .grand-total-row td {
            font-size: 11.5px;
            font-weight: 900;
            padding-top: 3px;
            padding-bottom: 3px;
          }

          .barcode-box {
            margin: 6px 0 2px 0;
            text-align: center;
          }
          .barcode-box svg {
            width: 100%;
            max-width: 48mm;
            height: auto;
          }

          .footer-notes {
            font-size: 8.5px;
            text-align: center;
            color: #333;
            margin-top: 6px;
            line-height: 1.25;
          }

          /* Kunci Cetak agar tidak pernah melebar */
          @media print {
            html, body {
              width: 58mm !important;
              max-width: 58mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
            .receipt-container {
              width: 58mm !important;
              max-width: 58mm !important;
              margin: 0 auto !important;
              padding: 3mm 2mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Kop Toko -->
          <div class="text-center">
            <div class="store-title">${storeName}</div>
            <div class="store-sub">${storeAddress}</div>
            <div class="store-sub">${storePhone}</div>
          </div>

          <div class="double-line"></div>

          <!-- Metadata Transaksi -->
          <table class="info-table">
            <tr>
              <td style="width: 32%;">No. Invoice</td>
              <td style="width: 4%;">:</td>
              <td class="font-bold">${tx.invoiceNumber}</td>
            </tr>
            <tr>
              <td>Waktu</td>
              <td>:</td>
              <td>${new Date(tx.createdAt).toLocaleDateString("id-ID")} ${new Date(tx.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
            </tr>
            <tr>
              <td>Kasir</td>
              <td>:</td>
              <td>${tx.cashier?.name || "Kasir"}</td>
            </tr>
            <tr>
              <td>Metode</td>
              <td>:</td>
              <td class="font-bold">${tx.paymentMethod}</td>
            </tr>
          </table>

          <div class="dashed-line"></div>

          <!-- Daftar Barang -->
          <div style="margin: 3px 0;">
            ${itemsHtml}
          </div>

          <div class="dashed-line"></div>

          <!-- Ringkasan Finansial -->
          <table class="summary-table">
            ${
              tx.discountAmount && tx.discountAmount > 0
                ? `
                <tr>
                  <td>SUBTOTAL</td>
                  <td class="text-right">Rp ${(tx.totalAmount + tx.discountAmount).toLocaleString("id-ID")}</td>
                </tr>
                <tr>
                  <td>DISKON</td>
                  <td class="text-right font-bold">- Rp ${tx.discountAmount.toLocaleString("id-ID")}</td>
                </tr>
                `
                : ""
            }
            <tr class="grand-total-row">
              <td>TOTAL</td>
              <td class="text-right">Rp ${tx.totalAmount.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td>BAYAR (${tx.paymentMethod})</td>
              <td class="text-right font-bold">Rp ${tx.cashPaid.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td>KEMBALI</td>
              <td class="text-right font-bold">Rp ${tx.changeDue.toLocaleString("id-ID")}</td>
            </tr>
          </table>

          <div class="dashed-line"></div>

          <!-- Barcode Struk -->
          ${
            barcodeSvg
              ? `<div class="barcode-box">${barcodeSvg}</div>`
              : `<div class="text-center font-bold" style="font-size: 9px; margin: 3px 0;">${tx.invoiceNumber}</div>`
          }

          <!-- Pesan Penutup -->
          <div class="footer-notes">
            *** TERIMA KASIH ***<br/>
            Barang yang sudah dibeli<br/>
            tidak dapat ditukar/dikembalikan
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() {
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}

export function printShiftZReport(shift: ShiftReportData, storeInfo?: { name?: string; address?: string }) {
  const storeName = storeInfo?.name || "FOCUS MARAJA";
  const storeAddress = storeInfo?.address || "Fotokopi – ATK – Studio";

  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Izinkan browser membuka jendela popup untuk mencetak laporan shift.");
    return;
  }

  const shiftLabel =
    shift.shiftType === "SHIFT_1"
      ? "Shift 1 (Pagi)"
      : shift.shiftType === "SHIFT_2"
      ? "Shift 2 (Siang)"
      : "Full Day";

  const diffText =
    shift.discrepancy === 0
      ? "PAS (Rp 0)"
      : shift.discrepancy > 0
      ? `LEBIH +Rp ${shift.discrepancy.toLocaleString("id-ID")}`
      : `KURANG -Rp ${Math.abs(shift.discrepancy).toLocaleString("id-ID")}`;

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Rekap Shift - ${shift.cashierName}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body {
            margin: 0; padding: 0; background: #fff; color: #000;
            font-family: 'Courier New', Courier, monospace;
            display: flex; justify-content: center;
          }
          .receipt-container {
            width: 58mm !important; max-width: 58mm !important;
            margin: 0 auto; padding: 4mm 2.5mm; font-size: 10px; line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .store-title { font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
          .report-badge {
            display: inline-block; background: #000; color: #fff;
            padding: 2px 6px; font-size: 9px; font-weight: 900; margin: 3px 0;
          }
          .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
          .double-line { border-top: 1.5px solid #000; margin: 5px 0; }
          table { width: 100%; font-size: 9.5px; border-collapse: collapse; }
          td { padding: 1.5px 0; vertical-align: top; }
          .total-row td { font-size: 11px; font-weight: 900; padding: 3px 0; }
          .sig-box { margin-top: 12px; display: flex; justify-content: space-between; text-align: center; font-size: 9px; }
          .sig-line { margin-top: 28px; border-top: 1px dashed #000; width: 22mm; }
          @media print {
            html, body, .receipt-container { width: 58mm !important; max-width: 58mm !important; margin: 0 !important; padding: 2mm !important; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center">
            <div class="store-title">${storeName}</div>
            <div style="font-size: 8.5px; color: #333;">${storeAddress}</div>
            <div class="report-badge">LAPORAN TUTUP SHIFT (Z-REPORT)</div>
          </div>

          <div class="double-line"></div>

          <table>
            <tr><td style="width: 40%;">Kasir</td><td>:</td><td class="font-bold">${shift.cashierName}</td></tr>
            <tr><td>Shift</td><td>:</td><td>${shiftLabel}</td></tr>
            <tr><td>Buka Kasir</td><td>:</td><td>${new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • ${new Date(shift.openedAt).toLocaleDateString("id-ID")}</td></tr>
            <tr><td>Tutup Kasir</td><td>:</td><td>${new Date(shift.closedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • ${new Date(shift.closedAt).toLocaleDateString("id-ID")}</td></tr>
            <tr><td>Total Trx</td><td>:</td><td class="font-bold">${shift.totalTransactions} Transaksi</td></tr>
          </table>

          <div class="dashed-line"></div>

          <table>
            <tr><td>Modal Awal Laci</td><td class="text-right">Rp ${shift.openingFloat.toLocaleString("id-ID")}</td></tr>
            <tr><td>Penjualan Tunai (+)</td><td class="text-right font-bold">Rp ${shift.totalCashSales.toLocaleString("id-ID")}</td></tr>
            <tr><td>Penjualan QRIS (+)</td><td class="text-right">Rp ${shift.totalQrisSales.toLocaleString("id-ID")}</td></tr>
            <tr class="total-row"><td>TOTAL OMZET</td><td class="text-right">Rp ${(shift.totalCashSales + shift.totalQrisSales).toLocaleString("id-ID")}</td></tr>
          </table>

          <div class="dashed-line"></div>

          <table>
            <tr><td>Uang Laci Sistem</td><td class="text-right font-bold">Rp ${shift.expectedCash.toLocaleString("id-ID")}</td></tr>
            <tr><td>Uang Laci Fisik</td><td class="text-right font-bold">Rp ${shift.closingCash.toLocaleString("id-ID")}</td></tr>
            <tr class="total-row"><td>STATUS SELISIH</td><td class="text-right">${diffText}</td></tr>
          </table>

          ${shift.notes ? `<div style="font-size: 8.5px; margin-top: 4px;"><b>Catatan:</b> ${shift.notes}</div>` : ""}

          <div class="sig-box">
            <div>
              Kasir Bertugas
              <div class="sig-line"></div>
              (${shift.cashierName})
            </div>
            <div>
              Supervisor / Owner
              <div class="sig-line"></div>
              ( ................. )
            </div>
          </div>

          <div class="text-center" style="font-size: 8px; color: #555; margin-top: 10px;">
            Dicetak otomatis oleh Sistem Kasir FOCUS MARAJA
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() {
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();
}
