"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { settingsSchema } from "@/lib/settings-schema";
import { audit } from "@/server/audit";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { checkPasswordStrength } from "@/server/auth/password-policy";
import { createSession, requireUser, revokeUserSessions } from "@/server/auth/session";
import { sha256 } from "@/server/crypto";
import { prisma } from "@/server/db";
import { PAIRING_TTL_MINUTES, generatePairingCode } from "@/server/device-auth";
import { getSettings, saveSettings } from "@/server/settings";

export type ActionState = { error?: string; success?: string; code?: string; deviceName?: string };

const str = (fd: FormData, key: string, max = 300) => String(fd.get(key) ?? "").slice(0, max);

// ---------------------------------------------------------------- Configurações
export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("ADMIN");
  const current = await getSettings();
  const parsed = settingsSchema.safeParse({
    companyName: str(fd, "companyName", 80),
    hrContact: str(fd, "hrContact", 400),
    psychologistContact: str(fd, "psychologistContact", 400),
    responseDeadline: str(fd, "responseDeadline", 80),
    idleTimeoutSeconds: str(fd, "idleTimeoutSeconds", 5),
    idleWarningSeconds: str(fd, "idleWarningSeconds", 5),
    orientation: str(fd, "orientation", 20),
    retentionDays: str(fd, "retentionDays", 5),
    consentText: str(fd, "consentText", 2000),
    consentVersion: current.consentVersion,
  });
  if (!parsed.success) {
    return { error: "Verifique os campos: tempo de inatividade entre 30 e 600 s, aviso entre 5 e 30 s, retenção entre 30 e 3650 dias." };
  }
  const saved = await saveSettings(parsed.data);
  const changed = Object.keys(saved).filter(
    (k) => saved[k as keyof typeof saved] !== current[k as keyof typeof current],
  );
  await audit("SETTINGS_UPDATE", { userId: user.id, details: { changed } });
  revalidatePath("/admin/configuracoes");
  return {
    success:
      saved.consentVersion !== current.consentVersion
        ? `Configurações salvas. O termo mudou e agora está na versão ${saved.consentVersion}.`
        : "Configurações salvas.",
  };
}

// ---------------------------------------------------------------- Usuários
const emailSchema = z.email().max(200);
const roleSchema = z.enum(["ADMIN", "ATENDENTE"]);

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const name = str(fd, "name", 100).trim();
  const email = str(fd, "email", 200).trim().toLowerCase();
  const role = roleSchema.safeParse(fd.get("role"));
  const password = str(fd, "password", 200);
  if (!name || !emailSchema.safeParse(email).success || !role.success) return { error: "Preencha nome, e-mail válido e papel." };
  const problems = checkPasswordStrength(password, [name, email, email.split("@")[0]]);
  if (problems.length) return { error: problems.join(" ") };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Já existe um usuário com esse e-mail." };

  const user = await prisma.user.create({
    data: { name, email, role: role.data as Role, passwordHash: await hashPassword(password) },
  });
  await audit("USER_CREATE", { userId: admin.id, details: { targetUserId: user.id, role: user.role } });
  revalidatePath("/admin/usuarios");
  return { success: `Usuário ${email} criado.` };
}

export async function updateUserAction(fd: FormData) {
  const admin = await requireUser("ADMIN");
  const id = z.uuid().parse(fd.get("id"));
  const op = z.enum(["activate", "deactivate", "unlock", "make-admin", "make-atendente"]).parse(fd.get("op"));
  if (id === admin.id && op !== "unlock") return; // ninguém se desativa ou se rebaixa sozinho

  const data = {
    activate: { active: true },
    deactivate: { active: false },
    unlock: { failedAttempts: 0, lockoutCount: 0, lockedUntil: null },
    "make-admin": { role: "ADMIN" as Role },
    "make-atendente": { role: "ATENDENTE" as Role },
  }[op];
  await prisma.user.update({ where: { id }, data });
  if (op === "deactivate" || op.startsWith("make-")) await revokeUserSessions(id);
  await audit("USER_UPDATE", { userId: admin.id, details: { targetUserId: id, op } });
  revalidatePath("/admin/usuarios");
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const id = z.uuid().parse(fd.get("id"));
  const password = str(fd, "password", 200);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Usuário não encontrado." };
  const problems = checkPasswordStrength(password, [target.name, target.email]);
  if (problems.length) return { error: problems.join(" ") };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), failedAttempts: 0, lockoutCount: 0, lockedUntil: null },
  });
  await revokeUserSessions(id);
  await audit("USER_UPDATE", { userId: admin.id, details: { targetUserId: id, op: "reset-password" } });
  return { success: "Senha redefinida. As sessões abertas desse usuário foram encerradas." };
}

// ---------------------------------------------------------------- Minha conta
export async function changeOwnPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = str(fd, "current", 200);
  const next = str(fd, "next", 200);
  if (next !== str(fd, "confirm", 200)) return { error: "A confirmação não confere com a nova senha." };
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(dbUser.passwordHash, current))) return { error: "Senha atual incorreta." };
  if (current === next) return { error: "A nova senha precisa ser diferente da atual." };
  const problems = checkPasswordStrength(next, [user.name, user.email]);
  if (problems.length) return { error: problems.join(" ") };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await revokeUserSessions(user.id);
  await createSession(user.id);
  await audit("USER_UPDATE", { userId: user.id, details: { targetUserId: user.id, op: "change-password" } });
  return { success: "Senha alterada. Outras sessões abertas foram encerradas." };
}

// ---------------------------------------------------------------- Totens
async function issuePairingCode(deviceId: string) {
  const code = generatePairingCode();
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      pairingCodeHash: sha256(code),
      pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MINUTES * 60_000),
      tokenHash: null, // o aparelho anterior (se houver) deixa de funcionar
      revokedAt: null,
    },
  });
  return code;
}

export async function createDeviceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const name = str(fd, "name", 80).trim();
  if (!name) return { error: "Dê um nome genérico ao totem (ex.: Totem Refeitório)." };
  const device = await prisma.device.create({ data: { name } });
  const code = await issuePairingCode(device.id);
  await audit("DEVICE_CREATE", { userId: admin.id, details: { deviceId: device.id } });
  revalidatePath("/admin/totens");
  return { code, deviceName: name };
}

export async function pairingCodeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const id = z.uuid().parse(fd.get("id"));
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) return { error: "Totem não encontrado." };
  const code = await issuePairingCode(id);
  await audit("DEVICE_PAIRING_CODE", { userId: admin.id, details: { deviceId: id } });
  revalidatePath("/admin/totens");
  return { code, deviceName: device.name };
}

export async function revokeDeviceAction(fd: FormData) {
  const admin = await requireUser("ADMIN");
  const id = z.uuid().parse(fd.get("id"));
  await prisma.device.update({
    where: { id },
    data: { revokedAt: new Date(), tokenHash: null, pairingCodeHash: null, pairingExpiresAt: null },
  });
  await audit("DEVICE_REVOKE", { userId: admin.id, details: { deviceId: id } });
  revalidatePath("/admin/totens");
}
