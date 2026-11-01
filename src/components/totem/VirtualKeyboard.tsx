"use client";

import { useEffect, useState } from "react";
import { PROTOCOL_ALPHABET } from "@/lib/protocol-format";

/**
 * Teclado virtual próprio, em português. Existe por privacidade: o teclado do sistema
 * (Android/iPad) aprende e sugere palavras digitadas — o próximo usuário veria sugestões
 * vindas do relato anterior. Aqui nada é memorizado.
 */

type Mode = "text" | "protocol";
type Layer = "letters" | "symbols";

const ACCENTS = ["á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "ü"];
const LETTERS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ç"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
const SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "R$", "@", '"', "'"],
  ["?", "!", "%", "+", "=", "#", "*"],
];

type Props = {
  mode?: Mode;
  onInput: (text: string) => void;
  onBackspace: () => void;
  /** Para auto-maiúscula no início do texto/frase. */
  value?: string;
};

const keyBase =
  "flex min-h-[64px] min-w-0 flex-1 items-center justify-center rounded-xl bg-card text-[1.15rem] font-bold text-ink shadow-[0_2px_0_#d6cec2] active:translate-y-[2px] active:bg-brand-soft active:shadow-none";

export function VirtualKeyboard({ mode = "text", onInput, onBackspace, value = "" }: Props) {
  const [layer, setLayer] = useState<Layer>("letters");
  const [shift, setShift] = useState(false);
  const autoCap = mode === "text" && (value.length === 0 || /[.!?]\s$/.test(value));
  const upper = shift || autoCap;

  // Teclado físico (ex.: teclado Bluetooth de manutenção) também funciona, sem campos nativos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
      } else if (e.key === "Enter" && mode === "text") {
        e.preventDefault();
        onInput("\n");
      } else if (e.key.length === 1) {
        const ch = mode === "protocol" ? e.key.toUpperCase() : e.key;
        if (mode === "protocol" && !PROTOCOL_ALPHABET.includes(ch)) return;
        e.preventDefault();
        onInput(ch);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onInput, onBackspace]);

  const press = (k: string) => {
    onInput(upper ? k.toUpperCase() : k);
    if (shift) setShift(false);
  };

  const Backspace = (
    <button type="button" aria-label="Apagar" data-testid="kb-apagar" className={`${keyBase} flex-[1.5]`} onClick={onBackspace}>
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5h11v14H9l-6-7 6-7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (mode === "protocol") {
    const chars = PROTOCOL_ALPHABET.split("");
    const rows = [chars.slice(0, 8), chars.slice(8, 16), chars.slice(16, 23), chars.slice(23)];
    return (
      <div className="flex flex-col gap-2 rounded-3xl bg-line/60 p-3" data-testid="teclado">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.map((k) => (
              <button key={k} type="button" className={keyBase} data-testid={`kb-${k}`} onClick={() => onInput(k)}>
                {k}
              </button>
            ))}
            {i === rows.length - 1 && Backspace}
          </div>
        ))}
      </div>
    );
  }

  const rows = layer === "letters" ? LETTERS : SYMBOLS;
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-line/60 p-3" data-testid="teclado">
      {layer === "letters" && (
        <div className="flex gap-1.5">
          {ACCENTS.map((k) => (
            <button key={k} type="button" className={`${keyBase} min-h-[56px] text-[1.05rem]`} onClick={() => press(k)}>
              {upper ? k.toUpperCase() : k}
            </button>
          ))}
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          {i === 2 && layer === "letters" && (
            <button
              type="button"
              aria-label="Maiúscula"
              aria-pressed={shift}
              className={`${keyBase} flex-[1.5] ${shift ? "bg-brand text-white" : ""}`}
              onClick={() => setShift((s) => !s)}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4l8 9h-5v7H9v-7H4l8-9z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {row.map((k) => (
            <button key={k} type="button" className={keyBase} onClick={() => (layer === "letters" ? press(k) : onInput(k))}>
              {layer === "letters" && upper ? k.toUpperCase() : k}
            </button>
          ))}
          {i === 2 && Backspace}
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className={`${keyBase} flex-[1.5] text-[1rem]`} onClick={() => setLayer((l) => (l === "letters" ? "symbols" : "letters"))}>
          {layer === "letters" ? "123" : "abc"}
        </button>
        <button type="button" className={keyBase} onClick={() => onInput(",")}>
          ,
        </button>
        <button type="button" aria-label="Espaço" data-testid="kb-espaco" className={`${keyBase} flex-[5]`} onClick={() => onInput(" ")}>
          espaço
        </button>
        <button type="button" className={keyBase} onClick={() => onInput(".")}>
          .
        </button>
        <button type="button" aria-label="Nova linha" className={`${keyBase} flex-[1.5]`} onClick={() => onInput("\n")}>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 5v7H6m0 0l4-4m-4 4l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
