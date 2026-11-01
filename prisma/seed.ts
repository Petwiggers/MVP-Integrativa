// Seed de desenvolvimento: admin/atendente de teste, totens e relatos fictícios.
// Uso: npm run db:seed   (idempotente para usuários/totens; recria os relatos fictícios)
import "dotenv/config";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { sha256 } from "../src/server/crypto";
import { createReport } from "../src/server/reports";
import { addDays, todayDateOnly } from "../src/lib/dates";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";
import type { ReportInput } from "../src/lib/validation";

const ADMIN_EMAIL = "admin@exemplo.com";
const ATENDENTE_EMAIL = "atendente@exemplo.com";
const SEED_DEVICE_ID = "00000000-0000-4000-8000-000000000001";
const PAIRING_DEVICE_ID = "00000000-0000-4000-8000-000000000002";
const DEV_PAIRING_CODE = "PAREAR";

const password = process.env.SEED_ADMIN_PASSWORD || "Acolher-Totem-2026!";
const deviceToken = process.env.SEED_DEVICE_TOKEN || "dev-totem-token-nao-usar-em-producao";

const base = (overrides: Partial<ReportInput>): ReportInput => ({
  identification: "ANONIMO",
  mood: 3,
  urgent: false,
  consent: true,
  consentVersion: 1,
  ...overrides,
});

const FAKE_REPORTS: Array<{ daysAgo: number; input: ReportInput; status?: string }> = [
  { daysAgo: 0, input: base({ mood: 1, theme: "SAUDE_MENTAL", urgent: true, story: "Tenho me sentido muito sobrecarregado e sem dormir direito." }) },
  { daysAgo: 1, input: base({ mood: 2, theme: "LIDERANCA", story: "Meu encarregado grita com a equipe na frente de todo mundo." }) },
  { daysAgo: 2, input: base({ mood: 2, theme: "COLEGAS", identification: "IDENTIFICADO", name: "Maria (fictícia)", sector: "Expedição", story: "Estou tendo dificuldade com um colega do turno da noite." }), status: "EM_ATENDIMENTO" },
  { daysAgo: 3, input: base({ mood: 3, theme: "FINANCAS", identification: "CONTATO", name: "João (fictício)", contact: "Ramal 2040", story: "Gostaria de orientação sobre empréstimo consignado." }) },
  { daysAgo: 5, input: base({ mood: 4, theme: "TRABALHO", story: "Sugiro pausas mais longas no setor de embalagem no verão." }), status: "RESPONDIDO" },
  { daysAgo: 6, input: base({ mood: 3, theme: "FAMILIA", story: "Estou passando por um momento difícil em casa." }) },
  { daysAgo: 8, input: base({ mood: 5, theme: "TRABALHO", story: "Quero agradecer o apoio que recebi no mês passado." }), status: "ENCERRADO" },
  { daysAgo: 9, input: base({ mood: 2, theme: "SAUDE_MENTAL", story: "Ansiedade antes de cada turno." }) },
  { daysAgo: 10, input: base({ mood: 4, theme: null, story: "" }) },
  { daysAgo: 12, input: base({ mood: 1, theme: "OUTRO", urgent: true, story: "Preciso conversar com alguém com urgência." }), status: "EM_ATENDIMENTO" },
  { daysAgo: 14, input: base({ mood: 3, theme: "TRABALHO", story: "O equipamento de proteção está desgastado." }) },
  { daysAgo: 15, input: base({ mood: 4, theme: "COLEGAS", story: "A integração com a equipe nova foi ótima." }), status: "ENCERRADO" },
];

async function main() {
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Admin de Teste", role: "ADMIN", passwordHash },
    update: { passwordHash, failedAttempts: 0, lockedUntil: null, lockoutCount: 0, active: true },
  });
  await prisma.user.upsert({
    where: { email: ATENDENTE_EMAIL },
    create: { email: ATENDENTE_EMAIL, name: "Atendente de Teste", role: "ATENDENTE", passwordHash },
    update: { passwordHash, failedAttempts: 0, lockedUntil: null, lockoutCount: 0, active: true },
  });

  // Usuário usado só pelo teste e2e de bloqueio após tentativas falhas.
  await prisma.user.upsert({
    where: { email: "bloqueio@exemplo.com" },
    create: { email: "bloqueio@exemplo.com", name: "Teste de Bloqueio", role: "ATENDENTE", passwordHash },
    update: { passwordHash, failedAttempts: 0, lockedUntil: null, lockoutCount: 0, active: true },
  });

  await prisma.device.upsert({
    where: { id: SEED_DEVICE_ID },
    create: { id: SEED_DEVICE_ID, name: "Totem Refeitório (teste)", tokenHash: sha256(deviceToken), pairedAt: new Date() },
    update: { tokenHash: sha256(deviceToken), revokedAt: null },
  });
  const pairingExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.device.upsert({
    where: { id: PAIRING_DEVICE_ID },
    create: { id: PAIRING_DEVICE_ID, name: "Totem Portaria (aguardando pareamento)", pairingCodeHash: sha256(DEV_PAIRING_CODE), pairingExpiresAt },
    update: { pairingCodeHash: sha256(DEV_PAIRING_CODE), pairingExpiresAt, tokenHash: null, revokedAt: null },
  });

  await prisma.setting.upsert({
    where: { key: "app" },
    create: { key: "app", value: DEFAULT_SETTINGS },
    update: {},
  });

  // Recria os relatos fictícios do totem de teste.
  await prisma.report.deleteMany({ where: { deviceId: SEED_DEVICE_ID } });
  const today = todayDateOnly();
  const protocols: string[] = [];
  for (const r of FAKE_REPORTS) {
    const { id, protocol } = await createReport(r.input, SEED_DEVICE_ID, { createdOn: addDays(today, -r.daysAgo) });
    protocols.push(protocol);
    if (r.status) {
      await prisma.report.update({
        where: { id },
        data: { status: r.status as never, closedOn: r.status === "ENCERRADO" ? addDays(today, -r.daysAgo + 1) : null },
      });
    }
  }

  console.log("Seed concluído.");
  console.log(`  Admin:     ${admin.email} / ${password}`);
  console.log(`  Atendente: ${ATENDENTE_EMAIL} / ${password}`);
  console.log(`  Código de pareamento (Totem Portaria, 24h): ${DEV_PAIRING_CODE}`);
  console.log(`  Protocolo de exemplo: ${protocols[0]}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Erro no seed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
