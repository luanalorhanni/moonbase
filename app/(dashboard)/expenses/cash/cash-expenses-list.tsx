"use client";

import { Banknote, MoreHorizontal, Plus } from "lucide-react";
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
import { deleteCashExpense } from "@/lib/actions/cash-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { CashExpenseWithDetails } from "@/lib/queries/cash-expenses";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import { CASH_METHOD_LABEL } from "@/lib/validation/cash-expense";

import { CashExpenseForm } from "./cash-expense-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: CashExpenseWithDetails };

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
  initialExpenses: CashExpenseWithDetails[];
  cards: CardRow[];
  subcategories: SubcategoryWithCategory[];
};

export function CashExpensesList({ initialExpenses, cards, subcategories }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<CashExpenseWithDetails | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(expense: CashExpenseWithDetails) {
    startDeleteTransition(async () => {
      const result = await deleteCashExpense(expense.id);
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
          <h1 className="text-2xl font-semibold tracking-tight">Despesas à vista</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Pagamentos via Pix, débito ou dinheiro.
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
                  Conta
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Método
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Data
                </TableHead>
                <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Valor
                </TableHead>
                <TableHead className="w-10 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="py-3.5 font-medium">{expense.description}</TableCell>
                  <TableCell className="py-3.5 text-sm">
                    <span className="text-muted-foreground text-xs">{expense.categoryName}</span>
                    <span className="text-muted-foreground mx-1 text-xs">/</span>
                    {expense.subcategoryName}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-3.5 text-sm">
                    {expense.cardName}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">
                    {CASH_METHOD_LABEL[expense.method]}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {formatDate(expense.date)}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {formatAmount(expense.amount)}
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
              {dialog.kind === "edit" ? "Editar despesa" : "Nova despesa à vista"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "Atualize os dados da despesa."
                : "Registre um pagamento via Pix, débito ou dinheiro."}
            </DialogDescription>
          </DialogHeader>
          <CashExpenseForm
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
      <Banknote className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhuma despesa à vista ainda</h2>
        <p className="text-muted-foreground text-sm">
          Registre pagamentos via Pix, débito ou dinheiro.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Nova despesa
      </Button>
    </div>
  );
}
