import { describe, expect, it } from "vitest";
import { safeCount, suppressSmallCells } from "@/lib/k-anonymity";

const cells = (...counts: number[]) => counts.map((count, i) => ({ key: i, count }));
const shown = (r: ReturnType<typeof suppressSmallCells>) => r.map((c) => c.count);

describe("supressão de agregados (k = 5)", () => {
  it("mantém grupos grandes intactos", () => {
    expect(shown(suppressSmallCells(cells(10, 7, 5, 0)))).toEqual([10, 7, 5, 0]);
  });

  it("oculta tudo quando o total é menor que 5", () => {
    const r = suppressSmallCells(cells(2, 1, 1));
    expect(r.every((c) => c.suppressed && c.count === null)).toBe(true);
  });

  it("oculta células entre 1 e 4", () => {
    expect(shown(suppressSmallCells(cells(10, 3, 2, 8)))).toEqual([10, null, null, 8]);
  });

  it("supressão complementar: uma única célula oculta leva junto a menor visível", () => {
    // Sem isso, 3 seria deduzido como total(25) - 10 - 6 - 6.
    const r = suppressSmallCells(cells(10, 3, 6, 6));
    expect(r.filter((c) => c.suppressed)).toHaveLength(2);
    expect(r[1].suppressed).toBe(true);
    expect(r[0].count).toBe(10);
  });

  it("zeros continuam visíveis (não identificam ninguém)", () => {
    expect(shown(suppressSmallCells(cells(0, 0, 12)))).toEqual([0, 0, 12]);
  });

  it("nenhuma célula visível fica entre 1 e 4", () => {
    for (let i = 0; i < 500; i++) {
      const input = cells(...Array.from({ length: 6 }, () => Math.floor(Math.random() * 12)));
      const r = suppressSmallCells(input);
      for (const c of r) if (c.count !== null) expect(c.count === 0 || c.count >= 5).toBe(true);
      expect(r.filter((c) => c.suppressed && input[c.key as number].count > 0).length).not.toBe(1);
    }
  });

  it("safeCount esconde números isolados pequenos", () => {
    expect(safeCount(0)).toBe(0);
    expect(safeCount(3)).toBeNull();
    expect(safeCount(5)).toBe(5);
  });
});
