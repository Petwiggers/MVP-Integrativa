import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DecryptionError,
  decrypt,
  decryptOptional,
  encrypt,
  encryptOptional,
  makeKeyring,
  parseKey,
} from "@/server/crypto";

const keyA = randomBytes(32);
const keyB = randomBytes(32);
const ring = makeKeyring(keyA);

describe("AES-256-GCM", () => {
  it("cifra e decifra mantendo acentos e quebras de linha", () => {
    const text = "Estou cansado.\nNão sei com quem falar — ação, coração, ç.";
    const payload = encrypt(text, undefined, ring);
    expect(decrypt(payload, undefined, ring)).toBe(text);
  });

  it("não expõe o texto original e usa IV aleatório", () => {
    const a = encrypt("segredo", undefined, ring);
    const b = encrypt("segredo", undefined, ring);
    expect(a).not.toContain("segredo");
    expect(a).not.toBe(b);
    expect(a.split(".")).toHaveLength(5);
    expect(a.startsWith("v1.")).toBe(true);
  });

  it("rejeita texto cifrado adulterado (autenticação GCM)", () => {
    const parts = encrypt("relato", undefined, ring).split(".");
    const ct = Buffer.from(parts[4], "base64url");
    ct[0] ^= 0xff;
    parts[4] = ct.toString("base64url");
    expect(() => decrypt(parts.join("."), undefined, ring)).toThrow(DecryptionError);
  });

  it("rejeita tag adulterada", () => {
    const parts = encrypt("relato", undefined, ring).split(".");
    parts[3] = Buffer.alloc(16).toString("base64url");
    expect(() => decrypt(parts.join("."), undefined, ring)).toThrow(DecryptionError);
  });

  it("amarra o dado ao registro via AAD", () => {
    const payload = encrypt("relato", "report:1:body", ring);
    expect(decrypt(payload, "report:1:body", ring)).toBe("relato");
    expect(() => decrypt(payload, "report:2:body", ring)).toThrow(DecryptionError);
    expect(() => decrypt(payload, undefined, ring)).toThrow(DecryptionError);
  });

  it("não decifra com outra chave", () => {
    const payload = encrypt("relato", undefined, ring);
    expect(() => decrypt(payload, undefined, makeKeyring(keyB))).toThrow(DecryptionError);
  });

  it("suporta rotação: lê com a chave anterior e grava com a nova", () => {
    const old = encrypt("antigo", undefined, makeKeyring(keyA));
    const rotated = makeKeyring(keyB, keyA);
    expect(decrypt(old, undefined, rotated)).toBe("antigo");
    const fresh = encrypt("novo", undefined, rotated);
    expect(() => decrypt(fresh, undefined, makeKeyring(keyA))).toThrow(DecryptionError);
  });

  it("rejeita formatos inválidos", () => {
    expect(() => decrypt("texto-claro", undefined, ring)).toThrow(DecryptionError);
    expect(() => decrypt("v2.a.b.c.d", undefined, ring)).toThrow(DecryptionError);
  });

  it("campos opcionais vazios viram null", () => {
    expect(encryptOptional("   ", undefined, ring)).toBeNull();
    expect(encryptOptional(undefined, undefined, ring)).toBeNull();
    expect(decryptOptional(null, undefined, ring)).toBeNull();
    const p = encryptOptional("  nome  ", undefined, ring)!;
    expect(decryptOptional(p, undefined, ring)).toBe("nome");
  });

  it("valida o tamanho da chave", () => {
    expect(() => parseKey(randomBytes(16).toString("base64"))).toThrow();
    expect(parseKey(keyA.toString("base64"))).toHaveLength(32);
  });
});
