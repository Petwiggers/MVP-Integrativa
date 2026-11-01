"use client";

import { THEMES, type ThemeValue } from "@/lib/constants";
import { BigButton, Screen } from "../ui";
import type { ScreenProps } from "./types";

export function ThemeScreen({ state, dispatch, exit }: ScreenProps) {
  const choose = (theme: ThemeValue | null) => {
    dispatch({ type: "update", patch: { theme } });
    dispatch({ type: "go", step: "story" });
  };

  return (
    <Screen
      testId="tela-tema"
      title="Sobre o que você quer falar?"
      subtitle="Se preferir, pode pular."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
      actions={
        <BigButton variant="secondary" className="sm:min-w-[220px]" onClick={() => choose(null)} data-testid="btn-pular">
          Pular
        </BigButton>
      }
    >
      <div className="grid content-start gap-4 portrait:grid-cols-2 landscape:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => choose(t.value)}
            data-testid={`tema-${t.value}`}
            aria-pressed={state.draft.theme === t.value}
            className={`min-h-[96px] rounded-3xl border-2 bg-card px-6 text-[1.2rem] font-bold active:bg-brand-soft ${
              state.draft.theme === t.value ? "border-brand" : "border-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </Screen>
  );
}
