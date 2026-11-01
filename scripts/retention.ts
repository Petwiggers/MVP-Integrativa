// Execução manual/local do job de retenção: npm run job:retention
import "dotenv/config";
import { prisma } from "../src/server/db";
import { runRetention } from "../src/server/retention";

runRetention()
  .then((r) => {
    console.log(
      `Retenção: ${r.reportsDeleted} relato(s) removido(s) (encerrados até ${r.cutoff.toISOString().slice(0, 10)}), ` +
        `${r.sessionsDeleted} sessão(ões) expirada(s).`,
    );
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.name : "Erro no job de retenção");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
