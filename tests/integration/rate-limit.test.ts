import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { endOfBusinessDay, purgeExpiredBuckets, rateLimit, rateLimitAll } from "@/server/rate-limit";

const prefix = `test:${randomUUID()}`;

afterAll(async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe("rate limiting (Postgres)", () => {
  it("permite até o limite e bloqueia depois", async () => {
    const key = `${prefix}:a`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.count)).toEqual([1, 2, 3, 4]);
    const secondsLeft = (results[0].resetAt.getTime() - Date.now()) / 1000;
    expect(secondsLeft).toBeGreaterThan(50);
    expect(secondsLeft).toBeLessThanOrEqual(61);
  });

  it("é atômico sob concorrência", async () => {
    const key = `${prefix}:b`;
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(key, 10, 60)));
    expect(results.filter((r) => r.ok)).toHaveLength(10);
    expect(new Set(results.map((r) => r.count)).size).toBe(20);
  });

  it("reinicia a janela depois que ela expira", async () => {
    const key = `${prefix}:c`;
    await rateLimit(key, 1, 60);
    await prisma.rateLimitBucket.update({ where: { key }, data: { resetAt: new Date(Date.now() - 1000) } });
    const r = await rateLimit(key, 1, 60);
    expect(r).toMatchObject({ ok: true, count: 1 });
  });

  it("janela com término fixo não depende do horário da requisição", async () => {
    const key = `${prefix}:d`;
    const until = endOfBusinessDay();
    const r = await rateLimit(key, 5, { until });
    expect(r.resetAt.getTime()).toBe(until.getTime());
    expect(until.getUTCHours()).toBe(0);
    expect(until.getUTCMinutes()).toBe(0);
  });

  it("rateLimitAll falha se qualquer regra estourar", async () => {
    const rules = [
      { key: `${prefix}:e1`, limit: 5, windowSeconds: 60 },
      { key: `${prefix}:e2`, limit: 1, windowSeconds: 60 },
    ];
    expect((await rateLimitAll(rules)).ok).toBe(true);
    expect((await rateLimitAll(rules)).ok).toBe(false);
  });

  it("limpa buckets vencidos", async () => {
    const key = `${prefix}:f`;
    await prisma.rateLimitBucket.create({ data: { key, count: 1, resetAt: new Date(Date.now() - 60_000) } });
    await purgeExpiredBuckets();
    expect(await prisma.rateLimitBucket.findUnique({ where: { key } })).toBeNull();
  });
});
