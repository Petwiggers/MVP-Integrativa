"use client";

import { BigButton, ChoiceCard, Screen } from "../ui";
import type { ScreenProps } from "./types";

export function UrgencyScreen({ dispatch, exit }: ScreenProps) {
  return (
    <Screen
      testId="tela-urgencia"
      title="Você precisa de ajuda agora?"
      subtitle="Se sim, vamos mostrar na hora quem pode te ajudar."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
    >
      <div className="flex flex-col gap-4">
        <ChoiceCard
          title="Sim, preciso de ajuda agora"
          description="Mostramos os contatos de apoio imediatamente."
          onClick={() => {
            dispatch({ type: "update", patch: { urgent: true } });
            dispatch({ type: "go", step: "support" });
          }}
          testId="urgencia-sim"
        />
        <ChoiceCard
          title="Não, pode seguir"
          onClick={() => {
            dispatch({ type: "update", patch: { urgent: false } });
            dispatch({ type: "go", step: "consent" });
          }}
          testId="urgencia-nao"
        />
      </div>
    </Screen>
  );
}

/** Tela de apoio imediato (exibida quando a pessoa precisa de ajuda agora). */
export function SupportScreen({ dispatch, exit, config }: ScreenProps) {
  return (
    <Screen
      testId="tela-apoio"
      title="Você não está sozinho(a)"
      subtitle="Procure agora uma destas pessoas. Seu relato também será marcado como urgente."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
      actions={
        <BigButton className="sm:min-w-[320px]" onClick={() => dispatch({ type: "go", step: "consent" })} data-testid="btn-continuar">
          Continuar e enviar meu relato
        </BigButton>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border-2 border-alert/30 bg-alert-soft p-6">
          <p className="text-[1rem] font-bold uppercase tracking-wide text-alert">CVV — Centro de Valorização da Vida</p>
          <p className="mt-2 text-[2.6rem] font-bold leading-none text-ink">Ligue 188</p>
          <p className="mt-2 text-[1.1rem] text-ink">24 horas, todos os dias, ligação gratuita.</p>
        </div>
        <div className="grid gap-4 landscape:grid-cols-2">
          <div className="rounded-3xl border-2 border-line bg-card p-6">
            <p className="text-[1rem] font-bold uppercase tracking-wide text-brand">RH</p>
            <p className="mt-2 whitespace-pre-line text-[1.15rem]">{config.hrContact}</p>
          </div>
          <div className="rounded-3xl border-2 border-line bg-card p-6">
            <p className="text-[1rem] font-bold uppercase tracking-wide text-brand">Psicologia</p>
            <p className="mt-2 whitespace-pre-line text-[1.15rem]">{config.psychologistContact}</p>
          </div>
        </div>
        <p className="text-[1rem] text-muted">Em caso de risco imediato à vida, ligue 192 (SAMU).</p>
      </div>
    </Screen>
  );
}
