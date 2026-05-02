"use client";

import { HandCoins, MoreHorizontal, Plus } from "lucide-react";
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
import { deleteCashReceivable, markCashReceivableAsPaid } from "@/lib/actions/cash-receivables";
import { deleteCreditReceivable } from "@/lib/actions/credit-receivables";
import type { CardRow } from "@/lib/queries/cards";
import type { CashReceivableRow, CreditReceivableWithCard } from "@/lib/queries/receivables";
import { LOAN_TYPE_LABEL } from "@/lib/validation/cash-receivable";

import { CashReceivableForm } from "./cash-receivable-form";
import { CreditReceivableForm } from "./credit-receivable-form";

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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function formatAmount(value: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

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
        toast.success("receivable removed.");
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
        toast.success("receivable removed.");
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
        toast.success("marked as received.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="receivables"
      subtitle="amounts owed to you"
      toolbar={
        <Button
          onClick={() =>
            tab === "cash" ? setCashDialog({ kind: "create" }) : setCreditDialog({ kind: "create" })
          }
          size="sm"
        >
          <Plus aria-hidden className="size-3.5" /> new receivable
        </Button>
      }
    >
      {/* tab switcher */}
      <div className="border-border flex shrink-0 gap-0 border-b">
        {(["cash", "credit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-3 text-[13px] transition-colors",
              tab === t
                ? "text-foreground bg-background"
                : "text-muted-foreground hover:text-foreground bg-muted/40",
            ].join(" ")}
          >
            {tab === t && (
              <span aria-hidden className="bg-primary absolute inset-x-0 -top-px h-[2px]" />
            )}
            {t === "cash" ? "cash loans" : "installments"}
          </button>
        ))}
        <div className="bg-muted/40 flex-1" />
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
              {cashDialog.kind === "edit" ? "edit receivable" : "new cash receivable"}
            </DialogTitle>
            <DialogDescription>
              {cashDialog.kind === "edit"
                ? "update receivable details."
                : "log an amount you'll receive back."}
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
              {creditDialog.kind === "edit" ? "edit receivable" : "new installment receivable"}
            </DialogTitle>
            <DialogDescription>
              {creditDialog.kind === "edit"
                ? "update receivable details."
                : "log a card purchase someone else will pay back in installments."}
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
            <AlertDialogTitle>delete receivable?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCash ? `"${pendingDeleteCash.description}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCash) handleDeleteCash(pendingDeleteCash);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
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
            <AlertDialogTitle>delete receivable?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCredit ? `"${pendingDeleteCredit.description}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCredit) handleDeleteCredit(pendingDeleteCredit);
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
      <EmptyState onAdd={onAdd} description="log money you've lent out and expect to get back." />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            description
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            method
          </TableHead>
          <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
            amount
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            lent on
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            expected
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            status
          </TableHead>
          <TableHead className="w-10 py-2" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {receivables.map((r) => (
          <TableRow key={r.id} className={r.isPaid ? "opacity-50" : ""}>
            <TableCell className="py-3 text-[13px] font-medium">{r.description}</TableCell>
            <TableCell className="text-muted-foreground py-3 text-[12px]">
              {LOAN_TYPE_LABEL[r.loanType]}
            </TableCell>
            <TableCell className="numeric py-3 text-right text-[13px] tabular-nums">
              {formatAmount(r.amount)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatDate(r.loanDate)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatMonth(r.expectedPaymentMonth)}
            </TableCell>
            <TableCell className="py-3 text-[12px]">
              {r.isPaid ? (
                <span className="text-muted-foreground">
                  received{r.actualPaymentDate ? ` on ${formatDate(r.actualPaymentDate)}` : ""}
                </span>
              ) : (
                <span className="text-foreground">pending</span>
              )}
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
                  {!r.isPaid && (
                    <DropdownMenuItem disabled={isMarking} onClick={() => onMarkPaid(r)}>
                      mark as received
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(r)}>edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(r)}>
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
        description="log card purchases someone else will pay back in installments."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            description
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            purchase
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            installments
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            period
          </TableHead>
          <TableHead className="w-10 py-2" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {receivables.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="py-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: r.cardColor }}
                  aria-hidden
                />
                <div>
                  <div className="text-[13px] font-medium">{r.description}</div>
                  <div className="text-muted-foreground text-[12px]">{r.cardName}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatDate(r.purchaseDate)}
            </TableCell>
            <TableCell className="numeric py-3 text-[12.5px] tabular-nums">
              {r.totalParcels}× {formatAmount(r.parcelValue)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {r.firstParcelMonth && r.lastParcelMonth ? (
                <span>
                  {formatMonth(r.firstParcelMonth)}
                  {r.totalParcels > 1 ? ` → ${formatMonth(r.lastParcelMonth)}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
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
                  <DropdownMenuItem onClick={() => onEdit(r)}>edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(r)}>
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyState({ onAdd, description }: { onAdd: () => void; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <HandCoins className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no receivables yet</h2>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new receivable
      </Button>
    </div>
  );
}
