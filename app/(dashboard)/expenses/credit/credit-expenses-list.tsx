"use client";

import { MoreHorizontal, Plus, ReceiptText } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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

import { CreditExpenseForm } from "./credit-expense-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: CreditExpenseWithDetails };

const COLOR_DOT_CLASS: Record<CreditExpenseWithDetails["cardColor"], string> = {
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

const PT_MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${PT_MONTH_SHORT[m - 1]}/${String(y).slice(2)}`;
}

function formatAmount(value: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
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

  function handleDelete(expense: CreditExpenseWithDetails) {
    startDeleteTransition(async () => {
      const result = await deleteCreditExpense(expense.id);
      if (result.ok) {
        toast.success("Despesa excluída.");
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Despesas de crédito</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Compras parceladas ou à vista no cartão de crédito.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-4" /> Nova despesa
        </Button>
      </div>

      {initialExpenses.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Descrição
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Subcategoria
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Compra
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Parcelas
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Período
                </TableHead>
                <TableHead className="w-10 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 shrink-0 rounded-full ${COLOR_DOT_CLASS[expense.cardColor]}`}
                        aria-hidden
                      />
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-muted-foreground text-xs">{expense.cardName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">
                    <span className="text-muted-foreground text-xs">{expense.categoryName}</span>
                    <span className="text-muted-foreground mx-1 text-xs">/</span>
                    {expense.subcategoryName}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {formatDate(expense.purchaseDate)}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {expense.totalParcels}× {formatAmount(expense.parcelValue)}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
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
                  <TableCell className="py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Ações"
                        className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                      >
                        <MoreHorizontal aria-hidden className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", expense })}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(expense)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
              {dialog.kind === "edit" ? "Editar despesa" : "Nova despesa de crédito"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "Atualize os dados da despesa."
                : "Registre uma compra parcelada ou à vista no cartão de crédito."}
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
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `A despesa "${pendingDelete.description}" será removida permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) handleDelete(pendingDelete);
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <ReceiptText className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhuma despesa de crédito ainda.</h2>
        <p className="text-muted-foreground text-sm">
          Registre compras parceladas ou à vista no cartão de crédito.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Nova despesa
      </Button>
    </div>
  );
}
