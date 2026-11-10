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

    let whereClause: Record<string, unknown> = {};

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

    return NextResponse.json({
      success: true,
      data: expenses,
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

// DELETE: Hapus pengeluaran
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

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

