import Link from "next/link";
import type { ReportStatus, Theme } from "@/generated/prisma/client";
import { Card, PageHeader, StatusBadge, UrgentBadge, inputClass, secondaryButtonClass, buttonClass } from "@/components/admin/ui";
import { IDENTIFICATION_LABEL, MOOD_LABEL, STATUSES, THEMES, THEME_LABEL } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";
import { countByStatus, listReports } from "@/server/admin-reports";
import { findByProtocolAction } from "./relatos/actions";
import { requireUser } from "@/server/auth/session";

type Search = Promise<Record<string, string | string[] | undefined>>;

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  await requireUser();
  const sp = await searchParams;
  const status = pick<ReportStatus>(sp.status, STATUSES.map((s) => s.value));
  const theme = pick<Theme>(sp.tema, THEMES.map((t) => t.value));
  const urgent = sp.urgencia === "sim" ? true : sp.urgencia === "nao" ? false : undefined;
  const page = Number(sp.pagina) || 1;

  const [{ rows, total, pages }, counts] = await Promise.all([
    listReports({ status, theme, urgent, page }),
    countByStatus(),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (theme) params.set("tema", theme);
    if (sp.urgencia) params.set("urgencia", String(sp.urgencia));
    params.set("pagina", String(p));
    return `?${params}`;
  };

  return (
    <>
      <PageHeader title="Relatos" description="Ordenados por urgência e depois por data. O conteúdo só é exibido ao abrir o relato (ação registrada em auditoria)." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="!p-4">
          <p className="text-xs font-bold uppercase text-alert">Urgentes em aberto</p>
          <p className="mt-1 text-2xl font-bold" data-testid="urgentes-abertos">{counts.urgentOpen}</p>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s.value} className="!p-4">
            <p className="text-xs font-bold uppercase text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{counts.byStatus[s.value] ?? 0}</p>
          </Card>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          Status
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          Tema
          <select name="tema" defaultValue={theme ?? ""} className={inputClass}>
            <option value="">Todos</option>
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          Urgência
          <select name="urgencia" defaultValue={typeof sp.urgencia === "string" ? sp.urgencia : ""} className={inputClass}>
            <option value="">Todas</option>
            <option value="sim">Urgentes</option>
            <option value="nao">Não urgentes</option>
          </select>
        </label>
        <button type="submit" className={buttonClass}>Filtrar</button>
        <Link href="/admin" className={secondaryButtonClass}>Limpar</Link>
      </form>

      <form action={findByProtocolAction} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          Abrir pelo protocolo
          <input name="protocolo" placeholder="ABC-DEF" maxLength={10} required className={`${inputClass} w-32 font-mono uppercase`} />
        </label>
        <button type="submit" className={secondaryButtonClass}>Buscar</button>
        {sp.protocolo === "nao-encontrado" && <span className="py-2 text-sm font-bold text-alert">Protocolo não encontrado.</span>}
      </form>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm" data-testid="tabela-relatos">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tema</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Identificação</th>
              <th className="px-4 py-3">Totem</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">Nenhum relato encontrado.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-line/70 last:border-0 ${r.urgent && r.status !== "ENCERRADO" ? "bg-alert-soft/40" : ""}`}>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateOnly(r.createdOn)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.urgent && <UrgentBadge />}
                    <StatusBadge status={r.status} />
                  </div>
                </td>
                <td className="px-4 py-3">{r.theme ? THEME_LABEL[r.theme] : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">{MOOD_LABEL[r.mood]}</td>
                <td className="px-4 py-3">{IDENTIFICATION_LABEL[r.identification]}</td>
                <td className="px-4 py-3 text-muted">{r.device.name}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/relatos/${r.id}`} className="font-bold text-brand hover:underline" data-testid="abrir-relato">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{total} relato(s)</span>
        <div className="flex gap-2">
          {page > 1 && <Link className={secondaryButtonClass} href={qs(page - 1)}>Anterior</Link>}
          <span className="px-2 py-2">Página {page} de {pages}</span>
          {page < pages && <Link className={secondaryButtonClass} href={qs(page + 1)}>Próxima</Link>}
        </div>
      </div>
    </>
  );
}
