// Logger com lista de campos permitidos. Regra: NUNCA registrar corpo de requisição,
// conteúdo de relato, nome, contato, protocolo, IP ou user-agent.

type Primitive = string | number | boolean | null | undefined;
const ALLOWED_FIELDS = new Set(["route", "status", "code", "action", "count", "durationMs", "job"]);

function sanitize(fields: Record<string, Primitive>) {
  const out: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

function write(level: "info" | "warn" | "error", message: string, fields: Record<string, Primitive>) {
  const line = JSON.stringify({ level, message, ...sanitize(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, fields: Record<string, Primitive> = {}) => write("info", message, fields),
  warn: (message: string, fields: Record<string, Primitive> = {}) => write("warn", message, fields),
  /** Registra apenas o tipo do erro — mensagens podem conter dados de entrada. */
  error: (message: string, err: unknown, fields: Record<string, Primitive> = {}) =>
    write("error", message, { ...fields, code: err instanceof Error ? err.name : "unknown" }),
};

export const _sanitizeForTest = sanitize;
