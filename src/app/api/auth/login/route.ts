import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createToken, TokenPayload } from "@/lib/auth";

// In-Memory Rate Limiter untuk mencegah serangan Brute-Force PIN
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const rateKey = `${ip}:${cleanUsername}`;
    const now = Date.now();

    const rateEntry = loginAttempts.get(rateKey);
    if (rateEntry?.blockedUntil && rateEntry.blockedUntil > now) {
      const remainingSecs = Math.ceil((rateEntry.blockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan PIN salah. Demi keamanan, silakan tunggu ${remainingSecs} detik sebelum mencoba lagi.`,
        },
        { status: 429 }
      );
    }

    const recordFailure = () => {
      const current = loginAttempts.get(rateKey) || { attempts: 0, firstAttempt: now };
      // Reset jendela jika sudah lewat 1 menit sejak percobaan pertama
      if (now - current.firstAttempt > 60000) {
        current.attempts = 1;
        current.firstAttempt = now;
        delete current.blockedUntil;
      } else {
        current.attempts += 1;
      }

      if (current.attempts >= 5) {
        current.blockedUntil = now + 60000; // Blokir selama 60 detik
      }
      loginAttempts.set(rateKey, current);
    };

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      recordFailure();
      return NextResponse.json(
        { success: false, message: "Username atau password salah." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      recordFailure();
      return NextResponse.json(
        { success: false, message: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Login sukses: hapus riwayat kegagalan
    loginAttempts.delete(rateKey);

    const tokenPayload: TokenPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as "ADMIN" | "KARYAWAN",
    };

    const token = await createToken(tokenPayload);

    const redirectPath = user.role === "ADMIN" ? "/admin" : "/pos";

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      redirect: redirectPath,
    });

    // Pasang secure HTTP-only cookie
    response.cookies.set("pos_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 jam
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Login Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

