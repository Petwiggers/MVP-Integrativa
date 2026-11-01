// Rótulos e enumerações compartilhados entre o totem, o painel e o servidor.

export const THEMES = [
  { value: "TRABALHO", label: "Trabalho" },
  { value: "LIDERANCA", label: "Liderança" },
  { value: "COLEGAS", label: "Colegas" },
  { value: "SAUDE_MENTAL", label: "Saúde mental" },
  { value: "FAMILIA", label: "Família" },
  { value: "FINANCAS", label: "Finanças" },
  { value: "OUTRO", label: "Outro" },
] as const;

export type ThemeValue = (typeof THEMES)[number]["value"];

export const THEME_LABEL: Record<ThemeValue, string> = Object.fromEntries(
  THEMES.map((t) => [t.value, t.label]),
) as Record<ThemeValue, string>;

/** Check-in emocional: 1 (muito mal) → 5 (muito bem). */
export const MOODS = [
  { value: 1, label: "Muito mal", color: "#b4505a" },
  { value: 2, label: "Mal", color: "#d08a4e" },
  { value: 3, label: "Mais ou menos", color: "#c9b458" },
  { value: 4, label: "Bem", color: "#6fa37a" },
  { value: 5, label: "Muito bem", color: "#3f8f8a" },
] as const;

export const MOOD_LABEL: Record<number, string> = Object.fromEntries(
  MOODS.map((m) => [m.value, m.label]),
);

export const STATUSES = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "RESPONDIDO", label: "Respondido" },
  { value: "ENCERRADO", label: "Encerrado" },
] as const;

export type StatusValue = (typeof STATUSES)[number]["value"];

export const STATUS_LABEL: Record<StatusValue, string> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.label]),
) as Record<StatusValue, string>;

/** Status exibido na consulta anônima do totem (linguagem acolhedora). */
export const STATUS_TOTEM_LABEL: Record<StatusValue, string> = {
  NOVO: "Recebido — em breve alguém vai ler",
  EM_ATENDIMENTO: "Em atendimento",
  RESPONDIDO: "Respondido",
  ENCERRADO: "Encerrado",
};

export const IDENTIFICATION_LABEL = {
  ANONIMO: "Anônimo",
  IDENTIFICADO: "Identificado",
  CONTATO: "Pediu contato",
} as const;

/** Limite mínimo para exibir qualquer agregado no dashboard (k-anonimato). */
export const MIN_AGGREGATE = 5;

export const MAX_STORY_LENGTH = 5000;
