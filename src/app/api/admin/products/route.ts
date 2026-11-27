import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active"; // "active" | "archived" | "all"

    const whereClause: { isActive?: boolean } = {};
    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "archived") {
      whereClause.isActive = false;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Hitung ringkasan statistik master produk aktif & arsip
    const allProducts = await prisma.product.findMany();
    const activeProducts = allProducts.filter((p) => p.isActive);
    const archivedCount = allProducts.filter((p) => !p.isActive).length;
    const totalProducts = activeProducts.length;
    const totalAssetValue = activeProducts.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
    const lowStockCount = activeProducts.filter((p) => p.stock <= p.minStock).length;

    return NextResponse.json({
      success: true,
      products,
      stats: {
        totalProducts,
        totalAssetValue,
        lowStockCount,
        archivedCount,
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
      unitMode: rawUnitMode,
      hasPack: rawHasPack,
      packName,
      packQuantity,
      packPrice,
      packBarcode,
    } = body;

    const unitMode: "PCS_ONLY" | "PACK_ONLY" | "BOTH" =
      rawUnitMode === "PACK_ONLY" || rawUnitMode === "BOTH" || rawUnitMode === "PCS_ONLY"
        ? rawUnitMode
        : Boolean(rawHasPack)
        ? "BOTH"
        : "PCS_ONLY";

    const hasPack = unitMode === "PACK_ONLY" || unitMode === "BOTH";

    if (!name || !categoryId || costPrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { success: false, message: "Mohon isi semua data yang diwajibkan." },
        { status: 400 }
      );
    }

    // Auto-generate SKU yang dijamin 100% unik di database
    let finalSku = sku?.trim();
    if (!finalSku) {
      const allSkus = await prisma.product.findMany({ select: { sku: true } });
      const skuSet = new Set(allSkus.map((p) => p.sku.toUpperCase()));
      let nextNum = allSkus.length + 1;
      while (skuSet.has(`ATK-${String(nextNum).padStart(4, "0")}`)) {
        nextNum++;
      }
      finalSku = `ATK-${String(nextNum).padStart(4, "0")}`;
    } else {
      // Jika user mengisi manual, cek apakah SKU tersebut sudah digunakan produk lain
      const existingSku = await prisma.product.findUnique({
        where: { sku: finalSku },
      });
      if (existingSku) {
        return NextResponse.json(
          {
            success: false,
            message: `Kode SKU "${finalSku}" sudah digunakan oleh produk "${existingSku.name}" (termasuk di daftar arsip). Mohon gunakan SKU yang berbeda.`,
          },
          { status: 400 }
        );
      }
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

    // Penanganan Satuan & Barcode Grosir (Pack Barcode)
    let finalPackBarcode: string | null = null;
    let finalPackName: string | null = null;
    let finalPackQuantity: number | null = null;
    let finalPackPrice: number | null = null;

    if (unitMode === "PACK_ONLY") {
      finalPackName = packName?.trim() || "Pack";
      finalPackQuantity = 1;
      finalPackPrice = Number(sellingPrice);
      finalPackBarcode = packBarcode?.trim() || finalBarcode;
    } else if (unitMode === "BOTH") {
      finalPackName = packName?.trim() || "Pack";
      finalPackQuantity = Number(packQuantity) || 10;
      finalPackPrice = Number(packPrice) || Number(sellingPrice);
      finalPackBarcode = packBarcode?.trim() || (finalBarcode + "P");
    }

    let newProduct;
    try {
      newProduct = await prisma.product.create({
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
          unitMode,
          hasPack: unitMode === "PACK_ONLY" || unitMode === "BOTH",
          packName: finalPackName,
          packQuantity: finalPackQuantity,
          packPrice: finalPackPrice,
          packBarcode: finalPackBarcode,
        },
        include: {
          category: true,
        },
      });
    } catch (createErr: unknown) {
      const errObj = createErr as { code?: string };
      if (errObj?.code === "P2002") {
        // Fallback otomatis jika terjadi tabrakan SKU unik: tambahkan timestamp unik
        const fallbackSku = `ATK-${Date.now().toString().slice(-6)}`;
        newProduct = await prisma.product.create({
          data: {
            name: name.trim(),
            categoryId,
            sku: fallbackSku,
            barcode: finalBarcode,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 5,
            isActive: true,
            unitMode,
            hasPack: unitMode === "PACK_ONLY" || unitMode === "BOTH",
            packName: finalPackName,
            packQuantity: finalPackQuantity,
            packPrice: finalPackPrice,
            packBarcode: finalPackBarcode,
          },
          include: {
            category: true,
          },
        });
      } else {
        throw createErr;
      }
    }

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

