import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET: Ambil daftar pengeluaran belanja bulanan toko
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // e.g. "2026-11" atau "11"
    const yearParam = searchParams.get("year");   // e.g. "2026"
    const category = searchParams.get("category");

    const whereClause: Record<string, unknown> = {};

    let targetYear: number | null = null;
    let targetMonth: number | null = null;

    if (monthParam) {
      if (monthParam.includes("-")) {
        const parts = monthParam.split("-");
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
      } else {
        targetMonth = parseInt(monthParam, 10);
        targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
      }
    } else if (yearParam) {
      targetYear = parseInt(yearParam, 10);
    }

    if (targetYear && targetMonth && !isNaN(targetYear) && !isNaN(targetMonth)) {
      const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (targetYear && !isNaN(targetYear)) {
      const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

      whereClause.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Kategori grouping
    const categorySummary: Record<string, number> = {};
    for (const e of expenses) {
      categorySummary[e.category] = (categorySummary[e.category] || 0) + e.amount;
    }

    const currentMonthLabel = monthParam || (targetYear && targetMonth ? `${targetYear}-${String(targetMonth).padStart(2, "0")}` : "");

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        summary: {
          month: currentMonthLabel,
          totalExpenses: totalAmount,
          byCategory: categorySummary,
        },
      },
      expenses,
      totalAmount,
      categorySummary,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// POST: Tambah pengeluaran belanja baru
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { category, description, amount, date } = body;

    if (!description || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "Deskripsi dan nominal pengeluaran wajib diisi." },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        category: category || "OPERASIONAL",
        description: description.trim(),
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        recordedBy: user.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengeluaran belanja berhasil dicatat.",
      data: expense,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// PUT: Ubah / Edit catatan pengeluaran belanja
export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { id, category, description, amount, date } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID pengeluaran wajib disertakan." }, { status: 400 });
    }

    if (!description || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "Deskripsi dan nominal pengeluaran wajib diisi." },
        { status: 400 }
      );
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        category: category || "OPERASIONAL",
        description: description.trim(),
        amount: Number(amount),
        date: date ? new Date(date) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Catatan pengeluaran berhasil diperbarui.",
      data: updated,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// DELETE: Hapus pengeluaran (satuan per id atau hapus semua)
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";
    const month = searchParams.get("month"); // e.g. "2026-11"

    if (all) {
      if (month && month.includes("-")) {
        const [yearStr, monthStr] = month.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        await prisma.expense.deleteMany({
          where: {
            date: { gte: start, lte: end },
          },
        });
        return NextResponse.json({
          success: true,
          message: `Seluruh catatan pengeluaran bulan ${month} berhasil dibersihkan.`,
        });
      }

      await prisma.expense.deleteMany({});
      return NextResponse.json({
        success: true,
        message: "Seluruh data pengeluaran toko berhasil dibersihkan.",
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib disertakan" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Data pengeluaran berhasil dihapus.",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

