"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { TotemConfig } from "@/lib/settings-schema";
import { flowReducer, initialFlow, type Step } from "./flow";
import { IdleGuard } from "./IdleGuard";
import { ConsentScreen } from "./screens/ConsentScreen";
import { ConfirmScreen, GoodbyeScreen } from "./screens/DoneScreens";
import { IdentifyDetailsScreen, IdentifyScreen } from "./screens/IdentifyScreen";
import { MoodScreen } from "./screens/MoodScreen";
import { RestScreen } from "./screens/RestScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { ThemeScreen } from "./screens/ThemeScreen";
import { TrackScreen } from "./screens/TrackScreen";
import type { ScreenProps } from "./screens/types";
import { SupportScreen, UrgencyScreen } from "./screens/UrgencyScreen";
import { useKioskHardening } from "./useKioskHardening";

const SCREENS: Record<Step, (p: ScreenProps) => React.ReactNode> = {
  rest: RestScreen,
  identify: IdentifyScreen,
  identifyDetails: IdentifyDetailsScreen,
  mood: MoodScreen,
  theme: ThemeScreen,
  story: StoryScreen,
  urgency: UrgencyScreen,
  support: SupportScreen,
  consent: ConsentScreen,
  confirm: ConfirmScreen,
  goodbye: GoodbyeScreen,
  track: TrackScreen,
};

/**
 * Raiz do totem. "Sair", timeout e encerramento trocam a `key` da sessão, o que
 * desmonta toda a árvore: nenhum resto de estado (texto, protocolo, teclado) sobrevive.
 */
export function TotemApp({ initialConfig }: { initialConfig: TotemConfig }) {
  const [sessionKey, setSessionKey] = useState(0);
  const [config, setConfig] = useState(initialConfig);
  useKioskHardening();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/totem/sw.js", { scope: "/totem" }).catch(() => {});
    }
  }, []);

  const reset = useCallback(() => {
    setSessionKey((k) => k + 1);
    // Atualiza textos/prazos/timeout configurados no painel a cada nova sessão.
    fetch("/api/totem/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: TotemConfig | null) => c && setConfig(c))
      .catch(() => {});
  }, []);

  return (
    <main className="totem-root fixed inset-0 overflow-hidden bg-paper">
      <TotemSession key={sessionKey} config={config} onExit={reset} />
    </main>
  );
}

function TotemSession({ config, onExit }: { config: TotemConfig; onExit: () => void }) {
  const [state, dispatch] = useReducer(flowReducer, undefined, initialFlow);
  const Current = SCREENS[state.step];

  return (
    <>
      <div className="mx-auto h-full w-full max-w-[1280px]">
        <Current state={state} dispatch={dispatch} exit={onExit} config={config} />
      </div>
      <IdleGuard
        enabled={state.step !== "rest"}
        timeoutSeconds={config.idleTimeoutSeconds}
        warningSeconds={config.idleWarningSeconds}
        onTimeout={onExit}
      />
    </>
  );
}
