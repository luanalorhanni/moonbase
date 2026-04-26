import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ChevronRight,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import {
  CompositionBar,
  type CompositionSegment,
} from "@/components/charts/composition-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { PixelMoonFull } from "@/components/decorative/pixel-icons";
import {
  aggregateMonth,
  cumulativeBalance,
  invoicePerCard,
  type InvoicePerCard,
} from "@/lib/finance/aggregate";
import {
  currentMonthRef,
  formatMonthLong,
  formatMonthShort,
  shiftMonth,
  sumNumeric,
} from "@/lib/finance/month";
import { listCards } from "@/lib/queries/cards";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { cn, formatCurrency } from "@/lib/utils";

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

function ptMonthLong(monthRef: string): string {
  const [, m] = monthRef.split("-").map(Number);
  return PT_MONTH_LONG[m] ?? "";
}

function formatBillDates(
  closingDay: number | null,
  dueDay: number | null,
  closingMonth: string,
) {
  const [, m] = closingMonth.split("-").map(Number);
  const dueM = m === 12 ? 1 : m + 1;
  return {
    closing: closingDay ? `${closingDay} de ${PT_MONTH_SHORT_NAMES[m]}` : null,
    due: dueDay ? `${dueDay} de ${PT_MONTH_SHORT_NAMES[dueM]}` : null,
  };
}

const INCOME = "income" as const;
const CASH = "cash" as const;
const CREDIT = "credit" as const;

type ActivityItem = {
  id: string;
  kind: typeof INCOME | typeof CASH | typeof CREDIT;
  primary: string;
  secondary: string;
  amount: string;
  date: string;
  sign: 1 | -1;
};

