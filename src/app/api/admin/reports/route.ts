import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Hanya Admin / Pemilik Toko yang berwenang mengakses laporan keuangan." },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    // Default rentang: 7 hari terakhir jika tidak ditentukan
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 6);
    defaultStart.setHours(0, 0, 0, 0);

    const filterStart = startDateParam ? new Date(startDateParam + "T00:00:00.000Z") : defaultStart;
    const filterEnd = endDateParam ? new Date(endDateParam + "T23:59:59.999Z") : now;

    // 1. Ambil transaksi sesuai filter rentang tanggal
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: filterStart,
          lte: filterEnd,
        },
      },
      include: {
        cashier: {
          select: { name: true, username: true },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                barcode: true,
                category: { select: { name: true } },
              },
            },
            bundle: {
              select: {
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Transaksi Hari Ini (Daily Report - Hanya yang aktif / tidak void)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startOfToday },
        status: { not: "VOIDED" },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            bundle: { select: { name: true } },
          },
        },
      },
    });

    const dailyRevenue = todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const dailyCost = todayTransactions.reduce((acc, t) => acc + t.totalCost, 0);
    const dailyGrossProfit = dailyRevenue - dailyCost;
    const dailyTxCount = todayTransactions.length;

    // Rekap barang terjual hari ini
    const dailyItemMap = new Map<string, { name: string; qty: number; subtotal: number }>();
    for (const tx of todayTransactions) {
      for (const item of tx.items) {
        const itemKey = item.productId || item.bundleId || item.id;
        const itemName = item.product?.name || item.bundle?.name || item.itemTitle || "Item";
        const existing = dailyItemMap.get(itemKey) || {
          name: itemName,
          qty: 0,
          subtotal: 0,
        };
        existing.qty += item.qty;
        existing.subtotal += item.subtotal;
        dailyItemMap.set(itemKey, existing);
      }
    }
    const dailySoldItems = Array.from(dailyItemMap.values()).sort((a, b) => b.qty - a.qty);

    // 3. Rekap Transaksi Filtered (Hanya transaksi valid yang dihitung ke omzet dan laba)
    const validTransactions = transactions.filter((t) => t.status !== "VOIDED");

    const rangeRevenue = validTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const rangeCost = validTransactions.reduce((acc, t) => acc + t.totalCost, 0);
    const rangeGrossProfit = rangeRevenue - rangeCost;
    const aov = validTransactions.length > 0 ? Math.round(rangeRevenue / validTransactions.length) : 0;
    const marginPercent = rangeRevenue > 0 ? ((rangeGrossProfit / rangeRevenue) * 100).toFixed(1) : "0";

    // Rekap Best Seller dalam rentang tanggal
    const bestSellerMap = new Map<string, { name: string; qty: number; totalSales: number }>();
    const categoryMap = new Map<string, { name: string; revenue: number; qty: number }>();
    const paymentMap = new Map<string, { total: number; count: number }>();

    for (const tx of validTransactions) {
      // Metode pembayaran
      const method = (tx.paymentMethod || "CASH").toUpperCase();
      const existingPay = paymentMap.get(method) || { total: 0, count: 0 };
      existingPay.total += tx.totalAmount;
      existingPay.count += 1;
      paymentMap.set(method, existingPay);

      for (const item of tx.items) {
        const itemKey = item.productId || item.bundleId || item.id;
        const itemName = item.product?.name || item.bundle?.name || item.itemTitle || "Item";

        // Best sellers
        const existingBest = bestSellerMap.get(itemKey) || {
          name: itemName,
          qty: 0,
          totalSales: 0,
        };
        existingBest.qty += item.qty;
        existingBest.totalSales += item.subtotal;
        bestSellerMap.set(itemKey, existingBest);

        // Kategori breakdown
        const catName = item.product?.category?.name || (item.bundleId ? "Paket Promo" : "Lainnya");
        const existingCat = categoryMap.get(catName) || { name: catName, revenue: 0, qty: 0 };
        existingCat.revenue += item.subtotal;
        existingCat.qty += item.qty;
        categoryMap.set(catName, existingCat);
      }
    }

    const bestSellers = Array.from(bestSellerMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);

    const paymentMethods = Array.from(paymentMap.entries()).map(([method, val]) => ({
      method,
      total: val.total,
      count: val.count,
    }));

    // 4. Data Tren Tanggal Kontinu (Continuous Date Range untuk Grafik Recharts Cantik)
    const trendMap = new Map<string, { date: string; omzet: number; laba: number; transaksi: number }>();

    // Inisialisasi rentang tanggal kontinu
    const curDate = new Date(filterStart);
    const endLimit = new Date(filterEnd);
    let dayCount = 0;
    while (curDate <= endLimit && dayCount < 60) {
      const dateKey = curDate.toISOString().slice(0, 10);
      trendMap.set(dateKey, {
        date: dateKey,
        omzet: 0,
        laba: 0,
        transaksi: 0,
      });
      curDate.setDate(curDate.getDate() + 1);
      dayCount++;
    }

    for (const tx of validTransactions) {
      const dateKey = tx.createdAt.toISOString().slice(0, 10);
      const existing = trendMap.get(dateKey) || {
        date: dateKey,
        omzet: 0,
        laba: 0,
        transaksi: 0,
      };
      existing.omzet += tx.totalAmount;
      existing.laba += tx.totalAmount - tx.totalCost;
      existing.transaksi += 1;
      trendMap.set(dateKey, existing);
    }

    const chartTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      daily: {
        revenue: dailyRevenue,
        cost: dailyCost,
        profit: dailyGrossProfit,
        transactionCount: dailyTxCount,
        soldItems: dailySoldItems,
      },
      rangeSummary: {
        revenue: rangeRevenue,
        cost: rangeCost,
        profit: rangeGrossProfit,
        transactionCount: validTransactions.length,
        totalRawTransactions: transactions.length,
        voidTransactionCount: transactions.length - validTransactions.length,
        aov,
        marginPercent,
      },
      bestSellers,
      categoryBreakdown,
      paymentMethods,
      chartTrend,
      transactions,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching reports";
    console.error("Reports API Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
