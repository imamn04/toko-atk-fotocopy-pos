import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Hanya Admin / Pemilik Toko yang berwenang membatalkan transaksi." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim() || "Salah input oleh kasir / dibatalkan";

    const txRecord = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            bundle: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!txRecord) {
      return NextResponse.json(
        { success: false, message: "Data transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (txRecord.status === "VOIDED") {
      return NextResponse.json(
        { success: false, message: "Transaksi ini sudah dalam status DIBATALKAN (VOID)." },
        { status: 400 }
      );
    }

    // Atomic Rollback di Database
    await prisma.$transaction(async (tx) => {
      // 1. Update Status Transaksi menjadi VOIDED
      await tx.transaction.update({
        where: { id },
        data: {
          status: "VOIDED",
          voidReason: reason,
          voidedAt: new Date(),
          voidedBy: user.name || user.username,
        },
      });

      // 2. Kembalikan Stok Produk Fisik ke Gudang
      for (const item of txRecord.items) {
        if (item.productId) {
          const isPack = item.unitType === "PACK" && item.product?.hasPack;
          const multiplier = isPack ? (item.product?.packQuantity || 1) : 1;
          const returnQty = item.qty * multiplier;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: returnQty },
            },
          });
        } else if (item.bundleId && item.bundle) {
          for (const comp of item.bundle.items) {
            const returnQty = comp.qty * item.qty;
            await tx.product.update({
              where: { id: comp.productId },
              data: {
                stock: { increment: returnQty },
              },
            });
          }
        }
      }

      // 3. Koreksi data shift kasir aktif jika shift kasir masih OPEN
      const openShift = await tx.shift.findFirst({
        where: {
          status: "OPEN",
          cashierId: txRecord.cashierId,
          openedAt: { lte: txRecord.createdAt },
        },
      });

      if (openShift) {
        await tx.shift.update({
          where: { id: openShift.id },
          data: {
            totalTransactions: { decrement: 1 },
            ...(txRecord.paymentMethod === "CASH"
              ? { totalCashSales: { decrement: txRecord.totalAmount } }
              : { totalQrisSales: { decrement: txRecord.totalAmount } }),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Transaksi ${txRecord.invoiceNumber} berhasil dibatalkan (VOID). Seluruh stok barang telah dikembalikan ke gudang.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    console.error("Void Transaction Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membatalkan transaksi: " + msg },
      { status: 500 }
    );
  }
}

