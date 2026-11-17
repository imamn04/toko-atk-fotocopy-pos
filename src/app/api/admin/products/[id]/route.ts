import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// PATCH: Restock dan Update Produk
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, categoryId, costPrice, sellingPrice, stock, stockToAdd, minStock, barcode, sku, isActive, unitMode: rawUnitMode } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    // Tentukan unitMode baru jika dikirimkan
    const effectiveUnitMode: "PCS_ONLY" | "PACK_ONLY" | "BOTH" | undefined =
      rawUnitMode !== undefined
        ? rawUnitMode
        : body.hasPack !== undefined
        ? (body.hasPack ? "BOTH" : "PCS_ONLY")
        : undefined;

    let packDataUpdate = {};
    if (effectiveUnitMode !== undefined) {
      if (effectiveUnitMode === "PACK_ONLY") {
        packDataUpdate = {
          unitMode: "PACK_ONLY",
          hasPack: true,
          packName: body.packName?.trim() || existingProduct.packName || "Pack",
          packQuantity: 1,
          packPrice: body.packPrice !== undefined ? Number(body.packPrice) : (sellingPrice !== undefined ? Number(sellingPrice) : existingProduct.sellingPrice),
          packBarcode: body.packBarcode?.trim() || (barcode?.trim() || existingProduct.barcode),
        };
      } else if (effectiveUnitMode === "BOTH") {
        packDataUpdate = {
          unitMode: "BOTH",
          hasPack: true,
          packName: body.packName?.trim() || existingProduct.packName || "Pack",
          packQuantity: body.packQuantity !== undefined ? Number(body.packQuantity) : (existingProduct.packQuantity || 10),
          packPrice: body.packPrice !== undefined ? Number(body.packPrice) : (existingProduct.packPrice || existingProduct.sellingPrice),
          packBarcode: body.packBarcode?.trim() || existingProduct.packBarcode || ((barcode?.trim() || existingProduct.barcode) + "P"),
        };
      } else {
        packDataUpdate = {
          unitMode: "PCS_ONLY",
          hasPack: false,
          packName: null,
          packQuantity: null,
          packPrice: null,
          packBarcode: null,
        };
      }
    }

    // Jika barcode diubah, cek duplikasi dengan produk lain
    if (barcode && barcode.trim() !== existingProduct.barcode) {
      const duplicate = await prisma.product.findUnique({
        where: { barcode: barcode.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { success: false, message: `Barcode "${barcode}" sudah digunakan oleh barang lain!` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(categoryId !== undefined && { categoryId }),
        ...(barcode !== undefined && { barcode: barcode.trim() }),
        ...(sku !== undefined && { sku: sku.trim() }),
        ...(costPrice !== undefined && { costPrice: Number(costPrice) }),
        ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...packDataUpdate,
        ...(stockToAdd !== undefined && {
          stock: {
            increment: Number(stockToAdd),
          },
        }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data produk berhasil diperbarui.",
      product: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating product";
    console.error("Update Product Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// DELETE: Hapus produk
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;

    // Cek apakah produk memiliki riwayat transaksi
    const itemCount = await prisma.transactionItem.count({
      where: { productId: id },
    });

    if (itemCount > 0) {
      // Jika memiliki transaksi historis, nonaktifkan (soft delete) untuk menjaga integritas data
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Produk memiliki riwayat transaksi sehingga dinonaktifkan (arsip).",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus secara permanen.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting product";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

