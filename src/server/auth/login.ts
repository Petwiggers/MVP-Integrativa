import { audit } from "../audit";
import { hmacSha256, sha256 } from "../crypto";
import { prisma } from "../db";
import { env } from "../env";
import { rateLimitAll } from "../rate-limit";
import { afterFailure, afterSuccess, isLocked } from "./lockout";
import { getDummyHash, verifyPassword } from "./password";

export const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos, ou acesso temporariamente bloqueado.";

export type LoginResult = { ok: true; userId: string } | { ok: false; error: string };

/**
 * Login com: rate limiting por IP (HMAC, nunca o IP em claro) e por e-mail,
 * bloqueio progressivo da conta e mensagens genéricas (não revela se o e-mail existe).
 */
export async function attemptLogin(emailRaw: string, password: string, ip: string | null): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const rl = await rateLimitAll([
    { key: `login:ip:${hmacSha256(ip ?? "desconhecido", env.ipHashSecret)}`, limit: 20, windowSeconds: 900 },
    { key: `login:email:${sha256(email)}`, limit: 10, windowSeconds: 900 },
  ]);
  if (!rl.ok) return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await verifyPassword(await getDummyHash(), password); // tempo de resposta constante
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (isLocked(user)) {
    await verifyPassword(await getDummyHash(), password);
    await audit("LOGIN_FAILURE", { userId: user.id, details: { reason: "locked" } });
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    const next = afterFailure(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: next.failedAttempts, lockoutCount: next.lockoutCount, lockedUntil: next.lockedUntil },
    });
    await audit(next.lockedNow ? "LOGIN_LOCKED" : "LOGIN_FAILURE", { userId: user.id });
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  await prisma.user.update({ where: { id: user.id }, data: { ...afterSuccess(), lastLoginAt: new Date() } });
  await audit("LOGIN_SUCCESS", { userId: user.id });
  return { ok: true, userId: user.id };
}
