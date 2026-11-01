import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Painel de Acolhimento" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand">Painel de Acolhimento</p>
          <h1 className="mt-2 text-2xl font-bold">Entrar</h1>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted">
          Acesso restrito à equipe autorizada. Todas as ações são registradas em auditoria.
        </p>
      </div>
    </main>
  );
}
