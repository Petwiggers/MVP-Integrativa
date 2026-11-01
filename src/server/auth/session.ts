import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/client";
import { randomToken, sha256 } from "../crypto";
import { prisma } from "../db";
import { env } from "../env";

export const SESSION_COOKIE = "admin_session";
const ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000; // 8h
const IDLE_TTL_MS = 30 * 60 * 1000; // 30 min sem uso
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionUser = { id: string; email: string; name: string; role: Role };

/** Cria a sessão e grava o cookie. Só pode ser chamada em Server Action / Route Handler. */
export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ABSOLUTE_TTL_MS);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
}

/** Usuário da sessão atual (memoizado por requisição) ou null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  const now = Date.now();
  if (
    !session ||
    !session.user.active ||
    session.expiresAt.getTime() <= now ||
    session.lastSeenAt.getTime() + IDLE_TTL_MS <= now
  ) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
});

export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (role && user.role !== role) redirect("/admin");
  return user;
}

export async function revokeUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}
