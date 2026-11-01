import { hash, verify } from "@node-rs/argon2";

// argon2id com parâmetros recomendados pela OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash fixo usado para equalizar o tempo de resposta quando o usuário não existe. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword("senha-inexistente-para-tempo-constante");
  return dummyHash;
}
