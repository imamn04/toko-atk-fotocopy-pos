import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TransactionReportData } from "./exportExcel";

export function exportTransactionsToPdf(
  transactions: TransactionReportData[],
  dateRangeText: string
) {
  const doc = new jsPDF("landscape", "mm", "a4");

  // Kop Laporan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("DEVOS TOKO ATK & FOTOCOPY", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Laporan Rekapitulasi Penjualan & Laba Kotor Resmi", 14, 22);
  doc.text(`Periode: ${dateRangeText} | Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 28);

  // Kalkulasi total
  const totalOmzet = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalHpp = transactions.reduce((acc, t) => acc + t.totalCost, 0);
  const totalLaba = transactions.reduce((acc, t) => acc + t.grossProfit, 0);

  // Table Body
  const tableRows = transactions.map((t, idx) => [
    idx + 1,
    t.invoiceNumber,
    new Date(t.createdAt).toLocaleString("id-ID"),
    t.cashierName,
    t.paymentMethod,
    `Rp ${t.totalAmount.toLocaleString("id-ID")}`,
    `Rp ${t.totalCost.toLocaleString("id-ID")}`,
    `Rp ${t.grossProfit.toLocaleString("id-ID")}`,
  ]);

  // Append Total Row
  tableRows.push([
    "",
    "TOTAL KESELURUHAN",
    "",
    "",
    `${transactions.length} TRX`,
    `Rp ${totalOmzet.toLocaleString("id-ID")}`,
    `Rp ${totalHpp.toLocaleString("id-ID")}`,
    `Rp ${totalLaba.toLocaleString("id-ID")}`,
  ]);

  autoTable(doc, {
    startY: 33,
    head: [
      [
        "No",
        "No. Invoice",
        "Waktu Transaksi",
        "Kasir",
        "Metode",
        "Total Omzet",
        "Total Modal (HPP)",
        "Laba Kotor",
      ],
    ],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235], // Blue-600
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 45, fontStyle: "bold" },
      2: { cellWidth: 38 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 35, halign: "right" },
      6: { cellWidth: 35, halign: "right" },
      7: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
  });

  doc.save(`Laporan_Penjualan_ATK_${Date.now()}.pdf`);
}

