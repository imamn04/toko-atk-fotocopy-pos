const fs = require("fs");
const path = require("path");

const target = (process.argv[2] || "mysql").toLowerCase();
const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error("Prisma schema not found at:", schemaPath);
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, "utf8");

if (target === "mysql") {
  content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mysql"');
  console.log("✓ Prisma schema provider switched to: mysql");
} else if (target === "sqlite") {
  content = content.replace(/provider\s*=\s*"mysql"/g, 'provider = "sqlite"');
  console.log("✓ Prisma schema provider switched to: sqlite");
} else {
  console.error("Unknown target database provider:", target);
  process.exit(1);
}

fs.writeFileSync(schemaPath, content, "utf8");
