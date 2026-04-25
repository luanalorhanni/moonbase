import { ArrowRight, Banknote, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";

import { YearBarChart } from "@/components/charts/year-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateMonth } from "@/lib/finance/aggregate";
import {
  currentMonthRef,
  formatMonthLong,
  formatMonthShort,
  shiftMonth,
} from "@/lib/finance/month";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { cn, formatBRL } from "@/lib/utils";

export default async function HomePage() {
  const dataset = await loadFullDataset();
  const inputs = toAggregateInputs(dataset);

  const current = currentMonthRef();
  const currentSummary = aggregateMonth(inputs, current);
  const year = Number(current.slice(0, 4));

  const trailing: string[] = Array.from({ length: 6 }, (_, i) => shiftMonth(current, -5 + i));
  const trend = trailing.map((m) => aggregateMonth(inputs, m));
  const chartData = trend.map((m) => ({
    label: formatMonthShort(m.reference).split("/")[0],
    receitas: Number(m.totalIncomes),
    despesas: Number(m.totalExpenses),
  }));

  type ActivityItem = {
    id: string;
    icon: "income" | "cash" | "credit";
    primary: string;
    secondary: string;
    amount: string;
    date: string;
    sign: 1 | -1;
  };

  const recent: ActivityItem[] = [
    ...dataset.incomes.slice(0, 10).map((i) => ({
      id: `inc-${i.id}`,
      icon: "income" as const,
      primary: i.description,
      secondary: "Receita",
      amount: i.amount,
      date: i.date,
      sign: 1 as const,
    })),
    ...dataset.cashExpenses.slice(0, 10).map((e) => ({
      id: `cash-${e.id}`,
      icon: "cash" as const,
      primary: e.description,
      secondary: `${e.cardName} · ${e.subcategoryName}`,
      amount: e.amount,
      date: e.date,
      sign: -1 as const,
    })),
    ...dataset.creditExpenses.slice(0, 10).map((e) => ({
      id: `cred-${e.id}`,
      icon: "credit" as const,
      primary: e.description,
      secondary: `${e.cardName} · ${e.subcategoryName}`,
      amount: e.parcelValue,
      date: e.purchaseDate,
      sign: -1 as const,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const balanceNum = Number(currentSummary.balance);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs tracking-wide uppercase">moonbase</span>
        <h1 className="text-3xl font-semibold tracking-tight capitalize">
          {formatMonthLong(current)}
        </h1>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryTile label="Receitas" value={currentSummary.totalIncomes} tone="default" />
        <SummaryTile label="Despesas" value={currentSummary.totalExpenses} tone="muted" />
        <SummaryTile
          label="Balanço"
          value={currentSummary.balance}
          tone={balanceNum < 0 ? "destructive" : "default"}
          highlight
        />
      </section>

      <section className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/month/${current}`}
          className="border-border bg-card hover:bg-muted/60 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          Ver detalhes do mês
          <ArrowRight className="size-3.5" strokeWidth={1.5} />
        </Link>
        <Link
          href={`/year/${year}`}
          className="border-border bg-card hover:bg-muted/60 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          Ver ano de {year}
          <ArrowRight className="size-3.5" strokeWidth={1.5} />
        </Link>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <YearBarChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {recent.length === 0 ? (
              <p className="text-muted-foreground px-6 py-2 text-sm">Sem registros ainda.</p>
            ) : (
              <ul className="divide-border divide-y">
                {recent.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone: "default" | "muted" | "destructive";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-1.5 rounded-lg border px-5 py-4",
        highlight ? "bg-muted/40" : "bg-card",
      )}
    >
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums",
          tone === "muted" && "text-muted-foreground",
          tone === "destructive" && "text-destructive",
        )}
      >
        {formatBRL(value)}
      </span>
    </div>
  );
}

function ActivityRow({
  item,
}: {
  item: {
    icon: "income" | "cash" | "credit";
    primary: string;
    secondary: string;
    amount: string;
    date: string;
    sign: 1 | -1;
  };
}) {
  const Icon = item.icon === "income" ? TrendingUp : item.icon === "cash" ? Banknote : ReceiptText;
  const [y, m, d] = item.date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(y, m - 1, d),
  );
  return (
    <li className="flex items-center gap-3 px-6 py-3">
      <span className="text-muted-foreground bg-muted flex size-8 items-center justify-center rounded-md">
        <Icon className="size-4" strokeWidth={1.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground truncate text-sm">{item.primary}</span>
        <span className="text-muted-foreground truncate text-xs">{item.secondary}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={cn(
            "text-sm tabular-nums",
            item.sign === 1 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {item.sign === 1 ? "+" : "−"} {formatBRL(item.amount)}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">{dateLabel}</span>
      </div>
    </li>
  );
}
