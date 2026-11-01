import { randomUUID } from "node:crypto";
import type { Prisma, ReportStatus, Theme } from "@/generated/prisma/client";
import { MAX_STORY_LENGTH } from "@/lib/constants";
import { todayDateOnly } from "@/lib/dates";
import { isValidProtocol } from "@/lib/protocol-format";
import { audit } from "./audit";
import type { SessionUser } from "./auth/session";
import { decrypt, decryptOptional, encrypt } from "./crypto";
import { prisma } from "./db";
import { notifySafely } from "./notifications";
import { hashProtocol } from "./protocol";
import { replyAad, reportAad } from "./reports";

export const PAGE_SIZE = 30;

export type ReportFilters = {
  status?: ReportStatus;
  theme?: Theme;
  urgent?: boolean;
  page?: number;
};

/** Lista só com metadados: o conteúdo é decifrado apenas no detalhe (que é auditado). */
export async function listReports(filters: ReportFilters) {
  const where: Prisma.ReportWhereInput = {
    status: filters.status,
    theme: filters.theme,
    urgent: filters.urgent,
  };
  const page = Math.max(1, filters.page ?? 1);
  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      // Urgência primeiro, depois data. Desempate por id (aleatório) não revela ordem de chegada.
      orderBy: [{ urgent: "desc" }, { createdOn: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdOn: true,
        urgent: true,
        status: true,
        theme: true,
        mood: true,
        identification: true,
        device: { select: { name: true } },
        _count: { select: { replies: true } },
      },
    }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows };
}

/** Busca por protocolo (via POST, para o código não aparecer em URLs/logs). */
export async function findReportIdByProtocol(code: string): Promise<string | null> {
  if (!isValidProtocol(code)) return null;
  const r = await prisma.report.findUnique({ where: { protocolHash: hashProtocol(code) }, select: { id: true } });
  return r?.id ?? null;
}

export async function countByStatus() {
  const groups = await prisma.report.groupBy({ by: ["status"], _count: { _all: true } });
  const urgentOpen = await prisma.report.count({ where: { urgent: true, status: { in: ["NOVO", "EM_ATENDIMENTO"] } } });
  return { byStatus: Object.fromEntries(groups.map((g) => [g.status, g._count._all])), urgentOpen };
}

/** Detalhe do relato. Registra REPORT_VIEW (e REPORT_IDENTITY_VIEW quando revela identificação). */
export async function getReportDetail(id: string, user: SessionUser, opts: { withIdentity?: boolean } = {}) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      device: { select: { name: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!report) return null;

  await audit("REPORT_VIEW", { userId: user.id, reportId: id });
  const hasIdentity = !!(report.nameEnc || report.sectorEnc || report.contactEnc);
  const revealIdentity = opts.withIdentity && hasIdentity;
  if (revealIdentity) await audit("REPORT_IDENTITY_VIEW", { userId: user.id, reportId: id });

  return {
    id: report.id,
    createdOn: report.createdOn,
    urgent: report.urgent,
    status: report.status,
    theme: report.theme,
    mood: report.mood,
    identification: report.identification,
    deviceName: report.device.name,
    closedOn: report.closedOn,
    consentVersion: report.consentVersion,
    protocol: decrypt(report.protocolEnc, reportAad(id, "protocol")),
    body: decryptOptional(report.bodyEnc, reportAad(id, "body")),
    hasIdentity,
    identity: revealIdentity
      ? {
          name: decryptOptional(report.nameEnc, reportAad(id, "name")),
          sector: decryptOptional(report.sectorEnc, reportAad(id, "sector")),
          contact: decryptOptional(report.contactEnc, reportAad(id, "contact")),
        }
      : null,
    replies: report.replies.map((r) => ({
      id: r.id,
      authorName: r.author.name,
      createdAt: r.createdAt,
      body: decrypt(r.bodyEnc, replyAad(r.id)),
    })),
  };
}

export async function changeStatus(id: string, status: ReportStatus, user: SessionUser) {
  const current = await prisma.report.findUnique({ where: { id }, select: { status: true } });
  if (!current || current.status === status) return;
  await prisma.report.update({
    where: { id },
    data: { status, closedOn: status === "ENCERRADO" ? todayDateOnly() : null },
  });
  await audit("REPORT_STATUS_CHANGE", { userId: user.id, reportId: id, details: { from: current.status, to: status } });
}

/** Responde ao relato; a resposta aparece na consulta anônima por protocolo no totem. */
export async function addReply(id: string, body: string, user: SessionUser) {
  const text = body.trim().slice(0, MAX_STORY_LENGTH);
  if (!text) return;
  const report = await prisma.report.findUnique({ where: { id }, select: { status: true } });
  if (!report) return;
  const replyId = randomUUID();
  await prisma.$transaction([
    prisma.reportReply.create({
      data: { id: replyId, reportId: id, authorId: user.id, bodyEnc: encrypt(text, replyAad(replyId)) },
    }),
    prisma.report.update({
      where: { id },
      data: report.status === "ENCERRADO" ? {} : { status: "RESPONDIDO" },
    }),
  ]);
  await audit("REPORT_REPLY", { userId: user.id, reportId: id });
  if (report.status !== "ENCERRADO" && report.status !== "RESPONDIDO") {
    await audit("REPORT_STATUS_CHANGE", {
      userId: user.id,
      reportId: id,
      details: { from: report.status, to: "RESPONDIDO" },
    });
  }
  await notifySafely((n) => n.reportReplied({ reportId: id }));
}

export async function reportAuditTrail(id: string) {
  return prisma.auditLog.findMany({
    where: { reportId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
}
