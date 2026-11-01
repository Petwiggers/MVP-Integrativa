import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, inputClass } from "@/components/admin/ui";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password-policy";
import { requireUser } from "@/server/auth/session";
import { changeOwnPasswordAction } from "../gestao-actions";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Minha conta" description={`${user.name} · ${user.email}`} />
      <Card className="max-w-md">
        <h2 className="mb-3 font-bold">Trocar senha</h2>
        <ActionForm action={changeOwnPasswordAction} submitLabel="Trocar senha" resetOnSuccess>
          <input name="current" type="password" autoComplete="current-password" placeholder="Senha atual" required className={inputClass} />
          <input name="next" type="password" autoComplete="new-password" placeholder={`Nova senha (mín. ${MIN_PASSWORD_LENGTH} caracteres)`} required className={inputClass} />
          <input name="confirm" type="password" autoComplete="new-password" placeholder="Confirme a nova senha" required className={inputClass} />
        </ActionForm>
      </Card>
    </>
  );
}
