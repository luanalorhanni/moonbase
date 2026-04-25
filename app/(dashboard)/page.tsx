import { ArrowUpRight, Banknote, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";

import { YearBarChart } from "@/components/charts/year-bar-chart";
import {
  ConstellationBullet,
  PixelComet,
  PixelMoonFull,
  PixelStarSmall,
} from "@/components/decorative/pixel-icons";
import { aggregateMonth } from "@/lib/finance/aggregate";
import {
  currentMonthRef,
  formatMonthLong,
  formatMonthShort,
  shiftMonth,
} from "@/lib/finance/month";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { cn, formatCurrency } from "@/lib/utils";

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
  const dataset = await loadFullDataset();
  const inputs = toAggregateInputs(dataset);

  const current = currentMonthRef();
  const month = aggregateMonth(inputs, current);
  const year = Number(current.slice(0, 4));

  const trail = Array.from({ length: 6 }, (_, i) => shiftMonth(current, -5 + i));
  const trend = trail.map((m) => aggregateMonth(inputs, m));
  const chartData = trend.map((m) => ({
    label: formatMonthShort(m.reference).split("/")[0],
    incomes: Number(m.totalIncomes),
    expenses: Number(m.totalExpenses),
  }));

  const recent: ActivityItem[] = [
    ...dataset.incomes.slice(0, 10).map((i) => ({
      id: `inc-${i.id}`,
      kind: INCOME,
      primary: i.description,
      secondary: "income received",
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
    .slice(0, 7);

  const balanceNum = Number(month.balance);
  const balanceTone = balanceNum > 0 ? "positive" : balanceNum < 0 ? "negative" : "neutral";

  return (
    <div className="enter mx-auto w-full max-w-6xl px-6 pt-10 pb-16 md:pt-14">
      <header className="flex flex-col gap-3">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em]">
          <PixelStarSmall size={6} className="text-primary" />
          <span>observatory log · {formatMonthShort(current)}</span>
          <span className="bg-border-strong ml-2 h-px max-w-32 flex-1" />
        </div>
        <div className="flex items-end justify-between gap-6">
          <h1 className="text-foreground text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] md:text-[56px]">
            {formatMonthLong(current)}
            <span className="text-muted-foreground">,</span>
            <br />
            <span className="text-muted-foreground italic">charted.</span>
          </h1>
          <div className="hidden md:block">
            <PixelMoonFull size={48} className="text-foreground/85" />
          </div>
        </div>
      </header>

      <section className="mt-12 grid gap-3 md:grid-cols-3">
        <SummaryTile
          label="incomes"
          value={month.totalIncomes}
          accent="aurora"
          decoration={<PixelStarSmall size={8} className="text-success/70" />}
        />
        <SummaryTile label="expenses" value={month.totalExpenses} accent="muted" />
        <SummaryTile
          label="balance"
          value={month.balance}
          tone={balanceTone}
          accent="gold"
          decoration={<PixelComet size={20} className="text-primary/80" />}
          highlight
        />
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-2">
        <QuickLink href={`/month/${current}`}>this month, in detail</QuickLink>
        <QuickLink href={`/year/${year}`}>year of {year}</QuickLink>
        <QuickLink href="/snapshots">archived snapshots</QuickLink>
      </section>

      <hr className="divider-dotted my-12" />

      <section className="grid gap-6 md:grid-cols-5">
        <div className="glass glass-glow md:col-span-3">
          <div className="flex items-baseline justify-between p-6 pb-2">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em]">
                last six lunations
              </span>
              <h2 className="text-foreground text-base font-medium">trailing trend</h2>
            </div>
            <ConstellationBullet />
          </div>
          <div className="px-3 pb-4">
            <YearBarChart data={chartData} />
          </div>
        </div>

        <div className="glass md:col-span-2">
          <div className="border-border flex items-baseline justify-between border-b px-6 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em]">
                recent activity
              </span>
              <h2 className="text-foreground text-base font-medium">small fortunes</h2>
            </div>
            <PixelStarSmall size={8} className="text-primary/70" />
          </div>
          {recent.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">the log is empty.</p>
          ) : (
            <ul className="divide-border divide-y">
              {recent.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
  accent = "muted",
  decoration,
  highlight,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  accent?: "muted" | "gold" | "aurora";
  decoration?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-0.5",
        highlight && "glass-glow",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em]">
          {label}
        </span>
        {decoration}
      </div>
      <p
        className={cn(
          "numeric mt-6 text-3xl font-semibold tracking-tight",
          tone === "negative" && "text-destructive",
          tone === "positive" && accent === "gold" && "text-primary",
          tone === "neutral" && accent === "muted" && "text-foreground/85",
          accent === "aurora" && "text-success",
        )}
      >
        {formatCurrency(value)}
      </p>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -bottom-8 size-24 rounded-full opacity-20 blur-2xl",
          accent === "gold" && "bg-primary",
          accent === "aurora" && "bg-success",
          accent === "muted" && "bg-accent/50",
        )}
      />
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group border-border-strong text-foreground/85 hover:border-primary/50 hover:bg-primary/5 hover:text-foreground bg-card/30 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] backdrop-blur-md transition-all duration-200"
    >
      {children}
      <ArrowUpRight
        className="size-3 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={1.8}
      />
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.kind === INCOME ? TrendingUp : item.kind === CASH ? Banknote : ReceiptText;
  const [y, m, d] = item.date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
  return (
    <li className="hover:bg-accent/[0.03] flex items-center gap-3 px-6 py-3 transition-colors">
      <span
        className={cn(
          "border-border bg-card/60 flex size-8 items-center justify-center rounded-lg border",
          item.sign === 1 ? "text-success" : "text-foreground/60",
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground truncate text-[13px]">{item.primary}</span>
        <span className="text-muted-foreground truncate text-[11px]">{item.secondary}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={cn(
            "numeric text-[13px]",
            item.sign === 1 ? "text-success" : "text-foreground/85",
          )}
        >
          {item.sign === 1 ? "+" : "−"} {formatCurrency(item.amount)}
        </span>
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-wider">
          {dateLabel}
        </span>
      </div>
    </li>
  );
}
