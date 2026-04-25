"use client";

import { HandCoins, MoreHorizontal, Plus } from "lucide-react";
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
import { deleteCashReceivable, markCashReceivableAsPaid } from "@/lib/actions/cash-receivables";
import { deleteCreditReceivable } from "@/lib/actions/credit-receivables";
import type { CardRow } from "@/lib/queries/cards";
import type { CashReceivableRow, CreditReceivableWithCard } from "@/lib/queries/receivables";
import { LOAN_TYPE_LABEL } from "@/lib/validation/cash-receivable";

import { CashReceivableForm } from "./cash-receivable-form";
import { CreditReceivableForm } from "./credit-receivable-form";

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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

function formatAmount(value: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

const COLOR_DOT_CLASS: Record<string, string> = {
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

type Tab = "cash" | "credit";

type CashDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; receivable: CashReceivableRow };

type CreditDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; receivable: CreditReceivableWithCard };

type Props = {
  cashReceivables: CashReceivableRow[];
  creditReceivables: CreditReceivableWithCard[];
  cards: CardRow[];
};

export function ReceivablesPage({ cashReceivables, creditReceivables, cards }: Props) {
  const [tab, setTab] = useState<Tab>("cash");
  const [cashDialog, setCashDialog] = useState<CashDialog>({ kind: "closed" });
  const [creditDialog, setCreditDialog] = useState<CreditDialog>({ kind: "closed" });
  const [pendingDeleteCash, setPendingDeleteCash] = useState<CashReceivableRow | null>(null);
  const [pendingDeleteCredit, setPendingDeleteCredit] = useState<CreditReceivableWithCard | null>(
    null,
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isMarking, startMarkTransition] = useTransition();

  function handleDeleteCash(r: CashReceivableRow) {
    startDeleteTransition(async () => {
      const result = await deleteCashReceivable(r.id);
      if (result.ok) {
        toast.success("Recebível excluído.");
        setPendingDeleteCash(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteCredit(r: CreditReceivableWithCard) {
    startDeleteTransition(async () => {
      const result = await deleteCreditReceivable(r.id);
      if (result.ok) {
        toast.success("Recebível excluído.");
        setPendingDeleteCredit(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleMarkAsPaid(r: CashReceivableRow) {
    startMarkTransition(async () => {
      const result = await markCashReceivableAsPaid(r.id);
      if (result.ok) {
        toast.success("Marcado como recebido.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recebíveis</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Valores a receber de terceiros, à vista ou parcelados.
          </p>
        </div>
        <Button
          onClick={() =>
            tab === "cash" ? setCashDialog({ kind: "create" }) : setCreditDialog({ kind: "create" })
          }
          size="sm"
        >
          <Plus aria-hidden className="size-4" /> Novo recebível
        </Button>
      </div>

      {/* tab switcher */}
      <div className="border-border flex gap-0 border-b">
        {(["cash", "credit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-4 pb-2.5 text-sm transition-colors",
              tab === t
                ? "border-primary text-foreground border-b-2 font-medium"
                : "text-muted-foreground hover:text-foreground -mb-px",
            ].join(" ")}
          >
            {t === "cash" ? "À vista" : "Parcelado"}
          </button>
        ))}
      </div>

      {tab === "cash" ? (
        <CashSection
          receivables={cashReceivables}
          onAdd={() => setCashDialog({ kind: "create" })}
          onEdit={(r) => setCashDialog({ kind: "edit", receivable: r })}
          onDelete={(r) => setPendingDeleteCash(r)}
          onMarkPaid={handleMarkAsPaid}
          isMarking={isMarking}
        />
      ) : (
        <CreditSection
          receivables={creditReceivables}
          onAdd={() => setCreditDialog({ kind: "create" })}
          onEdit={(r) => setCreditDialog({ kind: "edit", receivable: r })}
          onDelete={(r) => setPendingDeleteCredit(r)}
        />
      )}

      {/* cash dialog */}
      <Dialog
        open={cashDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setCashDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {cashDialog.kind === "edit" ? "Editar recebível" : "Novo recebível à vista"}
            </DialogTitle>
            <DialogDescription>
              {cashDialog.kind === "edit"
                ? "Atualize os dados do recebível."
                : "Registre um valor a receber de volta."}
            </DialogDescription>
          </DialogHeader>
          <CashReceivableForm
            key={cashDialog.kind === "edit" ? cashDialog.receivable.id : "create"}
            receivable={cashDialog.kind === "edit" ? cashDialog.receivable : undefined}
            onSuccess={() => setCashDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      {/* credit dialog */}
      <Dialog
        open={creditDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setCreditDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creditDialog.kind === "edit" ? "Editar recebível" : "Novo recebível parcelado"}
            </DialogTitle>
            <DialogDescription>
              {creditDialog.kind === "edit"
                ? "Atualize os dados do recebível."
                : "Registre uma compra no cartão que será paga em parcelas por terceiros."}
            </DialogDescription>
          </DialogHeader>
          <CreditReceivableForm
            key={creditDialog.kind === "edit" ? creditDialog.receivable.id : "create"}
            receivable={creditDialog.kind === "edit" ? creditDialog.receivable : undefined}
            cards={cards}
            onSuccess={() => setCreditDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      {/* cash delete confirm */}
      <AlertDialog
        open={pendingDeleteCash !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCash(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebível?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCash
                ? `"${pendingDeleteCash.description}" será removido permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCash) handleDeleteCash(pendingDeleteCash);
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* credit delete confirm */}
      <AlertDialog
        open={pendingDeleteCredit !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCredit(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebível?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCredit
                ? `"${pendingDeleteCredit.description}" será removido permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCredit) handleDeleteCredit(pendingDeleteCredit);
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

function CashSection({
  receivables,
  onAdd,
  onEdit,
  onDelete,
  onMarkPaid,
  isMarking,
}: {
  receivables: CashReceivableRow[];
  onAdd: () => void;
  onEdit: (r: CashReceivableRow) => void;
  onDelete: (r: CashReceivableRow) => void;
  onMarkPaid: (r: CashReceivableRow) => void;
  isMarking: boolean;
}) {
  if (receivables.length === 0) {
    return (
      <EmptyState
        onAdd={onAdd}
        description="Registre valores emprestados que você precisa receber de volta."
      />
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Descrição
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Método
            </TableHead>
            <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
              Valor
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Emprestado em
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Mês previsto
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Status
            </TableHead>
            <TableHead className="w-10 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {receivables.map((r) => (
            <TableRow key={r.id} className={r.isPaid ? "opacity-50" : ""}>
              <TableCell className="py-3.5 font-medium">{r.description}</TableCell>
              <TableCell className="text-muted-foreground py-3.5 text-sm">
                {LOAN_TYPE_LABEL[r.loanType]}
              </TableCell>
              <TableCell className="py-3.5 text-right text-sm tabular-nums">
                {formatAmount(r.amount)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatDate(r.loanDate)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatMonth(r.expectedPaymentMonth)}
              </TableCell>
              <TableCell className="py-3.5 text-sm">
                {r.isPaid ? (
                  <span className="text-muted-foreground">
                    recebido{r.actualPaymentDate ? ` em ${formatDate(r.actualPaymentDate)}` : ""}
                  </span>
                ) : (
                  <span className="text-foreground">pendente</span>
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
                    {!r.isPaid && (
                      <DropdownMenuItem disabled={isMarking} onSelect={() => onMarkPaid(r)}>
                        Marcar como recebido
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onEdit(r)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(r)}>
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
  );
}

function CreditSection({
  receivables,
  onAdd,
  onEdit,
  onDelete,
}: {
  receivables: CreditReceivableWithCard[];
  onAdd: () => void;
  onEdit: (r: CreditReceivableWithCard) => void;
  onDelete: (r: CreditReceivableWithCard) => void;
}) {
  if (receivables.length === 0) {
    return (
      <EmptyState
        onAdd={onAdd}
        description="Registre compras no cartão feitas para terceiros que serão pagas em parcelas."
      />
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Descrição
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
          {receivables.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${COLOR_DOT_CLASS[r.cardColor] ?? "bg-gray-400"}`}
                    aria-hidden
                  />
                  <div>
                    <div className="font-medium">{r.description}</div>
                    <div className="text-muted-foreground text-xs">{r.cardName}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatDate(r.purchaseDate)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {r.totalParcels}× {formatAmount(r.parcelValue)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {r.firstParcelMonth && r.lastParcelMonth ? (
                  <span>
                    {formatMonth(r.firstParcelMonth)}
                    {r.totalParcels > 1 ? ` → ${formatMonth(r.lastParcelMonth)}` : ""}
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
                    <DropdownMenuItem onSelect={() => onEdit(r)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(r)}>
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
  );
}

function EmptyState({ onAdd, description }: { onAdd: () => void; description: string }) {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <HandCoins className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhum recebível ainda.</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Novo recebível
      </Button>
    </div>
  );
}
