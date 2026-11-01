import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createDeviceAction, pairingCodeAction, revokeDeviceAction } from "../gestao-actions";

const smallBtn = "!px-2.5 !py-1 !text-xs";

export default async function DevicesPage() {
  await requireUser("ADMIN");
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { reports: true } } },
  });
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Totens"
        description="Cada tablet é pareado uma vez com um código temporário. O relato guarda só o nome genérico do totem — nunca dados do aparelho de quem escreveu."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          {devices.map((d) => {
            const status = d.revokedAt
              ? "Revogado"
              : d.tokenHash
                ? "Pareado"
                : d.pairingExpiresAt && d.pairingExpiresAt > now
                  ? "Aguardando pareamento"
                  : "Não pareado";
            return (
              <Card key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{d.name}</p>
                    <p className="text-xs text-muted">
                      {status}
                      {d.pairedAt && ` · pareado em ${formatDateTime(d.pairedAt)}`} · {d._count.reports} relato(s)
                    </p>
                  </div>
                  {!d.revokedAt && d.tokenHash && (
                    <form action={revokeDeviceAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className={`${dangerButtonClass} ${smallBtn}`}>Revogar acesso</button>
                    </form>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-brand">
                    {d.tokenHash ? "Trocar o tablet (gera novo código e desconecta o atual)" : "Gerar código de pareamento"}
                  </summary>
                  <ActionForm action={pairingCodeAction} submitLabel="Gerar código" submitClassName={`${secondaryButtonClass} ${smallBtn}`} className="mt-2">
                    <input type="hidden" name="id" value={d.id} />
                  </ActionForm>
                </details>
              </Card>
            );
          })}
        </div>
        <Card>
          <h2 className="mb-3 font-bold">Novo totem</h2>
          <ActionForm action={createDeviceAction} submitLabel="Cadastrar e gerar código">
            <input name="name" placeholder="Ex.: Totem Refeitório" required maxLength={80} className={inputClass} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
