import { addDays, todayDateOnly } from "@/lib/dates";
import { audit } from "./audit";
import { prisma } from "./db";
import { purgeExpiredBuckets } from "./rate-limit";
import { getSettings } from "./settings";

/**
 * Política de retenção (LGPD — necessidade/eliminação):
 * - relatos ENCERRADOS há mais de `retentionDays` são apagados (respostas vão junto, em cascata);
 * - a auditoria mantém apenas o id do relato removido;
 * - sessões expiradas e buckets de rate limit vencidos também são limpos.
 */
export async function runRetention(now = new Date()) {
  const { retentionDays } = await getSettings();
  const cutoff = addDays(todayDateOnly(now), -retentionDays);

  const expired = await prisma.report.findMany({
    where: { status: "ENCERRADO", closedOn: { lte: cutoff } },
    select: { id: true },
  });
  for (const { id } of expired) {
    await prisma.report.delete({ where: { id } });
    await audit("REPORT_DELETE_RETENTION", { reportId: id, details: { retentionDays } });
  }

  const sessions = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { lastSeenAt: { lt: new Date(now.getTime() - 30 * 60_000) } }] },
  });
  const buckets = await purgeExpiredBuckets();

  return { reportsDeleted: expired.length, sessionsDeleted: sessions.count, bucketsDeleted: buckets, cutoff };
}
