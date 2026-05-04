"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
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
import { createCreditExpense, updateCreditExpense } from "@/lib/actions/credit-expenses";
import type { CardRow } from "@/lib/queries/cards";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";
import type { CreditExpenseWithDetails } from "@/lib/queries/credit-expenses";
import {
  creditExpenseFormSchema,
  type CreditExpenseFormInput,
} from "@/lib/validation/credit-expense";

type Props = {
  expense?: CreditExpenseWithDetails;
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

export function CreditExpenseForm({ expense, cards, subcategories, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const creditCards = cards.filter((c) => c.type === "credit");
  const cardLabels = Object.fromEntries(
    creditCards.map((c) => [c.id, c.bank ? `${c.name} — ${c.bank}` : c.name]),
  );
  const subcategoryLabels = Object.fromEntries(subcategories.map((s) => [s.id, s.name]));

  const form = useForm<CreditExpenseFormInput>({
    resolver: zodResolver(creditExpenseFormSchema),
    defaultValues: expense
      ? {
          description: expense.description,
          cardId: expense.cardId,
          subcategoryId: expense.subcategoryId,
          purchaseDate: expense.purchaseDate,
          totalParcels: String(expense.totalParcels),
          parcelValue: expense.parcelValue,
          manualOverride: expense.manualOverride,
        }
      : {
          description: "",
          cardId: "",
          subcategoryId: "",
          purchaseDate: today(),
          totalParcels: "1",
          parcelValue: "",
          manualOverride: false,
        },
  });

  const grouped = groupByCategory(subcategories);

  function onSubmit(values: CreditExpenseFormInput) {
    startTransition(async () => {
      const result = expense
        ? await updateCreditExpense(expense.id, values)
        : await createCreditExpense(values);

      if (result.ok) {
        toast.success(expense ? "expense updated." : "expense logged.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CreditExpenseFormInput, {
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
            placeholder="e.g. laptop"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="ce-card">credit card</FieldLabel>
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
                  {creditCards.map((card) => (
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
          <FieldLabel htmlFor="ce-subcategory">subcategory</FieldLabel>
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
                  <SelectValue placeholder="select…" />
                </SelectTrigger>
                <SelectContent>
                  {[...grouped.entries()].map(([categoryName, { icon, items }]) => (
                    <SelectGroup key={categoryName}>
                      <SelectLabel className="flex items-center gap-1.5">
                        {icon && <CategoryIcon icon={icon} size={12} />}
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
          <FieldLabel htmlFor="ce-purchase-date">purchase date</FieldLabel>
          <Input
            id="ce-purchase-date"
            type="date"
            disabled={isPending}
            {...form.register("purchaseDate")}
          />
          {form.formState.errors.purchaseDate ? (
            <FieldError>{form.formState.errors.purchaseDate.message}</FieldError>
          ) : null}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="ce-parcels">installments</FieldLabel>
            <Input
              id="ce-parcels"
              inputMode="numeric"
              placeholder="e.g. 3"
              disabled={isPending}
              {...form.register("totalParcels")}
            />
            {form.formState.errors.totalParcels ? (
              <FieldError>{form.formState.errors.totalParcels.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="ce-parcel-value">installment value</FieldLabel>
            <Input
              id="ce-parcel-value"
              inputMode="decimal"
              placeholder="e.g. 199.90"
              disabled={isPending}
              {...form.register("parcelValue")}
            />
            {form.formState.errors.parcelValue ? (
              <FieldError>{form.formState.errors.parcelValue.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          use a period as the decimal separator (e.g. 199.90).
        </FieldDescription>

        <div className="flex items-start gap-3 rounded-md border px-3 py-3">
          <input
            id="ce-manual-override"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("manualOverride")}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="ce-manual-override"
              className="cursor-pointer text-sm leading-snug font-medium"
            >
              manual override
            </label>
            <p className="text-muted-foreground text-sm">
              keeps the existing installment dates on save, without recalculating.
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
