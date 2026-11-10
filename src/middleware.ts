import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "super-secure-secret-key-toko-atk-pos-2026-xyz"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("pos_session_token")?.value;

  let sessionUser: { id: string; name: string; username: string; role: "ADMIN" | "KARYAWAN" } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      sessionUser = payload as unknown as {
        id: string;
        name: string;
        username: string;
        role: "ADMIN" | "KARYAWAN";
      };
    } catch {
      sessionUser = null;
    }
  }

  // Jika user sudah login dan mengakses /login -> redirect sesuai role
  if (pathname === "/login") {
    if (sessionUser) {
      const target = sessionUser.role === "ADMIN" ? "/admin" : "/pos";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // Proteksi ketat API Admin (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Autentikasi diperlukan. Silakan login." },
        { status: 401 }
      );
    }

    // Kasir POS diizinkan membaca konfigurasi toko & QRIS via GET
    if (pathname === "/api/admin/settings" && request.method === "GET") {
      return NextResponse.next();
    }

    // Semua rute admin lainnya dan mutasi setting wajib memiliki hak akses ADMIN
    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Hak akses Administrator diperlukan." },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // Proteksi rute /pos
  if (pathname.startsWith("/pos")) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Baik ADMIN maupun KARYAWAN diizinkan membuka kasir POS
    return NextResponse.next();
  }

  // Proteksi ketat rute /admin
  if (pathname.startsWith("/admin")) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role KARYAWAN DILARANG KERAS membuka /admin
    if (sessionUser.role !== "ADMIN") {
      const deniedUrl = new URL("/pos", request.url);
      deniedUrl.searchParams.set("denied", "admin_only");
      return NextResponse.redirect(deniedUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*", "/api/admin/:path*", "/login"],
};

