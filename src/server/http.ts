import { NextResponse } from "next/server";
import { logger } from "./logger";
import { retryAfterSeconds, type RateLimitResult } from "./rate-limit";

export const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status });

export const tooManyRequests = (res: RateLimitResult) =>
  NextResponse.json(
    { error: "Muitas tentativas. Aguarde um pouco e tente de novo." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds(res)) } },
  );

/** Lê JSON com limite de tamanho; nunca loga o corpo. */
export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new PayloadTooLargeError();
  return JSON.parse(text);
}

export class PayloadTooLargeError extends Error {
  name = "PayloadTooLargeError";
}

/** Envolve um handler: qualquer erro vira 500 genérico com log sem conteúdo. */
export function withErrorHandling<A extends unknown[]>(route: string, handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) return jsonError(413, "Conteúdo muito grande.");
      if (err instanceof SyntaxError) return jsonError(400, "Requisição inválida.");
      logger.error("Falha na rota", err, { route });
      return jsonError(500, "Algo deu errado. Tente de novo.");
    }
  };
}
