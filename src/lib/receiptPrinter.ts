import JsBarcode from "jsbarcode";

export interface ReceiptData {
  invoiceNumber: string;
  totalAmount: number;
  cashPaid: number;
  changeDue: number;
  paymentMethod: string;
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
