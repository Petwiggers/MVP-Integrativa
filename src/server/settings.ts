import { prisma } from "./db";
import { settingsSchema, type AppSettings, type TotemConfig } from "@/lib/settings-schema";

const KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  // Campos inválidos/ausentes caem no padrão em vez de derrubar o totem.
  const parsed = settingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : settingsSchema.parse({});
}

export async function saveSettings(input: AppSettings): Promise<AppSettings> {
  const current = await getSettings();
  const next = settingsSchema.parse(input);
  // Mudou o texto do termo → nova versão de consentimento.
  next.consentVersion =
    next.consentText !== current.consentText ? current.consentVersion + 1 : current.consentVersion;
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next },
    update: { value: next },
  });
  return next;
}

export function toTotemConfig(s: AppSettings): TotemConfig {
  return {
    companyName: s.companyName,
    hrContact: s.hrContact,
    psychologistContact: s.psychologistContact,
    responseDeadline: s.responseDeadline,
    idleTimeoutSeconds: s.idleTimeoutSeconds,
    idleWarningSeconds: s.idleWarningSeconds,
    consentText: s.consentText,
    consentVersion: s.consentVersion,
  };
}
