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
import { createFixedExpense, updateFixedExpense } from "@/lib/actions/fixed-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { FixedExpenseWithDetails } from "@/lib/queries/fixed-expenses";
import {
  fixedExpenseFormSchema,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  type FixedExpenseFormInput,
} from "@/lib/validation/fixed-expense";

type Props = {
  expense?: FixedExpenseWithDetails;
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

export function FixedExpenseForm({ expense, cards, subcategories, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FixedExpenseFormInput>({
    resolver: zodResolver(fixedExpenseFormSchema),
    defaultValues: expense
      ? {
          description: expense.description,
          cardId: expense.cardId,
          subcategoryId: expense.subcategoryId,
          paymentMethod: expense.paymentMethod,
          monthlyAmount: expense.monthlyAmount,
          dueDay: expense.dueDay !== null ? String(expense.dueDay) : "",
          startDate: expense.startDate,
          endDate: expense.endDate ?? "",
          isActive: expense.isActive,
        }
      : {
          description: "",
          cardId: "",
          subcategoryId: "",
          paymentMethod: "cash",
          monthlyAmount: "",
          dueDay: "",
          startDate: today(),
          endDate: "",
          isActive: true,
        },
  });

  const grouped = groupByCategory(subcategories);

  function onSubmit(values: FixedExpenseFormInput) {
    startTransition(async () => {
      const result = expense
        ? await updateFixedExpense(expense.id, values)
        : await createFixedExpense(values);

      if (result.ok) {
        toast.success(expense ? "Despesa atualizada." : "Despesa registrada.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof FixedExpenseFormInput, {
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
          <FieldLabel htmlFor="fe-description">Descrição</FieldLabel>
          <Input
            id="fe-description"
            placeholder="Ex: Spotify"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="fe-subcategory">Subcategoria</FieldLabel>
          <Controller
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <SelectTrigger id="fe-subcategory" className="w-full">
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

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fe-card">Cartão / Conta</FieldLabel>
            <Controller
              control={form.control}
              name="cardId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="fe-card" className="w-full">
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
            <FieldLabel htmlFor="fe-method">Método</FieldLabel>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="fe-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fe-amount">Valor mensal</FieldLabel>
            <Input
              id="fe-amount"
              inputMode="decimal"
              placeholder="Ex: 29.90"
              disabled={isPending}
              {...form.register("monthlyAmount")}
            />
            {form.formState.errors.monthlyAmount ? (
              <FieldError>{form.formState.errors.monthlyAmount.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fe-due-day">Dia de vencimento</FieldLabel>
            <Input
              id="fe-due-day"
              inputMode="numeric"
              placeholder="Ex: 5"
              disabled={isPending}
              {...form.register("dueDay")}
            />
            {form.formState.errors.dueDay ? (
              <FieldError>{form.formState.errors.dueDay.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          Deixe o dia de vencimento em branco se não aplicável.
        </FieldDescription>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fe-start-date">Início</FieldLabel>
            <Input
              id="fe-start-date"
              type="date"
              disabled={isPending}
              {...form.register("startDate")}
            />
            {form.formState.errors.startDate ? (
              <FieldError>{form.formState.errors.startDate.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fe-end-date">Fim</FieldLabel>
            <Input
              id="fe-end-date"
              type="date"
              disabled={isPending}
              {...form.register("endDate")}
            />
            {form.formState.errors.endDate ? (
              <FieldError>{form.formState.errors.endDate.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          Deixe o fim em branco se ainda está ativo.
        </FieldDescription>

        <div className="flex items-start gap-3 rounded-md border px-3 py-3">
          <input
            id="fe-is-active"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("isActive")}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="fe-is-active"
              className="cursor-pointer text-sm leading-snug font-medium"
            >
              Ativo
            </label>
            <p className="text-muted-foreground text-sm">
              Despesas inativas não são incluídas nos totais mensais.
            </p>
          </div>
        </div>
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
