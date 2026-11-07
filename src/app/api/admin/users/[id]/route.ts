import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, role, password } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan." }, { status: 404 });
    }

    const updateData: { name?: string; role?: string; password?: string } = {};

    if (name) updateData.name = name.trim();
    if (role && (role === "ADMIN" || role === "KARYAWAN")) {
      // Cegah mengubah role diri sendiri jika dia adalah satu-satunya admin
      updateData.role = role;
    }
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.name} berhasil diperbarui.`,
      user: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;

    if (sessionUser.id === id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif." },
        { status: 400 }
      );
    }

    // Periksa apakah user memiliki riwayat transaksi
    const txCount = await prisma.transaction.count({
      where: { cashierId: id },
    });

    if (txCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `User ini memiliki ${txCount} riwayat transaksi kasir dan tidak dapat dihapus untuk menjaga integritas data audit keuangan. Anda dapat mengubah perannya atau mengganti passwordnya.`,
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

