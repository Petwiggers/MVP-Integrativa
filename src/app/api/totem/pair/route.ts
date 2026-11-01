import { NextResponse } from "next/server";
import { z } from "zod";
import { pairDevice } from "@/server/device-auth";
import { jsonError, readJson, tooManyRequests, withErrorHandling } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const bodySchema = z.object({ code: z.string().min(4).max(20) }).strict();

export const POST = withErrorHandling("totem.pair", async (request: Request) => {
  // Limite global: o pareamento é raro e feito por alguém do RH/TI.
  const rl = await rateLimit("totem:pair:global", 10, 600);
  if (!rl.ok) return tooManyRequests(rl);

  const parsed = bodySchema.safeParse(await readJson(request, 1000));
  if (!parsed.success) return jsonError(400, "Código inválido.");

  const device = await pairDevice(parsed.data.code);
  if (!device) return jsonError(400, "Código inválido ou expirado.");
  return NextResponse.json({ name: device.name });
});
