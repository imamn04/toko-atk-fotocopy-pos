import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Autentikasi diperlukan." }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, categories });
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
    const name = body?.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, message: "Nama kategori wajib diisi." }, { status: 400 });
    }

    // Cek apakah kategori sudah ada (pencarian case-insensitive)
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name } },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        category: existing,
        message: "Kategori dengan nama ini sudah tersedia.",
      });
    }

    const newCategory = await prisma.category.create({
      data: { name },
    });

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: `Kategori "${name}" berhasil dibuat.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error creating category";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID kategori wajib disertakan." }, { status: 400 });
    }

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Kategori ini masih digunakan oleh ${productCount} barang. Pindahkan barang terlebih dahulu sebelum menghapus kategori.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Kategori berhasil dihapus.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting category";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

