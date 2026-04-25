"use client";

import { MoreHorizontal, Plus, Repeat } from "lucide-react";
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
          <h1 className="text-2xl font-semibold tracking-tight">Despesas fixas</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Assinaturas e despesas recorrentes com valor estável.
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
                  Cartão / Método
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Vencimento
                </TableHead>
                <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Mensal
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Período
                </TableHead>
                <TableHead className="w-10 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialExpenses.map((expense) => (
                <TableRow key={expense.id} className={expense.isActive ? "" : "opacity-50"}>
                  <TableCell className="py-3.5">
                    <div className="font-medium">{expense.description}</div>
                    {!expense.isActive && (
                      <span className="text-muted-foreground text-xs">inativa</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">
                    <span className="text-muted-foreground text-xs">{expense.categoryName}</span>
                    <span className="text-muted-foreground mx-1 text-xs">/</span>
                    {expense.subcategoryName}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">
                    <div>{expense.cardName}</div>
                    <div className="text-muted-foreground text-xs">
                      {PAYMENT_METHOD_LABEL[expense.paymentMethod]}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {expense.dueDay !== null ? `dia ${expense.dueDay}` : "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {formatAmount(expense.monthlyAmount)}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {formatMonth(expense.startDate)}
                    {" → "}
                    {expense.endDate ? formatMonth(expense.endDate) : "…"}
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
              {dialog.kind === "edit" ? "Editar despesa fixa" : "Nova despesa fixa"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "Atualize os dados da despesa."
                : "Registre uma assinatura ou despesa recorrente mensal."}
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
      <Repeat className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhuma despesa fixa ainda.</h2>
        <p className="text-muted-foreground text-sm">
          Registre assinaturas e despesas recorrentes com valor mensal estável.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Nova despesa
      </Button>
    </div>
  );
}
