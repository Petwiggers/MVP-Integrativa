import "dotenv/config";
import { defineConfig } from "prisma/config";

// O CLI (migrate) usa conexão direta. No Supabase, DATABASE_URL aponta para o
// pooler (porta 6543) e DIRECT_URL para a conexão direta/sessão (porta 5432).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
