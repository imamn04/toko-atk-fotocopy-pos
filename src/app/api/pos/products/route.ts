import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";
    const categoryId = searchParams.get("categoryId")?.trim() || "";

    // Ambil daftar kategori untuk tabs kasir
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const productSelect = {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      sellingPrice: true,
      stock: true,
      minStock: true,
      categoryId: true,
      hasPack: true,
      packName: true,
      packQuantity: true,
      packPrice: true,
      category: {
        select: {
          name: true,
        },
      },
    };

    if (!query) {
      // Ambil produk aktif
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(categoryId && categoryId !== "ALL" && categoryId !== "bundle" ? { categoryId } : {}),
        },
        select: productSelect,
        orderBy: { name: "asc" },
        take: 100,
      });

      // Jika kategori "ALL" atau "bundle", sertakan paket bundling promo
      let bundlesMapped: any[] = [];
      if (!categoryId || categoryId === "ALL" || categoryId === "bundle") {
        const bundles = await prisma.bundle.findMany({
          where: { isActive: true },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, stock: true },
                },
              },
            },
          },
        });

        bundlesMapped = bundles.map((b) => {
          const bundleStock =
            b.items.length === 0
              ? 0
              : Math.min(...b.items.map((it) => Math.floor(it.product.stock / it.qty)));

          return {
            id: b.id,
            sku: b.sku,
            barcode: b.barcode,
            name: `[PAKET PROMO] ${b.name}`,
            sellingPrice: b.price,
            stock: bundleStock,
            minStock: 2,
            categoryId: "bundle",
            category: { name: "Paket Promo" },
            isBundle: true,
            bundleItems: b.items,
            hasPack: false,
          };
        });
      }

      return NextResponse.json({
        success: true,
        products: [...bundlesMapped, ...products],
        categories,
      });
    }

    // 1. Cek exact match barcode terlebih dahulu (paling sering dari USB barcode scanner)
    // Cek di produk reguler
    const exactBarcode = await prisma.product.findFirst({
      where: {
        barcode: query,
        isActive: true,
      },
      select: productSelect,
    });

    if (exactBarcode) {
      return NextResponse.json({
        success: true,
        exactMatch: true,
        products: [exactBarcode],
        categories,
      });
    }

    // Cek di paket bundling promo
    const exactBundle = await prisma.bundle.findFirst({
      where: {
        barcode: query,
        isActive: true,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, stock: true } },
          },
        },
      },
    });

    if (exactBundle) {
      const bundleStock =
        exactBundle.items.length === 0
          ? 0
          : Math.min(...exactBundle.items.map((it) => Math.floor(it.product.stock / it.qty)));

      const mappedBundle = {
        id: exactBundle.id,
        sku: exactBundle.sku,
        barcode: exactBundle.barcode,
        name: `[PAKET PROMO] ${exactBundle.name}`,
        sellingPrice: exactBundle.price,
        stock: bundleStock,
        minStock: 2,
        categoryId: "bundle",
        category: { name: "Paket Promo" },
        isBundle: true,
        bundleItems: exactBundle.items,
        hasPack: false,
      };

      return NextResponse.json({
        success: true,
        exactMatch: true,
        products: [mappedBundle],
        categories,
      });
    }

    // 2. Jika bukan exact barcode, cari berdasarkan nama atau sku atau barcode partial
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId && categoryId !== "ALL" && categoryId !== "bundle" ? { categoryId } : {}),
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { barcode: { contains: query } },
        ],
      },
      select: productSelect,
      take: 50,
    });

    // Cari juga bundling yang cocok dengan nama / sku / barcode
    const matchingBundles = await prisma.bundle.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { barcode: { contains: query } },
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, stock: true } },
          },
        },
      },
    });

    const mappedBundles = matchingBundles.map((b) => {
      const bundleStock =
        b.items.length === 0
          ? 0
          : Math.min(...b.items.map((it) => Math.floor(it.product.stock / it.qty)));

      return {
        id: b.id,
        sku: b.sku,
        barcode: b.barcode,
        name: `[PAKET PROMO] ${b.name}`,
        sellingPrice: b.price,
        stock: bundleStock,
        minStock: 2,
        categoryId: "bundle",
        category: { name: "Paket Promo" },
        isBundle: true,
        bundleItems: b.items,
        hasPack: false,
      };
    });

    return NextResponse.json({
      success: true,
      exactMatch: false,
      products: [...mappedBundles, ...products],
      categories,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Error";
    console.error("Fetch Products Error:", errMessage);
    return NextResponse.json(
      { success: false, message: "Gagal memuat katalog produk: " + errMessage },
      { status: 500 }
    );
  }
}
