import type { SafeCell } from "@/lib/k-anonymity";
import { MOOD_LABEL } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";

/**
 * Paleta divergente do check-in (vermelho ← cinza neutro → azul), validada para
 * daltonismo. Separada das cores do totem: aqui a cor codifica polaridade.
 */
export const MOOD_CHART_COLORS: Record<number, string> = {
  1: "#a83a36",
  2: "#dc8475",
  3: "#cfccc4",
  4: "#5c9bd6",
  5: "#1d5fa3",
};

// Hachura para células ocultas (k-anonimato): nunca uma cor de série.
const HATCH = "repeating-linear-gradient(45deg, #e2dbd1 0 4px, #f6f2ec 4px 8px)";

export function MoodLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {[1, 2, 3, 4, 5].map((m) => (
        <li key={m} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: MOOD_CHART_COLORS[m] }} />
          {MOOD_LABEL[m]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: HATCH }} />
        Oculto (menos de 5)
      </li>
    </ul>
  );
}

/** Barra 100% empilhada de uma semana. Células ocultas são agrupadas num único trecho hachurado. */
export function MoodStackedBar({ cells, total }: { cells: SafeCell<number>[]; total: number }) {
  const visible = cells.filter((c) => !c.suppressed && (c.count ?? 0) > 0);
  const hiddenSum = total - visible.reduce((s, c) => s + (c.count ?? 0), 0);
  return (
    <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label="Distribuição do check-in na semana">
      {visible.map((c) => (
        <div
          key={c.key}
          title={`${MOOD_LABEL[c.key]}: ${c.count} (${Math.round(((c.count ?? 0) / total) * 100)}%)`}
          style={{ width: `${((c.count ?? 0) / total) * 100}%`, background: MOOD_CHART_COLORS[c.key] }}
          className="h-full hover:opacity-80"
        />
      ))}
      {hiddenSum > 0 && (
        <div
          title="Valores ocultos para proteger o anonimato (grupos com menos de 5 relatos)"
          style={{ width: `${(hiddenSum / total) * 100}%`, background: HATCH }}
          className="h-full"
        />
      )}
    </div>
  );
}

export function weekLabel(weekStart: Date) {
  return `Semana de ${formatDateOnly(weekStart).slice(0, 5)}`;
}

/** Barras horizontais de um único valor (uma série: sem legenda, o título nomeia). */
export function HorizontalBars({ rows }: { rows: Array<{ key: string; label: string; count: number | null }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count ?? 0));
  return (
    <ul className="flex flex-col gap-2.5" data-testid="grafico-temas">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm">
          <span className="truncate text-muted">{r.label}</span>
          {r.count === null ? (
            <span className="flex items-center gap-2">
              <span className="h-5 w-16 rounded" style={{ background: HATCH }} />
              <span className="text-xs text-muted">menos de 5</span>
            </span>
          ) : (
            <span className="flex items-center gap-2" title={`${r.label}: ${r.count}`}>
              <span
                className="h-5 rounded-r bg-brand"
                style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count > 0 ? 4 : 0 }}
              />
              <span className="text-xs font-bold text-ink">{r.count}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
