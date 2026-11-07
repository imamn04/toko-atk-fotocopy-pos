import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial data...");

  // 1. Create Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const kasirPassword = await bcrypt.hash("kasir123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Owner Toko ATK",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const kasir = await prisma.user.upsert({
    where: { username: "kasir" },
    update: {},
    create: {
      name: "Budi Kasir",
      username: "kasir",
      password: kasirPassword,
      role: "KARYAWAN",
    },
  });

  console.log(`Users created: ${admin.name} (${admin.role}), ${kasir.name} (${kasir.role})`);

  // 2. Create Categories
  const catBuku = await prisma.category.upsert({
    where: { name: "Buku & Kertas" },
    update: {},
    create: { name: "Buku & Kertas" },
  });

  const catTulis = await prisma.category.upsert({
    where: { name: "Pulpen & Pensil" },
    update: {},
    create: { name: "Pulpen & Pensil" },
  });

  const catMap = await prisma.category.upsert({
    where: { name: "Penggaris & Map" },
    update: {},
    create: { name: "Penggaris & Map" },
  });

  const catAksesoris = await prisma.category.upsert({
    where: { name: "Aksesoris & Perekat" },
    update: {},
    create: { name: "Aksesoris & Perekat" },
  });

  // 3. Create Sample ATK Products
  const sampleProducts = [
    {
      sku: "ATK-001",
      barcode: "8992775211116",
      name: "Buku Tulis Sinar Dunia 38 Lembar",
      categoryId: catBuku.id,
      costPrice: 2800,
      sellingPrice: 4000,
      stock: 120,
      minStock: 15,
    },
    {
      sku: "ATK-002",
      barcode: "8999999000012",
      name: "Pulpen Standard AE7 0.5 Hitam",
      categoryId: catTulis.id,
      costPrice: 1800,
      sellingPrice: 3000,
      stock: 250,
      minStock: 20,
    },
    {
      sku: "ATK-003",
      barcode: "8998888000025",
      name: "Pensil 2B Faber-Castell",
      categoryId: catTulis.id,
      costPrice: 3500,
      sellingPrice: 5000,
      stock: 80,
      minStock: 10,
    },
    {
      sku: "ATK-004",
      barcode: "8997777000038",
      name: "Penghapus Karet Joyko Hitam",
      categoryId: catTulis.id,
      costPrice: 1200,
      sellingPrice: 2500,
      stock: 65,
      minStock: 10,
    },
    {
      sku: "ATK-005",
      barcode: "8996666000041",
      name: "Map Folio Kancing Joyko Transparan",
      categoryId: catMap.id,
      costPrice: 2500,
      sellingPrice: 4500,
      stock: 45,
      minStock: 10,
    },
    {
      sku: "ATK-006",
      barcode: "8995555000054",
      name: "Lem Kertas Glukol Sedang",
      categoryId: catAksesoris.id,
      costPrice: 3000,
      sellingPrice: 5000,
      stock: 30,
      minStock: 5,
    },
    {
      sku: "ATK-007",
      barcode: "8994444000067",
      name: "Kertas HVS A4 SiDU 75 GSM (Rim)",
      categoryId: catBuku.id,
      costPrice: 45000,
      sellingPrice: 55000,
      stock: 25,
      minStock: 5,
    },
    {
      sku: "ATK-008",
      barcode: "8993333000070",
      name: "Tipe-X Kertas Joyko Correction Tape",
      categoryId: catTulis.id,
      costPrice: 4000,
      sellingPrice: 7000,
      stock: 50,
      minStock: 8,
    },
  ];

  for (const item of sampleProducts) {
    await prisma.product.upsert({
      where: { barcode: item.barcode },
      update: {
        stock: item.stock,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
      },
      create: item,
    });
  }

  console.log(`Seeded ${sampleProducts.length} ATK sample products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

