import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

// Reaproveita a instância entre recarregamentos em dev e entre invocações quentes na Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Pool pequeno: em serverless cada instância abre poucas conexões com o pooler do Supabase.
  const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: 5 });
  // Sem log de queries: nunca registrar parâmetros (mesmo cifrados).
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (!env.isProduction) globalForPrisma.prisma = prisma;
