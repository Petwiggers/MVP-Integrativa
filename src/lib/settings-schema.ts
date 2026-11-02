import { z } from "zod";

// Configurações editáveis no /admin. Valores padrão com marcadores a substituir.
export const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(80).default("Cuida+"),
  hrContact: z
    .string()
    .trim()
    .max(400)
    .default("RH: ramal [0000] · sala do RH, térreo · rh@empresa.com.br"),
  psychologistContact: z
    .string()
    .trim()
    .max(400)
    .default("Psicóloga(o) da empresa: ramal [0000] · seg. a sex., 8h às 17h"),
  responseDeadline: z.string().trim().min(1).max(80).default("até 2 dias úteis"),
  idleTimeoutSeconds: z.coerce.number().int().min(30).max(600).default(90),
  idleWarningSeconds: z.coerce.number().int().min(5).max(30).default(10),
  orientation: z.enum(["any", "portrait", "landscape"]).default("any"),
  retentionDays: z.coerce.number().int().min(30).max(3650).default(180),
  consentText: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .default(
      "Seu relato será lido apenas pela equipe de acolhimento do RH. " +
        "Ele é guardado de forma criptografada e não registramos horário, aparelho pessoal ou endereço de rede. " +
        "Se você escolheu ficar anônimo, ninguém saberá quem escreveu. " +
        "Os dados são tratados conforme a LGPD apenas para cuidar do seu bem-estar, " +
        "e relatos encerrados são apagados automaticamente após o prazo de retenção.",
    ),
  consentVersion: z.coerce.number().int().min(1).default(1),
});

export type AppSettings = z.infer<typeof settingsSchema>;

/** Subconjunto público, enviado ao totem. */
export type TotemConfig = Pick<
  AppSettings,
  | "companyName"
  | "hrContact"
  | "psychologistContact"
  | "responseDeadline"
  | "idleTimeoutSeconds"
  | "idleWarningSeconds"
  | "consentText"
  | "consentVersion"
>;

export const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({});
