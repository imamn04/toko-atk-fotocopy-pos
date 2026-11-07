import ExcelJS from "exceljs";

export interface TransactionReportData {
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  paymentMethod: string;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  itemCount: number;
}

export async function exportTransactionsToExcel(
  transactions: TransactionReportData[],
  dateRangeText: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Devos ATK Backoffice";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan Penjualan");

  // Title
  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "LAPORAN PENJUALAN TOKO ATK & FOTOCOPY";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // slate-800
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Periode Subtitle
  worksheet.mergeCells("A2:G2");
  const periodCell = worksheet.getCell("A2");
  periodCell.value = `Periode: ${dateRangeText}`;
  periodCell.font = { name: "Arial", size: 10, italic: true };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  // Table Headers
  const headers = [
    "No. Invoice",
    "Waktu Transaksi",
    "Nama Kasir",
    "Metode Bayar",
    "Total Omzet (Rp)",
    "Total HPP/Modal (Rp)",
    "Laba Kotor (Rp)",
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // blue-600
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Table Data Rows
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  transactions.forEach((tx) => {
    totalRevenue += tx.totalAmount;
    totalCost += tx.totalCost;
    totalProfit += tx.grossProfit;

    const row = worksheet.addRow([
      tx.invoiceNumber,
      new Date(tx.createdAt).toLocaleString("id-ID"),
      tx.cashierName,
      tx.paymentMethod,
      tx.totalAmount,
      tx.totalCost,
      tx.grossProfit,
    ]);

    row.height = 20;
    row.getCell(5).numFmt = "#,##0";
    row.getCell(6).numFmt = "#,##0";
    row.getCell(7).numFmt = "#,##0";

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // Summary Row (TOTAL)
  const totalRow = worksheet.addRow([
    "TOTAL",
    "",
    "",
    `${transactions.length} Transaksi`,
    totalRevenue,
    totalCost,
    totalProfit,
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
    };
  });
  totalRow.getCell(5).numFmt = "#,##0";
  totalRow.getCell(6).numFmt = "#,##0";
  totalRow.getCell(7).numFmt = "#,##0";

  // Auto-fit column widths
  worksheet.columns = [
    { width: 24 }, // Invoice
    { width: 22 }, // Waktu
    { width: 18 }, // Kasir
    { width: 16 }, // Metode
    { width: 20 }, // Omzet
    { width: 20 }, // HPP
    { width: 20 }, // Laba
  ];

  // Write and Trigger Download in Browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Laporan_Penjualan_ATK_${Date.now()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

