import { expect, test } from "@playwright/test";
import { pairContext, withDb } from "./helpers";

test("cabeçalhos de segurança e CSP com nonce nas páginas", async ({ request }) => {
  for (const path of ["/admin/login", "/totem/parear"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("no-referrer");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["cache-control"]).toContain("no-store");
    expect(h["x-powered-by"]).toBeUndefined();
  }
});

test("rota do job de retenção exige o segredo do cron", async ({ request }) => {
  expect((await request.get("/api/cron/retention")).status()).toBe(401);
  const wrong = await request.get("/api/cron/retention", { headers: { Authorization: "Bearer errado" } });
  expect(wrong.status()).toBe(401);
  const ok = await request.get("/api/cron/retention", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(ok.status()).toBe(200);
});

test("consulta de protocolo tem rate limit por totem (anti-enumeração)", async ({ context, baseURL }) => {
  await pairContext(context, baseURL!);
  await withDb((db) => db.query(`DELETE FROM "RateLimitBucket" WHERE key LIKE 'totem:lookup:%'`));
  const statuses: number[] = [];
  for (let i = 0; i < 17; i++) {
    const res = await context.request.post("/api/totem/protocol", { data: { code: "ZZZZZZ" } });
    statuses.push(res.status());
  }
  expect(statuses.slice(0, 15).every((s) => s === 404)).toBe(true);
  expect(statuses.at(-1)).toBe(429);
  await withDb((db) => db.query(`DELETE FROM "RateLimitBucket" WHERE key LIKE 'totem:lookup:%'`));
});

test("API do totem valida a entrada e não aceita campos extras", async ({ context, baseURL }) => {
  await pairContext(context, baseURL!);
  const base = { mood: 3, urgent: false, consent: true, consentVersion: 1 };
  const extra = await context.request.post("/api/totem/reports", { data: { ...base, ip: "1.2.3.4" } });
  expect(extra.status()).toBe(400);
  const noConsent = await context.request.post("/api/totem/reports", { data: { ...base, consent: false } });
  expect(noConsent.status()).toBe(400);
  const big = await context.request.post("/api/totem/reports", { data: { ...base, story: "x".repeat(40_000) } });
  expect(big.status()).toBe(413);
});
