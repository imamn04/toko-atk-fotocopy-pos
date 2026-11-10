import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET: Ambil pengaturan toko & QRIS
export async function GET() {
  try {
    let setting = await prisma.storeSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      setting = await prisma.storeSetting.create({
        data: {
          id: "default",
          storeName: "FOCUS MARAJA",
          storeAddress: "Fotokopi – ATK – Studio",
          storePhone: "0812-3456-7890",
          bankAccountInfo: "BCA / Mandiri / ShopeePay a.n FOCUS MARAJA",
        },
      });
    }

    return NextResponse.json({ success: true, data: setting });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal mengambil pengaturan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// POST: Simpan / Perbarui pengaturan toko & QRIS
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { storeName, storeAddress, storePhone, qrisImageUrl, qrisRawPayload, bankAccountInfo } = body;

    const updated = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {
        storeName: storeName || "FOCUS MARAJA",
        storeAddress: storeAddress || "Fotokopi – ATK – Studio",
        storePhone: storePhone || "",
        qrisImageUrl: qrisImageUrl ?? undefined,
        qrisRawPayload: qrisRawPayload ?? undefined,
        bankAccountInfo: bankAccountInfo || "",
      },
      create: {
        id: "default",
        storeName: storeName || "FOCUS MARAJA",
        storeAddress: storeAddress || "Fotokopi – ATK – Studio",
        storePhone: storePhone || "",
        qrisImageUrl: qrisImageUrl ?? null,
        qrisRawPayload: qrisRawPayload ?? null,
        bankAccountInfo: bankAccountInfo || "",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan toko & QRIS berhasil disimpan.",
      data: updated,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal menyimpan pengaturan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

