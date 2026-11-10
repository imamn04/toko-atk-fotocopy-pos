import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET: Ambil status shift kasir aktif saat ini dengan kalkulasi transaksi riil dari database
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Sesi kasir tidak valid atau belum login." },
        { status: 401 }
      );
    }

    const cashierId = sessionUser.id;
    const cashierName = sessionUser.name || "Kasir";

    // 1. Cari shift yang masih OPEN untuk kasir ini
    let activeShift = await prisma.shift.findFirst({
      where: {
        cashierId,
        status: "OPEN",
      },
      orderBy: { openedAt: "desc" },
    });

    // Jika belum ada shift OPEN sama sekali untuk hari ini, otomatis inisialisasi shift aktif!
    if (!activeShift && cashierId) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      activeShift = await prisma.shift.create({
        data: {
          cashierId,
          cashierName,
          shiftType: "SHIFT_1",
          openingFloat: 100000,
          status: "OPEN",
          openedAt: startOfDay,
        },
      });
    }

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Tidak ada data kasir.",
      });
    }

    // 2. HITUNG RIIL TRANSAKSI DARI TABEL `Transaction` (Anti Selisih / Realtime - Kecuali VOID)
    // Ambil semua transaksi aktif oleh kasir ini sejak shift dibuka
    const transactions = await prisma.transaction.findMany({
      where: {
        cashierId: activeShift.cashierId,
        createdAt: {
          gte: activeShift.openedAt,
        },
        status: { not: "VOIDED" },
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
      },
    });

    let totalCashSales = 0;
    let totalQrisSales = 0;
    for (const tx of transactions) {
      if (tx.paymentMethod === "CASH") {
        totalCashSales += tx.totalAmount;
      } else {
        totalQrisSales += tx.totalAmount;
      }
    }

    const totalTransactions = transactions.length;
    const expectedCash = activeShift.openingFloat + totalCashSales;

    // Sinkronkan ke database shift
    const updatedShift = await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        totalCashSales,
        totalQrisSales,
        totalTransactions,
        expectedCash,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedShift,
        expectedCash,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    console.error("GET /api/pos/shift error:", errMsg);
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// POST: Buka Shift Baru (OPEN) atau Tutup Kasir / Setor Laci (CLOSE)
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Sesi kasir tidak valid atau belum login." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, shiftType = "SHIFT_1", openingFloat = 100000, shiftId, closingCash, notes } = body;

    const cashierId = sessionUser.id;
    const cashierName = sessionUser.name || "Kasir";

    if (action === "OPEN") {
      // Periksa apakah sudah ada shift yang OPEN untuk kasir ini
      const existingOpen = await prisma.shift.findFirst({
        where: {
          cashierId,
          status: "OPEN",
        },
      });

      if (existingOpen) {
        // Perbarui modal awal & tipe shift jika user mengubahnya di login
        const updated = await prisma.shift.update({
          where: { id: existingOpen.id },
          data: {
            shiftType,
            openingFloat: Number(openingFloat) || existingOpen.openingFloat,
          },
        });

        return NextResponse.json({
          success: true,
          data: updated,
          message: "Shift kasir diperbarui.",
        });
      }

      const newShift = await prisma.shift.create({
        data: {
          cashierId,
          cashierName,
          shiftType,
          openingFloat: Number(openingFloat) || 0,
          status: "OPEN",
        },
      });

      return NextResponse.json({
        success: true,
        data: newShift,
        message: "Shift kasir berhasil dibuka.",
      });
    }

    if (action === "CLOSE") {
      let shift = null;
      if (shiftId) {
        shift = await prisma.shift.findUnique({ where: { id: shiftId } });
      } else {
        shift = await prisma.shift.findFirst({
          where: { cashierId, status: "OPEN" },
          orderBy: { openedAt: "desc" },
        });
      }

      if (!shift) {
        return NextResponse.json(
          { success: false, message: "Shift kasir aktif tidak ditemukan untuk ditutup." },
          { status: 404 }
        );
      }

      // Ambil transaksi riil terkini untuk shift ini (Hanya transaksi valid non-VOID)
      const transactions = await prisma.transaction.findMany({
        where: {
          cashierId: shift.cashierId,
          createdAt: {
            gte: shift.openedAt,
          },
          status: { not: "VOIDED" },
        },
        select: {
          totalAmount: true,
          paymentMethod: true,
        },
      });

      let totalCashSales = 0;
      let totalQrisSales = 0;
      for (const tx of transactions) {
        if (tx.paymentMethod === "CASH") {
          totalCashSales += tx.totalAmount;
        } else {
          totalQrisSales += tx.totalAmount;
        }
      }

      const totalTransactions = transactions.length;
      const expectedCash = shift.openingFloat + totalCashSales;
      const parsedClosingCash = Number(closingCash) || 0;
      const discrepancy = parsedClosingCash - expectedCash;

      const closedShift = await prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: "CLOSED",
          totalCashSales,
          totalQrisSales,
          totalTransactions,
          closingCash: parsedClosingCash,
          expectedCash,
          notes: notes ? notes.trim() : null,
          closedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...closedShift,
          discrepancy,
        },
        message: "Shift kasir berhasil ditutup & direkap.",
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    console.error("POST /api/pos/shift error:", errMsg);
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
