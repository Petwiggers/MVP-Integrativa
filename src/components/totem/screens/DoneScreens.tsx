"use client";

import { useEffect } from "react";
import { formatProtocol } from "@/lib/protocol-format";
import { BigButton, Screen } from "../ui";
import type { ScreenProps } from "./types";

const GOODBYE_SECONDS = 8;

export function ConfirmScreen({ state, dispatch, exit, config }: ScreenProps) {
  const protocol = state.protocol ? formatProtocol(state.protocol) : "";
  return (
    <Screen
      testId="tela-confirmacao"
      title="Recebemos seu relato"
      subtitle={`Anote este código para acompanhar a resposta, que vem em ${config.responseDeadline}.`}
      onExit={exit}
      actions={
        <BigButton className="sm:min-w-[260px]" onClick={() => dispatch({ type: "go", step: "goodbye" })} data-testid="btn-concluir">
          Já anotei
        </BigButton>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <span className="text-[1rem] font-bold uppercase tracking-widest text-muted">Seu protocolo</span>
        <span
          data-testid="protocolo"
          aria-label={`Protocolo ${protocol.split("").join(" ")}`}
          className="rounded-3xl border-4 border-dashed border-brand bg-card px-10 py-6 font-mono text-[3.6rem] font-bold tracking-[0.25em] text-brand"
        >
          {protocol}
        </span>
        <p className="max-w-lg text-[1.05rem] text-muted">
          Use “Acompanhar protocolo” na tela inicial. Não é preciso se identificar. Por segurança, este código não
          aparece de novo.
        </p>
      </div>
    </Screen>
  );
}

export function GoodbyeScreen({ exit }: ScreenProps) {
  useEffect(() => {
    const t = setTimeout(exit, GOODBYE_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [exit]);

  return (
    <section data-testid="tela-encerramento" className="totem-screen flex h-full flex-col items-center justify-center gap-8 px-8 text-center">
      <svg width="110" height="110" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 84 C 20 64, 10 46, 22 32 C 32 20, 46 26, 50 36 C 54 26, 68 20, 78 32 C 90 46, 80 64, 50 84 Z" fill="#e8b48a" />
      </svg>
      <h1 className="text-[2.3rem] font-bold">Obrigado por confiar na gente.</h1>
      <p className="max-w-xl text-[1.3rem] text-muted">
        Falar sobre o que sentimos é um passo importante. Cuide-se — estamos aqui sempre que precisar.
      </p>
      <BigButton variant="secondary" onClick={exit} data-testid="btn-inicio">
        Voltar ao início
      </BigButton>
    </section>
  );
}
