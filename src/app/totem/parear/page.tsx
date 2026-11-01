"use client";

import { useState } from "react";

// Pareamento feito uma única vez pela equipe de RH/TI ao instalar o tablet.
export default function PairPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/totem/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível parear.");
        return;
      }
      window.location.replace("/totem");
    } catch {
      setError("Sem conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-[20px]">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Configurar este totem</h1>
        <p className="text-muted">
          No painel do RH, abra <strong>Totens</strong>, gere um código de pareamento e digite-o abaixo. O código vale por
          10 minutos e só pode ser usado uma vez.
        </p>
        <label className="flex flex-col gap-2 font-bold">
          Código de pareamento
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            data-testid="campo-pareamento"
            className="min-h-[64px] rounded-2xl border-2 border-line px-4 font-mono text-2xl tracking-widest"
          />
        </label>
        {error && <p role="alert" className="font-bold text-alert">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 4}
          className="min-h-[64px] rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-50"
        >
          {loading ? "Pareando…" : "Parear totem"}
        </button>
      </form>
    </main>
  );
}
