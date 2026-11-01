import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Painel de Acolhimento" };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = [
    { href: "/admin", label: "Relatos" },
    { href: "/admin/dashboard", label: "Dashboard" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/configuracoes", label: "Configurações" },
          { href: "/admin/usuarios", label: "Usuários" },
          { href: "/admin/totens", label: "Totens" },
          { href: "/admin/auditoria", label: "Auditoria" },
        ]
      : []),
    { href: "/admin/conta", label: "Minha conta" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-bold text-brand">
            Painel de Acolhimento
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user.name} · {user.role === "ADMIN" ? "Admin" : "Atendente"}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg border border-line px-3 py-1.5 font-bold hover:bg-brand-soft">
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 font-bold text-muted hover:bg-brand-soft hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
