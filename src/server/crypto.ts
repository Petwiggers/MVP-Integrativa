import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

/**
 * Criptografia de campos em repouso: AES-256-GCM.
 *
 * Formato: `v1.<kid>.<iv>.<tag>.<ciphertext>` (base64url), onde `kid` identifica a
 * chave usada (8 hex do SHA-256 da chave). Isso permite rotação: novas gravações usam
 * ENCRYPTION_KEY e leituras aceitam também ENCRYPTION_KEY_PREVIOUS.
 *
 * `aad` (dados autenticados adicionais) amarra o texto cifrado ao registro/campo,
 * impedindo que um valor cifrado seja copiado para outro relato.
 */

const FORMAT = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class DecryptionError extends Error {
  constructor() {
    super("Falha ao descriptografar dado");
    this.name = "DecryptionError";
  }
}

export function parseKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("ENCRYPTION_KEY deve ter 32 bytes codificados em base64");
  }
  return key;
}

function keyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

type Keyring = { current: Buffer; all: Map<string, Buffer> };

function keyringFromEnv(): Keyring {
  const current = parseKey(env.encryptionKey);
  const all = new Map([[keyId(current), current]]);
  const previous = env.encryptionKeyPrevious;
  if (previous) {
    const prev = parseKey(previous);
    all.set(keyId(prev), prev);
  }
  return { current, all };
}

export function makeKeyring(current: Buffer, ...previous: Buffer[]): Keyring {
  const all = new Map<string, Buffer>();
  for (const k of [current, ...previous]) all.set(keyId(k), k);
  return { current, all };
}

export function encrypt(plaintext: string, aad?: string, keyring: Keyring = keyringFromEnv()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyring.current, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    FORMAT,
    keyId(keyring.current),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decrypt(payload: string, aad?: string, keyring: Keyring = keyringFromEnv()): string {
  const parts = payload.split(".");
  if (parts.length !== 5 || parts[0] !== FORMAT) throw new DecryptionError();
  const [, kid, ivB64, tagB64, ctB64] = parts;
  const key = keyring.all.get(kid);
  if (!key) throw new DecryptionError();
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new DecryptionError();
  }
}

/** Cifra apenas se houver conteúdo; strings vazias viram null. */
export function encryptOptional(value: string | null | undefined, aad?: string, keyring?: Keyring) {
  const trimmed = value?.trim();
  return trimmed ? encrypt(trimmed, aad, keyring) : null;
}

export function decryptOptional(payload: string | null | undefined, aad?: string, keyring?: Keyring) {
  return payload ? decrypt(payload, aad, keyring) : null;
}

/** AAD padronizado por registro e campo. */
export const fieldAad = (table: string, id: string, field: string) => `${table}:${id}:${field}`;

export function hmacSha256(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
