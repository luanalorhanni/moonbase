import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { YearBarChart } from "@/components/charts/year-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMonthShort } from "@/lib/finance/month";
import { loadYear } from "@/lib/queries/year";
import { cn, formatBRL } from "@/lib/utils";

type Params = { year: string };

export default async function YearPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const parsed = Number(year);
  if (!/^\d{4}$/.test(year) || Number.isNaN(parsed)) {
    redirect(`/year/${new Date().getFullYear()}`);
  }

  const summary = await loadYear(parsed);
  const chartData = summary.months.map((m) => ({
    label: formatMonthShort(m.reference).split("/")[0],
    incomes: Number(m.totalIncomes),
    expenses: Number(m.totalExpenses),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs tracking-wide uppercase">Visão anual</span>
          <h1 className="text-3xl font-semibold tracking-tight">{summary.year}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/year/${summary.year - 1}`}
            aria-label={`Ano anterior (${summary.year - 1})`}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Link>
          <Link
            href={`/year/${summary.year + 1}`}
            aria-label={`Próximo ano (${summary.year + 1})`}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <Separator className="my-6" />

      <section className="grid grid-cols-3 gap-3">
        <TotalCard label="Receitas" value={summary.totalIncomes} />
        <TotalCard label="Despesas" value={summary.totalExpenses} muted />
        <TotalCard
          label="Balanço"
          value={summary.balance}
          tone={Number(summary.balance) < 0 ? "destructive" : "default"}
        />
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas e despesas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YearBarChart data={chartData} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento mensal</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-border divide-y">
              {summary.months.map((m) => {
                const balanceNum = Number(m.balance);
                const isEmpty = Number(m.totalIncomes) === 0 && Number(m.totalExpenses) === 0;
                return (
                  <li key={m.reference}>
                    <Link
                      href={`/month/${m.reference}`}
                      className="hover:bg-muted/40 flex items-center gap-4 px-6 py-3 transition-colors"
                    >
                      <span
                        className={cn(
                          "w-12 text-sm capitalize tabular-nums",
                          isEmpty ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {formatMonthShort(m.reference).split("/")[0]}
                      </span>
                      <div className="flex flex-1 items-baseline gap-6 text-sm">
                        <Stat
                          label="receitas"
                          value={m.totalIncomes}
                          dim={Number(m.totalIncomes) === 0}
                        />
                        <Stat
                          label="despesas"
                          value={m.totalExpenses}
                          dim={Number(m.totalExpenses) === 0}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          balanceNum < 0 && "text-destructive",
                          isEmpty && "text-muted-foreground",
                        )}
                      >
                        {formatBRL(m.balance)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function TotalCard({
  label,
  value,
  muted,
  tone = "default",
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-lg border px-4 py-3.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold tracking-tight tabular-nums",
          muted && "text-muted-foreground",
          tone === "destructive" && "text-destructive",
        )}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}

function Stat({ label, value, dim }: { label: string; value: string; dim: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <span className={cn("tabular-nums", dim ? "text-muted-foreground" : "text-foreground")}>
        {formatBRL(value)}
      </span>
    </span>
  );
}
