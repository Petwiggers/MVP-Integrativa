import type { ReactNode } from "react";
import { STATUS_LABEL, type StatusValue } from "@/lib/constants";

export const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-bold text-ink hover:bg-brand-soft";
export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-alert/40 bg-card px-4 py-2 text-sm font-bold text-alert hover:bg-alert-soft";

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-5 ${className}`}>{children}</div>;
}

const STATUS_STYLE: Record<StatusValue, string> = {
  NOVO: "bg-accent/15 text-accent",
  EM_ATENDIMENTO: "bg-brand-soft text-brand",
  RESPONDIDO: "bg-[#e6efe1] text-[#3c6b2f]",
  ENCERRADO: "bg-line text-muted",
};

export function StatusBadge({ status }: { status: StatusValue }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function UrgentBadge() {
  return <span className="inline-flex rounded-full bg-alert px-2.5 py-0.5 text-xs font-bold text-white">Urgente</span>;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: ReactNode }) {
  const style = {
    info: "bg-brand-soft text-brand",
    error: "bg-alert-soft text-alert",
    success: "bg-[#e6efe1] text-[#3c6b2f]",
  }[kind];
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm font-bold ${style}`}>
      {children}
    </p>
  );
}
