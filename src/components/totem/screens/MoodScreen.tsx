"use client";

import { MOODS } from "@/lib/constants";
import { MoodIcon } from "../MoodIcon";
import { Screen } from "../ui";
import type { ScreenProps } from "./types";

export function MoodScreen({ state, dispatch, exit }: ScreenProps) {
  const choose = (mood: number) => {
    dispatch({ type: "update", patch: { mood } });
    dispatch({ type: "go", step: "theme" });
  };

  return (
    <Screen
      testId="tela-humor"
      title="Como você está hoje?"
      subtitle="Não existe resposta certa. Escolha a que mais se parece com você agora."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
    >
      <div className="grid flex-1 content-center gap-4 portrait:grid-cols-1 landscape:grid-cols-5">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => choose(m.value)}
            data-testid={`humor-${m.value}`}
            aria-pressed={state.draft.mood === m.value}
            className={`flex min-h-[88px] items-center gap-5 rounded-3xl border-2 bg-card px-6 py-3 active:bg-brand-soft landscape:flex-col landscape:justify-center landscape:gap-3 landscape:py-6 ${
              state.draft.mood === m.value ? "border-brand" : "border-line"
            }`}
          >
            <span className="portrait:hidden">
              <MoodIcon mood={m.value} color={m.color} size={104} />
            </span>
            <span className="landscape:hidden">
              <MoodIcon mood={m.value} color={m.color} size={64} />
            </span>
            <span className="text-[1.2rem] font-bold">{m.label}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
