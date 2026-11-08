import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

interface CheckoutItemPayload {
  productId: string;
  qty: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      cashPaid,
      discountAmount: rawDiscount = 0,
      paymentMethod = "CASH",
      cashierId,
      customerName,
      customerPhone,
    } = body as {
      items: CheckoutItemPayload[];
      cashPaid: number;
      discountAmount?: number;
      paymentMethod?: string;
      cashierId?: string;
      customerName?: string;
      customerPhone?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Keranjang belanja masih kosong." },
        { status: 400 }
      );
    }

    // Ambil ID kasir dari session token yang sedang login jika tersedia
    const sessionUser = await getSessionUser();
    let activeCashierId = cashierId || sessionUser?.id;

    if (!activeCashierId) {
      const defaultCashier = await prisma.user.findFirst({
        where: { role: "KARYAWAN" },
      });
      activeCashierId = defaultCashier?.id;
      if (!activeCashierId) {
        const anyUser = await prisma.user.findFirst();
        activeCashierId = anyUser?.id;
      }
    }

    if (!activeCashierId) {
      return NextResponse.json(
        { success: false, message: "Data kasir tidak valid atau belum terdaftar." },
        { status: 400 }
      );
    }

    // Ambil semua produk dari database untuk validasi stok & harga akurat
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validasi stok setiap item
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Produk dengan ID ${item.productId} tidak ditemukan.` },
          { status: 404 }
        );
      }
      if (!product.isActive) {
        return NextResponse.json(
          { success: false, message: `Produk "${product.name}" sedang dinonaktifkan.` },
          { status: 400 }
        );
      }
      if (product.stock < item.qty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stok produk "${product.name}" tidak mencukupi! Sisa stok: ${product.stock}, diminta: ${item.qty}.`,
          },
          { status: 400 }
        );
      }
    }

    // Hitung total nilai belanja dan total modal HPP
    let totalAmount = 0;
    let totalCost = 0;
    const itemsToCreate: {
      productId: string;
      qty: number;
      costPrice: number;
      sellingPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const subtotal = product.sellingPrice * item.qty;
      const subtotalCost = product.costPrice * item.qty;

      totalAmount += subtotal;
      totalCost += subtotalCost;

      itemsToCreate.push({
        productId: product.id,
        qty: item.qty,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        subtotal,
      });
    }

    // Potongan Diskon
    const discountAmount = Math.max(0, Math.min(totalAmount, Number(rawDiscount) || 0));
    const finalTotalAmount = Math.max(0, totalAmount - discountAmount);

    // Validasi nominal pembayaran
    const effectivePaid = paymentMethod === "CASH" ? Number(cashPaid) : finalTotalAmount;
    if (paymentMethod === "CASH" && effectivePaid < finalTotalAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Uang pembayaran kurang! Total Tagihan: Rp ${finalTotalAmount.toLocaleString("id-ID")}, Dibayar: Rp ${effectivePaid.toLocaleString("id-ID")}`,
        },
        { status: 400 }
      );
    }

    const changeDue = Math.max(0, effectivePaid - finalTotalAmount);

    // Generate Invoice Number yang 100% Unik & Anti-Duplikat: TRX-YYYYMMDD-XXXX
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `TRX-${dateStr}-`;

    // Cari invoice terakhir yang dibuat dengan prefix tanggal ini
    const latestTx = await prisma.transaction.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        invoiceNumber: true,
      },
    });

    let nextSeq = 1;
    if (latestTx && latestTx.invoiceNumber.startsWith(prefix)) {
      const parts = latestTx.invoiceNumber.split("-");
      const lastSeqStr = parts[parts.length - 1];
      const parsed = parseInt(lastSeqStr, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    // Pastikan nomor kandidat belum pernah digunakan (mencegah unique constraint collision)
    let invoiceNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    let existingInv = await prisma.transaction.findUnique({
      where: { invoiceNumber },
      select: { id: true },
    });

    while (existingInv) {
      nextSeq++;
      invoiceNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      existingInv = await prisma.transaction.findUnique({
        where: { invoiceNumber },
        select: { id: true },
      });
    }

    // Eksekusi Atomic Transaction di Database
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat Header Transaksi
      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          cashierId: activeCashierId!,
          totalAmount: finalTotalAmount,
          totalCost,
          discountAmount,
          cashPaid: effectivePaid,
          changeDue,
          paymentMethod,
          customerName: customerName ? customerName.trim() : null,
          customerPhone: customerPhone ? customerPhone.trim() : null,
          items: {
            create: itemsToCreate.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          cashier: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      // 2. Decrement stok masing-masing produk secara aman
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        });
      }

      // 3. Akumulasikan ke shift kasir yang sedang aktif jika ada
      const activeShift = await tx.shift.findFirst({
        where: {
          status: "OPEN",
          cashierId: activeCashierId!,
        },
        orderBy: { openedAt: "desc" },
      });

      if (activeShift) {
        await tx.shift.update({
          where: { id: activeShift.id },
          data: {
            totalTransactions: { increment: 1 },
            ...(paymentMethod === "CASH"
              ? { totalCashSales: { increment: finalTotalAmount } }
              : { totalQrisSales: { increment: finalTotalAmount } }),
          },
        });
      }

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil diselesaikan.",
      data: result,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    console.error("Checkout Transaction Error:", errMessage);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan sistem saat memproses transaksi: " + errMessage,
      },
      { status: 500 }
    );
  }
}

