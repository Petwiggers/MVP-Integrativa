import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { todayDateOnly } from "@/lib/dates";
import type { ReportInput } from "@/lib/validation";
import { isValidProtocol } from "@/lib/protocol-format";
import { decrypt, encrypt, encryptOptional, fieldAad } from "./crypto";
import { prisma } from "./db";
import { notifySafely } from "./notifications";
import { generateProtocol, hashProtocol } from "./protocol";

const MAX_PROTOCOL_ATTEMPTS = 8;

export const reportAad = (id: string, field: string) => fieldAad("report", id, field);
export const replyAad = (id: string) => fieldAad("reply", id, "body");

/**
 * Cria um relato. Propositalmente NÃO recebe request/headers: não há como gravar IP,
 * user-agent ou horário. Só a data (fuso da empresa) e o totem genérico.
 */
export async function createReport(
  input: ReportInput,
  deviceId: string,
  options: { createdOn?: Date } = {},
): Promise<{ id: string; protocol: string }> {
  const id = randomUUID();
  const identified = input.identification !== "ANONIMO";

  const data = {
    id,
    deviceId,
    createdOn: options.createdOn ?? todayDateOnly(),
    identification: input.identification,
    mood: input.mood,
    theme: (input.theme ?? null) as Prisma.ReportCreateInput["theme"],
    urgent: input.urgent,
    bodyEnc: encryptOptional(input.story, reportAad(id, "body")),
    nameEnc: identified ? encryptOptional(input.name, reportAad(id, "name")) : null,
    sectorEnc:
      input.identification === "IDENTIFICADO"
        ? encryptOptional(input.sector, reportAad(id, "sector"))
        : null,
    contactEnc:
      input.identification === "CONTATO"
        ? encryptOptional(input.contact, reportAad(id, "contact"))
        : null,
    consentVersion: input.consentVersion,
  };

  for (let attempt = 0; attempt < MAX_PROTOCOL_ATTEMPTS; attempt++) {
    const protocol = generateProtocol();
    try {
      await prisma.report.create({
        data: {
          ...data,
          protocolHash: hashProtocol(protocol),
          protocolEnc: encrypt(protocol, reportAad(id, "protocol")),
        },
      });
      await notifySafely((n) => n.reportCreated({ reportId: id, urgent: input.urgent }));
      return { id, protocol };
    } catch (err) {
      const collision =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!collision) throw err;
    }
  }
  throw new Error("Não foi possível gerar um protocolo único");
}

export type ProtocolLookup = {
  status: "NOVO" | "EM_ATENDIMENTO" | "RESPONDIDO" | "ENCERRADO";
  createdOn: string;
  replies: Array<{ body: string; date: string }>;
};

/**
 * Consulta anônima pelo protocolo: devolve só status e respostas do RH.
 * Nunca devolve o texto do relato nem dados de identificação.
 */
export async function lookupProtocol(code: string): Promise<ProtocolLookup | null> {
  if (!isValidProtocol(code)) return null;
  const report = await prisma.report.findUnique({
    where: { protocolHash: hashProtocol(code) },
    select: {
      status: true,
      createdOn: true,
      replies: { select: { id: true, bodyEnc: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) return null;
  return {
    status: report.status,
    createdOn: report.createdOn.toISOString().slice(0, 10),
    replies: report.replies.map((r) => ({
      body: decrypt(r.bodyEnc, replyAad(r.id)),
      date: r.createdAt.toISOString().slice(0, 10),
    })),
  };
}
