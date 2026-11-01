import { afterEach, describe, expect, it, vi } from "vitest";
import { _sanitizeForTest, logger } from "@/server/logger";

afterEach(() => vi.restoreAllMocks());

describe("logger sem conteúdo sensível", () => {
  it("descarta campos fora da lista permitida", () => {
    const out = _sanitizeForTest({ route: "totem.reports", status: 500, story: "relato", name: "Ana", ip: "10.0.0.1" });
    expect(out).toEqual({ route: "totem.reports", status: 500 });
  });

  it("erros registram só o tipo, nunca a mensagem", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("Falha", new Error("conteúdo do relato vazou aqui"), { route: "x" });
    const line = String(spy.mock.calls[0][0]);
    expect(line).toContain('"code":"Error"');
    expect(line).not.toContain("conteúdo do relato");
  });
});
