import { NextResponse } from "next/server";
import { reportInputSchema } from "@/lib/validation";
import { authenticateDevice } from "@/server/device-auth";
import { jsonError, readJson, tooManyRequests, withErrorHandling } from "@/server/http";
import { endOfBusinessDay, rateLimit } from "@/server/rate-limit";
import { createReport } from "@/server/reports";
import { getSettings } from "@/server/settings";

// Importante: este handler não lê IP, user-agent nem outros cabeçalhos da requisição.
export const POST = withErrorHandling("totem.reports", async (request: Request) => {
  const device = await authenticateDevice();
  if (!device) return jsonError(401, "Totem não autorizado.");

  // Janela diária com término fixo: o bucket não revela o horário de nenhum envio.
  const rl = await rateLimit(`totem:report:${device.id}`, 150, { until: endOfBusinessDay() });
  if (!rl.ok) return tooManyRequests(rl);

  const parsed = reportInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "Não foi possível enviar. Confira as informações.");

  const settings = await getSettings();
  if (parsed.data.consentVersion !== settings.consentVersion) {
    return jsonError(409, "O termo foi atualizado. Leia novamente antes de enviar.");
  }

  const { protocol } = await createReport(parsed.data, device.id);
  return NextResponse.json({ protocol }, { status: 201 });
});
