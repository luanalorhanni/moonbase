"use client";

import { Landmark, MoreHorizontal, PiggyBank, Plus } from "lucide-react";
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
import { deleteFixedIncome, deleteLiquidSavings } from "@/lib/actions/investments";
import type { FixedIncomeRow, LiquidSavingsRow } from "@/lib/queries/investments";

import { FixedIncomeForm } from "./fixed-income-form";
import { LiquidSavingsForm } from "./liquid-savings-form";

type Tab = "liquid" | "fixed";

type LiquidDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; item: LiquidSavingsRow };

type FixedDialog = { kind: "closed" } | { kind: "create" } | { kind: "edit"; item: FixedIncomeRow };

type Props = {
  liquidSavings: LiquidSavingsRow[];
  fixedIncome: FixedIncomeRow[];
};

function formatAmount(value: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function totalActive(items: { isActive: boolean; latestYield: string }[]): string {
  const sum = items.filter((i) => i.isActive).reduce((acc, i) => acc + Number(i.latestYield), 0);
  return formatAmount(String(sum));
}

export function InvestmentsPage({ liquidSavings, fixedIncome }: Props) {
  const [tab, setTab] = useState<Tab>("liquid");
  const [liquidDialog, setLiquidDialog] = useState<LiquidDialog>({ kind: "closed" });
  const [fixedDialog, setFixedDialog] = useState<FixedDialog>({ kind: "closed" });
  const [pendingDeleteLiquid, setPendingDeleteLiquid] = useState<LiquidSavingsRow | null>(null);
  const [pendingDeleteFixed, setPendingDeleteFixed] = useState<FixedIncomeRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDeleteLiquid(item: LiquidSavingsRow) {
    startDeleteTransition(async () => {
      const result = await deleteLiquidSavings(item.id);
      if (result.ok) {
        toast.success("investment removed.");
        setPendingDeleteLiquid(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteFixed(item: FixedIncomeRow) {
    startDeleteTransition(async () => {
      const result = await deleteFixedIncome(item.id);
      if (result.ok) {
        toast.success("investment removed.");
        setPendingDeleteFixed(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const activeTotal = tab === "liquid" ? totalActive(liquidSavings) : totalActive(fixedIncome);

  return (
    <PageShell
      title="investments"
      subtitle="liquid savings and fixed income"
      toolbar={
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wider">
            active
          </span>
          <span className="numeric text-foreground text-[13px] font-medium tabular-nums">
            {activeTotal}
          </span>
          <Button
            onClick={() =>
              tab === "liquid"
                ? setLiquidDialog({ kind: "create" })
                : setFixedDialog({ kind: "create" })
            }
            size="sm"
            className="ml-2"
          >
            <Plus aria-hidden className="size-3.5" /> new investment
          </Button>
        </div>
      }
    >
      {/* tab switcher */}
      <div className="border-border flex shrink-0 gap-0 border-b">
        {(["liquid", "fixed"] as Tab[]).map((t) => (
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
            {t === "liquid" ? "liquid savings" : "fixed income"}
          </button>
        ))}
        <div className="bg-muted/40 flex-1" />
      </div>

      {tab === "liquid" ? (
        <LiquidSection
          items={liquidSavings}
          onAdd={() => setLiquidDialog({ kind: "create" })}
          onEdit={(item) => setLiquidDialog({ kind: "edit", item })}
          onDelete={(item) => setPendingDeleteLiquid(item)}
        />
      ) : (
        <FixedSection
          items={fixedIncome}
          onAdd={() => setFixedDialog({ kind: "create" })}
          onEdit={(item) => setFixedDialog({ kind: "edit", item })}
          onDelete={(item) => setPendingDeleteFixed(item)}
        />
      )}

      {/* liquid dialog */}
      <Dialog
        open={liquidDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setLiquidDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {liquidDialog.kind === "edit" ? "edit liquid savings" : "new liquid savings"}
            </DialogTitle>
            <DialogDescription>
              {liquidDialog.kind === "edit"
                ? "update balance and yield."
                : "log a savings/cash account with instant liquidity."}
            </DialogDescription>
          </DialogHeader>
          <LiquidSavingsForm
            key={liquidDialog.kind === "edit" ? liquidDialog.item.id : "create"}
            item={liquidDialog.kind === "edit" ? liquidDialog.item : undefined}
            onSuccess={() => setLiquidDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      {/* fixed income dialog */}
      <Dialog
        open={fixedDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setFixedDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {fixedDialog.kind === "edit" ? "edit fixed income" : "new fixed income"}
            </DialogTitle>
            <DialogDescription>
              {fixedDialog.kind === "edit"
                ? "update balance and yield."
                : "log an LCI, LCA, CDB, or treasury bond."}
            </DialogDescription>
          </DialogHeader>
          <FixedIncomeForm
            key={fixedDialog.kind === "edit" ? fixedDialog.item.id : "create"}
            item={fixedDialog.kind === "edit" ? fixedDialog.item : undefined}
            onSuccess={() => setFixedDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      {/* liquid delete confirm */}
      <AlertDialog
        open={pendingDeleteLiquid !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteLiquid(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteLiquid ? `"${pendingDeleteLiquid.title}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteLiquid) handleDeleteLiquid(pendingDeleteLiquid);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* fixed income delete confirm */}
      <AlertDialog
        open={pendingDeleteFixed !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFixed(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFixed ? `"${pendingDeleteFixed.title}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteFixed) handleDeleteFixed(pendingDeleteFixed);
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

function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="actions"
        className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        <MoreHorizontal aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LiquidSection({
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: LiquidSavingsRow[];
  onAdd: () => void;
  onEdit: (item: LiquidSavingsRow) => void;
  onDelete: (item: LiquidSavingsRow) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PiggyBank className="text-muted-foreground/60 size-10" strokeWidth={1} />}
        onAdd={onAdd}
        description="log savings and instant-liquidity investments."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            name
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            bank
          </TableHead>
          <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
            applied
          </TableHead>
          <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
            current balance
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            applied on
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            updated on
          </TableHead>
          <TableHead className="w-10 py-2" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className={item.isActive ? "" : "opacity-50"}>
            <TableCell className="py-3">
              <div className="text-[13px] font-medium">{item.title}</div>
              {!item.isActive && (
                <span className="text-muted-foreground text-[11px]">inactive</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground py-3 text-[12px]">{item.bank}</TableCell>
            <TableCell className="numeric py-3 text-right text-[12.5px] tabular-nums">
              {formatAmount(item.appliedAmount)}
            </TableCell>
            <TableCell className="numeric py-3 text-right text-[13px] tabular-nums">
              {formatAmount(item.latestYield)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatDate(item.applicationDate)}
            </TableCell>
            <TableCell className="text-muted-foreground py-3 font-mono text-[12px] tabular-nums">
              {item.lastUpdateDate ? formatDate(item.lastUpdateDate) : "—"}
            </TableCell>
            <TableCell className="py-3">
              <ActionCell onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FixedSection({
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: FixedIncomeRow[];
  onAdd: () => void;
  onEdit: (item: FixedIncomeRow) => void;
  onDelete: (item: FixedIncomeRow) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Landmark className="text-muted-foreground/60 size-10" strokeWidth={1} />}
        onAdd={onAdd}
        description="log LCIs, LCAs, CDBs, treasuries — anything with maturity."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            name
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            bank
          </TableHead>
          <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
            applied
          </TableHead>
          <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
            current balance
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            applied on
          </TableHead>
          <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
            maturity
          </TableHead>
          <TableHead className="w-10 py-2" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className={item.isActive ? "" : "opacity-50"}>
            <TableCell className="py-3">
              <div className="text-[13px] font-medium">{item.title}</div>
              {!item.isActive && (
                <span className="text-muted-foreground text-[11px]">inactive</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground py-3 text-[12px]">{item.bank}</TableCell>
            <TableCell className="numeric py-3 text-right text-[12.5px] tabular-nums">
              {formatAmount(item.appliedAmount)}
            </TableCell>
            <TableCell className="numeric py-3 text-right text-[13px] tabular-nums">
              {formatAmount(item.latestYield)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatDate(item.applicationDate)}
            </TableCell>
            <TableCell className="py-3 font-mono text-[12px] tabular-nums">
              {formatDate(item.maturityDate)}
            </TableCell>
            <TableCell className="py-3">
              <ActionCell onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyState({
  icon,
  onAdd,
  description,
}: {
  icon: React.ReactNode;
  onAdd: () => void;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span aria-hidden>{icon}</span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no investments yet</h2>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new investment
      </Button>
    </div>
  );
}
