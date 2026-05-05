"use client";

import { Banknote, MoreHorizontal, PiggyBank, Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  amountInRange,
  ColumnAmountRange,
  ColumnDateRange,
  ColumnFilter,
  ColumnSearch,
  dateInRange,
  EMPTY_AMOUNT_RANGE,
  EMPTY_DATE_RANGE,
  FilterOption,
  isAmountRangeActive,
  isDateRangeActive,
  StatusBar,
  type AmountRange,
  type DateRange,
} from "@/components/dashboard/column-filters";
import { EditorialHero } from "@/components/dashboard/editorial-hero";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCashExpense } from "@/lib/actions/cash-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { CashExpenseWithDetails } from "@/lib/queries/cash-expenses";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { LiquidSavingsRow } from "@/lib/queries/investments";
import { CASH_METHOD_LABEL } from "@/lib/validation/cash-expense";

import { CashExpenseForm } from "./cash-expense-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: CashExpenseWithDetails };

function formatAmount(value: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function timeAgo(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

type Props = {
  initialExpenses: CashExpenseWithDetails[];
  cards: CardRow[];
  subcategories: SubcategoryWithCategory[];
  liquidSavings: LiquidSavingsRow[];
};

export function CashExpensesList({ initialExpenses, cards, subcategories, liquidSavings }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<CashExpenseWithDetails | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<"pix" | "debit" | "cash" | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [amountRange, setAmountRange] = useState<AmountRange>(EMPTY_AMOUNT_RANGE);

  const filterOptions = useMemo(() => {
    const cardSet = new Map<string, { id: string; name: string; color: string }>();
    const categorySet = new Set<string>();
    for (const e of initialExpenses) {
      if (!cardSet.has(e.cardId)) {
        cardSet.set(e.cardId, { id: e.cardId, name: e.cardName, color: e.cardColor });
      }
      categorySet.add(e.categoryName);
    }
    return {
      cards: Array.from(cardSet.values()).sort((a, b) => a.name.localeCompare(b.name)),
      categories: Array.from(categorySet).sort(),
    };
  }, [initialExpenses]);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialExpenses.filter((e) => {
      if (cardFilter && e.cardId !== cardFilter) return false;
      if (methodFilter && e.method !== methodFilter) return false;
      if (categoryFilter && e.categoryName !== categoryFilter) return false;
      if (!dateInRange(e.date, dateRange)) return false;
      if (!amountInRange(e.amount, amountRange)) return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !e.cardName.toLowerCase().includes(q) &&
        !e.subcategoryName.toLowerCase().includes(q) &&
        !e.categoryName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [initialExpenses, query, cardFilter, methodFilter, categoryFilter, dateRange, amountRange]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0),
    [filteredExpenses],
  );

  const isFiltering =
    query.trim() !== "" ||
    cardFilter !== null ||
    methodFilter !== null ||
    categoryFilter !== null ||
    isDateRangeActive(dateRange) ||
    isAmountRangeActive(amountRange);

  function clearFilters() {
    setQuery("");
    setCardFilter(null);
    setMethodFilter(null);
    setCategoryFilter(null);
    setDateRange(EMPTY_DATE_RANGE);
    setAmountRange(EMPTY_AMOUNT_RANGE);
  }

  function handleDelete(expense: CashExpenseWithDetails) {
    startDeleteTransition(async () => {
      const result = await deleteCashExpense(expense.id);
      if (result.ok) {
        toast.success("expense deleted.");
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="cash expenses"
      subtitle="pix, debit, cash"
      toolbar={
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new expense
        </Button>
      }
    >
      <EditorialHero
        caption="paid now"
        title="cash"
        accent="expenses"
        subtitle="pix · debit · cash"
        tone="aqua"
      />

      {initialExpenses.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <>
          <StatusBar
            shownCount={filteredExpenses.length}
            totalCount={initialExpenses.length}
            filteredTotal={filteredTotal}
            isFiltering={isFiltering}
            clearFilters={clearFilters}
          />
          {filteredExpenses.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-foreground text-[14px]">no matches.</p>
              <p className="text-muted-foreground text-[12px]">
                try a different query or clear filters.
              </p>
              <Button onClick={clearFilters} variant="ghost" size="sm" className="mt-1">
                clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnSearch label="description" query={query} setQuery={setQuery} />
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnFilter
                      label="category"
                      active={categoryFilter !== null}
                      activeChip={categoryFilter ? { label: categoryFilter } : null}
                      onClear={() => setCategoryFilter(null)}
                    >
                      {filterOptions.categories.map((cat) => (
                        <FilterOption
                          key={cat}
                          label={cat}
                          active={categoryFilter === cat}
                          onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                        />
                      ))}
                    </ColumnFilter>
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnFilter
                      label="account"
                      active={cardFilter !== null}
                      activeChip={
                        cardFilter
                          ? {
                              label:
                                filterOptions.cards.find((c) => c.id === cardFilter)?.name ?? "",
                              color: filterOptions.cards.find((c) => c.id === cardFilter)?.color,
                            }
                          : null
                      }
                      onClear={() => setCardFilter(null)}
                    >
                      {filterOptions.cards.map((c) => (
                        <FilterOption
                          key={c.id}
                          label={c.name}
                          color={c.color}
                          active={cardFilter === c.id}
                          onClick={() => setCardFilter(cardFilter === c.id ? null : c.id)}
                        />
                      ))}
                    </ColumnFilter>
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnFilter
                      label="method"
                      active={methodFilter !== null}
                      activeChip={methodFilter ? { label: CASH_METHOD_LABEL[methodFilter] } : null}
                      onClear={() => setMethodFilter(null)}
                    >
                      {(["pix", "debit", "cash"] as const).map((m) => (
                        <FilterOption
                          key={m}
                          label={CASH_METHOD_LABEL[m]}
                          active={methodFilter === m}
                          onClick={() => setMethodFilter(methodFilter === m ? null : m)}
                        />
                      ))}
                    </ColumnFilter>
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnDateRange
                      label="date"
                      value={dateRange}
                      onChange={setDateRange}
                      granularity="day"
                    />
                  </TableHead>
                  <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnAmountRange
                      label="amount"
                      value={amountRange}
                      onChange={setAmountRange}
                    />
                  </TableHead>
                  <TableHead className="w-10 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => {
                  const cofrinho = expense.liquidSavingsId
                    ? liquidSavings.find((s) => s.id === expense.liquidSavingsId)
                    : null;
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2 text-[13px] font-medium">
                            <span className="truncate">{expense.description}</span>
                            {cofrinho && (
                              <span
                                className="border-border bg-primary/[0.06] text-primary inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
                                title={`do cofrinho: ${cofrinho.title}`}
                              >
                                <PiggyBank aria-hidden className="size-2.5" strokeWidth={1.8} />
                                cofrinho
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {timeAgo(expense.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-[12px]">
                        <span className="flex items-center gap-2">
                          {expense.categoryIcon ? (
                            <span
                              aria-hidden
                              className="border-border bg-card/60 flex size-5 shrink-0 items-center justify-center rounded-md border"
                              style={{
                                borderColor: `color-mix(in oklab, ${expense.categoryColor} 35%, var(--border))`,
                              }}
                            >
                              <CategoryIcon
                                icon={expense.categoryIcon}
                                color={expense.categoryColor}
                                size={12}
                              />
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate">
                            <span className="text-muted-foreground">{expense.categoryName}</span>
                            <span className="text-muted-foreground/40 mx-1">/</span>
                            <span className="text-foreground">{expense.subcategoryName}</span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: expense.cardColor }}
                            aria-hidden
                          />
                          <span
                            className="border-border bg-card/60 truncate rounded-md border px-2 py-0.5 text-[12px]"
                            style={{
                              borderColor: `color-mix(in oklab, ${expense.cardColor} 35%, var(--border))`,
                            }}
                          >
                            {expense.cardName}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-[12px]">
                        {CASH_METHOD_LABEL[expense.method]}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell className="numeric py-3 text-right text-[13px] tabular-nums">
                        {formatAmount(expense.amount)}
                      </TableCell>
                      <TableCell className="py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="actions"
                            className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                          >
                            <MoreHorizontal aria-hidden className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialog({ kind: "edit", expense })}>
                              edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete(expense)}
                            >
                              delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <Dialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === "edit" ? "edit expense" : "new cash expense"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update expense details."
                : "log a pix, debit, or cash payment."}
            </DialogDescription>
          </DialogHeader>
          <CashExpenseForm
            key={dialog.kind === "edit" ? dialog.expense.id : "create"}
            expense={dialog.kind === "edit" ? dialog.expense : undefined}
            cards={cards}
            subcategories={subcategories}
            liquidSavings={liquidSavings}
            onSuccess={() => setDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.description}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) handleDelete(pendingDelete);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Banknote className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no cash expenses yet</h2>
        <p className="text-muted-foreground text-[13px]">log pix, debit, or cash payments here.</p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new expense
      </Button>
    </div>
  );
}
