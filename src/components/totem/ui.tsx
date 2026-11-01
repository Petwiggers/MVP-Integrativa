"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "alert";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white active:bg-brand-dark shadow-sm",
  secondary: "bg-card text-ink border-2 border-line active:bg-brand-soft",
  ghost: "bg-transparent text-brand underline-offset-4 active:bg-brand-soft",
  alert: "bg-alert text-white active:brightness-90 shadow-sm",
};

export function BigButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`flex min-h-[72px] items-center justify-center gap-3 rounded-2xl px-8 text-[1.1rem] font-bold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Estrutura de cada tela: barra superior (Voltar / Sair), conteúdo e ações. */
export function Screen({
  title,
  subtitle,
  onBack,
  onExit,
  children,
  actions,
  testId,
  compact,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Telas com teclado: em paisagem esconde o subtítulo para sobrar espaço ao texto. */
  compact?: boolean;
  onBack?: () => void;
  onExit?: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className="totem-screen flex h-full flex-col">
      <header
        className={`flex min-h-[88px] items-center justify-between gap-4 px-6 pt-4 ${compact ? "landscape:min-h-[76px] landscape:pt-2" : ""}`}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            data-testid="btn-voltar"
            className="flex min-h-[64px] items-center gap-2 rounded-2xl px-5 text-[1rem] font-bold text-brand active:bg-brand-soft"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar
          </button>
        ) : (
          <span />
        )}
        {onExit && <ExitButton onExit={onExit} />}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 sm:px-10">
        {title && (
          <h1 className={`mt-2 text-[1.9rem] font-bold leading-tight text-ink ${compact ? "landscape:mt-0 landscape:text-[1.6rem]" : ""}`}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p className={`mt-3 text-[1.1rem] leading-snug text-muted ${compact ? "landscape:hidden" : ""}`}>{subtitle}</p>
        )}
        <div className={`flex min-h-0 flex-1 flex-col ${compact ? "mt-6 landscape:mt-3" : "mt-6"}`}>{children}</div>
      </div>

      {actions && (
        <footer
          className={`flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-end sm:px-10 ${compact ? "landscape:pb-3" : ""}`}
        >
          {actions}
        </footer>
      )}
    </section>
  );
}

export function ExitButton({ onExit }: { onExit: () => void }) {
  return (
    <button
      type="button"
      onClick={onExit}
      data-testid="btn-sair"
      aria-label="Sair e apagar tudo"
      className="flex min-h-[64px] items-center gap-2 rounded-2xl border-2 border-alert/40 bg-card px-6 text-[1rem] font-bold text-alert active:bg-alert-soft"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      Sair
    </button>
  );
}

/** Cartão grande de escolha (uma decisão por tela). */
export function ChoiceCard({
  title,
  description,
  highlighted,
  onClick,
  testId,
  icon,
}: {
  title: string;
  description?: string;
  highlighted?: boolean;
  onClick: () => void;
  testId?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex min-h-[96px] w-full items-center gap-5 rounded-3xl border-2 px-7 py-5 text-left transition-colors ${
        highlighted
          ? "border-brand bg-brand text-white active:bg-brand-dark"
          : "border-line bg-card text-ink active:bg-brand-soft"
      }`}
    >
      {icon}
      <span className="flex flex-col">
        <span className="text-[1.25rem] font-bold">{title}</span>
        {description && (
          <span className={`mt-1 text-[0.95rem] ${highlighted ? "text-white/85" : "text-muted"}`}>{description}</span>
        )}
      </span>
    </button>
  );
}
