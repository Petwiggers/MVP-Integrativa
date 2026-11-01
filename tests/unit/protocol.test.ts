import { describe, expect, it } from "vitest";
import {
  PROTOCOL_ALPHABET,
  PROTOCOL_LENGTH,
  formatProtocol,
  isValidProtocol,
  normalizeProtocol,
} from "@/lib/protocol-format";
import { generateProtocol, hashProtocol } from "@/server/protocol";

describe("geração de protocolo", () => {
  it("tem 6 caracteres do alfabeto sem ambíguos", () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateProtocol();
      expect(code).toHaveLength(PROTOCOL_LENGTH);
      expect(isValidProtocol(code)).toBe(true);
      expect(code).not.toMatch(/[0O1IL]/);
    }
  });

  it("o alfabeto exclui 0, O, 1, I e L e não tem repetidos", () => {
    expect(PROTOCOL_ALPHABET).not.toMatch(/[0O1IL]/);
    expect(new Set(PROTOCOL_ALPHABET).size).toBe(PROTOCOL_ALPHABET.length);
  });

  it("é praticamente único e usa todo o alfabeto", () => {
    const codes = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const c = generateProtocol();
      codes.add(c);
      for (const ch of c) seen.add(ch);
    }
    expect(codes.size).toBeGreaterThan(4990);
    expect(seen.size).toBe(PROTOCOL_ALPHABET.length);
  });
});

describe("formatação e validação", () => {
  it("normaliza minúsculas, espaços e hífen", () => {
    expect(normalizeProtocol(" abc-def ")).toBe("ABCDEF");
    expect(formatProtocol("abcdef")).toBe("ABC-DEF");
  });

  it("rejeita códigos com tamanho ou caracteres inválidos", () => {
    expect(isValidProtocol("ABCDE")).toBe(false);
    expect(isValidProtocol("ABCDEFG")).toBe(false);
    expect(isValidProtocol("ABCDE0")).toBe(false);
    expect(isValidProtocol("ABCDEI")).toBe(false);
    expect(isValidProtocol("abc-dez")).toBe(true);
  });
});

describe("hash do protocolo", () => {
  it("é determinístico, independe da formatação e depende do pepper", () => {
    const a = hashProtocol("ABC-DEF", "pepper-1");
    expect(hashProtocol("abcdef", "pepper-1")).toBe(a);
    expect(hashProtocol("ABCDEF", "pepper-2")).not.toBe(a);
    expect(a).not.toContain("ABCDEF");
  });
});
