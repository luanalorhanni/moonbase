import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMonthLong, formatMonthShort, shiftMonth } from "@/lib/finance/month";
import { type MonthSummary } from "@/lib/queries/month";
import { cn, formatBRL } from "@/lib/utils";

const PT_INCOME_TYPES: Record<string, string> = {
  salary: "Salário",
  research_grant: "Bolsa",
  refund: "Reembolso",
  fee: "Honorário",
  sale: "Venda",
  other: "Outro",
};

const PT_CASH_METHOD: Record<string, string> = {
  pix: "Pix",
  debit: "Débito",
  cash: "Dinheiro",
};

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShortDate(yyyyMmDd: string): string {
  const date = parseLocalDate(yyyyMmDd);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function MonthView({ summary }: { summary: MonthSummary }) {
  const { reference, data } = summary;
  const prev = shiftMonth(reference, -1);
  const next = shiftMonth(reference, 1);
  const year = reference.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href={`/year/${year}`}
            className="text-muted-foreground hover:text-foreground text-xs tracking-wide uppercase transition-colors"
          >
            Ano de {year}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight capitalize">
            {formatMonthLong(reference)}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/month/${prev}`}
            aria-label={`Mês anterior (${formatMonthShort(prev)})`}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Link>
          <span className="text-muted-foreground px-2 font-mono text-xs tabular-nums">
            {formatMonthShort(reference)}
          </span>
          <Link
            href={`/month/${next}`}
            aria-label={`Próximo mês (${formatMonthShort(next)})`}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <Separator className="my-6" />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TotalCard label="Receitas" value={summary.totalIncomes} />
        <TotalCard label="Despesas" value={summary.totalExpenses} muted />
        <TotalCard
          label="Balanço"
          value={summary.balance}
          tone={Number(summary.balance) < 0 ? "destructive" : "default"}
        />
        <TotalCard label="Recebíveis" value={summary.totalReceivables} muted />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={summary.byCategory} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={summary.byCard} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6">
        <ExpenseBreakdown
          label="Despesas à vista"
          total={summary.totalCashExpenses}
          empty="Nenhuma despesa à vista neste mês."
          rows={data.cashExpenses.map((e) => ({
            id: e.id,
            primary: e.description,
            secondary: `${e.cardName} · ${PT_CASH_METHOD[e.method] ?? e.method} · ${e.subcategoryName}`,
            meta: formatShortDate(e.date),
            amount: e.amount,
          }))}
        />

        <ExpenseBreakdown
          label="Despesas de crédito (parcelas)"
          total={summary.totalCreditExpenses}
          empty="Nenhuma parcela cai neste mês."
          rows={data.creditExpenses.map((e) => ({
            id: e.id,
            primary: e.description,
            secondary: `${e.cardName} · ${e.subcategoryName}`,
            meta: e.totalParcels > 1 ? `${e.totalParcels}× ${formatBRL(e.parcelValue)}` : "à vista",
            amount: e.parcelValue,
          }))}
        />

        <ExpenseBreakdown
          label="Despesas fixas"
          total={summary.totalFixedExpenses}
          empty="Nenhuma despesa fixa ativa."
          rows={data.fixedExpenses.map((e) => ({
            id: e.id,
            primary: e.description,
            secondary: `${e.cardName} · ${e.subcategoryName}`,
            meta: e.dueDay ? `dia ${e.dueDay}` : "—",
            amount: e.monthlyAmount,
          }))}
        />

        <IncomeBreakdown
          total={summary.totalIncomes}
          rows={data.incomes.map((i) => ({
            id: i.id,
            primary: i.description,
            secondary: PT_INCOME_TYPES[i.type] ?? i.type,
            meta: formatShortDate(i.date),
            amount: i.amount,
          }))}
        />

        <ReceivablesBreakdown
          totalCash={summary.totalCashReceivables}
          totalCredit={summary.totalCreditReceivables}
          cash={data.cashReceivables.map((r) => ({
            id: r.id,
            primary: r.description,
            secondary: r.isPaid ? "pago" : "a receber",
            meta: PT_CASH_METHOD[r.loanType] ?? r.loanType,
            amount: r.amount,
            dimmed: r.isPaid,
          }))}
          credit={data.creditReceivables.map((r) => ({
            id: r.id,
            primary: r.description,
            secondary: r.cardName,
            meta: r.totalParcels > 1 ? `${r.totalParcels}× ${formatBRL(r.parcelValue)}` : "à vista",
            amount: r.parcelValue,
          }))}
        />
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

type Row = {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
  amount: string;
  dimmed?: boolean;
};

function ExpenseBreakdown({
  label,
  total,
  empty,
  rows,
}: {
  label: string;
  total: string;
  empty: string;
  rows: Row[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{label}</CardTitle>
        <span className="text-muted-foreground text-sm tabular-nums">{formatBRL(total)}</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">{empty}</p>
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((r) => (
              <RowItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function IncomeBreakdown({ total, rows }: { total: string; rows: Row[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Receitas</CardTitle>
        <span className="text-foreground text-sm font-medium tabular-nums">{formatBRL(total)}</span>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">Nenhuma receita neste mês.</p>
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((r) => (
              <RowItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReceivablesBreakdown({
  totalCash,
  totalCredit,
  cash,
  credit,
}: {
  totalCash: string;
  totalCredit: string;
  cash: Row[];
  credit: Row[];
}) {
  if (cash.length === 0 && credit.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recebíveis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {cash.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs tracking-wide uppercase">
              <span>À vista</span>
              <span className="tabular-nums">{formatBRL(totalCash)}</span>
            </div>
            <ul className="divide-border divide-y">
              {cash.map((r) => (
                <RowItem key={r.id} row={r} />
              ))}
            </ul>
          </div>
        )}
        {credit.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs tracking-wide uppercase">
              <span>Parcelado</span>
              <span className="tabular-nums">{formatBRL(totalCredit)}</span>
            </div>
            <ul className="divide-border divide-y">
              {credit.map((r) => (
                <RowItem key={r.id} row={r} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RowItem({ row }: { row: Row }) {
  return (
    <li className={cn("flex items-center justify-between gap-4 py-3", row.dimmed && "opacity-50")}>
      <div className="flex min-w-0 flex-col">
        <span className="text-foreground truncate text-sm">{row.primary}</span>
        <span className="text-muted-foreground truncate text-xs">{row.secondary}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-foreground text-sm tabular-nums">{formatBRL(row.amount)}</span>
        <span className="text-muted-foreground text-xs">{row.meta}</span>
      </div>
    </li>
  );
}
