"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Target } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Label used in BudgetField below
import { saveMonthlyBudget } from "@/lib/actions/monthly-budgets";
import { type MonthBudget } from "@/lib/queries/monthly-budgets";
import {
  monthlyBudgetFormSchema,
  type MonthlyBudgetFormInput,
} from "@/lib/validation/monthly-budget";

type CategoryMeta = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
};

type Props = {
  reference: string;
  budget: MonthBudget;
  categories: CategoryMeta[];
};

export function MonthBudgetDialog({ reference, budget, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultValues: MonthlyBudgetFormInput = {
    maxTotal: budget.budget?.maxTotal ?? "",
    maxCredit: budget.budget?.maxCredit ?? "",
    maxCash: budget.budget?.maxCash ?? "",
    categories: categories.map((cat) => {
      const existing = budget.categoryBudgets.find((b) => b.categoryId === cat.id);
      return { categoryId: cat.id, maxAmount: existing?.maxAmount ?? "" };
    }),
  };

  const form = useForm<MonthlyBudgetFormInput>({
    resolver: zodResolver(monthlyBudgetFormSchema),
    defaultValues,
  });

  const hasAnyBudget =
    !!budget.budget?.maxTotal ||
    !!budget.budget?.maxCredit ||
    !!budget.budget?.maxCash ||
    budget.categoryBudgets.length > 0;

  function onSubmit(values: MonthlyBudgetFormInput) {
    startTransition(async () => {
      const result = await saveMonthlyBudget(reference, values);
      if (result.ok) {
        toast.success("monthly goal saved.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-normal transition-colors">
        <Target className="size-3 shrink-0" strokeWidth={1.7} />
        <span>{hasAnyBudget ? "monthly goal" : "set goal"}</span>
        {hasAnyBudget && (
          <span className="bg-primary/15 text-primary rounded-full px-1.5 py-px font-mono text-[9px] leading-none">
            active
          </span>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4">
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            monthly spending goal
          </DialogTitle>
          <p className="text-muted-foreground text-[12px]">
            leave a field blank to skip that limit.{" "}
            <span className="text-warning font-medium">amber</span> at 80%,{" "}
            <span className="text-destructive font-medium">red</span> when exceeded.
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {/* ── general limits ─────────────────────────────────── */}
            <section className="mb-5">
              <h3 className="text-foreground/80 mb-3 text-[11px] font-medium tracking-[0.14em] uppercase">
                general limits
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <BudgetField
                  label="total expenses"
                  name="maxTotal"
                  form={form}
                  placeholder="e.g. 3000"
                />
                <BudgetField
                  label="credit only"
                  name="maxCredit"
                  form={form}
                  placeholder="e.g. 2000"
                />
                <BudgetField label="cash only" name="maxCash" form={form} placeholder="e.g. 1000" />
              </div>
            </section>

            {/* ── per category ───────────────────────────────────── */}
            {categories.length > 0 && (
              <section>
                <h3 className="text-foreground/80 mb-3 text-[11px] font-medium tracking-[0.14em] uppercase">
                  by category
                </h3>
                <div className="flex flex-col gap-2">
                  {categories.map((cat, idx) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <CategoryIcon
                          icon={cat.icon ?? undefined}
                          color={cat.color ?? undefined}
                          size={14}
                        />
                        <span className="text-foreground min-w-0 truncate text-[12px]">
                          {cat.name}
                        </span>
                      </div>
                      <div className="w-28 shrink-0">
                        <input type="hidden" {...form.register(`categories.${idx}.categoryId`)} />
                        <Input
                          {...form.register(`categories.${idx}.maxAmount`)}
                          placeholder="no limit"
                          className="h-8 text-right font-mono text-[12px]"
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="border-border flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-[12px]"
              onClick={() => {
                form.reset({
                  maxTotal: "",
                  maxCredit: "",
                  maxCash: "",
                  categories: categories.map((cat) => ({ categoryId: cat.id, maxAmount: "" })),
                });
              }}
            >
              clear all
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-[12px]"
              >
                cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending} className="text-[12px]">
                {pending ? "saving..." : "save goal"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetField({
  label,
  name,
  form,
  placeholder,
}: {
  label: string;
  name: "maxTotal" | "maxCredit" | "maxCash";
  form: ReturnType<typeof useForm<MonthlyBudgetFormInput>>;
  placeholder: string;
}) {
  const error = form.formState.errors[name];
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-[11px]">{label}</Label>
      <Input
        {...form.register(name)}
        placeholder={placeholder}
        inputMode="decimal"
        className="h-8 font-mono text-[13px]"
      />
      {error && <span className="text-destructive text-[10px]">{error.message}</span>}
    </div>
  );
}
