import { NextResponse } from "next/server";
import { safeEqual } from "@/server/crypto";
import { env } from "@/server/env";
import { jsonError, withErrorHandling } from "@/server/http";
import { logger } from "@/server/logger";
import { runRetention } from "@/server/retention";

// Chamado pela Vercel Cron (vercel.json), que envia "Authorization: Bearer <CRON_SECRET>".
export const GET = withErrorHandling("cron.retention", async (request: Request) => {
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env.cronSecret}`)) return jsonError(401, "Não autorizado.");

  const result = await runRetention();
  logger.info("Retenção executada", { job: "retention", count: result.reportsDeleted });
  return NextResponse.json({ reportsDeleted: result.reportsDeleted, sessionsDeleted: result.sessionsDeleted });
});
