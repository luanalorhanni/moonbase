"use client";

import { CreditCard, MoreHorizontal, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
  credit: "Crédito",
  account: "Conta",
};

const COLOR_DOT_CLASS: Record<CardRow["color"], string> = {
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
        toast.success("Cartão excluído.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cartões de crédito e contas para pagamentos à vista.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })} size="sm">
          <Plus aria-hidden className="size-4" /> Novo cartão
        </Button>
      </div>

      {initialCards.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Nome
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Tipo
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Banco
                </TableHead>
                <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Fechamento
                </TableHead>
                <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Vencimento
                </TableHead>
                <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Limite
                </TableHead>
                <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
                  Status
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
                        className={`size-3 shrink-0 rounded-full ring-1 ring-black/10 ${COLOR_DOT_CLASS[card.color]}`}
                        aria-hidden
                      />
                      <span className="font-medium">{card.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm">{TYPE_LABEL[card.type]}</TableCell>
                  <TableCell className="text-muted-foreground py-3.5 text-sm">
                    {card.bank ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right tabular-nums text-sm">
                    {card.defaultClosingDay ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right tabular-nums text-sm">
                    {card.dueDay ?? "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-right tabular-nums text-sm">
                    {formatAmount(card.limitAmount)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {card.isActive ? (
                      <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                        <span className="bg-success size-1.5 rounded-full" aria-hidden />
                        Ativo
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs">
                        Inativo
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
                        <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", card })}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(card)}
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
            <DialogTitle>{dialog.kind === "edit" ? "Editar cartão" : "Novo cartão"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "Atualize os dados do cartão."
                : "Adicione um cartão de crédito ou conta de pagamento à vista."}
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
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `O cartão "${pendingDelete.name}" será removido. Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
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
      <CreditCard className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhum cartão cadastrado ainda</h2>
        <p className="text-muted-foreground text-sm">
          Cadastre o primeiro para começar a registrar despesas.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Novo cartão
      </Button>
    </div>
  );
}
