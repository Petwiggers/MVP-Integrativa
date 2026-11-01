"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/admin/(painel)/gestao-actions";
import { formatProtocol } from "@/lib/protocol-format";
import { Notice, buttonClass } from "./ui";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Formulário com retorno de erro/sucesso. Exibe código de pareamento uma única vez. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  submitClassName = buttonClass,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form
      action={formAction}
      className={`flex flex-col gap-3 ${className}`}
      key={resetOnSuccess && state.success ? state.success : undefined}
    >
      {children}
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.success && <Notice kind="success">{state.success}</Notice>}
      {state.code && (
        <div className="rounded-xl border-2 border-dashed border-brand bg-brand-soft p-4" data-testid="codigo-pareamento">
          <p className="text-sm font-bold text-brand">Código de pareamento para “{state.deviceName}”</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{formatProtocol(state.code)}</p>
          <p className="mt-1 text-xs text-muted">
            Abra /totem/parear no tablet e digite o código. Válido por 10 minutos, uso único. Ele não será exibido de novo.
          </p>
        </div>
      )}
      <div>
        <button type="submit" disabled={pending} className={submitClassName}>
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
