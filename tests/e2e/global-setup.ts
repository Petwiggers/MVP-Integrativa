import { execSync } from "node:child_process";
import { Client } from "pg";

// Banco de teste em estado conhecido: seed + zera rate limiting entre execuções.
export default async function globalSetup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query('DELETE FROM "RateLimitBucket"');
  await db.end();
}
