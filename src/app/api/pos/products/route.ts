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

    if (!query) {
      // Ambil produk aktif (bisa difilter per kategori)
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(categoryId ? { categoryId } : {}),
        },
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          sellingPrice: true,
          stock: true,
          minStock: true,
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: 100,
      });

      return NextResponse.json({ success: true, products, categories });
    }

    // 1. Cek exact match barcode terlebih dahulu (paling sering dari USB barcode scanner)
    const exactBarcode = await prisma.product.findFirst({
      where: {
        barcode: query,
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        sellingPrice: true,
        stock: true,
        minStock: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (exactBarcode) {
      return NextResponse.json({
        success: true,
        exactMatch: true,
        products: [exactBarcode],
        categories,
      });
    }

    // 2. Jika bukan exact barcode, cari berdasarkan nama atau sku atau barcode partial
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { barcode: { contains: query } },
        ],
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        sellingPrice: true,
        stock: true,
        minStock: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      exactMatch: false,
      products,
      categories,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Error";
    console.error("Fetch Products Error:", errMessage);
    return NextResponse.json(
      { success: false, message: "Gagal memuat produk: " + errMessage },
      { status: 500 }
    );
  }
}
