import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const jwtSecretKey =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("FATAL: JWT_SECRET atau NEXTAUTH_SECRET wajib didefinisikan di environment production (.env)!");
      })()
    : "dev-only-secret-key-do-not-use-in-production-2026");

const SECRET = new TextEncoder().encode(jwtSecretKey);

export interface TokenPayload {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "KARYAWAN";
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pos_session_token")?.value;
  if (!token) return null;
  return await verifyAuthToken(token);
}

