"use client";

import { useState } from "react";
import { BigButton, Screen } from "../ui";
import type { ScreenProps } from "./types";

export function ConsentScreen({ state, dispatch, exit, config }: ScreenProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { draft } = state;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/totem/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          identification: draft.identification,
          name: draft.identification !== "ANONIMO" ? draft.name : undefined,
          sector: draft.identification === "IDENTIFICADO" ? draft.sector : undefined,
          contact: draft.identification === "CONTATO" ? draft.contact : undefined,
          mood: draft.mood ?? 3,
          theme: draft.theme,
          story: draft.story,
          urgent: draft.urgent,
          consent: true,
          consentVersion: config.consentVersion,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { protocol?: string; error?: string };
      if (!res.ok || !data.protocol) {
        setError(data.error ?? "Não conseguimos enviar agora. Tente de novo em instantes.");
        return;
      }
      dispatch({ type: "submitted", protocol: data.protocol });
    } catch {
      setError("Sem conexão no momento. Tente de novo em instantes.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen
      testId="tela-consentimento"
      title="Antes de enviar"
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
      actions={
        <BigButton className="sm:min-w-[320px]" onClick={send} disabled={sending} data-testid="btn-enviar">
          {sending ? "Enviando…" : "Concordo e quero enviar"}
        </BigButton>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 landscape:grid-cols-2">
          <div className="rounded-3xl bg-brand-soft p-6">
            <p className="text-[1rem] font-bold text-brand">Quem lê</p>
            <p className="mt-1 text-[1.15rem]">Somente a equipe de acolhimento do RH.</p>
          </div>
          <div className="rounded-3xl bg-brand-soft p-6">
            <p className="text-[1rem] font-bold text-brand">Quando respondemos</p>
            <p className="mt-1 text-[1.15rem]">Em {config.responseDeadline}.</p>
          </div>
        </div>
        <p className="text-[1.1rem] leading-relaxed" data-testid="texto-consentimento">
          {config.consentText}
        </p>
        <p className="text-[1.05rem] font-bold text-brand">
          {draft.identification === "ANONIMO"
            ? "Você está enviando de forma anônima."
            : "Você escolheu se identificar. Seus dados ficam protegidos e só o RH vê."}
        </p>
        {error && (
          <p role="alert" className="rounded-2xl bg-alert-soft p-4 text-[1.05rem] font-bold text-alert">
            {error}
          </p>
        )}
      </div>
    </Screen>
  );
}
