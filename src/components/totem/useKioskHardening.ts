"use client";

import { useEffect } from "react";

/**
 * Travas do modo totem no navegador: sem menu de contexto, seleção, arrastar,
 * zoom (pinça, Ctrl+roda, Ctrl+/-), botão voltar ou navegação para fora de /totem.
 * Complementa o modo kiosk do sistema (fixação de tela / Acesso Guiado).
 */
export function useKioskHardening() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const preventMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventCtrlWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const preventShortcuts = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0", "p", "s", "o", "f", "l", "n", "t", "a"].includes(k)) {
        e.preventDefault();
      }
    };
    const blockExternalLinks = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith("/totem")) e.preventDefault();
    };
    // Botão "voltar" do Android: mantém o usuário no app.
    const stayOnPage = () => history.pushState(null, "", location.href);
    history.pushState(null, "", location.href);

    const opts = { passive: false } as const;
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("gesturestart", prevent, opts);
    document.addEventListener("touchmove", preventMultiTouch, opts);
    document.addEventListener("wheel", preventCtrlWheel, opts);
    document.addEventListener("keydown", preventShortcuts);
    document.addEventListener("click", blockExternalLinks, true);
    window.addEventListener("popstate", stayOnPage);
    window.open = () => null;

    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("touchmove", preventMultiTouch);
      document.removeEventListener("wheel", preventCtrlWheel);
      document.removeEventListener("keydown", preventShortcuts);
      document.removeEventListener("click", blockExternalLinks, true);
      window.removeEventListener("popstate", stayOnPage);
    };
  }, []);
}
