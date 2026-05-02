"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CardRow } from "@/lib/queries/cards";
import { createCard, updateCard } from "@/lib/actions/cards";
import { cardFormSchema, type CardFormInput } from "@/lib/validation/card";

type Props = {
  /** When provided, the form runs in edit mode. */
  card?: CardRow;
  onSuccess: () => void;
};

function emptyDefaults(): CardFormInput {
  return {
    name: "",
    type: "credit",
    bank: "",
    defaultClosingDay: "",
    dueDay: "",
    limitAmount: "",
    color: "#7e82aa",
    isActive: true,
  };
}

function defaultsFromCard(card: CardRow): CardFormInput {
  return {
    name: card.name,
    type: card.type,
    bank: card.bank ?? "",
    defaultClosingDay: card.defaultClosingDay !== null ? String(card.defaultClosingDay) : "",
    dueDay: card.dueDay !== null ? String(card.dueDay) : "",
    limitAmount: card.limitAmount ?? "",
    color: card.color,
    isActive: card.isActive,
  };
}

export function CardForm({ card, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CardFormInput>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: card ? defaultsFromCard(card) : emptyDefaults(),
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isCredit = type === "credit";

  function onSubmit(values: CardFormInput) {
    startTransition(async () => {
      const result = card ? await updateCard(card.id, values) : await createCard(values);

      if (result.ok) {
        toast.success(card ? "card updated." : "card created.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CardFormInput, {
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
          <FieldLabel htmlFor="name">name</FieldLabel>
          <Input
            id="name"
            placeholder="ex: nubank"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="type">type</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={{
                  credit: "credit card",
                  account: "account (pix, debit, cash)",
                }}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">credit card</SelectItem>
                  <SelectItem value="account">account (pix, debit, cash)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>
            accounts represent immediate-payment methods (pix, debit, cash).
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="bank">bank</FieldLabel>
          <Input
            id="bank"
            placeholder="ex: nubank"
            disabled={isPending}
            {...form.register("bank")}
          />
          <FieldDescription>optional.</FieldDescription>
        </Field>

        {isCredit ? (
          <>
            <Field>
              <FieldLabel htmlFor="defaultClosingDay">default closing day</FieldLabel>
              <Input
                id="defaultClosingDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="ex: 25"
                disabled={isPending}
                {...form.register("defaultClosingDay")}
              />
              <FieldDescription>
                can be overridden month-by-month (in &ldquo;card_closings&rdquo;).
              </FieldDescription>
              {form.formState.errors.defaultClosingDay ? (
                <FieldError>{form.formState.errors.defaultClosingDay.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="dueDay">due day</FieldLabel>
              <Input
                id="dueDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="ex: 5"
                disabled={isPending}
                {...form.register("dueDay")}
              />
              {form.formState.errors.dueDay ? (
                <FieldError>{form.formState.errors.dueDay.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="limitAmount">limit</FieldLabel>
              <Input
                id="limitAmount"
                inputMode="decimal"
                placeholder="ex: 5000.00"
                disabled={isPending}
                {...form.register("limitAmount")}
              />
              <FieldDescription>use period as decimal separator (ex: 1234.56).</FieldDescription>
              {form.formState.errors.limitAmount ? (
                <FieldError>{form.formState.errors.limitAmount.message}</FieldError>
              ) : null}
            </Field>
          </>
        ) : null}

        <Field>
          <FieldLabel htmlFor="color">color</FieldLabel>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <ColorPicker
                id="color"
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          {form.formState.errors.color ? (
            <FieldError>{form.formState.errors.color.message}</FieldError>
          ) : null}
        </Field>

        <Field orientation="horizontal">
          <input
            id="isActive"
            type="checkbox"
            disabled={isPending}
            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded-sm border focus-visible:ring-3"
            {...form.register("isActive")}
          />
          <FieldLabel htmlFor="isActive">active</FieldLabel>
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : card ? "save" : "create"}
        </Button>
      </div>
    </form>
  );
}
