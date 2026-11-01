import { MIN_AGGREGATE } from "./constants";

export type Cell<K extends string | number> = { key: K; count: number };
export type SafeCell<K extends string | number> = { key: K; count: number | null; suppressed: boolean };

/**
 * Supressão para evitar identificação em agregados pequenos:
 * 1. se o total do grupo for < k, tudo é ocultado;
 * 2. toda célula com 0 < contagem < k é ocultada;
 * 3. supressão complementar: se só UMA célula foi ocultada, a menor célula visível
 *    (não zero) também é ocultada — senão o valor sairia por diferença do total.
 */
export function suppressSmallCells<K extends string | number>(cells: Cell<K>[], k = MIN_AGGREGATE): SafeCell<K>[] {
  const total = cells.reduce((s, c) => s + c.count, 0);
  if (total < k) return cells.map((c) => ({ key: c.key, count: null, suppressed: true }));

  const hidden = new Set(cells.filter((c) => c.count > 0 && c.count < k).map((c) => c.key));
  if (hidden.size === 1) {
    const candidates = cells.filter((c) => !hidden.has(c.key) && c.count > 0).sort((a, b) => a.count - b.count);
    if (candidates[0]) hidden.add(candidates[0].key);
  }
  return cells.map((c) => ({
    key: c.key,
    count: hidden.has(c.key) ? null : c.count,
    suppressed: hidden.has(c.key),
  }));
}

/** Um número isolado (ex.: total de urgentes) só aparece se for 0 ou >= k. */
export function safeCount(count: number, k = MIN_AGGREGATE): number | null {
  return count === 0 || count >= k ? count : null;
}
