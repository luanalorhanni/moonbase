"use client";

import { Landmark, MoreHorizontal, PiggyBank, Plus } from "lucide-react";
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
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
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
        toast.success("Investimento excluído.");
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
        toast.success("Investimento excluído.");
        setPendingDeleteFixed(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const activeTotal = tab === "liquid" ? totalActive(liquidSavings) : totalActive(fixedIncome);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cofrinhos com liquidez imediata e renda fixa com vencimento.
          </p>
        </div>
        <Button
          onClick={() =>
            tab === "liquid"
              ? setLiquidDialog({ kind: "create" })
              : setFixedDialog({ kind: "create" })
          }
          size="sm"
        >
          <Plus aria-hidden className="size-4" /> Novo investimento
        </Button>
      </div>

      {/* tab switcher */}
      <div className="border-border flex gap-0 border-b">
        {(["liquid", "fixed"] as Tab[]).map((t) => (
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
            {t === "liquid" ? "Liquidez imediata" : "Renda fixa"}
          </button>
        ))}
      </div>

      {/* summary */}
      <div className="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-3">
        <p className="text-muted-foreground text-sm">Total ativo</p>
        <p className="text-foreground text-sm font-medium tabular-nums">{activeTotal}</p>
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
              {liquidDialog.kind === "edit" ? "Editar cofrinho" : "Novo cofrinho"}
            </DialogTitle>
            <DialogDescription>
              {liquidDialog.kind === "edit"
                ? "Atualize o saldo e rendimento."
                : "Registre um investimento com liquidez imediata."}
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
              {fixedDialog.kind === "edit" ? "Editar renda fixa" : "Nova renda fixa"}
            </DialogTitle>
            <DialogDescription>
              {fixedDialog.kind === "edit"
                ? "Atualize o saldo e rendimento."
                : "Registre um LCI, LCA, CDB ou Tesouro Direto."}
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
            <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteLiquid
                ? `"${pendingDeleteLiquid.title}" será removido permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteLiquid) handleDeleteLiquid(pendingDeleteLiquid);
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
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
            <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFixed
                ? `"${pendingDeleteFixed.title}" será removido permanentemente.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteFixed) handleDeleteFixed(pendingDeleteFixed);
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

function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ações"
        className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        <MoreHorizontal aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Excluir
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
        description="Registre cofrinhos e investimentos com liquidez imediata."
      />
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Nome
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Banco
            </TableHead>
            <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
              Aplicado
            </TableHead>
            <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
              Saldo atual
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Aplicado em
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Atualizado em
            </TableHead>
            <TableHead className="w-10 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.isActive ? "" : "opacity-50"}>
              <TableCell className="py-3.5">
                <div className="font-medium">{item.title}</div>
                {!item.isActive && <span className="text-muted-foreground text-xs">inativo</span>}
              </TableCell>
              <TableCell className="text-muted-foreground py-3.5 text-sm">{item.bank}</TableCell>
              <TableCell className="py-3.5 text-right text-sm tabular-nums">
                {formatAmount(item.appliedAmount)}
              </TableCell>
              <TableCell className="py-3.5 text-right text-sm tabular-nums">
                {formatAmount(item.latestYield)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatDate(item.applicationDate)}
              </TableCell>
              <TableCell className="text-muted-foreground py-3.5 text-sm tabular-nums">
                {item.lastUpdateDate ? formatDate(item.lastUpdateDate) : "—"}
              </TableCell>
              <TableCell className="py-3.5">
                <ActionCell onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
        description="Registre LCIs, LCAs, CDBs e outros títulos de renda fixa."
      />
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Nome
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Banco
            </TableHead>
            <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
              Aplicado
            </TableHead>
            <TableHead className="py-3 text-right text-[11px] font-medium tracking-wider uppercase">
              Saldo atual
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Aplicado em
            </TableHead>
            <TableHead className="py-3 text-[11px] font-medium tracking-wider uppercase">
              Vencimento
            </TableHead>
            <TableHead className="w-10 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.isActive ? "" : "opacity-50"}>
              <TableCell className="py-3.5">
                <div className="font-medium">{item.title}</div>
                {!item.isActive && <span className="text-muted-foreground text-xs">inativo</span>}
              </TableCell>
              <TableCell className="text-muted-foreground py-3.5 text-sm">{item.bank}</TableCell>
              <TableCell className="py-3.5 text-right text-sm tabular-nums">
                {formatAmount(item.appliedAmount)}
              </TableCell>
              <TableCell className="py-3.5 text-right text-sm tabular-nums">
                {formatAmount(item.latestYield)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatDate(item.applicationDate)}
              </TableCell>
              <TableCell className="py-3.5 text-sm tabular-nums">
                {formatDate(item.maturityDate)}
              </TableCell>
              <TableCell className="py-3.5">
                <ActionCell onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
    <div className="border-border bg-card flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <span aria-hidden>{icon}</span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhum investimento ainda.</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Novo investimento
      </Button>
    </div>
  );
}
