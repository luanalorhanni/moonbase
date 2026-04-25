"use client";

import { ArrowDownToLine, MoreHorizontal, Plus } from "lucide-react";
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
import { deleteIncome } from "@/lib/actions/incomes";
import type { IncomeRow } from "@/lib/queries/incomes";
import { INCOME_TYPE_LABEL } from "@/lib/validation/income";

import { IncomeForm } from "./income-form";

type DialogState = { kind: "closed" } | { kind: "create" } | { kind: "edit"; income: IncomeRow };

function formatAmount(value: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function IncomesList({ initialIncomes }: { initialIncomes: IncomeRow[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<IncomeRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(income: IncomeRow) {
    startDeleteTransition(async () => {
      const result = await deleteIncome(income.id);
      if (result.ok) {
        toast.success("Receita excluída.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Receitas</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Salários, bolsas, reembolsos e outros recebimentos.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-4" /> Nova receita
        </Button>
      </div>

      {initialIncomes.length === 0 ? (
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
                  Tipo
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
              {initialIncomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell className="py-3.5 font-medium">{income.description}</TableCell>
                  <TableCell className="text-muted-foreground py-3.5 text-sm">
                    {INCOME_TYPE_LABEL[income.type]}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm tabular-nums">
                    {formatDate(income.date)}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm font-medium tabular-nums">
                    {formatAmount(income.amount)}
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
                        <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", income })}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(income)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.kind === "edit" ? "Editar receita" : "Nova receita"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "Atualize os dados da receita."
                : "Registre um recebimento."}
            </DialogDescription>
          </DialogHeader>
          <IncomeForm
            key={dialog.kind === "edit" ? dialog.income.id : "create"}
            income={dialog.kind === "edit" ? dialog.income : undefined}
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
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `A receita "${pendingDelete.description}" será removida permanentemente.`
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
      <ArrowDownToLine className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhuma receita ainda</h2>
        <p className="text-muted-foreground text-sm">
          Registre salários, bolsas, reembolsos e outros recebimentos.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Nova receita
      </Button>
    </div>
  );
}
