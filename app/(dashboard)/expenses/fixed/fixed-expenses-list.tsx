"use client";

import { MoreHorizontal, Plus, Repeat } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { deleteFixedExpense } from "@/lib/actions/fixed-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { FixedExpenseWithDetails } from "@/lib/queries/fixed-expenses";
import { PAYMENT_METHOD_LABEL } from "@/lib/validation/fixed-expense";

import { FixedExpenseForm } from "./fixed-expense-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: FixedExpenseWithDetails };

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

type Props = {
  initialExpenses: FixedExpenseWithDetails[];
  cards: CardRow[];
  subcategories: SubcategoryWithCategory[];
};

export function FixedExpensesList({ initialExpenses, cards, subcategories }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<FixedExpenseWithDetails | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(expense: FixedExpenseWithDetails) {
    startDeleteTransition(async () => {
      const result = await deleteFixedExpense(expense.id);
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
      title="recurring"
      subtitle="subscriptions and monthly fixed costs"
      toolbar={
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new recurring
        </Button>
      }
    >
      {initialExpenses.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                description
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                subcategory
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                card / method
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                due
              </TableHead>
              <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
                monthly
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                period
              </TableHead>
              <TableHead className="w-10 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialExpenses.map((expense) => (
              <TableRow key={expense.id} className={expense.isActive ? "" : "opacity-50"}>
                <TableCell className="py-3">
                  <div className="text-[13px] font-medium">{expense.description}</div>
                  {!expense.isActive && (
                    <span className="text-muted-foreground text-[11px]">inactive</span>
                  )}
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
                      <span className="text-muted-foreground mx-1">/</span>
                      {expense.subcategoryName}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="py-3 text-[12px]">
                  <div>{expense.cardName}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {PAYMENT_METHOD_LABEL[expense.paymentMethod]}
                  </div>
                </TableCell>
                <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                  {expense.dueDay !== null ? `day ${expense.dueDay}` : "—"}
                </TableCell>
                <TableCell className="numeric py-3 text-right text-[13px] tabular-nums">
                  {formatAmount(expense.monthlyAmount)}
                </TableCell>
                <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                  {formatMonth(expense.startDate)}
                  {" → "}
                  {expense.endDate ? formatMonth(expense.endDate) : "…"}
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

      <Dialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === "edit" ? "edit recurring" : "new recurring"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update recurring expense details."
                : "log a subscription or monthly fixed cost."}
            </DialogDescription>
          </DialogHeader>
          <FixedExpenseForm
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
            <AlertDialogTitle>delete recurring?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.description}" will be removed.`
                : null}
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
      <Repeat className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no recurring expenses yet</h2>
        <p className="text-muted-foreground text-[13px]">
          subscriptions, gym, taxes, anything that repeats monthly.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new recurring
      </Button>
    </div>
  );
}
