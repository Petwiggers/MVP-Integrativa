import { z } from "zod";
import { MAX_STORY_LENGTH, THEMES } from "./constants";

const themeValues = THEMES.map((t) => t.value) as [string, ...string[]];
const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Corpo aceito em POST /api/totem/reports. Nenhum campo de texto é obrigatório. */
export const reportInputSchema = z
  .object({
    identification: z.enum(["ANONIMO", "IDENTIFICADO", "CONTATO"]).default("ANONIMO"),
    name: optionalText(100),
    sector: optionalText(100),
    contact: optionalText(150),
    mood: z.number().int().min(1).max(5),
    theme: z.enum(themeValues).nullable().optional(),
    story: optionalText(MAX_STORY_LENGTH),
    urgent: z.boolean().default(false),
    consent: z.literal(true),
    consentVersion: z.number().int().min(1),
  })
  .strict();

export type ReportInput = z.infer<typeof reportInputSchema>;
