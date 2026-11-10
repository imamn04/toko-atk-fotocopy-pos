import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Ambil daftar ringkas pengguna aktif untuk layar login POS
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: [
        { role: "desc" }, // KARYAWAN (kasir) tampil duluan, disusul ADMIN
        { name: "asc" },
      ],
    });

    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching login users";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

