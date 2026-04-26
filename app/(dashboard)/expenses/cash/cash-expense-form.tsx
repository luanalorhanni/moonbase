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
import { createCashExpense, updateCashExpense } from "@/lib/actions/cash-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { CashExpenseRow } from "@/lib/queries/cash-expenses";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
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
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupByCategory(subcategories: SubcategoryWithCategory[]) {
  const groups = new Map<string, { icon: string | null; items: SubcategoryWithCategory[] }>();
  for (const sub of subcategories) {
    if (!groups.has(sub.categoryName)) {
      groups.set(sub.categoryName, { icon: sub.categoryIcon, items: [] });
    }
    groups.get(sub.categoryName)!.items.push(sub);
  }
  return groups;
}

export function CashExpenseForm({ expense, cards, subcategories, onSuccess }: Props) {
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
        }
      : {
          description: "",
          cardId: "",
          method: "pix",
          subcategoryId: "",
          date: today(),
          amount: "",
        },
  });

  const grouped = groupByCategory(subcategories);
  const subcategoryLabels = Object.fromEntries(subcategories.map((s) => [s.id, s.name]));
  const cardLabels = Object.fromEntries(
    cards.map((c) => [c.id, c.bank ? `${c.name} — ${c.bank}` : c.name]),
  );

  function onSubmit(values: CashExpenseFormInput) {
    startTransition(async () => {
      const result = expense
        ? await updateCashExpense(expense.id, values)
        : await createCashExpense(values);

      if (result.ok) {
        toast.success(expense ? "Despesa atualizada." : "Despesa registrada.");
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
          <FieldLabel htmlFor="ce-description">Descrição</FieldLabel>
          <Input
            id="ce-description"
            placeholder="Ex: Almoço"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-subcategory">Subcategoria</FieldLabel>
          <Controller
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={subcategoryLabels}
              >
                <SelectTrigger id="ce-subcategory" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {[...grouped.entries()].map(([categoryName, { icon, items }]) => (
                    <SelectGroup key={categoryName}>
                      <SelectLabel>
                        {icon ? `${icon} ` : ""}
                        {categoryName}
                      </SelectLabel>
                      {items.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.subcategoryId ? (
            <FieldError>{form.formState.errors.subcategoryId.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-card">Conta / Cartão</FieldLabel>
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
                  <SelectValue placeholder="Selecione…" />
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
          <FieldLabel htmlFor="ce-method">Método</FieldLabel>
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
          <FieldLabel htmlFor="ce-date">Data</FieldLabel>
          <Input id="ce-date" type="date" disabled={isPending} {...form.register("date")} />
          {form.formState.errors.date ? (
            <FieldError>{form.formState.errors.date.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-amount">Valor</FieldLabel>
          <Input
            id="ce-amount"
            inputMode="decimal"
            placeholder="Ex: 45.90"
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldDescription>Use ponto como separador decimal (ex: 45.90).</FieldDescription>
          {form.formState.errors.amount ? (
            <FieldError>{form.formState.errors.amount.message}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : expense ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
