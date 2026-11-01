"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/server/audit";
import { attemptLogin } from "@/server/auth/login";
import { createSession, destroySession, getCurrentUser } from "@/server/auth/session";

export type LoginState = { error?: string };

function clientIp(h: Headers): string | null {
  // Na Vercel, x-real-ip / x-forwarded-for vêm da borda. Usado só no rate limit do login (em HMAC).
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const result = await attemptLogin(email, password, clientIp(await headers()));
  if (!result.ok) return { error: result.error };

  await createSession(result.userId);
  redirect("/admin");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit("LOGOUT", { userId: user.id });
  redirect("/admin/login");
}
