import { CalendarClock, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import Link from "next/link";

import {
  ConstellationBullet,
  PixelComet,
  PixelMoonFull,
  PixelStarSmall,
} from "@/components/decorative/pixel-icons";
import type { InvoicePerCard } from "@/lib/finance/aggregate";
import { formatMonthLong, formatMonthShort, shiftMonth, type MonthRef } from "@/lib/finance/month";
import { type MonthSummary } from "@/lib/queries/month";
import { cn, formatCurrency } from "@/lib/utils";

const PT_MONTH_LONG: Record<number, string> = {
  1: "janeiro",
  2: "fevereiro",
  3: "março",
  4: "abril",
  5: "maio",
  6: "junho",
  7: "julho",
  8: "agosto",
  9: "setembro",
  10: "outubro",
  11: "novembro",
  12: "dezembro",
};

const PT_MONTH_SHORT_NAMES: Record<number, string> = {
  1: "jan",
  2: "fev",
  3: "mar",
  4: "abr",
  5: "mai",
  6: "jun",
  7: "jul",
  8: "ago",
  9: "set",
  10: "out",
  11: "nov",
  12: "dez",
};

function ptMonthLong(monthRef: MonthRef): string {
  const [, m] = monthRef.split("-").map(Number);
  return PT_MONTH_LONG[m] ?? "";
}

/**
 * Returns "{day} de {monthShort}" for the closing/due dates of a card whose
 * cycle closes in `closingMonth` and is paid in the month after. So a card
 * that closes on the 29 of an invoice tagged to may shows
 *   { closing: "29 de mai", due: "5 de jun" }
 */
function formatBillDates(
  closingDay: number | null,
  dueDay: number | null,
  closingMonth: MonthRef,
) {
  const [y, m] = closingMonth.split("-").map(Number);
  const dueY = m === 12 ? y + 1 : y;
  const dueM = m === 12 ? 1 : m + 1;
  void dueY;
  return {
    closing: closingDay ? `${closingDay} de ${PT_MONTH_SHORT_NAMES[m]}` : null,
    due: dueDay ? `${dueDay} de ${PT_MONTH_SHORT_NAMES[dueM]}` : null,
  };
}

const PT_INCOME_TYPES: Record<string, string> = {
  salary: "salário",
  research_grant: "bolsa",
  refund: "reembolso",
  fee: "honorário",
  sale: "venda",
  other: "outro",
};

const PT_CASH_METHOD: Record<string, string> = {
  pix: "pix",
  debit: "débito",
  cash: "dinheiro",
  other: "outro",
};

const CARD_DOT: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  brown: "bg-amber-700",
  gray: "bg-gray-400",
};

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShortDate(yyyyMmDd: string): string {
  const date = parseLocalDate(yyyyMmDd);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(date)
    .toLowerCase();
}

