import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Hitung ringkasan statistik
    const totalProducts = products.length;
    const totalAssetValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

    return NextResponse.json({
      success: true,
      products,
      stats: {
        totalProducts,
        totalAssetValue,
        lowStockCount,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      categoryId,
      costPrice,
      sellingPrice,
      stock,
      minStock,
      barcode,
      sku,
      hasPack = false,
      packName,
      packQuantity,
      packPrice,
    } = body;

    if (!name || !categoryId || costPrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { success: false, message: "Mohon isi semua data yang diwajibkan." },
        { status: 400 }
      );
    }

    // Auto-generate SKU jika kosong: ATK-XXXX
    let finalSku = sku?.trim();
    if (!finalSku) {
      const count = await prisma.product.count();
      finalSku = `ATK-${String(count + 1).padStart(4, "0")}`;
    }

    // Auto-generate barcode 13 digit standar jika kosong
    let finalBarcode = barcode?.trim();
    if (!finalBarcode) {
      finalBarcode = "899" + Math.floor(100000000 + Math.random() * 900000000).toString();
    }

    // Cek duplikasi barcode
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: finalBarcode },
    });
    if (existingBarcode) {
      return NextResponse.json(
        { success: false, message: `Barcode "${finalBarcode}" sudah digunakan oleh produk lain!` },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        categoryId,
        sku: finalSku,
        barcode: finalBarcode,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 5,
        isActive: true,
        hasPack: Boolean(hasPack),
        packName: hasPack && packName ? packName.trim() : null,
        packQuantity: hasPack && packQuantity ? Number(packQuantity) : null,
        packPrice: hasPack && packPrice ? Number(packPrice) : null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil ditambahkan.",
      product: newProduct,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

