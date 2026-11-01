import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, inputClass } from "@/components/admin/ui";
import { requireUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { saveSettingsAction } from "../gestao-actions";

const label = "flex flex-col gap-1 text-sm font-bold";
const hint = "text-xs font-normal text-muted";

export default async function SettingsPage() {
  await requireUser("ADMIN");
  const s = await getSettings();

  return (
    <>
      <PageHeader title="Configurações" description="Textos e comportamento do totem. As mudanças valem a partir da próxima pessoa que usar o totem." />
      <Card className="max-w-3xl">
        <ActionForm action={saveSettingsAction} submitLabel="Salvar configurações">
          <label className={label}>
            Nome da empresa
            <input name="companyName" defaultValue={s.companyName} required maxLength={80} className={inputClass} />
          </label>
          <label className={label}>
            Contato do RH
            <span className={hint}>Exibido na tela de apoio quando a pessoa precisa de ajuda agora.</span>
            <textarea name="hrContact" defaultValue={s.hrContact} rows={2} maxLength={400} className={inputClass} />
          </label>
          <label className={label}>
            Contato da psicologia
            <textarea name="psychologistContact" defaultValue={s.psychologistContact} rows={2} maxLength={400} className={inputClass} />
          </label>
          <label className={label}>
            Prazo de resposta
            <span className={hint}>Completa a frase “Respondemos em …”. Ex.: até 2 dias úteis.</span>
            <input name="responseDeadline" defaultValue={s.responseDeadline} required maxLength={80} className={inputClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Inatividade (s)
              <input name="idleTimeoutSeconds" type="number" min={30} max={600} defaultValue={s.idleTimeoutSeconds} className={inputClass} />
            </label>
            <label className={label}>
              Aviso antes de limpar (s)
              <input name="idleWarningSeconds" type="number" min={5} max={30} defaultValue={s.idleWarningSeconds} className={inputClass} />
            </label>
            <label className={label}>
              Orientação do PWA
              <select name="orientation" defaultValue={s.orientation} className={inputClass}>
                <option value="any">Livre (gira com o tablet)</option>
                <option value="portrait">Retrato</option>
                <option value="landscape">Paisagem</option>
              </select>
            </label>
          </div>
          <label className={label}>
            Retenção (dias)
            <span className={hint}>Relatos encerrados há mais tempo que isso são apagados definitivamente pelo job diário.</span>
            <input name="retentionDays" type="number" min={30} max={3650} defaultValue={s.retentionDays} className={`${inputClass} max-w-40`} />
          </label>
          <label className={label}>
            Termo de consentimento (LGPD) — versão atual: {s.consentVersion}
            <span className={hint}>Ao alterar o texto, a versão é incrementada e passa a ser registrada nos novos relatos.</span>
            <textarea name="consentText" defaultValue={s.consentText} rows={6} required maxLength={2000} className={inputClass} />
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
