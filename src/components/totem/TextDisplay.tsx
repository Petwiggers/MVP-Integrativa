"use client";

import { useEffect, useRef } from "react";

/**
 * Campo de texto "falso": não é um <input>, então o teclado do sistema nunca abre
 * e o navegador não oferece autocompletar/sugestões com dados de outros usuários.
 */
export function TextDisplay({
  label,
  value,
  placeholder,
  active,
  onActivate,
  multiline,
  testId,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder?: string;
  active: boolean;
  onActivate?: () => void;
  multiline?: boolean;
  testId?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [value]);

  return (
    <div className={`relative flex flex-col gap-2 ${multiline ? "min-h-[110px] flex-1" : ""}`}>
      <span className={`text-[1rem] font-bold text-muted ${multiline ? "landscape:sr-only" : ""}`}>{label}</span>
      <div
        ref={ref}
        role="textbox"
        aria-label={label}
        aria-multiline={multiline || undefined}
        aria-readonly
        tabIndex={-1}
        data-testid={testId}
        onClick={onActivate}
        className={`overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border-2 bg-card px-5 py-4 text-[1.15rem] leading-snug ${
          active ? "border-brand ring-4 ring-brand/15" : "border-line"
        } ${multiline ? "min-h-0 flex-1 pb-7" : "min-h-[72px]"}`}
      >
        {value ? <span>{value}</span> : <span className="text-muted/70">{placeholder}</span>}
        {active && <span className="ml-0.5 inline-block h-[1.2em] w-[3px] translate-y-[3px] animate-pulse bg-brand" />}
      </div>
      {maxLength && multiline && (
        <span className="pointer-events-none absolute bottom-2 right-4 text-[0.8rem] text-muted">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