export function MonthView({ summary }: { summary: MonthSummary }) {
  const { reference, data } = summary;
  const prev = shiftMonth(reference, -1);
  const next = shiftMonth(reference, 1);
  const year = reference.slice(0, 4);

  const balanceNum = Number(summary.balance);
  const balanceTone =
    balanceNum > 0 ? "positive" : balanceNum < 0 ? "negative" : "neutral";

  return (
    <div className="enter mx-auto w-full max-w-6xl px-6 pt-10 pb-16 md:pt-14">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/year/${year}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] transition-colors"
          >
            <PixelStarSmall size={6} className="text-primary" />
            <span>logbook · year {year}</span>
            <span className="bg-border-strong ml-2 hidden h-px max-w-32 flex-1 sm:block" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={`/month/${prev}`}
              aria-label={`previous month (${formatMonthShort(prev)})`}
              className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronLeft className="size-3.5" strokeWidth={1.6} />
            </Link>
            <span className="text-muted-foreground px-2 font-mono text-[11px] tracking-[0.16em] tabular-nums">
              {formatMonthShort(reference)}
            </span>
            <Link
              href={`/month/${next}`}
              aria-label={`next month (${formatMonthShort(next)})`}
              className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <h1 className="font-display text-foreground text-[56px] leading-[0.95] font-light tracking-[-0.025em] md:text-[80px]">
            {formatMonthLong(reference).split(" ")[0]}
            <span className="text-muted-foreground italic">,</span>
            <br />
            <span className="text-muted-foreground/80 italic">
              {formatMonthLong(reference).split(" ")[1]}.
            </span>
          </h1>
          <div className="hidden shrink-0 md:block">
            <PixelMoonFull size={36} className="text-foreground/40" />
          </div>
        </div>
      </header>

      {/* ── 4 stat tiles ─────────────────────────────────────────────────── */}
      <section className="mt-12 grid gap-3 md:grid-cols-4">
        <StatTile
          label="incomes"
          value={summary.totalIncomes}
          accent="aurora"
          decoration={<PixelStarSmall size={8} className="text-success/70" />}
        />
        <StatTile label="expenses" value={summary.totalExpenses} accent="muted" />
        <StatTile
          label="balance"
          value={summary.balance}
          tone={balanceTone}
          accent="gold"
          decoration={<PixelComet size={20} className="text-primary/80" />}
          highlight
        />
        <StatTile
          label="total save"
          value={summary.cumulativeSave}
          tone={Number(summary.cumulativeSave) < 0 ? "negative" : "neutral"}
          accent="muted"
          caption="cumulative · all months"
        />
      </section>

      <hr className="divider-dotted my-12" />

      {/* ── ledger: receitas em cima, despesas embaixo ──────────────────── */}
      <section className="flex flex-col gap-6">
        {/* ── receitas ─────────────────────────────────────────────────── */}
        <Panel
          eyebrow="ledger · entradas"
          title="receitas"
          total={summary.totalIncomes}
          tone="success"
          decoration={<PixelStarSmall size={8} className="text-success/70" />}
        >
          {summary.bySource.length === 0 ? (
            <EmptyLine>nenhuma receita neste mês.</EmptyLine>
          ) : (
            <ul className="divide-border divide-y">
              {summary.bySource.map((b) => (
                <BucketRow
                  key={b.key}
                  primary={PT_INCOME_TYPES[b.key] ?? b.key}
                  meta={`${b.count} ${b.count === 1 ? "lançamento" : "lançamentos"}`}
                  amount={b.total}
                  accent="success"
                />
              ))}
            </ul>
          )}
          {data.incomes.length > 0 && (
            <Disclosure label={`detalhes · ${data.incomes.length}`}>
              <ul className="divide-border divide-y">
                {data.incomes.map((i) => (
                  <DetailRow
                    key={i.id}
                    primary={i.description}
                    secondary={PT_INCOME_TYPES[i.type] ?? i.type}
                    meta={formatShortDate(i.date)}
                    amount={i.amount}
                    sign="+"
                  />
                ))}
              </ul>
            </Disclosure>
          )}
        </Panel>

        {/* ── despesas ─────────────────────────────────────────────────── */}
        <Panel
          eyebrow="ledger · saídas"
          title="despesas"
          total={summary.totalExpenses}
          tone="muted"
          decoration={<ConstellationBullet />}
        >
          <div className="flex flex-col gap-5">
            {/* à vista */}
            <SubPanel
              label="à vista"
              total={summary.totalCashExpenses}
              empty="nada à vista neste mês."
              count={data.cashExpenses.length}
            >
              {summary.byCashMethod.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {summary.byCashMethod.map((b) => (
                    <MethodTile
                      key={b.key}
                      label={PT_CASH_METHOD[b.key] ?? b.key}
                      total={b.total}
                      count={b.count}
                    />
                  ))}
                </div>
              )}
              {data.cashExpenses.length > 0 && (
                <Disclosure label={`detalhes · ${data.cashExpenses.length}`}>
                  <ul className="divide-border divide-y">
                    {data.cashExpenses.map((e) => (
                      <DetailRow
                        key={e.id}
                        primary={e.description}
                        secondary={`${e.cardName} · ${PT_CASH_METHOD[e.method] ?? e.method} · ${e.subcategoryName}`}
                        meta={formatShortDate(e.date)}
                        amount={e.amount}
                        sign="−"
                      />
                    ))}
                  </ul>
                </Disclosure>
              )}
            </SubPanel>

            {/* crédito */}
            <SubPanel
              label={`crédito · fatura de ${ptMonthLong(reference)}`}
              microcopy="parcelas e compras que aparecem na fatura cobrada neste mês."
              total={summary.totalCreditExpenses}
              empty="nenhuma parcela cai neste mês."
              count={data.creditExpenses.length}
            >
              {summary.thisInvoice.length > 0 && (
                <ul className="divide-border-strong/40 divide-y">
                  {summary.thisInvoice.map((b) => (
                    <CardWithItems
                      key={b.cardId}
                      bucket={b}
                      sign="−"
                      closingMonth={reference}
                    />
                  ))}
                </ul>
              )}
            </SubPanel>

            {/* fixas */}
            <SubPanel
              label="fixas"
              total={summary.totalFixedExpenses}
              empty="nenhuma despesa fixa ativa."
              count={data.fixedExpenses.length}
            >
              {data.fixedExpenses.length > 0 && (
                <ul className="divide-border divide-y">
                  {data.fixedExpenses.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <Repeat
                        className="text-muted-foreground/70 size-4 shrink-0"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-foreground truncate text-[15px]">
                          {e.description}
                        </span>
                        <span className="text-muted-foreground truncate text-[12px]">
                          {e.cardName} · {e.subcategoryName}
                          {e.dueDay ? ` · dia ${e.dueDay}` : ""}
                        </span>
                      </div>
                      <span className="numeric text-foreground/90 text-[16px] tabular-nums">
                        {formatCurrency(e.monthlyAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SubPanel>
          </div>
        </Panel>
      </section>

      {/* ── próxima fatura ───────────────────────────────────────────────── */}
      {summary.nextInvoice ? (
        <>
          <hr className="divider-dotted my-12" />
          <NextInvoice invoice={summary.nextInvoice} />
        </>
      ) : null}

      {/* ── recebíveis ───────────────────────────────────────────────────── */}
      {data.cashReceivables.length + data.creditReceivables.length > 0 && (
        <>
          <hr className="divider-dotted my-12" />
          <section className="glass">
            <PanelHeader
              eyebrow="receivables · in flight"
              title="recebíveis"
              total={summary.totalReceivables}
              tone="muted"
              decoration={<PixelStarSmall size={8} className="text-accent/70" />}
            />
            <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
              {data.cashReceivables.length > 0 && (
                <SubPanel
                  label="à vista"
                  total={summary.totalCashReceivables}
                  empty=""
                  count={data.cashReceivables.length}
                  bare
                >
                  <ul className="divide-border divide-y">
                    {data.cashReceivables.map((r) => (
                      <DetailRow
                        key={r.id}
                        primary={r.description}
                        secondary={r.isPaid ? "pago" : "a receber"}
                        meta={PT_CASH_METHOD[r.loanType] ?? r.loanType}
                        amount={r.amount}
                        sign="+"
                        dimmed={r.isPaid}
                      />
                    ))}
                  </ul>
                </SubPanel>
              )}
              {data.creditReceivables.length > 0 && (
                <SubPanel
                  label="parcelado"
                  total={summary.totalCreditReceivables}
                  empty=""
                  count={data.creditReceivables.length}
                  bare
                >
                  <ul className="divide-border divide-y">
                    {data.creditReceivables.map((r) => (
                      <DetailRow
                        key={r.id}
                        primary={r.description}
                        secondary={r.cardName}
                        meta={
                          r.totalParcels > 1
                            ? `${r.totalParcels}× ${formatCurrency(r.parcelValue)}`
                            : "à vista"
                        }
                        amount={r.parcelValue}
                        sign="+"
                      />
                    ))}
                  </ul>
                </SubPanel>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  building blocks                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  tone = "neutral",
  accent = "muted",
  decoration,
  highlight,
  caption,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  accent?: "muted" | "gold" | "aurora";
  decoration?: React.ReactNode;
  highlight?: boolean;
  caption?: string;
}) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-0.5",
        highlight && "glass-glow",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.22em]">
          {label}
        </span>
        {decoration}
      </div>
      <p
        className={cn(
          "display-numeric mt-5 text-[34px] leading-none font-light tracking-tight md:text-[40px]",
          tone === "negative" && "text-destructive/85",
          tone === "positive" && accent === "gold" && "text-primary",
          tone === "neutral" && accent === "muted" && "text-foreground/90",
          accent === "aurora" && "text-success/90",
        )}
      >
        {formatCurrency(value)}
      </p>
      {caption ? (
        <p className="text-muted-foreground/70 mt-2 font-mono text-[10px] tracking-[0.18em]">
          {caption}
        </p>
      ) : null}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -bottom-8 size-20 rounded-full opacity-20 blur-2xl",
          accent === "gold" && "bg-primary",
          accent === "aurora" && "bg-success",
          accent === "muted" && "bg-accent/50",
        )}
      />
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  total,
  tone = "muted",
  decoration,
}: {
  eyebrow: string;
  title: string;
  total: string;
  tone?: "muted" | "success";
  decoration?: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-end justify-between gap-4 border-b px-7 py-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.24em]">
          {eyebrow}
        </span>
        <h2 className="font-display text-foreground text-[44px] leading-[0.95] font-light tracking-[-0.02em] italic md:text-[56px]">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "numeric text-xl font-medium tabular-nums md:text-2xl",
            tone === "success" ? "text-success/90" : "text-foreground/85",
          )}
        >
          {formatCurrency(total)}
        </span>
        {decoration}
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  total,
  tone,
  decoration,
  children,
}: {
  eyebrow: string;
  title: string;
  total: string;
  tone?: "muted" | "success";
  decoration?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass flex flex-col">
      <PanelHeader
        eyebrow={eyebrow}
        title={title}
        total={total}
        tone={tone}
        decoration={decoration}
      />
      <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
    </section>
  );
}

