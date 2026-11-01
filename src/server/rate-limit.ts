import { addDays, todayDateOnly } from "@/lib/dates";
import { prisma } from "./db";

export type RateLimitResult = { ok: boolean; count: number; limit: number; resetAt: Date };

/**
 * Rate limiting de janela fixa guardado no Postgres (funciona em serverless sem Redis).
 * O upsert é atômico: incrementa o contador ou reinicia a janela se ela já expirou.
 *
 * `window` pode ser uma duração em segundos (janela começa na 1ª requisição) ou um
 * instante fixo de término. Use instante fixo quando o início da janela não puder
 * revelar QUANDO algo aconteceu (ex.: envio de relato).
 */
export async function rateLimit(key: string, limit: number, window: number | { until: Date }): Promise<RateLimitResult> {
  const until = typeof window === "number" ? null : window.until;
  const seconds = typeof window === "number" ? window : 0;
  // Colunas DateTime do Prisma são "timestamp" sem fuso, gravadas em UTC: todo cálculo em UTC explícito.
  const untilIso = until?.toISOString() ?? null;
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    WITH t AS (SELECT (now() AT TIME ZONE 'UTC') AS now_utc),
    next_reset AS (
      SELECT COALESCE(
        (${untilIso}::timestamptz AT TIME ZONE 'UTC'),
        (SELECT now_utc FROM t) + (${seconds}::int * interval '1 second')
      ) AS at
    )
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    SELECT ${key}, 1, at FROM next_reset
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= (SELECT now_utc FROM t)
                     THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= (SELECT now_utc FROM t)
                       THEN (SELECT at FROM next_reset)
                       ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  const { count, resetAt } = rows[0];
  return { ok: count <= limit, count, limit, resetAt };
}

/** Aplica vários limites; falha se qualquer um estourar. */
export async function rateLimitAll(
  rules: Array<{ key: string; limit: number; windowSeconds: number }>,
): Promise<RateLimitResult> {
  let last: RateLimitResult | undefined;
  for (const r of rules) {
    const res = await rateLimit(r.key, r.limit, r.windowSeconds);
    if (!res.ok) return res;
    last = res;
  }
  return last!;
}

/** Fim do dia atual (fuso da empresa ≈ meia-noite UTC do dia seguinte, sem relação com o horário do envio). */
export function endOfBusinessDay(now = new Date()): Date {
  return addDays(todayDateOnly(now), 1);
}

export async function purgeExpiredBuckets() {
  const { count } = await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return count;
}

export function retryAfterSeconds(res: RateLimitResult) {
  return Math.max(1, Math.ceil((res.resetAt.getTime() - Date.now()) / 1000));
}