export default async function HomePage() {
  const [dataset, cards] = await Promise.all([loadFullDataset(), listCards()]);
  const inputs = toAggregateInputs(dataset);

  const current = currentMonthRef();
  const next = shiftMonth(current, 1);
  const month = aggregateMonth(inputs, current);
  const year = Number(current.slice(0, 4));

  const cardsForInvoice = cards.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    defaultClosingDay: c.defaultClosingDay,
    dueDay: c.dueDay,
  }));
  const nextInvoice = invoicePerCard(dataset.creditExpenses, cardsForInvoice, next);
  const nextInvoiceTotal = sumNumeric(nextInvoice.map((b) => b.total));

  const totalSave = cumulativeBalance(inputs, current);

  const trail = Array.from({ length: 12 }, (_, i) => shiftMonth(current, -11 + i));
  const trend = trail.map((m) => aggregateMonth(inputs, m));
  const trendData = trail.map((m, i) => ({
    label: formatMonthShort(m).split("/")[0],
    net: Number(trend[i].balance),
    cumulative: Number(cumulativeBalance(inputs, m)),
  }));

  const composition: CompositionSegment[] = [
    {
      key: "credit",
      label: "credit",
      value: Number(month.totalCreditExpenses),
      tone: "primary",
    },
    {
      key: "cash",
      label: "cash",
      value: Number(month.totalCashExpenses),
      tone: "muted",
    },
    {
      key: "fixed",
      label: "fixed",
      value: Number(month.totalFixedExpenses),
      tone: "subtle",
    },
  ];

  const recent: ActivityItem[] = [
    ...dataset.incomes.slice(0, 10).map((i) => ({
      id: `inc-${i.id}`,
      kind: INCOME,
      primary: i.description,
      secondary: "received",
      amount: i.amount,
      date: i.date,
      sign: 1 as const,
    })),
    ...dataset.cashExpenses.slice(0, 10).map((e) => ({
      id: `cash-${e.id}`,
      kind: CASH,
      primary: e.description,
      secondary: `${e.cardName} · ${e.subcategoryName}`,
      amount: e.amount,
      date: e.date,
      sign: -1 as const,
    })),
    ...dataset.creditExpenses.slice(0, 10).map((e) => ({
      id: `cred-${e.id}`,
      kind: CREDIT,
      primary: e.description,
      secondary: `${e.cardName} · ${e.subcategoryName}`,
      amount: e.parcelValue,
      date: e.purchaseDate,
      sign: -1 as const,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const balanceNum = Number(month.balance);
  const balanceTone =
    balanceNum > 0 ? "positive" : balanceNum < 0 ? "negative" : "neutral";

  return (
    <div className="enter mx-auto w-full max-w-4xl px-6 pt-12 pb-24 md:pt-20">
      {/* ── header — almanac dateline ────────────────────────────────────── */}
      <header className="flex flex-col gap-7">
        <div className="text-muted-foreground flex items-center gap-3 font-mono text-[10px] tracking-[0.22em]">
          <span>almanac · entry {formatMonthShort(current)}</span>
          <span className="bg-border-strong h-px max-w-32 flex-1" />
          <Link
            href={`/year/${year}`}
            className="hover:text-foreground transition-colors"
          >
            year of {year}
          </Link>
        </div>

        <div className="flex items-end justify-between gap-6">
          <h1 className="font-display text-foreground text-[64px] leading-[0.95] font-light tracking-[-0.03em] md:text-[88px]">
            {formatMonthLong(current).split(" ")[0]}
            <span className="text-muted-foreground italic">,</span>
            <br />
            <span className="text-muted-foreground/80 italic">
              {formatMonthLong(current).split(" ")[1]}.
            </span>
          </h1>
          <div className="hidden shrink-0 md:block">
            <PixelMoonFull size={36} className="text-foreground/40" />
          </div>
        </div>
      </header>

      {/* ── hero number — balance ────────────────────────────────────────── */}
      <section className="border-border-strong mt-14 flex flex-col gap-3 border-t pt-7">
        <div className="flex items-baseline justify-between gap-6">
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em]">
            balance, this month
          </span>
          <Link
            href={`/month/${current}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] transition-colors"
          >
            in detail
            <ArrowUpRight className="size-3" strokeWidth={1.6} />
          </Link>
        </div>
        <p
          className={cn(
            "display-numeric text-foreground text-[80px] leading-none font-light md:text-[112px]",
            balanceTone === "negative" && "text-destructive/85",
            balanceTone === "positive" && "text-primary",
          )}
        >
          {formatCurrency(month.balance)}
        </p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.16em]">
          <span>
            <span className="text-success/80">incomes</span>{" "}
            <span className="numeric text-foreground/75">
              {formatCurrency(month.totalIncomes)}
            </span>
          </span>
          <span>
            <span>expenses</span>{" "}
            <span className="numeric text-foreground/75">
              {formatCurrency(month.totalExpenses)}
            </span>
          </span>
          <span>
            <span>save · cumulative</span>{" "}
            <span className="numeric text-foreground/75">{formatCurrency(totalSave)}</span>
          </span>
        </div>
      </section>

      {/* ── composition — single segmented bar ───────────────────────────── */}
      {Number(month.totalExpenses) > 0 && (
        <section className="mt-14 flex flex-col gap-4">
          <SectionHead eyebrow="composition" title="how the month spent" />
          <CompositionBar segments={composition} />
        </section>
      )}

      {/* ── invoice forming ──────────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col gap-4">
        <SectionHead
          eyebrow={`fatura formando · fecha em ${ptMonthLong(next)}`}
          title="próxima fatura"
          aside={formatCurrency(nextInvoiceTotal)}
          asideIcon={<CalendarClock className="size-3.5" strokeWidth={1.4} />}
        />
        <p className="text-muted-foreground/90 -mt-1 max-w-prose text-[13px] leading-relaxed">
          parcelas em andamento + compras feitas após o fechamento de cada cartão. cada cartão pode ser aberto pra ver o que está dentro.
        </p>
        {nextInvoice.length === 0 ? (
          <EmptyLine>nada acumulado para a próxima fatura ainda.</EmptyLine>
        ) : (
          <ul className="divide-border-strong/40 divide-y">
            {nextInvoice.map((b) => (
              <CardWithItems key={b.cardId} bucket={b} closingMonth={next} />
            ))}
          </ul>
        )}
      </section>

      {/* ── trend ────────────────────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col gap-4">
        <SectionHead
          eyebrow="trend · trailing twelve"
          title="save, accumulating"
          legend={[
            { label: "cumulative", tone: "primary" },
            { label: "monthly net", tone: "success" },
          ]}
        />
        <div className="text-foreground/80 -mx-2">
          <TrendChart data={trendData} />
        </div>
      </section>

      {/* ── recent activity ──────────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col gap-4">
        <SectionHead eyebrow="logbook · last entries" title="recent activity" />
        {recent.length === 0 ? (
          <EmptyLine>the log is empty.</EmptyLine>
        ) : (
          <ul className="divide-border-strong/60 divide-y">
            {recent.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  building blocks                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function SectionHead({
  eyebrow,
  title,
  aside,
  asideIcon,
  legend,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  asideIcon?: React.ReactNode;
  legend?: { label: string; tone: "primary" | "success" | "muted" }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em]">
          {eyebrow}
        </span>
        {aside ? (
          <span className="numeric text-foreground/85 flex items-center gap-2 text-[15px] tabular-nums">
            {aside}
            {asideIcon ? (
              <span className="text-primary/80">{asideIcon}</span>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-foreground text-[26px] leading-tight font-light tracking-[-0.015em] italic">
          {title}
        </h2>
        {legend ? (
          <ul className="text-muted-foreground hidden items-baseline gap-4 font-mono text-[10px] tracking-[0.16em] sm:flex">
            {legend.map((l) => (
              <li key={l.label} className="flex items-baseline gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 translate-y-[-1px] rounded-full",
                    l.tone === "primary" && "bg-primary/85",
                    l.tone === "success" && "bg-success/85",
                    l.tone === "muted" && "bg-foreground/40",
                  )}
                />
                {l.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="bg-border-strong h-px w-full" />
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-[13px] italic">{children}</p>
  );
}

function CardWithItems({
  bucket,
  closingMonth,
}: {
  bucket: InvoicePerCard;
  closingMonth: string;
}) {
  const dates = formatBillDates(bucket.closingDay, bucket.dueDay, closingMonth);
  return (
    <li>
      <details className="group/details">
        <summary className="hover:bg-accent/[0.03] flex cursor-pointer list-none items-center gap-3 py-3.5 transition-colors [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              CARD_DOT[bucket.cardColor ?? "gray"] ?? CARD_DOT.gray,
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-foreground truncate text-[15px]">{bucket.cardName}</span>
            <span className="text-muted-foreground truncate font-mono text-[10px] tracking-[0.16em]">
              {bucket.count} {bucket.count === 1 ? "compra" : "compras"}
              {dates.closing ? ` · fecha ${dates.closing}` : ""}
              {dates.due ? ` · vence ${dates.due}` : ""}
            </span>
          </div>
          <span className="numeric text-foreground/85 text-[15px] tabular-nums">
            {formatCurrency(bucket.total)}
          </span>
          <ChevronRight
            className="text-muted-foreground/50 size-3.5 shrink-0 transition-transform duration-200 group-open/details:rotate-90"
            strokeWidth={1.6}
            aria-hidden
          />
        </summary>
        <ul className="divide-border-strong/30 divide-y border-t border-border-strong/30 pl-5">
          {bucket.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-2.5">
              <span
                aria-hidden
                className="bg-border-strong/60 size-1 shrink-0 rounded-full"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground/90 truncate text-[13px]">
                  {it.description || "—"}
                </span>
                <span className="text-muted-foreground/85 truncate font-mono text-[10px] tracking-[0.14em]">
                  {it.subcategoryName || it.categoryName}
                  {it.totalParcels > 1 ? ` · parcela ${it.parcelIndex}/${it.totalParcels}` : ""}
                </span>
              </div>
              <span className="numeric text-foreground/85 text-[13px] tabular-nums">
                {formatCurrency(it.parcelValue)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.kind === INCOME ? TrendingUp : item.kind === CASH ? Banknote : ReceiptText;
  const [y, m, d] = item.date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
  return (
    <li className="flex items-center gap-3 py-3.5">
      <span
        className={cn(
          "border-border-strong/60 bg-card/40 flex size-7 items-center justify-center rounded-full border",
          item.sign === 1 ? "text-success/80" : "text-foreground/55",
        )}
      >
        <Icon className="size-3" strokeWidth={1.6} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground truncate text-[14px]">{item.primary}</span>
        <span className="text-muted-foreground truncate font-mono text-[10px] tracking-[0.14em]">
          {item.secondary}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={cn(
            "numeric text-[14px]",
            item.sign === 1 ? "text-success/85" : "text-foreground/85",
          )}
        >
          {item.sign === 1 ? "+" : "−"} {formatCurrency(item.amount)}
        </span>
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.14em] tabular-nums">
          {dateLabel}
        </span>
      </div>
    </li>
  );
}
