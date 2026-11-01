import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  Card,
  Notice,
  PageHeader,
  StatusBadge,
  UrgentBadge,
  buttonClass,
  inputClass,
  secondaryButtonClass,
} from "@/components/admin/ui";
import { IDENTIFICATION_LABEL, MAX_STORY_LENGTH, MOOD_LABEL, STATUSES, THEME_LABEL } from "@/lib/constants";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { formatProtocol } from "@/lib/protocol-format";
import { getReportDetail, reportAuditTrail } from "@/server/admin-reports";
import { AUDIT_LABEL } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { changeStatusAction, replyAction } from "../actions";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportDetailPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sp = await searchParams;

  const report = await getReportDetail(id, user, { withIdentity: sp.identidade === "1" });
  if (!report) notFound();
  const trail = user.role === "ADMIN" ? await reportAuditTrail(id) : [];

  return (
    <>
      <Link href="/admin" className="mb-4 inline-block text-sm font-bold text-brand hover:underline">
        ← Voltar para a lista
      </Link>
      <PageHeader title={`Relato de ${formatDateOnly(report.createdOn)}`}>
        <div className="flex flex-wrap items-center gap-2">
          {report.urgent && <UrgentBadge />}
          <StatusBadge status={report.status} />
        </div>
      </PageHeader>

      {sp.ok === "resposta" && <div className="mb-4"><Notice kind="success">Resposta enviada. Ela já aparece na consulta pelo protocolo no totem.</Notice></div>}
      {sp.ok === "status" && <div className="mb-4"><Notice kind="success">Status atualizado.</Notice></div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="text-sm font-bold uppercase text-muted">Relato</h2>
            {report.body ? (
              <p className="mt-3 whitespace-pre-line leading-relaxed" data-testid="texto-relato">{report.body}</p>
            ) : (
              <p className="mt-3 italic text-muted">A pessoa preferiu não escrever um relato.</p>
            )}
          </Card>

          {report.urgent && report.status !== "ENCERRADO" && (
            <Notice kind="error">
              Marcado como urgente: a pessoa indicou que precisava de ajuda imediata e recebeu os contatos de apoio e do CVV (188).
            </Notice>
          )}

          <Card>
            <h2 className="text-sm font-bold uppercase text-muted">Respostas</h2>
            <p className="mt-1 text-xs text-muted">
              As respostas aparecem para quem consultar o protocolo no totem (sem o nome de quem respondeu).
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {report.replies.length === 0 && <p className="text-sm text-muted">Nenhuma resposta ainda.</p>}
              {report.replies.map((r) => (
                <article key={r.id} className="rounded-xl bg-brand-soft/60 p-4">
                  <p className="text-xs font-bold text-brand">
                    {r.authorName} · {formatDateTime(r.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
                </article>
              ))}
            </div>
            <form action={replyAction} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="id" value={report.id} />
              <textarea
                name="body"
                required
                rows={5}
                maxLength={MAX_STORY_LENGTH}
                placeholder="Escreva uma resposta acolhedora. Evite dados pessoais: qualquer pessoa com o protocolo pode lê-la no totem."
                className={`${inputClass} resize-y`}
                data-testid="campo-resposta"
              />
              <button type="submit" className={`${buttonClass} self-end`} data-testid="btn-responder">
                Enviar resposta
              </button>
            </form>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Protocolo</dt>
              <dd className="font-mono font-bold">{formatProtocol(report.protocol)}</dd>
              <dt className="text-muted">Data</dt>
              <dd>{formatDateOnly(report.createdOn)}</dd>
              <dt className="text-muted">Check-in</dt>
              <dd>{MOOD_LABEL[report.mood]}</dd>
              <dt className="text-muted">Tema</dt>
              <dd>{report.theme ? THEME_LABEL[report.theme] : "—"}</dd>
              <dt className="text-muted">Totem</dt>
              <dd>{report.deviceName}</dd>
              <dt className="text-muted">Termo</dt>
              <dd>versão {report.consentVersion}</dd>
              {report.closedOn && (
                <>
                  <dt className="text-muted">Encerrado</dt>
                  <dd>{formatDateOnly(report.closedOn)}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-muted">Identificação</h2>
            <p className="mt-2 text-sm font-bold">{IDENTIFICATION_LABEL[report.identification]}</p>
            {report.hasIdentity && !report.identity && (
              <>
                <p className="mt-2 text-xs text-muted">Os dados ficam ocultos por padrão. Exibir registra o acesso na auditoria.</p>
                <Link href={`/admin/relatos/${report.id}?identidade=1`} className={`${secondaryButtonClass} mt-3 w-full`} data-testid="btn-identidade">
                  Mostrar dados de identificação
                </Link>
              </>
            )}
            {report.identity && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" data-testid="dados-identidade">
                <dt className="text-muted">Nome</dt>
                <dd>{report.identity.name ?? "—"}</dd>
                {report.identification === "IDENTIFICADO" && (
                  <>
                    <dt className="text-muted">Setor</dt>
                    <dd>{report.identity.sector ?? "—"}</dd>
                  </>
                )}
                {report.identification === "CONTATO" && (
                  <>
                    <dt className="text-muted">Contato</dt>
                    <dd>{report.identity.contact ?? "—"}</dd>
                  </>
                )}
              </dl>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-muted">Status</h2>
            <form action={changeStatusAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="id" value={report.id} />
              <select name="status" defaultValue={report.status} className={inputClass} data-testid="select-status">
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button type="submit" className={buttonClass} data-testid="btn-status">Atualizar status</button>
            </form>
          </Card>

          {user.role === "ADMIN" && (
            <Card>
              <h2 className="text-sm font-bold uppercase text-muted">Auditoria deste relato</h2>
              <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto text-xs" data-testid="auditoria-relato">
                {trail.map((a) => (
                  <li key={a.id}>
                    <span className="font-bold">{a.user?.name ?? "Sistema"}</span> · {AUDIT_LABEL[a.action]}
                    <br />
                    <span className="text-muted">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
