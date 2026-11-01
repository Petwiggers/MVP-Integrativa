"use client";

import { BigButton } from "../ui";
import type { ScreenProps } from "./types";

// Tela de descanso: neutra. Nada aqui revela o assunto de quem está usando o totem.
export function RestScreen({ dispatch, config }: ScreenProps) {
  return (
    <section data-testid="tela-descanso" className="totem-screen flex h-full flex-col items-center justify-center gap-10 px-8 text-center">
      <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="38" r="14" fill="#e8b48a" />
        <path d="M12 52 C 12 76, 34 88, 50 88 C 66 88, 88 76, 88 52" stroke="#24575a" strokeWidth="9" strokeLinecap="round" fill="none" />
      </svg>
      <div className="flex flex-col gap-4">
        <h1 className="text-[2.6rem] font-bold leading-tight text-ink">Precisa conversar?</h1>
        <p className="text-[1.6rem] text-brand">Estamos aqui.</p>
      </div>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <BigButton className="min-h-[96px] text-[1.35rem]" onClick={() => dispatch({ type: "go", step: "identify" })} data-testid="btn-comecar">
          Toque para começar
        </BigButton>
        <BigButton variant="secondary" onClick={() => dispatch({ type: "go", step: "track" })} data-testid="btn-acompanhar">
          Acompanhar protocolo
        </BigButton>
      </div>
      <p className="max-w-md text-[0.95rem] text-muted">{config.companyName} · Espaço de escuta e bem-estar</p>
    </section>
  );
}
