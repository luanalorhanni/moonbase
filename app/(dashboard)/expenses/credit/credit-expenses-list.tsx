"use client";

import { MoreHorizontal, Plus, ReceiptText } from "lucide-react";
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
  periodOverlapsRange,
  StatusBar,
  type AmountRange,
  type DateRange,
} from "@/components/dashboard/column-filters";
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
import { deleteCreditExpense } from "@/lib/actions/credit-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { CreditExpenseWithDetails } from "@/lib/queries/credit-expenses";
import { cn } from "@/lib/utils";

import { CreditExpenseForm } from "./credit-expense-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: CreditExpenseWithDetails };

const EN_MONTH_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${EN_MONTH_SHORT[m - 1]}/${String(y).slice(2)}`;
}

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

type Props = {
  initialExpenses: CreditExpenseWithDetails[];
  cards: CardRow[];
  subcategories: SubcategoryWithCategory[];
};

export function CreditExpensesList({ initialExpenses, cards, subcategories }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<CreditExpenseWithDetails | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [purchaseRange, setPurchaseRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [parcelRange, setParcelRange] = useState<AmountRange>(EMPTY_AMOUNT_RANGE);
  const [periodRange, setPeriodRange] = useState<DateRange>(EMPTY_DATE_RANGE);

  // Distinct filter options derived from the loaded list
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
      if (categoryFilter && e.categoryName !== categoryFilter) return false;
      if (!dateInRange(e.purchaseDate, purchaseRange)) return false;
      if (!amountInRange(e.parcelValue, parcelRange)) return false;
      if (!periodOverlapsRange(e.firstParcelMonth, e.lastParcelMonth, periodRange)) return false;
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
  }, [initialExpenses, query, cardFilter, categoryFilter, purchaseRange, parcelRange, periodRange]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + Number(e.parcelValue) * e.totalParcels, 0),
    [filteredExpenses],
  );

  const isFiltering =
    query.trim() !== "" ||
    cardFilter !== null ||
    categoryFilter !== null ||
    isDateRangeActive(purchaseRange) ||
    isAmountRangeActive(parcelRange) ||
    isDateRangeActive(periodRange);

  function clearFilters() {
    setQuery("");
    setCardFilter(null);
    setCategoryFilter(null);
    setPurchaseRange(EMPTY_DATE_RANGE);
    setParcelRange(EMPTY_AMOUNT_RANGE);
    setPeriodRange(EMPTY_DATE_RANGE);
  }

  function handleDelete(expense: CreditExpenseWithDetails) {
    startDeleteTransition(async () => {
      const result = await deleteCreditExpense(expense.id);
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
      title="credit expenses"
      subtitle="installments and one-shot card purchases"
      toolbar={
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new expense
        </Button>
      }
    >
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
                      label="card"
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
                    <ColumnDateRange
                      label="purchase"
                      value={purchaseRange}
                      onChange={setPurchaseRange}
                      granularity="day"
                    />
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnAmountRange
                      label="installments"
                      value={parcelRange}
                      onChange={setParcelRange}
                    />
                  </TableHead>
                  <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                    <ColumnDateRange
                      label="period"
                      value={periodRange}
                      onChange={setPeriodRange}
                      granularity="month"
                    />
                  </TableHead>
                  <TableHead className="w-10 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="py-3">
                      <div className="text-[13px] font-medium">{expense.description}</div>
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
                    <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                      {formatDate(expense.purchaseDate)}
                    </TableCell>
                    <TableCell className="numeric py-3 text-[12.5px] tabular-nums">
                      {expense.totalParcels}× {formatAmount(expense.parcelValue)}
                    </TableCell>
                    <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                      {expense.firstParcelMonth && expense.lastParcelMonth ? (
                        <span>
                          {formatMonth(expense.firstParcelMonth)}
                          {expense.totalParcels > 1
                            ? ` → ${formatMonth(expense.lastParcelMonth)}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                ))}
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
              {dialog.kind === "edit" ? "edit expense" : "new credit expense"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update expense details."
                : "log an installment or one-shot card purchase."}
            </DialogDescription>
          </DialogHeader>
          <CreditExpenseForm
            key={dialog.kind === "edit" ? dialog.expense.id : "create"}
            expense={dialog.kind === "edit" ? dialog.expense : undefined}
            cards={cards}
            subcategories={subcategories}
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
      <ReceiptText className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no credit expenses yet</h2>
        <p className="text-muted-foreground text-[13px]">
          log installments or one-shot card purchases.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new expense
      </Button>
    </div>
  );
}
