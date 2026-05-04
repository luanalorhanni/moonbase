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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCreditReceivable, updateCreditReceivable } from "@/lib/actions/credit-receivables";
import type { CardRow } from "@/lib/queries/cards";
import type { CreditReceivableWithCard } from "@/lib/queries/receivables";
import {
  creditReceivableFormSchema,
  type CreditReceivableFormInput,
} from "@/lib/validation/credit-receivable";

type Props = {
  receivable?: CreditReceivableWithCard;
  cards: CardRow[];
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreditReceivableForm({ receivable, cards, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const creditCards = cards.filter((c) => c.type === "credit");
  const cardLabels = Object.fromEntries(
    creditCards.map((c) => [c.id, c.bank ? `${c.name} — ${c.bank}` : c.name]),
  );

  const form = useForm<CreditReceivableFormInput>({
    resolver: zodResolver(creditReceivableFormSchema),
    defaultValues: receivable
      ? {
          description: receivable.description,
          cardId: receivable.cardId,
          purchaseDate: receivable.purchaseDate,
          totalParcels: String(receivable.totalParcels),
          parcelValue: receivable.parcelValue,
          manualOverride: receivable.manualOverride,
        }
      : {
          description: "",
          cardId: "",
          purchaseDate: today(),
          totalParcels: "1",
          parcelValue: "",
          manualOverride: false,
        },
  });

  function onSubmit(values: CreditReceivableFormInput) {
    startTransition(async () => {
      const result = receivable
        ? await updateCreditReceivable(receivable.id, values)
        : await createCreditReceivable(values);

      if (result.ok) {
        toast.success(receivable ? "receivable updated." : "receivable logged.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CreditReceivableFormInput, {
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
          <FieldLabel htmlFor="cr-description">description</FieldLabel>
          <Input
            id="cr-description"
            placeholder="e.g. purchase for Mary"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="cr-card">credit card</FieldLabel>
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
                <SelectTrigger id="cr-card" className="w-full">
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
          <FieldLabel htmlFor="cr-purchase-date">purchase date</FieldLabel>
          <Input
            id="cr-purchase-date"
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
            <FieldLabel htmlFor="cr-parcels">installments</FieldLabel>
            <Input
              id="cr-parcels"
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
            <FieldLabel htmlFor="cr-parcel-value">installment value</FieldLabel>
            <Input
              id="cr-parcel-value"
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
            id="cr-manual-override"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("manualOverride")}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="cr-manual-override"
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
          {isPending ? "saving..." : receivable ? "save" : "log"}
        </Button>
      </div>
    </form>
  );
}
