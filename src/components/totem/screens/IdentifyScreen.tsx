"use client";

import { useCallback, useState } from "react";
import { TextDisplay } from "../TextDisplay";
import { VirtualKeyboard } from "../VirtualKeyboard";
import { BigButton, ChoiceCard, Screen } from "../ui";
import type { Identification } from "../flow";
import type { ScreenProps } from "./types";

const ShieldIcon = (
  <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export function IdentifyScreen({ dispatch, exit }: ScreenProps) {
  const choose = (identification: Identification) => {
    dispatch({ type: "update", patch: { identification } });
    dispatch({ type: "go", step: identification === "ANONIMO" ? "mood" : "identifyDetails" });
  };

  return (
    <Screen
      testId="tela-identificacao"
      title="Como você prefere falar com a gente?"
      subtitle="Você pode ficar totalmente anônimo. Ninguém saberá quem escreveu."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
    >
      <div className="flex flex-col gap-4">
        <ChoiceCard
          highlighted
          icon={ShieldIcon}
          title="Anônimo"
          description="Recomendado. Não pedimos nome nem nada que identifique você."
          onClick={() => choose("ANONIMO")}
          testId="opcao-anonimo"
        />
        <ChoiceCard
          title="Quero me identificar"
          description="Informe seu nome e setor."
          onClick={() => choose("IDENTIFICADO")}
          testId="opcao-identificar"
        />
        <ChoiceCard
          title="Quero que alguém me procure"
          description="Informe seu nome e como prefere ser contatado."
          onClick={() => choose("CONTATO")}
          testId="opcao-contato"
        />
      </div>
    </Screen>
  );
}

type Field = "name" | "sector" | "contact";
const LIMITS: Record<Field, number> = { name: 100, sector: 100, contact: 150 };

export function IdentifyDetailsScreen({ state, dispatch, exit }: ScreenProps) {
  const { draft } = state;
  const wantsContact = draft.identification === "CONTATO";
  const fields: Field[] = wantsContact ? ["name", "contact"] : ["name", "sector"];
  const [active, setActive] = useState<Field>("name");

  const onInput = useCallback(
    (text: string) => {
      if (text === "\n") return;
      const current = state.draft[active];
      if (current.length >= LIMITS[active]) return;
      dispatch({ type: "update", patch: { [active]: current + text } });
    },
    [active, state.draft, dispatch],
  );
  const onBackspace = useCallback(
    () => dispatch({ type: "update", patch: { [active]: state.draft[active].slice(0, -1) } }),
    [active, state.draft, dispatch],
  );

  const labels: Record<Field, { label: string; placeholder: string }> = {
    name: { label: "Seu nome", placeholder: "Toque aqui para escrever" },
    sector: { label: "Seu setor", placeholder: "Ex.: Expedição, turno B" },
    contact: { label: "Como podemos falar com você?", placeholder: "Ramal, telefone, e-mail ou local" },
  };

  return (
    <Screen
      testId="tela-identificacao-dados"
      compact
      title={wantsContact ? "Como podemos te procurar?" : "Quem é você?"}
      subtitle="Preencha só o que quiser. Esses dados ficam protegidos e só o RH vê."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
      actions={
        <BigButton className="sm:min-w-[260px]" onClick={() => dispatch({ type: "go", step: "mood" })} data-testid="btn-continuar">
          Continuar
        </BigButton>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 landscape:grid-cols-2">
          {fields.map((f) => (
            <TextDisplay
              key={f}
              label={labels[f].label}
              placeholder={labels[f].placeholder}
              value={draft[f]}
              active={active === f}
              onActivate={() => setActive(f)}
              testId={`campo-${f}`}
            />
          ))}
        </div>
        <div className="mt-auto">
          <VirtualKeyboard value={draft[active]} onInput={onInput} onBackspace={onBackspace} />
        </div>
      </div>
    </Screen>
  );
}
