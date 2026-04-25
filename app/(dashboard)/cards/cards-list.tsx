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

  // Server actions revalidatePath, so initialCards refreshes on the next
  // server render — no client-side state needed for the list.

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground text-sm">
            Cartões de crédito e contas para pagamentos à vista.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })}>
          <Plus aria-hidden /> Novo cartão
        </Button>
      </div>

      {initialCards.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Fechamento</TableHead>
                <TableHead className="text-right">Vencimento</TableHead>
                <TableHead className="text-right">Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${COLOR_DOT_CLASS[card.color]}`}
                        aria-hidden
                      />
                      <span className="font-medium">{card.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{TYPE_LABEL[card.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{card.bank ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {card.defaultClosingDay ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{card.dueDay ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(card.limitAmount)}
                  </TableCell>
                  <TableCell>
                    {card.isActive ? (
                      <span className="text-success-foreground inline-flex items-center gap-1 text-xs">
                        <span className="bg-success size-1.5 rounded-full" aria-hidden />
                        Ativo
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Inativo</span>
                    )}
                  </TableCell>
                  <TableCell>
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
      <CreditCard className="text-muted-foreground size-10" strokeWidth={1.25} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-lg font-medium">Nenhum cartão cadastrado ainda</h2>
        <p className="text-muted-foreground text-sm">
          Cadastre o primeiro para começar a registrar despesas.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus aria-hidden /> Novo cartão
      </Button>
    </div>
  );
}
