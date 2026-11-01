import { cookies } from "next/headers";
import { PROTOCOL_ALPHABET } from "@/lib/protocol-format";
import { randomInt } from "node:crypto";
import { randomToken, sha256 } from "./crypto";
import { prisma } from "./db";
import { env } from "./env";

/**
 * Autenticação do totem. O cookie identifica apenas o APARELHO (ex.: "Totem Refeitório"),
 * nunca a pessoa que está usando. No banco fica só o SHA-256 do token.
 */
export const DEVICE_COOKIE = "totem_device";
const ONE_YEAR = 60 * 60 * 24 * 365;
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_TTL_MINUTES = 10;

export type AuthenticatedDevice = { id: string; name: string };

export async function authenticateDevice(): Promise<AuthenticatedDevice | null> {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return null;
  const device = await prisma.device.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, name: true, revokedAt: true },
  });
  if (!device || device.revokedAt) return null;
  return { id: device.id, name: device.name };
}

export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) code += PROTOCOL_ALPHABET[randomInt(PROTOCOL_ALPHABET.length)];
  return code;
}

/** Troca um código de pareamento válido por um token de dispositivo. Uso único. */
export async function pairDevice(code: string): Promise<AuthenticatedDevice | null> {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  const device = await prisma.device.findUnique({ where: { pairingCodeHash: sha256(normalized) } });
  if (!device || device.revokedAt || !device.pairingExpiresAt || device.pairingExpiresAt < new Date()) {
    return null;
  }
  const token = randomToken(32);
  await prisma.device.update({
    where: { id: device.id },
    data: { tokenHash: sha256(token), pairingCodeHash: null, pairingExpiresAt: null, pairedAt: new Date() },
  });
  (await cookies()).set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return { id: device.id, name: device.name };
}
