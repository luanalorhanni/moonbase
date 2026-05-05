"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubcategoryCombobox } from "@/components/ui/subcategory-combobox";
import { createCashExpense, updateCashExpense } from "@/lib/actions/cash-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { CashExpenseRow } from "@/lib/queries/cash-expenses";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { LiquidSavingsRow } from "@/lib/queries/investments";
import {
  CASH_METHOD_LABEL,
  CASH_METHODS,
  cashExpenseFormSchema,
  type CashExpenseFormInput,
} from "@/lib/validation/cash-expense";

type Props = {
  expense?: CashExpenseRow;
  cards: CardRow[];
  subcategories: SubcategoryWithCategory[];
  liquidSavings: LiquidSavingsRow[];
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CashExpenseForm({
  expense,
  cards,
  subcategories,
  liquidSavings,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CashExpenseFormInput>({
    resolver: zodResolver(cashExpenseFormSchema),
    defaultValues: expense
      ? {
          description: expense.description,
          cardId: expense.cardId,
          method: expense.method,
          subcategoryId: expense.subcategoryId,
          date: expense.date,
          amount: expense.amount,
          liquidSavingsId: expense.liquidSavingsId ?? "",
        }
      : {
          description: "",
          cardId: "",
          method: "pix",
          subcategoryId: "",
          date: today(),
          amount: "",
          liquidSavingsId: "",
        },
  });

  const liquidSavingsId = form.watch("liquidSavingsId");
  const fromCofrinho = liquidSavingsId !== "" && liquidSavingsId !== undefined;
  const activeSavings = liquidSavings.filter(
    (s) => s.isActive || s.id === expense?.liquidSavingsId,
  );
  const savingsLabels = Object.fromEntries(
    activeSavings.map((s) => [s.id, `${s.title} — ${s.bank}`]),
  );

  const cardLabels = Object.fromEntries(
    cards.map((c) => [c.id, c.bank ? `${c.name} — ${c.bank}` : c.name]),
  );

  function onSubmit(values: CashExpenseFormInput) {
    startTransition(async () => {
      const result = expense
        ? await updateCashExpense(expense.id, values)
        : await createCashExpense(values);

      if (result.ok) {
        toast.success(expense ? "expense updated." : "expense logged.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CashExpenseFormInput, {
            type: "server",
            message: messages.join(", "),
          });
        }
      }
      toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ce-description">description</FieldLabel>
          <Input
            id="ce-description"
            placeholder="e.g. lunch"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-subcategory">subcategory</FieldLabel>
          <Controller
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <SubcategoryCombobox
                id="ce-subcategory"
                subcategories={subcategories}
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          {form.formState.errors.subcategoryId ? (
            <FieldError>{form.formState.errors.subcategoryId.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-card">account / card</FieldLabel>
          <Controller
            control={form.control}
            name="cardId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={cardLabels}
              >
                <SelectTrigger id="ce-card" className="w-full">
                  <SelectValue placeholder="select…" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                      {card.bank ? ` — ${card.bank}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.cardId ? (
            <FieldError>{form.formState.errors.cardId.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-method">method</FieldLabel>
          <Controller
            control={form.control}
            name="method"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={CASH_METHOD_LABEL}
              >
                <SelectTrigger id="ce-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASH_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {CASH_METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-date">date</FieldLabel>
          <Input id="ce-date" type="date" disabled={isPending} {...form.register("date")} />
          {form.formState.errors.date ? (
            <FieldError>{form.formState.errors.date.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-amount">amount</FieldLabel>
          <Input
            id="ce-amount"
            inputMode="decimal"
            placeholder="e.g. 45.90"
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldDescription>use a period as the decimal separator (e.g. 45.90).</FieldDescription>
          {form.formState.errors.amount ? (
            <FieldError>{form.formState.errors.amount.message}</FieldError>
          ) : null}
        </Field>

        {activeSavings.length > 0 && (
          <Field>
            <label className="border-border bg-muted/20 hover:bg-muted/30 flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors">
              <input
                type="checkbox"
                checked={fromCofrinho}
                disabled={isPending}
                onChange={(e) => {
                  if (e.target.checked) {
                    form.setValue("liquidSavingsId", activeSavings[0]!.id, {
                      shouldDirty: true,
                    });
                  } else {
                    form.setValue("liquidSavingsId", "", { shouldDirty: true });
                  }
                }}
                className="border-input mt-0.5 size-4 rounded border accent-current"
              />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-foreground text-[13px] font-medium">Tirei do cofrinho?</span>
                <span className="text-muted-foreground text-[11.5px]">
                  when checked, the amount is deducted automatically from the savings balance.
                </span>
              </span>
            </label>
            {fromCofrinho && (
              <Controller
                control={form.control}
                name="liquidSavingsId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isPending}
                    items={savingsLabels}
                  >
                    <SelectTrigger id="ce-liquid-savings" className="mt-2 w-full">
                      <SelectValue placeholder="choose liquid savings..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSavings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title} — {s.bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {form.formState.errors.liquidSavingsId ? (
              <FieldError>{form.formState.errors.liquidSavingsId.message}</FieldError>
            ) : null}
          </Field>
        )}
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : expense ? "save" : "log"}
        </Button>
      </div>
    </form>
  );
}
