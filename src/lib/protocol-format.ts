// Formatação e validação do código de protocolo (compartilhado entre cliente e servidor).

/** Sem caracteres ambíguos: 0/O, 1/I/L. 31 símbolos → 31^6 ≈ 887 milhões de códigos. */
export const PROTOCOL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PROTOCOL_LENGTH = 6;

const VALID = new RegExp(`^[${PROTOCOL_ALPHABET}]{${PROTOCOL_LENGTH}}$`);

/** Aceita minúsculas, espaços e hífen: " abc-def " → "ABCDEF". */
export function normalizeProtocol(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidProtocol(input: string): boolean {
  return VALID.test(normalizeProtocol(input));
}

/** "ABCDEF" → "ABC-DEF" (mais fácil de ler e anotar). */
export function formatProtocol(code: string): string {
  const n = normalizeProtocol(code);
  return n.length === PROTOCOL_LENGTH ? `${n.slice(0, 3)}-${n.slice(3)}` : n;
}
