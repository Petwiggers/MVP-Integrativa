import { randomInt } from "node:crypto";
import { PROTOCOL_ALPHABET, PROTOCOL_LENGTH, normalizeProtocol } from "@/lib/protocol-format";
import { hmacSha256 } from "./crypto";
import { env } from "./env";

/** Gera um protocolo com CSPRNG e distribuição uniforme (randomInt não tem viés de módulo). */
export function generateProtocol(): string {
  let code = "";
  for (let i = 0; i < PROTOCOL_LENGTH; i++) {
    code += PROTOCOL_ALPHABET[randomInt(PROTOCOL_ALPHABET.length)];
  }
  return code;
}

/** Hash usado para busca: o banco nunca guarda o protocolo em claro. */
export function hashProtocol(code: string, pepper: string = env.protocolPepper): string {
  return hmacSha256(normalizeProtocol(code), pepper);
}
