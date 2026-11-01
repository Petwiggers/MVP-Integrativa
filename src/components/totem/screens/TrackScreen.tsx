"use client";

import { useCallback, useState } from "react";
import { STATUS_TOTEM_LABEL, type StatusValue } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";
import { PROTOCOL_LENGTH, formatProtocol } from "@/lib/protocol-format";
import { VirtualKeyboard } from "../VirtualKeyboard";
import { BigButton, Screen } from "../ui";
import type { ScreenProps } from "./types";

type Lookup = { status: StatusValue; createdOn: string; replies: Array<{ body: string; date: string }> };

const fmt = (ymd: string) => formatDateOnly(new Date(`${ymd}T00:00:00Z`));

export function TrackScreen({ exit, config }: ScreenProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Lookup | null>(null);

  const onInput = useCallback((ch: string) => setCode((c) => (c.length < PROTOCOL_LENGTH ? c + ch : c)), []);
  const onBackspace = useCallback(() => setCode((c) => c.slice(0, -1)), []);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/totem/protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível consultar agora.");
        return;
      }
      setResult(data as Lookup);
      setCode("");
    } catch {
      setError("Sem conexão no momento. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Screen
        testId="tela-protocolo-resultado"
        title="Acompanhamento"
        subtitle={`Relato enviado em ${fmt(result.createdOn)}`}
        onExit={exit}
        actions={
          <BigButton className="sm:min-w-[260px]" onClick={exit} data-testid="btn-concluir">
            Concluir
          </BigButton>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl bg-brand-soft p-6">
            <p className="text-[1rem] font-bold text-brand">Situação</p>
            <p className="mt-1 text-[1.4rem] font-bold" data-testid="status-protocolo">
              {STATUS_TOTEM_LABEL[result.status]}
            </p>
          </div>
          {result.replies.length === 0 ? (
            <p className="text-[1.1rem] text-muted">
              Ainda não há resposta. Nosso prazo é de {config.responseDeadline}.
            </p>
          ) : (
            result.replies.map((r, i) => (
              <article key={i} className="rounded-3xl border-2 border-line bg-card p-6" data-testid="resposta-rh">
                <p className="text-[0.95rem] font-bold text-muted">Resposta da equipe · {fmt(r.date)}</p>
                <p className="mt-2 whitespace-pre-line text-[1.15rem] leading-relaxed">{r.body}</p>
              </article>
            ))
          )}
        </div>
      </Screen>
    );
  }

  const slots = Array.from({ length: PROTOCOL_LENGTH }, (_, i) => code[i] ?? "");
  return (
    <Screen
      testId="tela-protocolo"
      compact
      title="Acompanhar protocolo"
      subtitle="Digite o código de 6 letras e números que você recebeu."
      onBack={exit}
      onExit={exit}
      actions={
        <BigButton
          className="sm:min-w-[260px]"
          disabled={code.length !== PROTOCOL_LENGTH || loading}
          onClick={search}
          data-testid="btn-consultar"
        >
          {loading ? "Consultando…" : "Consultar"}
        </BigButton>
      }
    >
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-center gap-2" aria-label={`Código digitado: ${formatProtocol(code)}`} data-testid="campo-protocolo">
          {slots.map((ch, i) => (
            <span key={i} className="contents">
              {i === 3 && <span className="text-[2rem] font-bold text-muted">–</span>}
              <span
                className={`flex h-[84px] w-[64px] items-center justify-center rounded-2xl border-2 bg-card font-mono text-[2.4rem] font-bold ${
                  i === code.length ? "border-brand" : "border-line"
                }`}
              >
                {ch}
              </span>
            </span>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-alert-soft p-4 text-center text-[1.05rem] font-bold text-alert">
            {error}
          </p>
        )}
        <div className="mt-auto">
          <VirtualKeyboard mode="protocol" onInput={onInput} onBackspace={onBackspace} />
        </div>
      </div>
    </Screen>
  );
}
