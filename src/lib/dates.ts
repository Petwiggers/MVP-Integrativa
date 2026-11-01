// Datas "sem horário": o relato guarda só o dia, no fuso da empresa.

export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

/** Data de hoje no fuso da empresa como Date à meia-noite UTC (formato de colunas @db.Date). */
export function todayDateOnly(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Formata uma coluna @db.Date (meia-noite UTC) como dd/mm/aaaa. */
export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/** Segunda-feira (UTC) da semana ISO de uma data sem horário. */
export function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
