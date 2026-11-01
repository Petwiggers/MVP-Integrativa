import { NextResponse } from "next/server";
import { authenticateDevice } from "@/server/device-auth";
import { jsonError, tooManyRequests, withErrorHandling } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSettings, toTotemConfig } from "@/server/settings";

export const GET = withErrorHandling("totem.config", async () => {
  const device = await authenticateDevice();
  if (!device) return jsonError(401, "Totem não autorizado.");
  const rl = await rateLimit(`totem:config:${device.id}`, 120, 600);
  if (!rl.ok) return tooManyRequests(rl);
  return NextResponse.json(toTotemConfig(await getSettings()));
});
