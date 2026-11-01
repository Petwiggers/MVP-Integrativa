import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/server/device-auth";
import { jsonError, readJson, tooManyRequests, withErrorHandling } from "@/server/http";
import { rateLimitAll } from "@/server/rate-limit";
import { lookupProtocol } from "@/server/reports";

// POST (e não GET /protocol/:code) para o código nunca aparecer em URLs/logs de acesso.
const bodySchema = z.object({ code: z.string().max(20) }).strict();

export const POST = withErrorHandling("totem.protocol", async (request: Request) => {
  const device = await authenticateDevice();
  if (!device) return jsonError(401, "Totem não autorizado.");

  // Limite por totem + global, contra tentativa de adivinhar protocolos.
  const rl = await rateLimitAll([
    { key: `totem:lookup:${device.id}`, limit: 15, windowSeconds: 600 },
    { key: "totem:lookup:global", limit: 300, windowSeconds: 600 },
  ]);
  if (!rl.ok) return tooManyRequests(rl);

  const parsed = bodySchema.safeParse(await readJson(request, 1000));
  if (!parsed.success) return jsonError(400, "Código inválido.");

  const result = await lookupProtocol(parsed.data.code);
  if (!result) return jsonError(404, "Não encontramos esse protocolo. Confira o código.");
  return NextResponse.json(result);
});
