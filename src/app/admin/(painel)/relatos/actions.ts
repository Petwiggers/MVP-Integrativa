"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { STATUSES } from "@/lib/constants";
import { addReply, changeStatus, findReportIdByProtocol } from "@/server/admin-reports";
import { requireUser } from "@/server/auth/session";

const idSchema = z.uuid();
const statusSchema = z.enum(STATUSES.map((s) => s.value) as ["NOVO", "EM_ATENDIMENTO", "RESPONDIDO", "ENCERRADO"]);

export async function changeStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.parse(formData.get("id"));
  const status = statusSchema.parse(formData.get("status"));
  await changeStatus(id, status, user);
  revalidatePath(`/admin/relatos/${id}`);
  redirect(`/admin/relatos/${id}?ok=status`);
}

export async function replyAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.parse(formData.get("id"));
  const body = String(formData.get("body") ?? "");
  await addReply(id, body, user);
  revalidatePath(`/admin/relatos/${id}`);
  redirect(`/admin/relatos/${id}?ok=resposta`);
}

export async function findByProtocolAction(formData: FormData) {
  await requireUser();
  const id = await findReportIdByProtocol(String(formData.get("protocolo") ?? "").slice(0, 20));
  redirect(id ? `/admin/relatos/${id}` : "/admin?protocolo=nao-encontrado");
}