function SubPanel({
  label,
  microcopy,
  total,
  empty,
  count,
  bare = false,
  children,
}: {
  label: string;
  microcopy?: string;
  total: string;
  empty: string;
  count: number;
  bare?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", !bare && "")}>
      <div className="border-border-strong/40 flex flex-col gap-1 border-b pb-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-foreground/90 text-[20px] leading-none font-light tracking-[-0.01em] italic">
            {label}
          </span>
          <span className="numeric text-foreground/85 text-base font-medium tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
        {microcopy ? (
          <span className="text-muted-foreground/85 text-[12px] leading-snug">{microcopy}</span>
        ) : null}
      </div>
      {count === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  );
}

function MethodTile({
  label,
  total,
  count,
}: {
  label: string;
  total: string;
  count: number;
}) {
  return (
    <div className="border-border bg-card/40 flex flex-col gap-1.5 rounded-lg border px-4 py-3">
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em]">
        {label}
      </span>
      <span className="numeric text-foreground text-[17px] font-medium tabular-nums">
        {formatCurrency(total)}
      </span>
      <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
        {count}×
      </span>
    </div>
  );
}

function BucketRow({
  primary,
  meta,
  amount,
  accent,
}: {
  primary: string;
  meta: string;
  amount: string;
  accent?: "success";
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground truncate text-[15px]">{primary}</span>
        <span className="text-muted-foreground font-mono truncate text-[11px] tracking-[0.14em]">
          {meta}
        </span>
      </div>
      <span
        className={cn(
          "numeric text-[16px] tabular-nums",
          accent === "success" ? "text-success/90" : "text-foreground/90",
        )}
      >
        {formatCurrency(amount)}
      </span>
    </li>
  );
}

