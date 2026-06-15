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
import { createFixedExpense, updateFixedExpense } from "@/lib/actions/fixed-expenses";
import { todayBrazil } from "@/lib/utils";
import type { CardRow } from "@/lib/queries/cards";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { FixedExpenseWithDetails } from "@/lib/queries/fixed-expenses";
import { toFormAmount } from "@/lib/validation/amount";
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

const today = todayBrazil;

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
          monthlyAmount: toFormAmount(expense.monthlyAmount),
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

  const cardLabels = Object.fromEntries(
    cards.map((c) => [c.id, c.bank ? `${c.name} — ${c.bank}` : c.name]),
  );

  function onSubmit(values: FixedExpenseFormInput) {
    startTransition(async () => {
      const result = expense
        ? await updateFixedExpense(expense.id, values)
        : await createFixedExpense(values);

      if (result.ok) {
        toast.success(expense ? "expense updated." : "expense logged.");
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
          <FieldLabel htmlFor="fe-description">description</FieldLabel>
          <Input
            id="fe-description"
            placeholder="e.g. spotify"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="fe-subcategory">subcategory</FieldLabel>
          <Controller
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <SubcategoryCombobox
                id="fe-subcategory"
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

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fe-card">card / account</FieldLabel>
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
                  <SelectTrigger id="fe-card" className="w-full">
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
            <FieldLabel htmlFor="fe-method">method</FieldLabel>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={PAYMENT_METHOD_LABEL}
                >
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
            <FieldLabel htmlFor="fe-amount">monthly amount</FieldLabel>
            <Input
              id="fe-amount"
              inputMode="decimal"
              placeholder="ex. 29,90"
              disabled={isPending}
              {...form.register("monthlyAmount")}
            />
            {form.formState.errors.monthlyAmount ? (
              <FieldError>{form.formState.errors.monthlyAmount.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fe-due-day">due day</FieldLabel>
            <Input
              id="fe-due-day"
              inputMode="numeric"
              placeholder="e.g. 5"
              disabled={isPending}
              {...form.register("dueDay")}
            />
            {form.formState.errors.dueDay ? (
              <FieldError>{form.formState.errors.dueDay.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          leave the due day empty if not applicable.
        </FieldDescription>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fe-start-date">start</FieldLabel>
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
            <FieldLabel htmlFor="fe-end-date">end</FieldLabel>
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
          leave the end date empty if still active.
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
              inactive expenses are not included in the monthly totals.
            </p>
          </div>
        </div>
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
