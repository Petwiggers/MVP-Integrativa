import Link from "next/link";
import { Card, PageHeader, secondaryButtonClass } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { AUDIT_LABEL } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

const PAGE = 50;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditPage({ searchParams }: { searchParams: Search }) {
  await requireUser("ADMIN");
  const page = Math.max(1, Number((await searchParams).pagina) || 1);
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Auditoria" description="Quem visualizou ou alterou cada relato, logins e mudanças administrativas. O registro é somente de inclusão e nunca contém o conteúdo dos relatos." />
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm" data-testid="tabela-auditoria">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Relato</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-line/70 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs">{formatDateTime(l.createdAt)}</td>
                <td className="px-4 py-2.5">{l.user ? `${l.user.name} (${l.user.email})` : "Sistema"}</td>
                <td className="px-4 py-2.5">{AUDIT_LABEL[l.action]}</td>
                <td className="px-4 py-2.5">
                  {l.reportId ? (
                    <Link href={`/admin/relatos/${l.reportId}`} className="font-mono text-xs text-brand hover:underline">
                      {l.reportId.slice(0, 8)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 flex justify-end gap-2 text-sm">
        {page > 1 && <Link className={secondaryButtonClass} href={`?pagina=${page - 1}`}>Anterior</Link>}
        <span className="px-2 py-2 text-muted">Página {page} de {pages}</span>
        {page < pages && <Link className={secondaryButtonClass} href={`?pagina=${page + 1}`}>Próxima</Link>}
      </div>
    </>
  );
}
