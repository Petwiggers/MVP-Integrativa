"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
      <label className="flex flex-col gap-1 text-sm font-bold">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="rounded-lg border border-line bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Senha
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-line bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-alert-soft px-3 py-2 text-sm font-bold text-alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
