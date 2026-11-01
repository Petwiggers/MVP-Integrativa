import { describe, expect, it } from "vitest";
import { MAX_FAILED_ATTEMPTS, afterFailure, afterSuccess, isLocked, lockMinutes, type LockState } from "@/server/auth/lockout";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { checkPasswordStrength } from "@/server/auth/password-policy";

describe("bloqueio progressivo", () => {
  const fresh: LockState = { failedAttempts: 0, lockoutCount: 0, lockedUntil: null };
  const now = new Date("2026-01-01T12:00:00Z");

  it(`bloqueia na ${MAX_FAILED_ATTEMPTS}ª falha por 15 minutos`, () => {
    let s: LockState = { ...fresh };
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      const next = afterFailure(s, now);
      expect(next.lockedNow).toBe(false);
      s = next;
    }
    const locked = afterFailure(s, now);
    expect(locked.lockedNow).toBe(true);
    expect(locked.failedAttempts).toBe(0);
    expect(locked.lockedUntil!.getTime() - now.getTime()).toBe(15 * 60_000);
    expect(isLocked(locked, now)).toBe(true);
    expect(isLocked(locked, new Date(now.getTime() + 16 * 60_000))).toBe(false);
  });

  it("dobra a duração a cada novo bloqueio, com teto de 24h", () => {
    expect([1, 2, 3, 4].map(lockMinutes)).toEqual([15, 30, 60, 120]);
    expect(lockMinutes(20)).toBe(24 * 60);
  });

  it("login correto zera o histórico", () => {
    expect(afterSuccess()).toEqual(fresh);
  });
});

describe("senhas", () => {
  it("argon2id: hash verifica e rejeita senha errada", async () => {
    const h = await hashPassword("Cavalo-Bateria-Grampo-42");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Cavalo-Bateria-Grampo-42")).toBe(true);
    expect(await verifyPassword(h, "cavalo-bateria-grampo-42")).toBe(false);
    expect(await verifyPassword("hash-invalido", "x")).toBe(false);
  });

  it("política: recusa senhas curtas ou óbvias", () => {
    expect(checkPasswordStrength("curta1!")).not.toHaveLength(0);
    expect(checkPasswordStrength("senha12345678")).not.toHaveLength(0);
    expect(checkPasswordStrength("abcdefghijkl")).not.toHaveLength(0);
    expect(checkPasswordStrength("maria.silva2026", ["maria", "silva"])).not.toHaveLength(0);
  });

  it("política: aceita senhas longas e imprevisíveis", () => {
    expect(checkPasswordStrength("Girassol-Trovão-Azulejo-73")).toEqual([]);
    expect(checkPasswordStrength("v9#Lq2!pX7@tRm")).toEqual([]);
  });
});
