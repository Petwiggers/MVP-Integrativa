import Link from "next/link";
import { HorizontalBars, MoodLegend, MoodStackedBar, weekLabel } from "@/components/admin/charts";
import { Card, PageHeader } from "@/components/admin/ui";
import { MIN_AGGREGATE, MOOD_LABEL } from "@/lib/constants";
import { requireUser } from "@/server/auth/session";
import { reportsByTheme, weeklyMood } from "@/server/dashboard";

type Search = Promise<Record<string, string | string[] | undefined>>;
const PERIODS = [30, 90, 365] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  await requireUser();
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.periodo) ?? 90;
  const [weeks, themes] = await Promise.all([weeklyMood(8), reportsByTheme(days)]);
  const fmt = (n: number | null) => (n === null ? "menos de 5" : String(n));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Somente dados agregados. Qualquer grupo com menos de ${MIN_AGGREGATE} relatos é ocultado para que ninguém possa ser identificado.`}
      >
        <div className="flex gap-1 rounded-lg border border-line bg-card p-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/dashboard?periodo=${p}`}
              className={`rounded-md px-3 py-1.5 font-bold ${p === days ? "bg-brand text-white" : "text-muted hover:bg-brand-soft"}`}
            >
              {p === 365 ? "12 meses" : `${p} dias`}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-bold uppercase text-muted">Relatos no período</p>
          <p className="mt-1 text-3xl font-bold" data-testid="total-periodo">{fmt(themes.total)}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase text-muted">Urgentes no período</p>
          <p className="mt-1 text-3xl font-bold">{fmt(themes.urgent)}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Check-in emocional por semana</h2>
          <p className="mb-4 text-xs text-muted">Últimas 8 semanas · média de 1 (muito mal) a 5 (muito bem)</p>
          <MoodLegend />
          <ul className="mt-4 flex flex-col gap-3" data-testid="grafico-humor">
            {weeks.map((w) => (
              <li key={w.weekStart.toISOString()} className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-sm">
                <span className="text-muted">{weekLabel(w.weekStart)}</span>
                {w.total === null ? (
                  <span className="text-xs text-muted">Menos de {MIN_AGGREGATE} relatos — oculto</span>
                ) : (
                  <MoodStackedBar cells={w.cells} total={w.total} />
                )}
                <span className="text-right text-xs font-bold">{w.average === null ? "—" : w.average.toFixed(1)}</span>
              </li>
            ))}
          </ul>

          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-bold text-brand">Ver como tabela</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 pr-2">Semana</th>
                    {[1, 2, 3, 4, 5].map((m) => (
                      <th key={m} className="py-1 pr-2">{MOOD_LABEL[m]}</th>
                    ))}
                    <th className="py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.weekStart.toISOString()} className="border-t border-line">
                      <td className="py-1 pr-2">{weekLabel(w.weekStart)}</td>
                      {w.cells.map((c) => (
                        <td key={c.key} className="py-1 pr-2">{c.suppressed ? "<5" : c.count}</td>
                      ))}
                      <td className="py-1">{w.total ?? "<5"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>

        <Card>
          <h2 className="font-bold">Relatos por tema</h2>
          <p className="mb-4 text-xs text-muted">{days === 365 ? "Últimos 12 meses" : `Últimos ${days} dias`}</p>
          <HorizontalBars rows={themes.rows} />
        </Card>
      </div>
    </>
  );
}
