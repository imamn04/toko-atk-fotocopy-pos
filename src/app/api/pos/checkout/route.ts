import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

interface CheckoutItemPayload {
  productId: string;
  qty: number;
  unitType?: "PCS" | "PACK";
  isBundle?: boolean;
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

    // Validasi sesi autentikasi kasir
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Sesi kasir tidak valid atau telah kedaluwarsa. Silakan login kembali." },
        { status: 401 }
      );
    }
    const activeCashierId = sessionUser.id;

    // Validasi kuantitas setiap item (cegah manipulasi angka negatif / pecahan)
    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          { success: false, message: "ID barang pada keranjang belanja tidak valid." },
          { status: 400 }
        );
      }
      if (!item.qty || typeof item.qty !== "number" || item.qty <= 0 || !Number.isInteger(item.qty)) {
        return NextResponse.json(
          { success: false, message: "Jumlah kuantitas barang wajib berupa bilangan bulat positif (minimal 1)." },
          { status: 400 }
        );
      }
    }

    // Pisahkan item bundle dan item produk reguler
    const bundlePayloads = items.filter((i) => i.isBundle);
    const regularPayloads = items.filter((i) => !i.isBundle);

    // Ambil data produk reguler
    const regularProductIds = regularPayloads.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: regularProductIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Ambil data bundle jika ada
    const bundleIds = bundlePayloads.map((i) => i.productId);
    const dbBundles = await prisma.bundle.findMany({
      where: { id: { in: bundleIds } },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    const bundleMap = new Map(dbBundles.map((b) => [b.id, b]));

    // Validasi stok & kalkulasi
    let totalAmount = 0;
    let totalCost = 0;

    interface ProcessedItem {
      productId?: string | null;
      bundleId?: string | null;
      itemTitle?: string;
      unitType?: string;
      qty: number;
      costPrice: number;
      sellingPrice: number;
      subtotal: number;
    }

    const itemsToCreate: ProcessedItem[] = [];
    const stockDeductions: { productId: string; qty: number }[] = [];

    // 1. Proses Regular Products
    for (const item of regularPayloads) {
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

      const isPack = item.unitType === "PACK" && product.hasPack && product.packPrice;
      const effectivePrice = isPack ? (product.packPrice as number) : product.sellingPrice;
      const packQtyMultiplier = isPack ? (product.packQuantity || 1) : 1;
      const totalUnitsNeeded = item.qty * packQtyMultiplier;
      const effectiveCost = product.costPrice * packQtyMultiplier;

      if (product.stock < totalUnitsNeeded) {
        return NextResponse.json(
          {
            success: false,
            message: `Stok produk "${product.name}" tidak mencukupi! Sisa stok: ${product.stock} pcs, dibutuhkan: ${totalUnitsNeeded} pcs (${item.qty} ${isPack ? product.packName || "Pack" : "Pcs"}).`,
          },
          { status: 400 }
        );
      }

      const subtotal = effectivePrice * item.qty;
      const subtotalCost = effectiveCost * item.qty;

      totalAmount += subtotal;
      totalCost += subtotalCost;

      itemsToCreate.push({
        productId: product.id,
        itemTitle: isPack ? `${product.name} (${product.packName || "Pack"} @${product.packQuantity}pcs)` : product.name,
        unitType: isPack ? "PACK" : "PCS",
        qty: item.qty,
        costPrice: effectiveCost,
        sellingPrice: effectivePrice,
        subtotal,
      });

      stockDeductions.push({
        productId: product.id,
        qty: totalUnitsNeeded,
      });
    }

    // 2. Proses Bundles
    for (const item of bundlePayloads) {
      const bundle = bundleMap.get(item.productId);
      if (!bundle) {
        return NextResponse.json(
          { success: false, message: `Paket bundling dengan ID ${item.productId} tidak ditemukan.` },
          { status: 404 }
        );
      }
      if (!bundle.isActive) {
        return NextResponse.json(
          { success: false, message: `Paket bundling "${bundle.name}" sedang dinonaktifkan.` },
          { status: 400 }
        );
      }

      // Hitung HPP bundling dari total modal barang penyusunnya
      let bundleUnitCost = 0;
      for (const comp of bundle.items) {
        const requiredStock = comp.qty * item.qty;
        if (comp.product.stock < requiredStock) {
          return NextResponse.json(
            {
              success: false,
              message: `Stok komponen "${comp.product.name}" untuk paket promo "${bundle.name}" tidak mencukupi! Sisa stok: ${comp.product.stock}, dibutuhkan: ${requiredStock}.`,
            },
            { status: 400 }
          );
        }
        bundleUnitCost += comp.product.costPrice * comp.qty;
        stockDeductions.push({
          productId: comp.productId,
          qty: requiredStock,
        });
      }

      const subtotal = bundle.price * item.qty;
      const subtotalCost = bundleUnitCost * item.qty;

      totalAmount += subtotal;
      totalCost += subtotalCost;

      itemsToCreate.push({
        bundleId: bundle.id,
        itemTitle: `[PAKET] ${bundle.name}`,
        unitType: "BUNDLE",
        qty: item.qty,
        costPrice: bundleUnitCost,
        sellingPrice: bundle.price,
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
      // 1. Buat Header Transaksi & Detail Items
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
              productId: item.productId || null,
              bundleId: item.bundleId || null,
              itemTitle: item.itemTitle || null,
              unitType: item.unitType || "PCS",
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
              bundle: true,
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

      // 2. Decrement stok fisik produk (termasuk komponen bundle dan pack multiplier)
      // Gabungkan pengurangan stok per productId agar atomic
      const aggregatedDeductions = new Map<string, number>();
      for (const ded of stockDeductions) {
        aggregatedDeductions.set(
          ded.productId,
          (aggregatedDeductions.get(ded.productId) || 0) + ded.qty
        );
      }

      for (const [prodId, qtyToDec] of aggregatedDeductions.entries()) {
        await tx.product.update({
          where: { id: prodId },
          data: {
            stock: {
              decrement: qtyToDec,
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
