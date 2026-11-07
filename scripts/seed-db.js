const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Checking if database needs initial seeding...");

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`Database already has ${existingUsers} users. Skipping seeding.`);
    return;
  }

  console.log("Empty database detected. Seeding default admin, cashier & ATK catalog...");

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

  console.log(`✓ Default users created: ${admin.name} (Admin), ${kasir.name} (Kasir)`);

  // Categories
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

  const catJasa = await prisma.category.upsert({
    where: { name: "Jasa Fotocopy & Print" },
    update: {},
    create: { name: "Jasa Fotocopy & Print" },
  });

  // Sample ATK and Fotocopy Items
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
    {
      sku: "SRV-001",
      barcode: "990001",
      name: "Fotocopy HVS A4 (B/W)",
      categoryId: catJasa.id,
      costPrice: 100,
      sellingPrice: 300,
      stock: 9999,
      minStock: 100,
    },
    {
      sku: "SRV-002",
      barcode: "990002",
      name: "Fotocopy HVS F4 (B/W)",
      categoryId: catJasa.id,
      costPrice: 150,
      sellingPrice: 350,
      stock: 9999,
      minStock: 100,
    },
    {
      sku: "SRV-003",
      barcode: "990003",
      name: "Print Hitam Putih A4",
      categoryId: catJasa.id,
      costPrice: 200,
      sellingPrice: 500,
      stock: 9999,
      minStock: 100,
    },
    {
      sku: "SRV-004",
      barcode: "990004",
      name: "Print Warna A4",
      categoryId: catJasa.id,
      costPrice: 500,
      sellingPrice: 1500,
      stock: 9999,
      minStock: 100,
    },
    {
      sku: "SRV-005",
      barcode: "990005",
      name: "Jilid Mika & Lakban",
      categoryId: catJasa.id,
      costPrice: 1000,
      sellingPrice: 4000,
      stock: 500,
      minStock: 20,
    },
    {
      sku: "SRV-006",
      barcode: "990006",
      name: "Laminating Panas A4/F4",
      categoryId: catJasa.id,
      costPrice: 1500,
      sellingPrice: 5000,
      stock: 500,
      minStock: 20,
    },
  ];

  for (const item of sampleProducts) {
    await prisma.product.upsert({
      where: { barcode: item.barcode },
      update: {},
      create: item,
    });
  }

  console.log(`✓ Seeded ${sampleProducts.length} default products & services.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

