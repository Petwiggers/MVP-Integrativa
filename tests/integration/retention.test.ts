import { afterAll, describe, expect, it } from "vitest";
import { addDays, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/server/db";
import { createReport } from "@/server/reports";
import { runRetention } from "@/server/retention";
import { getSettings } from "@/server/settings";

const SEED_DEVICE_ID = "00000000-0000-4000-8000-000000000001";
const created: string[] = [];

async function makeReport(status: "ENCERRADO" | "EM_ATENDIMENTO", closedDaysAgo: number | null) {
  const { id } = await createReport(
    { identification: "ANONIMO", mood: 3, urgent: false, consent: true, consentVersion: 1, story: "retenção" },
    SEED_DEVICE_ID,
    { createdOn: addDays(todayDateOnly(), -400) },
  );
  created.push(id);
  await prisma.report.update({
    where: { id },
    data: { status, closedOn: closedDaysAgo === null ? null : addDays(todayDateOnly(), -closedDaysAgo) },
  });
  return id;
}

afterAll(async () => {
  await prisma.report.deleteMany({ where: { id: { in: created } } });
  await prisma.auditLog.deleteMany({ where: { reportId: { in: created } } });
  await prisma.$disconnect();
});

describe("job de retenção", () => {
  it("apaga só relatos encerrados há mais tempo que o prazo e registra na auditoria", async () => {
    const { retentionDays } = await getSettings();
    const oldClosed = await makeReport("ENCERRADO", retentionDays + 5);
    const recentClosed = await makeReport("ENCERRADO", Math.max(0, retentionDays - 5));
    const oldOpen = await makeReport("EM_ATENDIMENTO", null);

    const result = await runRetention();
    expect(result.reportsDeleted).toBeGreaterThanOrEqual(1);

    expect(await prisma.report.findUnique({ where: { id: oldClosed } })).toBeNull();
    expect(await prisma.report.findUnique({ where: { id: recentClosed } })).not.toBeNull();
    expect(await prisma.report.findUnique({ where: { id: oldOpen } })).not.toBeNull();

    const log = await prisma.auditLog.findFirst({ where: { reportId: oldClosed, action: "REPORT_DELETE_RETENTION" } });
    expect(log).not.toBeNull();
    expect(JSON.stringify(log!.details)).not.toContain("retenção"); // sem conteúdo do relato
  });
});
