import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET: Ambil semua paket bundling promo
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const bundles = await prisma.bundle.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellingPrice: true,
                stock: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: bundles });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

// POST: Buat paket bundling promo baru dengan barcode khusus
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { name, barcode, price, description, items } = body as {
      name: string;
      barcode?: string;
      price: number;
      description?: string;
      items: Array<{ productId: string; qty: number }>;
    };

    if (!name || !price || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nama paket, harga promo, dan minimal 1 barang penyusun wajib diisi." },
        { status: 400 }
      );
    }

    // Auto-generate barcode & SKU bundling jika belum diisi
    const count = await prisma.bundle.count();
    const seqStr = String(count + 1).padStart(4, "0");
    const autoSku = `BND-${seqStr}`;
    const autoBarcode = barcode && barcode.trim() !== "" ? barcode.trim() : `899${Date.now().toString().slice(-9)}`;

    // Cek duplikasi barcode terhadap produk reguler dan bundling lain
    const existingProd = await prisma.product.findUnique({
      where: { barcode: autoBarcode },
    });
    const existingBundle = await prisma.bundle.findUnique({
      where: { barcode: autoBarcode },
    });
    if (existingProd || existingBundle) {
      return NextResponse.json(
        { success: false, message: `Barcode "${autoBarcode}" sudah digunakan oleh barang atau paket promo lain!` },
        { status: 400 }
      );
    }

    const bundle = await prisma.bundle.create({
      data: {
        name: name.trim(),
        sku: autoSku,
        barcode: autoBarcode,
        price: Number(price),
        description: description?.trim() || null,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            qty: Math.max(1, Number(it.qty) || 1),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Paket bundling promo "${bundle.name}" berhasil dibuat dengan barcode: ${bundle.barcode}`,
      data: bundle,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}

