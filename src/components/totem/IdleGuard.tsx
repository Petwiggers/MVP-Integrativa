"use client";

import { useEffect, useRef, useState } from "react";
import { BigButton } from "./ui";

const ACTIVITY_EVENTS = ["pointerdown", "touchstart", "keydown", "wheel"] as const;

/**
 * Inatividade: após `timeoutSeconds` sem toque, mostra um aviso por `warningSeconds`
 * e então chama `onTimeout` (que apaga todo o estado). Qualquer toque cancela o aviso.
 */
export function IdleGuard({
  enabled,
  timeoutSeconds,
  warningSeconds,
  onTimeout,
}: {
  enabled: boolean;
  timeoutSeconds: number;
  warningSeconds: number;
  onTimeout: () => void;
}) {
  const lastActivity = useRef(0);
  const onTimeoutRef = useRef(onTimeout);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;
    lastActivity.current = Date.now();
    const markActive = () => {
      lastActivity.current = Date.now();
      setRemaining(null);
    };
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, markActive, { capture: true, passive: true });

    const tick = setInterval(() => {
      const idle = (Date.now() - lastActivity.current) / 1000;
      if (idle >= timeoutSeconds + warningSeconds) {
        setRemaining(null);
        onTimeoutRef.current();
      } else if (idle >= timeoutSeconds) {
        setRemaining(Math.ceil(timeoutSeconds + warningSeconds - idle));
      } else {
        setRemaining(null);
      }
    }, 250);

    return () => {
      clearInterval(tick);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, markActive, { capture: true });
      setRemaining(null);
    };
  }, [enabled, timeoutSeconds, warningSeconds]);

  if (!enabled || remaining === null) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="idle-title"
      data-testid="aviso-inatividade"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-6"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl bg-card p-10 text-center shadow-xl">
        <h2 id="idle-title" className="text-[1.7rem] font-bold">
          Você ainda está aí?
        </h2>
        <p className="text-[1.1rem] text-muted">
          Para proteger sua privacidade, vamos apagar tudo e voltar ao início em
        </p>
        <span className="text-[3.5rem] font-bold leading-none text-brand" data-testid="contagem">
          {remaining}
        </span>
        <BigButton className="w-full" onClick={() => setRemaining(null)} data-testid="btn-continuar-aqui">
          Continuar aqui
        </BigButton>
      </div>
    </div>
  );
}
