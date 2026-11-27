import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const shifts = await prisma.shift.findMany({
      orderBy: { openedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: shifts,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// DELETE: Hapus data shift (bisa hapus satuan per id atau hapus semua)
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      await prisma.shift.deleteMany({});
      return NextResponse.json({ success: true, message: "Semua data shift kasir berhasil dibersihkan." });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: "ID shift wajib disertakan." }, { status: 400 });
    }

    await prisma.shift.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Data shift berhasil dihapus." });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus shift";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

