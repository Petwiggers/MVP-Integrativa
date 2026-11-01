import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

/**
 * Registro de auditoria (append-only). `details` só pode conter metadados
 * (ex.: status anterior/novo) — nunca conteúdo de relatos ou dados pessoais.
 */
export async function audit(
  action: AuditAction,
  opts: { userId?: string | null; reportId?: string | null; details?: Prisma.InputJsonValue } = {},
) {
  await prisma.auditLog.create({
    data: { action, userId: opts.userId ?? null, reportId: opts.reportId ?? null, details: opts.details },
  });
}

export const AUDIT_LABEL: Record<AuditAction, string> = {
  REPORT_VIEW: "Visualizou relato",
  REPORT_STATUS_CHANGE: "Alterou status",
  REPORT_REPLY: "Respondeu relato",
  REPORT_IDENTITY_VIEW: "Visualizou identificação",
  REPORT_DELETE_RETENTION: "Relato removido (retenção)",
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILURE: "Login falhou",
  LOGIN_LOCKED: "Conta bloqueada",
  LOGOUT: "Logout",
  USER_CREATE: "Criou usuário",
  USER_UPDATE: "Alterou usuário",
  DEVICE_CREATE: "Cadastrou totem",
  DEVICE_PAIRING_CODE: "Gerou código de pareamento",
  DEVICE_REVOKE: "Revogou totem",
  SETTINGS_UPDATE: "Alterou configurações",
};
