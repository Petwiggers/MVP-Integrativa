"use client";

import { useCallback } from "react";
import { MAX_STORY_LENGTH } from "@/lib/constants";
import { TextDisplay } from "../TextDisplay";
import { VirtualKeyboard } from "../VirtualKeyboard";
import { BigButton, Screen } from "../ui";
import type { ScreenProps } from "./types";

export function StoryScreen({ state, dispatch, exit }: ScreenProps) {
  const story = state.draft.story;
  const onInput = useCallback(
    (text: string) => {
      if (story.length + text.length > MAX_STORY_LENGTH) return;
      dispatch({ type: "update", patch: { story: story + text } });
    },
    [story, dispatch],
  );
  const onBackspace = useCallback(
    () => dispatch({ type: "update", patch: { story: story.slice(0, -1) } }),
    [story, dispatch],
  );

  return (
    <Screen
      testId="tela-relato"
      compact
      title="Conte o que está acontecendo"
      subtitle="Escreva do seu jeito, no seu tempo. Se não quiser escrever, tudo bem: toque em Continuar."
      onBack={() => dispatch({ type: "back" })}
      onExit={exit}
      actions={
        <BigButton className="sm:min-w-[260px]" onClick={() => dispatch({ type: "go", step: "urgency" })} data-testid="btn-continuar">
          Continuar
        </BigButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <TextDisplay
          label="Seu relato"
          placeholder="Comece a digitar no teclado abaixo…"
          value={story}
          active
          multiline
          maxLength={MAX_STORY_LENGTH}
          testId="campo-relato"
        />
        <VirtualKeyboard value={story} onInput={onInput} onBackspace={onBackspace} />
      </div>
    </Screen>
  );
}
