import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// POST: Reset seluruh data transaksi dan shift uji coba (Fresh Launch Toko)
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak. Hanya Pemilik/Admin yang berhak mereset toko." }, { status: 403 });
    }

    // Eksekusi pembersihan transaksi demo di dalam database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Hapus seluruh item transaksi detail
      await tx.transactionItem.deleteMany({});

      // 2. Hapus seluruh header riwayat transaksi penjualan
      await tx.transaction.deleteMany({});

      // 3. Hapus seluruh riwayat pembukuan shift kasir (Z-Report)
      await tx.shift.deleteMany({});
    });

    return NextResponse.json({
      success: true,
      message: "Seluruh data transaksi dan rekap shift uji coba berhasil dibersihkan! Omzet telah kembali ke Rp 0 dan toko siap beroperasi resmi.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mereset data transaksi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
