import { MIN_AGGREGATE, MOODS, THEMES, THEME_LABEL, type ThemeValue } from "@/lib/constants";
import { addDays, isoWeekStart, todayDateOnly } from "@/lib/dates";
import { safeCount, suppressSmallCells, type SafeCell } from "@/lib/k-anonymity";
import { prisma } from "./db";

export type WeekRow = {
  weekStart: Date;
  /** null = semana com menos de 5 relatos (oculta). */
  total: number | null;
  average: number | null;
  cells: SafeCell<number>[];
};

/** Check-in emocional por semana (últimas N semanas), com supressão k ≥ 5. */
export async function weeklyMood(weeks = 8): Promise<WeekRow[]> {
  const thisWeek = isoWeekStart(todayDateOnly());
  const start = addDays(thisWeek, -7 * (weeks - 1));
  const rows = await prisma.report.findMany({
    where: { createdOn: { gte: start } },
    select: { createdOn: true, mood: true },
  });

  const result: WeekRow[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(start, 7 * i);
    const inWeek = rows.filter((r) => isoWeekStart(r.createdOn).getTime() === weekStart.getTime());
    const total = inWeek.length;
    const counts = MOODS.map((m) => ({ key: m.value, count: inWeek.filter((r) => r.mood === m.value).length }));
    const visible = total >= MIN_AGGREGATE;
    result.push({
      weekStart,
      total: visible ? total : null,
      average: visible ? inWeek.reduce((s, r) => s + r.mood, 0) / total : null,
      cells: suppressSmallCells(counts),
    });
  }
  return result;
}

export type ThemeRow = SafeCell<ThemeValue | "SEM_TEMA"> & { label: string };

/** Relatos por tema no período, com supressão k ≥ 5. */
export async function reportsByTheme(days: number) {
  const since = addDays(todayDateOnly(), -days + 1);
  const groups = await prisma.report.groupBy({
    by: ["theme"],
    where: { createdOn: { gte: since } },
    _count: { _all: true },
  });
  const countOf = (t: ThemeValue | null) => groups.find((g) => g.theme === t)?._count._all ?? 0;
  const cells = [
    ...THEMES.map((t) => ({ key: t.value as ThemeValue | "SEM_TEMA", count: countOf(t.value) })),
    { key: "SEM_TEMA" as const, count: countOf(null) },
  ];
  const total = cells.reduce((s, c) => s + c.count, 0);
  const urgent = await prisma.report.count({ where: { createdOn: { gte: since }, urgent: true } });

  const rows: ThemeRow[] = suppressSmallCells(cells).map((c) => ({
    ...c,
    label: c.key === "SEM_TEMA" ? "Sem tema" : THEME_LABEL[c.key],
  }));
  return { rows, total: safeCount(total), urgent: safeCount(urgent) };
}
