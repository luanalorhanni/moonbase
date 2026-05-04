"use client";

import { BookmarkCheck, BookmarkPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { upsertMonthlySnapshot } from "@/lib/actions/snapshots";
import type { MonthRef } from "@/lib/finance/month";
import { cn, formatCurrency } from "@/lib/utils";

type Props = {
  reference: MonthRef;
  /** Whether this month is in the past relative to today's calendar
   *  month. Computed in the parent (server) and passed in so this
   *  client component doesn't need its own clock. */
  isPastMonth: boolean;
  snapshot: {
    totalIncomes: string;
    totalExpenses: string;
  } | null;
};

/**
 * Tiny indicator next to the month title that:
 *   • for past months WITH a snapshot — filled bookmark + tooltip
 *     showing the historical totals
 *   • for past months WITHOUT a snapshot — outlined bookmark button
 *     that triggers `upsertMonthlySnapshot` to seed one from current
 *     data
 *   • for the current/future month — renders nothing (no snapshot
 *     until the month is closed)
 */
export function SnapshotBadge({ reference, isPastMonth, snapshot }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!isPastMonth) return null;

  if (snapshot) {
    const balance = (Number(snapshot.totalIncomes) - Number(snapshot.totalExpenses)).toFixed(2);
    const tip = `snapshot saved · inc ${formatCurrency(
      snapshot.totalIncomes,
    )} · exp ${formatCurrency(snapshot.totalExpenses)} · save ${formatCurrency(balance)}`;
    return (
      <span
        className="text-primary/70 inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-md"
        title={tip}
        aria-label={tip}
      >
        <BookmarkCheck className="size-4" strokeWidth={1.6} aria-hidden />
      </span>
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertMonthlySnapshot(reference);
      if (result.ok) {
        toast.success("snapshot saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isPending}
      title="this month has no snapshot yet — click to save one"
      aria-label="save snapshot of this month"
      className={cn(
        "text-muted-foreground/60 hover:text-foreground hover:bg-muted inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
        isPending && "cursor-wait",
      )}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" strokeWidth={1.6} aria-hidden />
      ) : (
        <BookmarkPlus className="size-4" strokeWidth={1.6} aria-hidden />
      )}
    </button>
  );
}
