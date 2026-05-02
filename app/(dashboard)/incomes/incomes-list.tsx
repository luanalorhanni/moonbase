"use client";

import { ArrowDownToLine, MoreHorizontal, Plus } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

import { IncomeForm } from "./income-form";

type DialogState = { kind: "closed" } | { kind: "create" } | { kind: "edit"; income: IncomeRow };

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

export function IncomesList({ initialIncomes }: { initialIncomes: IncomeRow[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<IncomeRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(income: IncomeRow) {
    startDeleteTransition(async () => {
      const result = await deleteIncome(income.id);
      if (result.ok) {
        toast.success("income deleted.");
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="incomes"
      subtitle="salaries, grants, refunds, sales"
      toolbar={
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new income
        </Button>
      }
    >
      {initialIncomes.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                description
              </TableHead>
              <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                type
              </TableHead>
              <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                date
              </TableHead>
              <TableHead className="py-2 text-right text-[11px] font-mono font-normal tracking-[0.16em]">
                amount
              </TableHead>
              <TableHead className="w-10 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialIncomes.map((income) => (
              <TableRow key={income.id}>
                <TableCell className="py-3 text-[13px] font-medium">{income.description}</TableCell>
                <TableCell className="text-muted-foreground py-3 text-[12px]">
                  {INCOME_TYPE_LABEL[income.type]}
                </TableCell>
                <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                  {formatDate(income.date)}
                </TableCell>
                <TableCell className="numeric py-3 text-right text-[13px] font-medium tabular-nums">
                  {formatCurrency(income.amount)}
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
                      <DropdownMenuItem onClick={() => setDialog({ kind: "edit", income })}>
                        edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(income)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.kind === "edit" ? "edit income" : "new income"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update income details."
                : "log a payment received."}
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
            <AlertDialogTitle>delete income?</AlertDialogTitle>
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
      <ArrowDownToLine className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no income yet</h2>
        <p className="text-muted-foreground text-[13px]">
          log salaries, grants, refunds, sales, anything you receive.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new income
      </Button>
    </div>
  );
}
