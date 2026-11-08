import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET: Ambil status shift kasir aktif saat ini
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const cashierId = sessionUser?.id;

    let activeShift = null;
    if (cashierId) {
      activeShift = await prisma.shift.findFirst({
        where: {
          cashierId,
          status: "OPEN",
        },
        orderBy: { openedAt: "desc" },
      });
    }

    if (!activeShift) {
      activeShift = await prisma.shift.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });
    }

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Tidak ada shift kasir yang sedang aktif.",
      });
    }

    const expectedCash = activeShift.openingFloat + activeShift.totalCashSales;

    return NextResponse.json({
      success: true,
      data: {
        ...activeShift,
        expectedCash,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// POST: Buka Shift Baru (OPEN) atau Tutup Kasir / Setor Laci (CLOSE)
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const body = await req.json();
    const { action, shiftType = "SHIFT_1", openingFloat = 100000, shiftId, closingCash, notes } = body;

    const cashierId = sessionUser?.id || "default-cashier";
    const cashierName = sessionUser?.name || "Kasir";

    if (action === "OPEN") {
      // Periksa apakah kasir ini sudah punya shift yang masih terbuka
      const existingOpen = await prisma.shift.findFirst({
        where: {
          cashierId,
          status: "OPEN",
        },
      });

      if (existingOpen) {
        return NextResponse.json({
          success: true,
          data: existingOpen,
          message: "Shift kasir sebelumnya masih aktif.",
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
      const targetId = shiftId;
      let shift = null;

      if (targetId) {
        shift = await prisma.shift.findUnique({ where: { id: targetId } });
      } else {
        shift = await prisma.shift.findFirst({
          where: { cashierId, status: "OPEN" },
          orderBy: { openedAt: "desc" },
        });
      }

      if (!shift || shift.status !== "OPEN") {
        return NextResponse.json(
          { success: false, message: "Shift kasir aktif tidak ditemukan untuk ditutup." },
          { status: 404 }
        );
      }

      const parsedClosingCash = Number(closingCash) || 0;
      const expectedCash = shift.openingFloat + shift.totalCashSales;
      const discrepancy = parsedClosingCash - expectedCash;

      const closedShift = await prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: "CLOSED",
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
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
