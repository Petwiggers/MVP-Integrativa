import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, inputClass, secondaryButtonClass } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { isLocked } from "@/server/auth/lockout";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password-policy";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createUserAction, resetPasswordAction, updateUserAction } from "../gestao-actions";

const smallBtn = `${secondaryButtonClass} !px-2.5 !py-1 !text-xs`;

export default async function UsersPage() {
  const me = await requireUser("ADMIN");
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <>
      <PageHeader title="Usuários" description={`Senhas com no mínimo ${MIN_PASSWORD_LENGTH} caracteres e difíceis de adivinhar. 5 tentativas erradas bloqueiam a conta (15 min, dobrando a cada novo bloqueio).`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const locked = isLocked(u);
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className="border-b border-line/70 align-top last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold">{u.name}{self && " (você)"}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">{u.role === "ADMIN" ? "Admin" : "Atendente"}</td>
                    <td className="px-4 py-3">
                      {!u.active ? "Desativado" : locked ? <span className="font-bold text-alert">Bloqueado</span> : "Ativo"}
                    </td>
                    <td className="px-4 py-3 text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {locked && (
                          <form action={updateUserAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button name="op" value="unlock" className={smallBtn}>Desbloquear</button>
                          </form>
                        )}
                        {!self && (
                          <form action={updateUserAction} className="flex gap-1.5">
                            <input type="hidden" name="id" value={u.id} />
                            <button name="op" value={u.active ? "deactivate" : "activate"} className={smallBtn}>
                              {u.active ? "Desativar" : "Reativar"}
                            </button>
                            <button name="op" value={u.role === "ADMIN" ? "make-atendente" : "make-admin"} className={smallBtn}>
                              {u.role === "ADMIN" ? "Tornar atendente" : "Tornar admin"}
                            </button>
                          </form>
                        )}
                      </div>
                      {!self && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-bold text-brand">Redefinir senha</summary>
                          <ActionForm action={resetPasswordAction} submitLabel="Redefinir" submitClassName={smallBtn} className="mt-2" resetOnSuccess>
                            <input type="hidden" name="id" value={u.id} />
                            <input name="password" type="password" autoComplete="new-password" placeholder="Nova senha" required className={inputClass} />
                          </ActionForm>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Novo usuário</h2>
          <ActionForm action={createUserAction} submitLabel="Criar usuário" resetOnSuccess>
            <input name="name" placeholder="Nome" required maxLength={100} className={inputClass} />
            <input name="email" type="email" placeholder="E-mail" required className={inputClass} />
            <select name="role" defaultValue="ATENDENTE" className={inputClass}>
              <option value="ATENDENTE">Atendente (lê e responde relatos)</option>
              <option value="ADMIN">Admin (também gerencia usuários, totens e configurações)</option>
            </select>
            <input name="password" type="password" autoComplete="new-password" placeholder="Senha inicial forte" required className={inputClass} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