function DetailRow({
  primary,
  secondary,
  meta,
  amount,
  sign,
  dimmed,
}: {
  primary: string;
  secondary: string;
  meta: string;
  amount: string;
  sign: "+" | "−";
  dimmed?: boolean;
}) {
  return (
    <li className={cn("flex items-center gap-3 py-3", dimmed && "opacity-50")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground truncate text-[15px]">{primary}</span>
        <span className="text-muted-foreground truncate text-[12px]">{secondary}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={cn(
            "numeric text-[16px] tabular-nums",
            sign === "+" ? "text-success/90" : "text-foreground/90",
          )}
        >
          {sign} {formatCurrency(amount)}
        </span>
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.14em]">
          {meta}
        </span>
      </div>
    </li>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground py-2 text-center text-[13px] italic">{children}</p>
  );
}

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-border/60 mt-3 rounded-lg border border-dashed">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-between gap-3 px-3 py-2 font-mono text-[10px] tracking-[0.16em] transition-colors">
        <span>{label}</span>
        <span className="group-open:rotate-90 transition-transform">›</span>
      </summary>
      <div className="border-border/40 border-t px-3 pt-1 pb-2">{children}</div>
    </details>
  );
}

function CardWithItems({
  bucket,
  sign,
  inset = false,
  closingMonth,
}: {
  bucket: InvoicePerCard;
  sign: "+" | "−";
  inset?: boolean;
  /** The month in which this invoice closes — used to label closing/due dates. */
  closingMonth: MonthRef;
}) {
  const labelNoun = sign === "+" ? "recebimento" : "compra";
  const labelNounP = sign === "+" ? "recebimentos" : "compras";
  const dates = formatBillDates(bucket.closingDay, bucket.dueDay, closingMonth);

  return (
    <li className="group">
      <details className="group/details">
        <summary
          className={cn(
            "hover:bg-accent/[0.03] flex cursor-pointer items-center gap-3 transition-colors",
            inset ? "px-7 py-4" : "py-3",
            "list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "shrink-0 rounded-full",
              inset ? "size-3" : "size-2.5",
              CARD_DOT[bucket.cardColor ?? "gray"] ?? CARD_DOT.gray,
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                "text-foreground truncate",
                inset ? "text-[16px]" : "text-[15px]",
              )}
            >
              {bucket.cardName}
            </span>
            <span className="text-muted-foreground truncate font-mono text-[11px] tracking-[0.14em]">
              {bucket.count} {bucket.count === 1 ? labelNoun : labelNounP}
              {dates.closing ? ` · fecha ${dates.closing}` : ""}
              {dates.due ? ` · vence ${dates.due}` : ""}
            </span>
          </div>
          <span
            className={cn(
              "numeric tabular-nums",
              inset ? "text-[17px]" : "text-[16px]",
              sign === "+" ? "text-success/90" : "text-foreground/90",
            )}
          >
            {formatCurrency(bucket.total)}
          </span>
          <ChevronRight
            className={cn(
              "text-muted-foreground/50 size-3.5 shrink-0 transition-transform duration-200",
              "group-open/details:rotate-90",
            )}
            strokeWidth={1.6}
            aria-hidden
          />
        </summary>
        <div
          className={cn(
            "border-border-strong/30 border-t",
            inset ? "px-7 py-2" : "py-2",
          )}
        >
          {bucket.items.length === 0 ? (
            <EmptyLine>sem detalhes deste cartão.</EmptyLine>
          ) : (
            <ul className="divide-border-strong/30 divide-y">
              {bucket.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 py-2.5 pl-5"
                >
                  <span
                    aria-hidden
                    className="bg-border-strong/60 size-1 shrink-0 rounded-full"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-foreground/90 truncate text-[14px]">
                      {it.description || "—"}
                    </span>
                    <span className="text-muted-foreground/85 truncate font-mono text-[10px] tracking-[0.14em]">
                      {it.subcategoryName || it.categoryName}
                      {it.totalParcels > 1
                        ? ` · ${it.parcelIndex}/${it.totalParcels}`
                        : ""}
                      {it.purchaseDate ? ` · ${formatPurchaseDate(it.purchaseDate)}` : ""}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "numeric text-[14px] tabular-nums",
                      sign === "+" ? "text-success/85" : "text-foreground/85",
                    )}
                  >
                    {sign} {formatCurrency(it.parcelValue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

function formatPurchaseDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function NextInvoice({
  invoice,
}: {
  invoice: { reference: string; perCard: InvoicePerCard[]; total: string };
}) {
  return (
    <section className="glass">
      <div className="border-border flex flex-col gap-3 border-b px-7 py-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground font-mono text-[11px] tracking-[0.24em]">
              fatura formando · {formatMonthShort(invoice.reference)}
            </span>
            <h2 className="font-display text-foreground text-[44px] leading-[0.95] font-light tracking-[-0.02em] italic md:text-[56px]">
              próxima fatura
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="numeric text-primary/90 text-xl font-medium tabular-nums md:text-2xl">
              {formatCurrency(invoice.total)}
            </span>
            <CalendarClock className="text-primary/80 size-5" strokeWidth={1.6} aria-hidden />
          </div>
        </div>
        <p className="text-muted-foreground/90 max-w-prose text-[13px] leading-relaxed">
          fatura que <span className="text-foreground/80">fecha em {ptMonthLong(invoice.reference as MonthRef)}</span>: parcelas em andamento + compras feitas após o fechamento de cada cartão.
        </p>
      </div>
      {invoice.perCard.length === 0 ? (
        <EmptyLine>
          <span className="px-6 py-6 inline-block">
            nada acumulado para a próxima fatura ainda.
          </span>
        </EmptyLine>
      ) : (
        <ul className="divide-border-strong/40 divide-y">
          {invoice.perCard.map((b) => (
            <CardWithItems
              key={b.cardId}
              bucket={b}
              sign="−"
              inset
              closingMonth={invoice.reference as MonthRef}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

