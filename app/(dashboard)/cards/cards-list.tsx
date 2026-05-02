"use client";

import { CreditCard, MoreHorizontal, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
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
import { deleteCard } from "@/lib/actions/cards";
import type { CardRow } from "@/lib/queries/cards";

import { CardForm } from "./card-form";

type DialogState = { kind: "closed" } | { kind: "create" } | { kind: "edit"; card: CardRow };

const TYPE_LABEL: Record<CardRow["type"], string> = {
  credit: "credit",
  account: "account",
};


function formatAmount(value: string | null): string {
  if (value === null) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

export function CardsList({ initialCards }: { initialCards: CardRow[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<CardRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(card: CardRow) {
    startDeleteTransition(async () => {
      const result = await deleteCard(card.id);
      if (result.ok) {
        toast.success("card deleted.");
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="cards"
      subtitle="credit cards & cash accounts"
      toolbar={
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new card
        </Button>
      }
    >
      {initialCards.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                  name
                </TableHead>
                <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                  type
                </TableHead>
                <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                  bank
                </TableHead>
                <TableHead className="py-2 text-right text-[11px] font-mono font-normal tracking-[0.16em]">
                  closing
                </TableHead>
                <TableHead className="py-2 text-right text-[11px] font-mono font-normal tracking-[0.16em]">
                  due
                </TableHead>
                <TableHead className="py-2 text-right text-[11px] font-mono font-normal tracking-[0.16em]">
                  limit
                </TableHead>
                <TableHead className="py-2 text-[11px] font-mono font-normal tracking-[0.16em]">
                  status
                </TableHead>
                <TableHead className="w-10 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: card.color }}
                        aria-hidden
                      />
                      <span className="font-medium">{card.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">{TYPE_LABEL[card.type]}</TableCell>
                  <TableCell className="text-muted-foreground py-3.5 text-sm">
                    {card.bank ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {card.defaultClosingDay ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {card.dueDay ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {formatAmount(card.limitAmount)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {card.isActive ? (
                      <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium">
                        <span className="bg-success size-1.5 rounded-full" aria-hidden />
                        active
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[12px]">
                        inactive
                      </span>
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
                        <DropdownMenuItem onClick={() => setDialog({ kind: "edit", card })}>
                          edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPendingDelete(card)}
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
            <DialogTitle>{dialog.kind === "edit" ? "edit card" : "new card"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update card details."
                : "add a credit card or cash account."}
            </DialogDescription>
          </DialogHeader>
          <CardForm
            key={dialog.kind === "edit" ? dialog.card.id : "create"}
            card={dialog.kind === "edit" ? dialog.card : undefined}
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
            <AlertDialogTitle>delete card?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" will be removed. this can't be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
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
      <CreditCard className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no cards yet</h2>
        <p className="text-muted-foreground text-[13px]">
          add the first one to start logging expenses.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new card
      </Button>
    </div>
  );
}
