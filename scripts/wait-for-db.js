const net = require("net");

const dbUrl = process.env.DATABASE_URL || "";
let host = "db";
let port = 3306;

try {
  if (dbUrl.includes("@")) {
    const parts = dbUrl.split("@")[1].split("/")[0].split(":");
    host = parts[0] || host;
    if (parts[1]) port = parseInt(parts[1], 10);
  }
} catch (e) {}

console.log(`Menunggu database MySQL di ${host}:${port} siap menerima koneksi...`);

function checkDb(retries = 40) {
  if (retries <= 0) {
    console.error("Timeout: Database MySQL belum siap setelah 80 detik.");
    process.exit(1);
  }

  const socket = new net.Socket();
  socket.setTimeout(2000);

  socket.on("connect", () => {
    console.log(`✓ Database MySQL (${host}:${port}) berhasil tersambung.`);
    socket.destroy();
    process.exit(0);
  });

  socket.on("error", () => {
    socket.destroy();
    setTimeout(() => checkDb(retries - 1), 2000);
  });

  socket.on("timeout", () => {
    socket.destroy();
    setTimeout(() => checkDb(retries - 1), 2000);
  });

  socket.connect(port, host);
}

checkDb();

